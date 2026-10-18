import "server-only";
import { NextResponse } from "next/server";
import { getCurrentUser, type SessionUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { isServiceRoleConfigured } from "@/lib/env.server";
import { BACKEND_ISSUE_COPY, BackendError } from "@/lib/backend-errors";

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

/**
 * Wraps a route handler so database setup problems become a clear 503 JSON
 * error (e.g. "Your database isn't set up yet") instead of an opaque 500.
 */
export function withBackendErrors<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>,
): (...args: Args) => Promise<Response> {
  return async (...args: Args) => {
    try {
      return await handler(...args);
    } catch (error) {
      if (error instanceof BackendError) {
        const copy = BACKEND_ISSUE_COPY[error.issue];
        return apiError(503, `backend_${error.issue}`, `${copy.title}. ${copy.summary}`);
      }
      throw error;
    }
  };
}
