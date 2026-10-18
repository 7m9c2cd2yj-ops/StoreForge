import Link from "next/link";
import { CreditCard, FolderKanban, Plus, Sparkles, Wand2, Zap, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, EmptyState } from "@/components/ui/misc";
import { ProjectCard } from "@/components/dashboard/project-card";
import { StatCard } from "@/components/dashboard/stat-card";
import { requireUser } from "@/lib/auth";
import { getAccount, listProjects } from "@/lib/data";
import { displayStatus } from "@/lib/projects";
import { formatDate } from "@/lib/utils";

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const user = await requireUser("/dashboard");
  const [{ entitlements, usage, displayName }, projects, params] = await Promise.all([
    getAccount(user.id),
    listProjects(),
    searchParams,
  ]);
  const { plan } = entitlements;
  const atProjectLimit = projects.length >= plan.limits.projects;
  const firstName = displayName?.split(" ")[0];

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Welcome{firstName ? `, ${firstName}` : " back"}
          </h1>
          <p className="mt-1 text-fg-muted">Here&apos;s what&apos;s happening with your stores.</p>
        </div>
        <Button asChild size="lg" variant={atProjectLimit ? "secondary" : "primary"}>
          <Link href={atProjectLimit ? "/dashboard/billing" : "/dashboard/new"}>
            <Plus /> {atProjectLimit ? "Project limit reached: upgrade" : "Create New Store"}
          </Link>
        </Button>
      </div>

      {params.password === "updated" && <Alert variant="success">Your password has been updated.</Alert>}
      {entitlements.paymentIssue && (
        <Alert variant="warning" title="There's a problem with your payment">
          Please update your payment method to keep your {plan.name} features.{" "}
          <Link href="/dashboard/billing" className="underline">Go to billing</Link>
        </Alert>
      )}

      <section aria-label="Account summary" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Projects"
          icon={<FolderKanban />}
          value={`${projects.length} / ${plan.limits.projects}`}
          progress={(projects.length / Math.max(1, plan.limits.projects)) * 100}
          detail={atProjectLimit ? "Project limit reached" : "Saved store projects"}
        />
        <StatCard
          label="Store generations"
          icon={<Zap />}
          value={`${usage.storeGenerations.remaining} left`}
          progress={(usage.storeGenerations.used / Math.max(1, usage.storeGenerations.limit)) * 100}
          detail={`${usage.storeGenerations.used} of ${usage.storeGenerations.limit} used · resets ${formatDate(usage.periodEnd)}`}
        />
        <StatCard
          label="AI tool runs"
          icon={<Wand2 />}
          value={`${usage.aiToolRuns.remaining} left`}
          progress={(usage.aiToolRuns.used / Math.max(1, usage.aiToolRuns.limit)) * 100}
          detail={`${usage.aiToolRuns.used} of ${usage.aiToolRuns.limit} used this month`}
        />
        <StatCard
          label="Subscription"
          icon={<CreditCard />}
          value={plan.name}
          detail={
            entitlements.cancelAtPeriodEnd && entitlements.currentPeriodEnd
              ? `Cancels on ${formatDate(entitlements.currentPeriodEnd)}`
              : plan.id === "free"
                ? "Upgrade for more generations and exports"
                : `Status: ${entitlements.status}`
          }
        />
      </section>

      <section aria-labelledby="quick-actions">
        <h2 id="quick-actions" className="text-lg font-semibold">Quick actions</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <QuickAction href="/dashboard/new" icon={<Sparkles />} title="Generate a store" body="Describe an idea, get a full concept." />
          <QuickAction href="/dashboard/tools" icon={<Wand2 />} title="Use an AI tool" body="Names, descriptions, SEO and more." />
          <QuickAction
            href={plan.features.export ? (projects[0] ? `/dashboard/projects/${projects[0].id}?tab=export` : "/dashboard/new") : "/dashboard/billing"}
            icon={<FileDown />}
            title="Export a blueprint"
            body={plan.features.export ? "Shopify CSV and Markdown." : "Available on Pro and Business."}
          />
        </div>
      </section>

      <section aria-labelledby="recent-projects">
        <div className="flex items-center justify-between">
          <h2 id="recent-projects" className="text-lg font-semibold">Recent projects</h2>
          {atProjectLimit && plan.id !== "business" && (
            <Link href="/dashboard/billing" className="text-sm text-accent-text hover:underline">
              Need more projects? Upgrade
            </Link>
          )}
        </div>
        {projects.length === 0 ? (
          <EmptyState
            className="mt-4"
            icon={<Sparkles />}
            title="Create your first store"
            description="Describe your business idea and StoreForge will draft your brand, products, homepage and launch plan."
            action={
              <Button asChild>
                <Link href="/dashboard/new">
                  <Plus /> Create New Store
                </Link>
              </Button>
            }
          />
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <ProjectCard
                key={p.id}
                project={{
                  id: p.id,
                  storeName: p.store_name,
                  niche: p.niche,
                  createdAt: p.created_at,
                  status: displayStatus(p.status, p.updated_at),
                }}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function QuickAction({ href, icon, title, body }: { href: string; icon: React.ReactNode; title: string; body: string }) {
  return (
    <Link
      href={href}
      className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-border-strong hover:bg-surface-2"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-text [&_svg]:size-4">
        {icon}
      </span>
      <span>
        <span className="block text-sm font-medium">{title}</span>
        <span className="mt-0.5 block text-sm text-fg-muted">{body}</span>
      </span>
    </Link>
  );
}
