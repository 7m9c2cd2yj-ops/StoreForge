import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export const RATE_LIMITS = {
  storeGeneration: { limit: 3, windowSeconds: 60 },
  aiTool: { limit: 12, windowSeconds: 60 },
  checkout: { limit: 10, windowSeconds: 60 },
} as const;

/**
 * Fixed-window rate limit stored in Postgres, so it holds across serverless
 * instances. Fails closed: if the check itself errors, the request is denied.
 */
export async function checkRateLimit(
  key: string,
  { limit, windowSeconds }: { limit: number; windowSeconds: number },
): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("check_rate_limit", {
      p_key: key,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (error) return false;
    return data === true;
  } catch {
    return false;
  }
}
