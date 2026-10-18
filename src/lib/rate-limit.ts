import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { BackendError, classifyDbError } from "@/lib/backend-errors";

export const RATE_LIMITS = {
  storeGeneration: { limit: 3, windowSeconds: 60 },
  aiTool: { limit: 12, windowSeconds: 60 },
  checkout: { limit: 10, windowSeconds: 60 },
} as const;

/**
 * Fixed-window rate limit stored in Postgres, so it holds across serverless
 * instances. Fails closed: if the check itself errors, a BackendError is
 * thrown (callers answer 503 with the cause) and the request is not served.
 */
export async function checkRateLimit(
  key: string,
  { limit, windowSeconds }: { limit: number; windowSeconds: number },
): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("check_rate_limit", {
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error("[db] rate limit check failed", error.code ?? "", error.message ?? "");
    throw new BackendError(classifyDbError(error), "rate limit", error);
  }
  return data === true;
}
