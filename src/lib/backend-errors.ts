/**
 * Classifies database failures into problems an operator can act on, so a
 * misconfigured deployment shows "run the migration" instead of a bare 500.
 */

export type BackendIssue =
  | "missing_schema"
  | "invalid_service_key"
  | "service_key_not_privileged"
  | "unreachable"
  | "unknown";

type PostgrestLikeError = { code?: string | null; message?: string | null; details?: string | null; hint?: string | null };

export class BackendError extends Error {
  readonly issue: BackendIssue;

  constructor(issue: BackendIssue, context: string, cause?: unknown) {
    super(`${context}: ${issue}`, { cause });
    this.name = "BackendError";
    this.issue = issue;
  }
}

export function classifyDbError(error: PostgrestLikeError | null | undefined): BackendIssue {
  if (!error) return "unknown";
  const code = error.code ?? "";
  const text = `${error.message ?? ""} ${error.details ?? ""} ${error.hint ?? ""}`;

  // Table / function / column not found: the migration hasn't been applied (fully).
  if (["PGRST205", "PGRST202", "PGRST204", "42P01", "42883", "42703", "3F000"].includes(code)) return "missing_schema";
  if (/schema cache|does not exist/i.test(text)) return "missing_schema";

  // The API gateway rejected the key, or the JWT is invalid/expired.
  if (["PGRST301", "PGRST302", "PGRST300"].includes(code)) return "invalid_service_key";
  if (/invalid api key|no api key|jwt|invalid signature|unauthorized/i.test(text)) return "invalid_service_key";

  // Privileges revoked for anon/authenticated: the "service role" key is really the public key.
  if (code === "42501" || /permission denied/i.test(text)) return "service_key_not_privileged";

  if (/fetch failed|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|network|timed out|socket/i.test(text)) return "unreachable";
  return "unknown";
}

/** Throws a classified BackendError for a failed Supabase query. */
export function throwDbError(context: string, error: PostgrestLikeError): never {
  const issue = classifyDbError(error);
  console.error(`[db] ${context} failed (${issue})`, error.code ?? "", error.message ?? "");
  throw new BackendError(issue, context, error);
}

export function backendIssueOf(error: unknown): BackendIssue | null {
  return error instanceof BackendError ? error.issue : null;
}

export const BACKEND_ISSUE_COPY: Record<BackendIssue, { title: string; summary: string; steps: string[] }> = {
  missing_schema: {
    title: "Your database isn't set up yet",
    summary:
      "Supabase is connected, but the StoreForge tables don't exist (or only partly exist). The database migration needs to be run once.",
    steps: [
      "Open your project at supabase.com and go to SQL Editor → New query.",
      "Paste the full database setup SQL (use the Copy button below) and press Run.",
      "You should see “Success. No rows returned”. The script is safe to run again.",
      "Come back and reload this page.",
    ],
  },
  invalid_service_key: {
    title: "Supabase rejected the server key",
    summary: "SUPABASE_SERVICE_ROLE_KEY in your hosting settings is missing characters, expired or from a different project.",
    steps: [
      "In Supabase, open Project Settings → API Keys and copy the service_role (secret) key of this project.",
      "In Vercel, open Settings → Environment Variables and replace SUPABASE_SERVICE_ROLE_KEY with it.",
      "Redeploy (Deployments → ⋯ → Redeploy), then reload this page.",
    ],
  },
  service_key_not_privileged: {
    title: "The server key is the public key",
    summary:
      "SUPABASE_SERVICE_ROLE_KEY seems to contain the public anon/publishable key, which isn't allowed to manage subscriptions and credits.",
    steps: [
      "In Supabase, open Project Settings → API Keys and copy the service_role (secret) key, not the anon/publishable one.",
      "In Vercel, set SUPABASE_SERVICE_ROLE_KEY to that value.",
      "Redeploy, then reload this page.",
    ],
  },
  unreachable: {
    title: "The server can't reach Supabase",
    summary:
      "The request to your Supabase project failed. Free Supabase projects are paused after a period of inactivity.",
    steps: [
      "Open supabase.com and check whether your project is paused; if so, click Restore project.",
      "Check that NEXT_PUBLIC_SUPABASE_URL in Vercel matches your project URL (Project Settings → API).",
      "Reload this page in a minute.",
    ],
  },
  unknown: {
    title: "The database returned an unexpected error",
    summary: "StoreForge couldn't load your account data.",
    steps: [
      "Open /api/health on this site to see which part of the setup is failing.",
      "Check the Logs tab of your latest Vercel deployment for lines starting with [db].",
    ],
  },
};
