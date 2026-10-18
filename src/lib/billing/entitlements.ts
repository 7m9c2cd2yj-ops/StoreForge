import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlan, type Plan } from "@/lib/config/plans";
import { resolveEffectivePlan, type EffectivePlan } from "@/lib/billing/plan-resolution";

export type Entitlements = EffectivePlan & { plan: Plan };

/**
 * Reads the user's subscription from the server-managed `subscriptions` table
 * (written only by verified Stripe webhooks / server-side Stripe lookups) and
 * resolves what they are entitled to. Never trusts client-provided plan data.
 */
export async function getEntitlements(userId: string): Promise<Entitlements> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("subscriptions")
    .select("plan, status, current_period_end, cancel_at_period_end")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error("Could not load subscription");
  }

  const effective = resolveEffectivePlan(data);
  return { ...effective, plan: getPlan(effective.planId) };
}
