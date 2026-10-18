import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/misc";
import { GenerationPoller } from "@/components/dashboard/generation-poller";
import { Workspace } from "@/components/workspace/workspace";
import { requireUser } from "@/lib/auth";
import { getAccount } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { parseProductSeo, parseStoredChecklist, parseStoredContent } from "@/lib/blueprint";
import { displayStatus } from "@/lib/projects";
import type { ProductRow } from "@/lib/actions/projects";

export const metadata: Metadata = { title: "Store workspace" };

export default async function ProjectPage({ params }: PageProps<"/dashboard/projects/[id]">) {
  const { id } = await params;
  const user = await requireUser(`/dashboard/projects/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  // RLS guarantees only the owner's project and products are returned.
  const supabase = await createClient();
  const [{ data: project }, { data: productRows }, { entitlements }] = await Promise.all([
    supabase.from("projects").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("products")
      .select("id, title, description, price, category, seo, position")
      .eq("project_id", id)
      .order("position", { ascending: true }),
    getAccount(user.id),
  ]);
  if (!project) notFound();

  const status = displayStatus(project.status, project.updated_at);
  const content = parseStoredContent(project.content);

  const back = (
    <Button asChild variant="ghost" size="sm" className="-ml-2">
      <Link href="/dashboard">
        <ArrowLeft /> Dashboard
      </Link>
    </Button>
  );

  if (status === "generating") {
    return (
      <div>
        {back}
        <GenerationPoller />
        <div className="mx-auto max-w-md py-20 text-center" role="status">
          <Spinner className="mx-auto size-8 text-accent-text" />
          <h1 className="mt-6 text-xl font-semibold">Generating {project.store_name}…</h1>
          <p className="mt-2 text-sm text-fg-muted">
            This page refreshes automatically. Generations usually take one to three minutes.
          </p>
        </div>
      </div>
    );
  }

  if (status === "failed" || !content) {
    return (
      <div>
        {back}
        <div className="mx-auto max-w-md py-16 text-center">
          <AlertTriangle className="mx-auto size-8 text-warning" aria-hidden />
          <h1 className="mt-4 text-xl font-semibold">This store wasn&apos;t generated</h1>
          <p className="mt-2 text-sm text-fg-muted">
            {project.error_message ??
              "The generation was interrupted before it finished. Any credit used for a failed generation is refunded."}
          </p>
          <Button asChild className="mt-6">
            <Link href={`/dashboard/new?retry=${project.id}`}>
              <RotateCcw /> Review and try again
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const products: ProductRow[] = (productRows ?? []).map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description,
    price: Number(p.price),
    category: p.category,
    seo: parseProductSeo(p.seo),
    position: p.position,
  }));

  return (
    <div>
      {back}
      <div className="mt-4">
        <Workspace
          projectId={project.id}
          initialContent={content}
          initialProducts={products}
          initialChecklist={parseStoredChecklist(project.checklist)}
          exportAccess={{
            export: entitlements.plan.features.export,
            jsonExport: entitlements.plan.features.jsonExport,
            planName: entitlements.plan.name,
          }}
        />
      </div>
    </div>
  );
}
