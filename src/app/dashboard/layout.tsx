import type { Metadata } from "next";
import { AppShell } from "@/components/dashboard/app-shell";
import { SetupRequired } from "@/components/dashboard/setup-required";
import { BackendProblem } from "@/components/dashboard/backend-problem";
import { backendIssueOf } from "@/lib/backend-errors";
import { requireUser } from "@/lib/auth";
import { getAccount } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/env";
import { isServiceRoleConfigured } from "@/lib/env.server";

// Per-user, session-dependent content: never prerender.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false } };

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  if (!isSupabaseConfigured() || !isServiceRoleConfigured()) return <SetupRequired />;

  const user = await requireUser("/dashboard");

  // Errors thrown in this layout bypass dashboard/error.tsx (an error boundary
  // never wraps the layout of its own segment), so database setup problems
  // are handled here and shown with the exact fix instead of a generic 500.
  let account: Awaited<ReturnType<typeof getAccount>>;
  try {
    account = await getAccount(user.id);
  } catch (error) {
    const issue = backendIssueOf(error);
    if (!issue) throw error;
    return <BackendProblem issue={issue} />;
  }
  const { entitlements, usage } = account;

  return (
    <AppShell
      email={user.email}
      planName={entitlements.plan.name}
      generationsRemaining={usage.storeGenerations.remaining}
    >
      {children}
    </AppShell>
  );
}
