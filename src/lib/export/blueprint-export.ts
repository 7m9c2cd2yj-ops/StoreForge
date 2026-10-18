import type { ChecklistItem, ProductSeo, StoreContent } from "@/lib/blueprint";
import { slugify, toCsv } from "@/lib/export/csv";

export type ExportProduct = {
  title: string;
  description: string;
  price: number;
  category: string;
  seo: ProductSeo;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function toParagraphHtml(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

/** Simple, spreadsheet-friendly product export. */
export function productsToCsv(products: ExportProduct[]): string {
  return toCsv(
    ["Title", "Description", "Price", "Category", "SEO title", "SEO description"],
    products.map((p) => [p.title, p.description, p.price.toFixed(2), p.category, p.seo.title, p.seo.description]),
  );
}

/**
 * Product CSV in Shopify's product import format (one row per product, single
 * default variant). Products are imported as drafts so nothing goes live
 * before the merchant adds images and reviews it.
 */
export function productsToShopifyCsv(products: ExportProduct[], vendor: string): string {
  const headers = [
    "Handle",
    "Title",
    "Body (HTML)",
    "Vendor",
    "Type",
    "Tags",
    "Published",
    "Option1 Name",
    "Option1 Value",
    "Variant Price",
    "Variant Inventory Policy",
    "Variant Fulfillment Service",
    "Variant Requires Shipping",
    "Variant Taxable",
    "SEO Title",
    "SEO Description",
    "Status",
  ];

  const usedHandles = new Map<string, number>();
  const rows = products.map((p) => {
    const base = slugify(p.title);
    const count = usedHandles.get(base) ?? 0;
    usedHandles.set(base, count + 1);
    const handle = count === 0 ? base : `${base}-${count + 1}`;
    return [
      handle,
      p.title,
      toParagraphHtml(p.description),
      vendor,
      p.category,
      p.category,
      "FALSE",
      "Title",
      "Default Title",
      p.price.toFixed(2),
      "deny",
      "manual",
      "TRUE",
      "TRUE",
      p.seo.title,
      p.seo.description,
      "draft",
    ];
  });

  return toCsv(headers, rows);
}

/** Full blueprint as a readable Markdown document. */
export function blueprintToMarkdown(
  content: StoreContent,
  products: ExportProduct[],
  checklist: ChecklistItem[],
): string {
  const lines: string[] = [];
  const h = (level: number, text: string) => lines.push(`${"#".repeat(level)} ${text}`, "");
  const p = (text: string) => text && lines.push(text, "");
  const ul = (items: string[]) => items.length && lines.push(...items.map((i) => `- ${i}`), "");

  h(1, `${content.store_name} — Store Blueprint`);
  p(`_${content.tagline}_`);
  p("Generated with StoreForge AI. Review all content, prices and claims before publishing.");

  h(2, "Brand");
  h(3, "Brand story");
  p(content.brand_story);
  h(3, "Alternative names");
  ul(content.alternative_names.map((n) => `**${n.name}** — ${n.rationale}`));
  h(3, "Target audience");
  p(content.target_audience.summary);
  ul(content.target_audience.segments);
  h(3, "Positioning");
  p(content.positioning.statement);
  p(`Price positioning: ${content.positioning.price_positioning}`);
  ul(content.positioning.differentiators);
  h(3, "Colors");
  ul(content.brand_colors.map((c) => `${c.name} \`${c.hex}\` — ${c.usage}`));
  h(3, "Typography");
  p(`Headings: ${content.typography.heading_font} · Body: ${content.typography.body_font}`);
  p(content.typography.rationale);

  h(2, "Products");
  for (const product of products) {
    h(3, `${product.title} — ${product.price.toFixed(2)} ${content.currency}`);
    if (product.category) p(`Category: ${product.category}`);
    p(product.description);
    if (product.seo.title || product.seo.description) {
      p(`SEO: ${product.seo.title}${product.seo.description ? ` — ${product.seo.description}` : ""}`);
    }
  }
  if (content.product_ideas.length) {
    h(3, "More product ideas");
    ul(content.product_ideas.map((i) => `**${i.name}** — ${i.rationale}`));
  }

  const hp = content.homepage;
  h(2, "Homepage");
  h(3, "Hero");
  p(`**${hp.hero_headline}**`);
  p(hp.hero_subheadline);
  p(`Button: ${hp.hero_cta}`);
  h(3, hp.featured_heading || "Featured products");
  p(hp.featured_subheading);
  h(3, "Benefits");
  ul(hp.benefits.map((b) => `**${b.title}** — ${b.description}`));
  h(3, hp.story_heading || "Our story");
  p(hp.story_body);
  h(3, "Testimonials");
  p("_Placeholder — add real customer reviews after launch. Do not publish invented testimonials._");
  h(3, hp.newsletter_heading || "Newsletter");
  p(hp.newsletter_body);
  h(3, "Footer");
  p(hp.footer_tagline);

  h(2, content.about_page.heading || "About");
  p(content.about_page.body);

  h(2, hp.faq_heading || "FAQ");
  for (const item of content.faq) {
    p(`**${item.question}**`);
    p(item.answer);
  }

  h(2, "SEO");
  p(`Title: ${content.seo.title}`);
  p(`Meta description: ${content.seo.meta_description}`);
  p(`Keywords: ${content.seo.keywords.join(", ")}`);

  h(2, "Shopify theme recommendations");
  p(content.theme.style);
  ul(content.theme.characteristics);
  h(3, "Recommended sections");
  ul(content.theme.recommended_sections);

  h(2, "Launch checklist");
  ul(checklist.map((c) => `[${c.done ? "x" : " "}] **${c.title}** — ${c.description}`));

  return lines.join("\n");
}
