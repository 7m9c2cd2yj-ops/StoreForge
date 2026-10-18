import { DatabaseZap } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { CopySetupSql } from "@/components/dashboard/copy-setup-sql";
import { BACKEND_ISSUE_COPY, type BackendIssue } from "@/lib/backend-errors";

/** Shown instead of the dashboard when the database isn't usable, with the exact fix. */
export function BackendProblem({ issue }: { issue: BackendIssue }) {
  const copy = BACKEND_ISSUE_COPY[issue];
  return (
    <div className="flex min-h-dvh flex-col bg-page-glow">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center px-4 sm:px-6">
        <Logo />
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
        <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8" role="alert">
          <div className="flex size-11 items-center justify-center rounded-xl bg-amber-400/10 text-amber-300">
            <DatabaseZap className="size-5" aria-hidden />
          </div>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">{copy.title}</h1>
          <p className="mt-2 text-fg-muted">{copy.summary}</p>
          <ol className="mt-6 list-decimal space-y-3 pl-5 text-sm text-fg marker:text-fg-subtle">
            {copy.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          {issue === "missing_schema" && <CopySetupSql />}
          <p className="mt-6 text-xs text-fg-subtle">Problem code: {issue}. Your account is safe; nothing was lost.</p>
        </div>
      </main>
    </div>
  );
}
