import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Plan } from "@/lib/config/plans";
import type { Json, UsageType } from "@/lib/database.types";
import { currentUsagePeriod } from "@/lib/usage-period";

export { currentUsagePeriod };

export function limitFor(plan: Plan, usageType: UsageType): number {
  return usageType === "store_generation" ? plan.limits.storeGenerations : plan.limits.aiToolRuns;
}

export type ReservationResult =
  | { ok: true; reservationId: string }
  | { ok: false; reason: "limit_reached"; limit: number };

/**
 * Atomically reserves credits in Postgres (`reserve_usage`). The database
 * serialises concurrent requests per user with an advisory lock, so refreshing
 * the page or firing parallel requests cannot spend more than the allowance.
 */
export async function reserveCredits(
  userId: string,
  plan: Plan,
  usageType: UsageType,
  metadata: Json = {},
  credits = 1,
): Promise<ReservationResult> {
  const admin = createAdminClient();
  const period = currentUsagePeriod();
  const limit = limitFor(plan, usageType);

  const { data, error } = await admin.rpc("reserve_usage", {
    p_user_id: userId,
    p_usage_type: usageType,
    p_credits: credits,
    p_limit: limit,
    p_period_start: period.start.toISOString(),
    p_period_end: period.end.toISOString(),
    p_metadata: metadata,
  });

  if (error) throw new Error("Could not reserve credits");
  if (!data) return { ok: false, reason: "limit_reached", limit };
  return { ok: true, reservationId: data };
}

/** Marks a reservation as consumed (success). Idempotent. */
export async function consumeCredits(reservationId: string): Promise<void> {
  const admin = createAdminClient();
  await admin.rpc("finalize_usage", { p_reservation_id: reservationId, p_status: "consumed" });
}

/** Returns credits for a failed generation (provider error, invalid output, timeout). Idempotent. */
export async function refundCredits(reservationId: string): Promise<void> {
  const admin = createAdminClient();
  await admin.rpc("finalize_usage", { p_reservation_id: reservationId, p_status: "refunded" });
}

export type UsageSummary = {
  periodStart: string;
  periodEnd: string;
  storeGenerations: { used: number; limit: number; remaining: number };
  aiToolRuns: { used: number; limit: number; remaining: number };
};

export async function getUsageSummary(userId: string, plan: Plan): Promise<UsageSummary> {
  const admin = createAdminClient();
  const period = currentUsagePeriod();
  const { data, error } = await admin
    .from("usage_events")
    .select("usage_type, credits, status")
    .eq("user_id", userId)
    .eq("period_start", period.start.toISOString())
    .neq("status", "refunded");

  if (error) throw new Error("Could not load usage");

  const used = { store_generation: 0, ai_tool: 0 };
  for (const row of data ?? []) used[row.usage_type] += row.credits;

  const summarise = (type: UsageType) => {
    const limit = limitFor(plan, type);
    return { used: used[type], limit, remaining: Math.max(0, limit - used[type]) };
  };

  return {
    periodStart: period.start.toISOString(),
    periodEnd: period.end.toISOString(),
    storeGenerations: summarise("store_generation"),
    aiToolRuns: summarise("ai_tool"),
  };
}
