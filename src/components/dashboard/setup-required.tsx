import { Settings2 } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { supabaseConfigProblem } from "@/lib/env";

const VARS = [
  { name: "NEXT_PUBLIC_SUPABASE_URL", desc: "Your Supabase project URL" },
  { name: "NEXT_PUBLIC_SUPABASE_ANON_KEY", desc: "Public anon key (safe for the browser; access is enforced by RLS)" },
  { name: "SUPABASE_SERVICE_ROLE_KEY", desc: "Secret, server-only. Used for subscriptions, usage and rate limits" },
];

/** Shown instead of the dashboard when required backend configuration is missing. */
export function SetupRequired() {
  const problem = supabaseConfigProblem() ?? "SUPABASE_SERVICE_ROLE_KEY is not set.";
  return (
    <div className="flex min-h-dvh flex-col bg-page-glow">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center px-4 sm:px-6">
        <Logo />
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
          <div className="flex size-11 items-center justify-center rounded-xl bg-accent-soft text-accent-text">
            <Settings2 className="size-5" aria-hidden />
          </div>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">Finish setting up StoreForge</h1>
          <p className="mt-2 text-fg-muted">
            The dashboard needs a Supabase project for authentication and data storage. Add these environment
            variables, apply the database migration, and restart the server:
          </p>
          <p className="mt-4 rounded-xl border border-amber-400/25 bg-amber-400/[0.07] px-4 py-3 text-sm text-amber-100" role="alert">
            {problem}
          </p>
          <ul className="mt-6 space-y-3">
            {VARS.map((v) => (
              <li key={v.name} className="rounded-xl border border-border bg-surface-2 px-4 py-3">
                <code className="font-mono text-sm break-all text-accent-text">{v.name}</code>
                <p className="mt-1 text-sm text-fg-muted">{v.desc}</p>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-fg-subtle">See README.md → “Setup” for step-by-step instructions.</p>
        </div>
      </main>
    </div>
  );
}
