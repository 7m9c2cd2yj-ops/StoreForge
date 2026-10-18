import { apiError, authenticate, withBackendErrors } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";
import { getEntitlements } from "@/lib/billing/entitlements";
import { parseProductSeo, parseStoredChecklist, parseStoredContent } from "@/lib/blueprint";
import { blueprintToMarkdown, productsToCsv, type ExportProduct } from "@/lib/export/blueprint-export";
import { slugify } from "@/lib/export/csv";
import { getPublisher } from "@/lib/shopify";

const FORMATS = ["csv", "shopify", "markdown", "json"] as const;
type Format = (typeof FORMATS)[number];

async function handleGET(request: Request, ctx: RouteContext<"/api/projects/[id]/export">) {
  const auth = await authenticate();
  if ("response" in auth) return auth.response;

  const { id } = await ctx.params;
  const format = new URL(request.url).searchParams.get("format") as Format | null;
  if (!format || !FORMATS.includes(format)) {
    return apiError(400, "invalid_format", "Unknown export format.");
  }

  const { plan } = await getEntitlements(auth.user.id);
  if (!plan.features.export) {
    return apiError(403, "upgrade_required", "Exports are available on the Pro and Business plans.");
  }
  if (format === "json" && !plan.features.jsonExport) {
    return apiError(403, "upgrade_required", "JSON blueprint export is available on the Business plan.");
  }

  // RLS restricts both queries to the signed-in user's rows.
  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id, store_name, content, checklist, status")
    .eq("id", id)
    .maybeSingle();
  if (!project) return apiError(404, "not_found", "Project not found.");

  const content = parseStoredContent(project.content);
  if (project.status !== "ready" || !content) {
    return apiError(409, "not_ready", "This project has no generated content to export yet.");
  }

  const { data: rows, error } = await supabase
    .from("products")
    .select("title, description, price, category, seo")
    .eq("project_id", id)
    .order("position", { ascending: true });
  if (error) return apiError(500, "server_error", "Could not load products.");

  const products: ExportProduct[] = (rows ?? []).map((p) => ({
    title: p.title,
    description: p.description,
    price: Number(p.price),
    category: p.category,
    seo: parseProductSeo(p.seo),
  }));
  const checklist = parseStoredChecklist(project.checklist);
  const base = slugify(project.store_name);

  let filename: string;
  let contentType: string;
  let body: string;

  switch (format) {
    case "csv":
      filename = `${base}-products.csv`;
      contentType = "text/csv; charset=utf-8";
      body = productsToCsv(products);
      break;
    case "shopify": {
      const result = await getPublisher().publishProducts({ storeName: content.store_name, products });
      if (result.kind !== "file") return apiError(500, "server_error", "Unexpected publisher result.");
      filename = `${base}-${result.filename}`;
      contentType = result.contentType;
      body = result.body;
      break;
    }
    case "markdown":
      filename = `${base}-blueprint.md`;
      contentType = "text/markdown; charset=utf-8";
      body = blueprintToMarkdown(content, products, checklist);
      break;
    case "json":
      filename = `${base}-blueprint.json`;
      contentType = "application/json; charset=utf-8";
      body = JSON.stringify({ format: "storeforge-blueprint", version: 1, content, products, checklist }, null, 2);
      break;
  }

  return new Response(body, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

export const GET = withBackendErrors(handleGET);
