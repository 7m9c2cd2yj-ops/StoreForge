import type { Metadata } from "next";
import { StoreWizard } from "@/components/dashboard/store-wizard";
import { requireUser } from "@/lib/auth";
import { getAccount, listProjects } from "@/lib/data";
import { isAIConfigured } from "@/lib/env.server";
import { createClient } from "@/lib/supabase/server";
import { storeInputSchema } from "@/lib/validation/store-input";

export const metadata: Metadata = { title: "Create a new store" };

export default async function NewStorePage({ searchParams }: PageProps<"/dashboard/new">) {
  const user = await requireUser("/dashboard/new");
  const [{ entitlements, usage }, projects, { retry }] = await Promise.all([
    getAccount(user.id),
    listProjects(),
    searchParams,
  ]);

  // Optional: retry a failed project with its saved input.
  let retryData: { projectId: string; input: Record<string, string> } | undefined;
  if (typeof retry === "string") {
    const supabase = await createClient();
    const { data } = await supabase.from("projects").select("id, input").eq("id", retry).maybeSingle();
    const parsed = storeInputSchema.safeParse(data?.input);
    if (data && parsed.success) {
      retryData = {
        projectId: data.id,
        input: Object.fromEntries(
          Object.entries(parsed.data).map(([k, v]) => [k, v === undefined ? "" : String(v)]),
        ),
      };
    }
  }

  return (
    <div>
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {retryData ? "Regenerate your store" : "Create a new store"}
        </h1>
        <p className="mt-1 text-fg-muted">
          Answer as much or as little as you like. Only the business idea is required.
        </p>
      </div>
      <div className="mt-8">
        <StoreWizard
          aiConfigured={isAIConfigured()}
          generationsRemaining={usage.storeGenerations.remaining}
          maxProducts={entitlements.plan.limits.productsPerGeneration}
          planName={entitlements.plan.name}
          atProjectLimit={projects.length >= entitlements.plan.limits.projects}
          retry={retryData}
        />
      </div>
    </div>
  );
}
