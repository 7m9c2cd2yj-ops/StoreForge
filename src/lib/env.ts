/**
 * Centralised environment access.
 *
 * Public values (NEXT_PUBLIC_*) are inlined into the browser bundle by Next.js.
 * Everything else must only be read from server code — see `serverEnv` in
 * `env.server.ts`, which is guarded with `server-only`.
 */

export const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  appUrl: (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, ""),
};

export function isSupabaseConfigured(): boolean {
  return Boolean(publicEnv.supabaseUrl && publicEnv.supabaseAnonKey);
}
