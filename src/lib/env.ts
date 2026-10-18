/**
 * Centralised environment access.
 *
 * Public values (NEXT_PUBLIC_*) are inlined into the browser bundle by Next.js.
 * Everything else must only be read from server code — see `serverEnv` in
 * `env.server.ts`, which is guarded with `server-only`.
 *
 * Values are normalised because dashboard copy-paste mistakes (missing
 * `https://`, surrounding quotes, a trailing `/rest/v1`) are common, and a
 * malformed URL must never crash the whole site.
 */

/** Trims whitespace and one pair of surrounding quotes. */
export function cleanEnvValue(value: string | undefined): string {
  return (value ?? "").trim().replace(/^(["'])(.*)\1$/, "$2").trim();
}

/**
 * Normalises a base URL: adds a missing `https://`, drops trailing slashes and
 * any path. Returns null when the value still isn't a valid http(s) URL.
 */
export function normalizeBaseUrl(value: string | undefined): string | null {
  const cleaned = cleanEnvValue(value);
  if (!cleaned) return null;
  const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(cleaned) ? cleaned : `https://${cleaned}`;
  try {
    const url = new URL(withProtocol);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (!url.hostname.includes(".") && url.hostname !== "localhost") return null;
    return url.origin;
  } catch {
    return null;
  }
}

const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const rawAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const rawAppUrl = process.env.NEXT_PUBLIC_APP_URL;
const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;

export const publicEnv = {
  supabaseUrl: normalizeBaseUrl(rawSupabaseUrl) ?? "",
  supabaseAnonKey: cleanEnvValue(rawAnonKey),
  appUrl: normalizeBaseUrl(rawAppUrl) ?? normalizeBaseUrl(vercelUrl) ?? "http://localhost:3000",
};

export function isSupabaseConfigured(): boolean {
  return Boolean(publicEnv.supabaseUrl && publicEnv.supabaseAnonKey);
}

/** Human-readable reason Supabase isn't usable, or null when it is. */
export function supabaseConfigProblem(): string | null {
  if (!cleanEnvValue(rawSupabaseUrl)) return "NEXT_PUBLIC_SUPABASE_URL is not set.";
  if (!publicEnv.supabaseUrl) {
    return "NEXT_PUBLIC_SUPABASE_URL is not a valid URL. It should look like https://abcdefgh.supabase.co";
  }
  if (!publicEnv.supabaseAnonKey) return "NEXT_PUBLIC_SUPABASE_ANON_KEY is not set.";
  return null;
}
