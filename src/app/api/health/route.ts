import { NextResponse } from "next/server";
import { isSupabaseConfigured, supabaseConfigProblem, publicEnv } from "@/lib/env";
import { isAIConfigured, isServiceRoleConfigured, isStripeConfigured } from "@/lib/env.server";
import { createAdminClient } from "@/lib/supabase/admin";
import { classifyDbError, type BackendIssue } from "@/lib/backend-errors";

export const dynamic = "force-dynamic";

const TABLES = ["profiles", "projects", "products", "subscriptions", "stripe_events", "usage_events", "rate_limits"] as const;
const NIL_UUID = "00000000-0000-0000-0000-000000000000";

type DatabaseCheck =
  | { ok: true }
  | { ok: false; issue: BackendIssue | "not_configured"; missing?: string[] };

/**
 * Setup status for operators. Reports only pass/fail and problem codes,
 * never keys, URLs of secrets or user data. Cached at the edge for 30s.
 */
export async function GET() {
  const database = await checkDatabase();
  const body = {
    ok: isSupabaseConfigured() && isServiceRoleConfigured() && database.ok,
    supabase: { configured: isSupabaseConfigured(), problem: supabaseConfigProblem() },
    serviceRoleKey: { configured: isServiceRoleConfigured() },
    database,
    ai: { configured: isAIConfigured() },
    stripe: { configured: isStripeConfigured() },
    appUrl: publicEnv.appUrl,
  };
  return NextResponse.json(body, {
    status: body.ok ? 200 : 503,
    headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=30" },
  });
}

async function checkDatabase(): Promise<DatabaseCheck> {
  if (!isSupabaseConfigured() || !isServiceRoleConfigured()) return { ok: false, issue: "not_configured" };
  try {
    const admin = createAdminClient();
    const missing: string[] = [];
    let firstIssue: BackendIssue | null = null;

    const tableResults = await Promise.all(
      // GET with limit 0, not HEAD: supabase-js reports a HEAD 404 (missing table) as success.
      TABLES.map(async (table) => ({ table, ...(await admin.from(table).select("*").limit(0)) })),
    );
    for (const { table, error } of tableResults) {
      if (!error) continue;
      const issue = classifyDbError(error);
      if (issue === "missing_schema") missing.push(table);
      firstIssue ??= issue;
    }

    // Side-effect-free calls that only succeed if the functions exist.
    const functionResults = await Promise.all([
      admin.rpc("finalize_usage", { p_reservation_id: NIL_UUID, p_status: "refunded" }).then((r) => ({ fn: "finalize_usage", ...r })),
      admin
        .rpc("reserve_usage", {
          p_user_id: NIL_UUID,
          p_usage_type: "ai_tool",
          p_credits: 1,
          p_limit: 0, // always over the limit, so nothing is inserted
          p_period_start: "2000-01-01T00:00:00Z",
          p_period_end: "2000-02-01T00:00:00Z",
        })
        .then((r) => ({ fn: "reserve_usage", ...r })),
    ]);
    for (const { fn, error } of functionResults) {
      if (!error) continue;
      const issue = classifyDbError(error);
      if (issue === "missing_schema") missing.push(`${fn}()`);
      firstIssue ??= issue;
    }

    if (!firstIssue) return { ok: true };
    return missing.length ? { ok: false, issue: "missing_schema", missing } : { ok: false, issue: firstIssue };
  } catch {
    return { ok: false, issue: "unreachable" };
  }
}
