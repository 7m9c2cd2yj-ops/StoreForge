import "server-only";
import { NextResponse } from "next/server";
import { getCurrentUser, type SessionUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { isServiceRoleConfigured } from "@/lib/env.server";

export type ApiErrorBody = { error: { code: string; message: string } };

export function apiError(status: number, code: string, message: string) {
  return NextResponse.json<ApiErrorBody>({ error: { code, message } }, { status });
}

/**
 * Authenticates an API request. Returns the user, or a ready-to-return error
 * response when unauthenticated or when the backend isn't configured.
 */
export async function authenticate(): Promise<{ user: SessionUser } | { response: NextResponse }> {
  if (!isSupabaseConfigured() || !isServiceRoleConfigured()) {
    return {
      response: apiError(503, "not_configured", "Supabase is not configured on this server."),
    };
  }
  const user = await getCurrentUser();
  if (!user) return { response: apiError(401, "unauthorized", "Please sign in to continue.") };
  return { user };
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
