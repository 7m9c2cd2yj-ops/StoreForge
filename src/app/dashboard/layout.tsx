import type { Metadata } from "next";
import { AppShell } from "@/components/dashboard/app-shell";
import { SetupRequired } from "@/components/dashboard/setup-required";
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
  const { entitlements, usage } = await getAccount(user.id);

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
