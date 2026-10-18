import { z } from "zod";

/*
 * Store blueprint schemas.
 *
 * - `aiBlueprintSchema` is sent to the model as the structured-output format.
 *   It deliberately has no length/regex constraints (structured outputs only
 *   support a JSON Schema subset); limits are given in descriptions instead.
 * - `storeContentSchema` / `productInputSchema` are the strict app-side schemas.
 *   Every AI response and every user edit is validated (and clamped) with them
 *   before it is saved or displayed.
 */

// ---------------------------------------------------------------------------
// Strict app-side primitives
// ---------------------------------------------------------------------------

const HEX = /^#[0-9a-f]{6}$/;

/** Trims and clamps a string to `max` characters. */
const text = (max: number) => z.string().transform((s) => s.trim().slice(0, max));
/** Like `text`, but must be non-empty after trimming. */
const requiredText = (max: number) => text(max).pipe(z.string().min(1, "Required"));
/** Clamps an array to `max` items. */
const list = <T extends z.ZodType>(item: T, max: number) =>
  z.array(item).transform((items) => items.slice(0, max));

const colorSchema = z.object({
  name: text(60),
  hex: z.string().transform((s) => s.trim().toLowerCase()),
  usage: text(200),
});

/** ISO 4217 code; anything malformed falls back to USD. */
const currency = z
  .string()
  .optional()
  .transform((s) => {
    const code = (s ?? "").trim().toUpperCase();
    return /^[A-Z]{3}$/.test(code) ? code : "USD";
  });

export const storeContentSchema = z.object({
  store_name: requiredText(120),
  currency,
  alternative_names: list(z.object({ name: requiredText(120), rationale: text(400) }), 12),
  tagline: text(200),
  brand_story: text(5000),
  target_audience: z.object({
    summary: text(1000),
    segments: list(text(200), 8),
  }),
  brand_colors: z
    .array(colorSchema)
    .transform((colors) => colors.filter((c) => HEX.test(c.hex)).slice(0, 8)),
  typography: z.object({
    heading_font: text(80),
    body_font: text(80),
    rationale: text(500),
  }),
  positioning: z.object({
    statement: text(1000),
    price_positioning: text(200),
    differentiators: list(text(300), 8),
  }),
  product_categories: list(text(100), 15),
  product_ideas: list(z.object({ name: requiredText(150), rationale: text(600) }), 15),
  homepage: z.object({
    hero_headline: text(200),
    hero_subheadline: text(400),
    hero_cta: text(60),
    featured_heading: text(150),
    featured_subheading: text(300),
    benefits: list(z.object({ title: text(120), description: text(400) }), 8),
    story_heading: text(150),
    story_body: text(2000),
    faq_heading: text(150),
    newsletter_heading: text(150),
    newsletter_body: text(300),
    footer_tagline: text(300),
  }),
  about_page: z.object({ heading: text(150), body: text(6000) }),
  faq: list(z.object({ question: requiredText(300), answer: text(1500) }), 15),
  seo: z.object({
    title: text(120),
    meta_description: text(320),
    keywords: list(text(80), 20),
  }),
  theme: z.object({
    style: text(200),
    characteristics: list(text(200), 10),
    recommended_sections: list(text(150), 12),
  }),
});

export type StoreContent = z.output<typeof storeContentSchema>;

/** Editable sections of the store content (used by workspace saves). */
export const storeContentPatchSchema = storeContentSchema.partial();
export type StoreContentPatch = z.input<typeof storeContentPatchSchema>;

const price = z
  .number()
  .refine((n) => Number.isFinite(n), "Invalid price")
  .transform((n) => Math.min(9_999_999, Math.max(0, Math.round(n * 100) / 100)));

export const productSeoSchema = z.object({
  title: text(120).default(""),
  description: text(320).default(""),
});
export type ProductSeo = z.output<typeof productSeoSchema>;

export const productInputSchema = z.object({
  title: requiredText(200),
  description: text(5000).default(""),
  price: price.default(0),
  category: text(100).default(""),
  seo: productSeoSchema.default({ title: "", description: "" }),
});
export type ProductInput = z.output<typeof productInputSchema>;

// ---------------------------------------------------------------------------
// Launch checklist
// ---------------------------------------------------------------------------

export const checklistItemSchema = z.object({
  id: z.string().min(1).max(64),
  title: requiredText(200),
  description: text(600),
  category: text(60),
  done: z.boolean(),
});
export const checklistSchema = list(checklistItemSchema, 40);
export type ChecklistItem = z.output<typeof checklistItemSchema>;

/** Core launch steps every store needs; AI-suggested steps are appended. */
export const CORE_CHECKLIST: Omit<ChecklistItem, "done">[] = [
  { id: "domain", title: "Choose a domain", category: "Setup", description: "Pick a short, memorable domain that matches your store name and connect it in Shopify (Settings → Domains)." },
  { id: "shopify", title: "Create or connect your Shopify store", category: "Setup", description: "Create a Shopify account (or use your existing one), pick a plan, and select a theme that matches the recommendations in this blueprint." },
  { id: "products", title: "Import products and add product images", category: "Catalog", description: "Import the product CSV, then add your own high-quality photos for every product. Never use images you don't have the rights to." },
  { id: "shipping", title: "Configure shipping", category: "Operations", description: "Set shipping zones, rates and delivery times for every market you sell to." },
  { id: "payments", title: "Configure payment providers", category: "Operations", description: "Activate Shopify Payments or another provider, and verify payouts, currencies and taxes." },
  { id: "policies", title: "Review legal policies", category: "Legal", description: "Create and review refund, privacy, terms of service and shipping policies. Have them checked for your jurisdiction." },
  { id: "checkout", title: "Test the checkout", category: "Launch", description: "Place test orders (Shopify's test mode or Bogus Gateway) on desktop and mobile, including refunds." },
  { id: "publish", title: "Publish the store", category: "Launch", description: "Remove the storefront password, double-check SEO settings, and announce your launch." },
];

export function buildChecklist(aiItems: { title: string; description: string; category: string }[]): ChecklistItem[] {
  const core = CORE_CHECKLIST.map((item) => ({ ...item, done: false }));
  const coreTitles = new Set(core.map((c) => c.title.toLowerCase()));
  const extra = aiItems
    .filter((item) => item.title.trim() && !coreTitles.has(item.title.trim().toLowerCase()))
    .slice(0, 10)
    .map((item, index) => ({
      id: `ai-${index + 1}`,
      title: item.title.trim().slice(0, 200),
      description: item.description.trim().slice(0, 600),
      category: item.category.trim().slice(0, 60) || "Launch",
      done: false,
    }));
  return [...core, ...extra];
}

// ---------------------------------------------------------------------------
// AI structured-output schema (no constraints; see note at top)
// ---------------------------------------------------------------------------

export const aiBlueprintSchema = z.object({
  store_name: z.string().describe("Primary store/brand name, max 40 characters"),
  currency: z.string().describe("ISO 4217 currency code used for all prices, e.g. EUR, USD, SEK"),
  alternative_names: z
    .array(z.object({ name: z.string(), rationale: z.string() }))
    .describe("Alternative brand names with a one-sentence rationale each"),
  tagline: z.string().describe("Short memorable tagline, max 80 characters"),
  brand_story: z.string().describe("Brand story, 2-4 short paragraphs"),
  target_audience: z.object({
    summary: z.string(),
    segments: z.array(z.string()).describe("2-4 audience segments"),
  }),
  brand_colors: z
    .array(z.object({ name: z.string(), hex: z.string().describe("6-digit hex, e.g. #1f2937"), usage: z.string() }))
    .describe("4-6 brand colors"),
  typography: z.object({
    heading_font: z.string().describe("A widely available font, e.g. from Google Fonts"),
    body_font: z.string(),
    rationale: z.string(),
  }),
  positioning: z.object({
    statement: z.string(),
    price_positioning: z.string(),
    differentiators: z.array(z.string()).describe("3-5 differentiators"),
  }),
  product_categories: z.array(z.string()).describe("Collection/category names used by the products"),
  product_ideas: z
    .array(z.object({ name: z.string(), rationale: z.string() }))
    .describe("Further product concepts the store could add later"),
  products: z
    .array(
      z.object({
        title: z.string(),
        description: z.string().describe("Persuasive product description, 60-150 words"),
        suggested_price: z.number().describe("Suggested retail price in the store currency"),
        category: z.string().describe("One of product_categories"),
        seo_title: z.string().describe("Max 60 characters"),
        seo_description: z.string().describe("Max 155 characters"),
      }),
    )
    .describe("Launch products"),
  homepage: z.object({
    hero_headline: z.string(),
    hero_subheadline: z.string(),
    hero_cta: z.string().describe("Button label, 2-4 words"),
    featured_heading: z.string(),
    featured_subheading: z.string(),
    benefits: z.array(z.object({ title: z.string(), description: z.string() })).describe("3-4 benefits"),
    story_heading: z.string(),
    story_body: z.string(),
    faq_heading: z.string(),
    newsletter_heading: z.string(),
    newsletter_body: z.string(),
    footer_tagline: z.string(),
  }),
  about_page: z.object({ heading: z.string(), body: z.string().describe("About page copy, 3-5 paragraphs") }),
  faq: z.array(z.object({ question: z.string(), answer: z.string() })).describe("5-8 FAQs"),
  seo: z.object({
    title: z.string().describe("Homepage SEO title, max 60 characters"),
    meta_description: z.string().describe("Max 155 characters"),
    keywords: z.array(z.string()).describe("8-12 keywords"),
  }),
  theme: z.object({
    style: z.string().describe("Recommended Shopify theme style"),
    characteristics: z.array(z.string()),
    recommended_sections: z.array(z.string()),
  }),
  launch_checklist: z
    .array(z.object({ title: z.string(), description: z.string(), category: z.string() }))
    .describe("Store-specific launch steps beyond the basics (domain, shipping, payments, policies, checkout test)"),
});

export type AIBlueprint = z.infer<typeof aiBlueprintSchema>;

const aiProductsSchema = z.array(
  z.object({
    title: z.string(),
    description: z.string(),
    suggested_price: z.number(),
    category: z.string(),
    seo_title: z.string(),
    seo_description: z.string(),
  }),
);

export type NormalizedBlueprint = {
  content: StoreContent;
  products: ProductInput[];
  checklist: ChecklistItem[];
};

export type NormalizeResult =
  | { ok: true; value: NormalizedBlueprint }
  | { ok: false; error: string };

/**
 * Validates a raw model response and converts it into storable data.
 * Rejects responses that are structurally wrong or have no usable products.
 */
export function normalizeBlueprint(
  raw: unknown,
  opts: { maxProducts: number; maxAlternativeNames: number },
): NormalizeResult {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, error: "Response was not an object" };
  }
  const record = raw as Record<string, unknown>;

  const content = storeContentSchema.safeParse(record);
  if (!content.success) {
    return { ok: false, error: `Invalid store content: ${content.error.issues[0]?.path.join(".")}` };
  }

  const rawProducts = aiProductsSchema.safeParse(record.products);
  if (!rawProducts.success) {
    return { ok: false, error: "Invalid products" };
  }

  const products: ProductInput[] = [];
  for (const p of rawProducts.data.slice(0, opts.maxProducts)) {
    const parsed = productInputSchema.safeParse({
      title: p.title,
      description: p.description,
      price: p.suggested_price,
      category: p.category,
      seo: { title: p.seo_title, description: p.seo_description },
    });
    if (parsed.success) products.push(parsed.data);
  }
  if (products.length === 0) {
    return { ok: false, error: "No valid products in response" };
  }

  const checklistRaw = z
    .array(z.object({ title: z.string(), description: z.string(), category: z.string() }))
    .safeParse(record.launch_checklist);

  return {
    ok: true,
    value: {
      content: {
        ...content.data,
        alternative_names: content.data.alternative_names.slice(0, opts.maxAlternativeNames),
      },
      products,
      checklist: buildChecklist(checklistRaw.success ? checklistRaw.data : []),
    },
  };
}

/** Safely reads stored content (may be null for failed/generating projects). */
export function parseStoredContent(value: unknown): StoreContent | null {
  const parsed = storeContentSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function parseStoredChecklist(value: unknown): ChecklistItem[] {
  const parsed = checklistSchema.safeParse(value);
  return parsed.success ? parsed.data : [];
}

export function parseProductSeo(value: unknown): ProductSeo {
  const parsed = productSeoSchema.safeParse(value ?? {});
  return parsed.success ? parsed.data : { title: "", description: "" };
}
