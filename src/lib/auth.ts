import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export type SessionUser = {
  id: string;
  email: string | null;
};

/**
 * Returns the signed-in user, verified with Supabase Auth (the JWT signature
 * and expiry are checked — the cookie value is never trusted as-is).
 * Cached per request.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();
    if (error || !data?.claims?.sub) return null;
    return {
      id: data.claims.sub,
      email: typeof data.claims.email === "string" ? data.claims.email : null,
    };
  } catch (error) {
    // An auth outage or misconfiguration must not take down public pages.
    console.error("[auth] session check failed", error instanceof Error ? error.message : error);
    return null;
  }
});

/** For pages: redirects to the login page when there is no session. */
export async function requireUser(nextPath?: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login");
  }
  return user;
}
