import { z } from "zod";

/*
 * Shared definitions for the standalone AI tools. Used by the client (form
 * rendering) and the server (input validation + output schemas).
 */

export const TOOL_IDS = [
  "brand-names",
  "product-description",
  "product-ideas",
  "homepage-copy",
  "brand-story",
  "seo",
] as const;
export type ToolId = (typeof TOOL_IDS)[number];

export function isToolId(value: string): value is ToolId {
  return (TOOL_IDS as readonly string[]).includes(value);
}

type FieldType = "text" | "textarea" | "select";

export type ToolField = {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  required?: boolean;
  maxLength: number;
  options?: { value: string; label: string }[];
};

const req = (max: number, label: string) =>
  z.string({ error: `${label} is required` }).trim().min(2, `${label} is required`).max(max, `${label} must be ${max} characters or fewer`);
const opt = (max: number, label: string) =>
  z.string().trim().max(max, `${label} must be ${max} characters or fewer`).optional().default("");

const languageField: ToolField = {
  name: "language",
  label: "Language",
  type: "text",
  placeholder: "English",
  maxLength: 60,
};

export const TOOL_INPUT_SCHEMAS = {
  "brand-names": z.object({
    niche: req(200, "Niche"),
    audience: opt(300, "Target audience"),
    style: opt(200, "Brand style"),
    language: opt(60, "Language"),
  }),
  "product-description": z.object({
    productName: req(200, "Product name"),
    details: req(2000, "Product details"),
    audience: opt(300, "Target audience"),
    tone: opt(120, "Tone"),
    language: opt(60, "Language"),
  }),
  "product-ideas": z.object({
    niche: req(200, "Niche"),
    market: opt(150, "Target market"),
    audience: opt(300, "Target audience"),
    priceRange: opt(120, "Price range"),
    language: opt(60, "Language"),
  }),
  "homepage-copy": z.object({
    storeName: opt(120, "Store name"),
    niche: req(300, "What you sell"),
    audience: opt(300, "Target audience"),
    uniqueValue: opt(500, "What makes you different"),
    tone: opt(120, "Tone"),
    language: opt(60, "Language"),
  }),
  "brand-story": z.object({
    storeName: opt(120, "Store name"),
    businessDetails: req(2000, "Business details"),
    founderContext: opt(1000, "Founder context"),
    values: opt(400, "Values"),
    tone: opt(120, "Tone"),
    language: opt(60, "Language"),
  }),
  seo: z.object({
    pageType: z.enum(["homepage", "product", "collection", "about", "blog"], { error: "Choose a page type" }),
    subject: req(500, "Page subject"),
    storeName: opt(120, "Store name"),
    keywords: opt(300, "Seed keywords"),
    market: opt(150, "Target market"),
    language: opt(60, "Language"),
  }),
} satisfies Record<ToolId, z.ZodType>;

export type ToolInput<T extends ToolId> = z.output<(typeof TOOL_INPUT_SCHEMAS)[T]>;

// Output schemas: shared by the API format and app-side validation. Strings are
// clamped after parsing (see `clampStrings` in the server module).
export const TOOL_OUTPUT_SCHEMAS = {
  "brand-names": z.object({
    names: z.array(
      z.object({
        name: z.string(),
        rationale: z.string(),
        style: z.string().describe("e.g. descriptive, invented, evocative"),
      }),
    ),
  }),
  "product-description": z.object({
    title: z.string(),
    short_description: z.string().describe("One sentence, max 160 characters"),
    description: z.string().describe("80-180 words"),
    key_benefits: z.array(z.string()),
    seo_title: z.string().describe("Max 60 characters"),
    seo_description: z.string().describe("Max 155 characters"),
  }),
  "product-ideas": z.object({
    ideas: z.array(
      z.object({
        name: z.string(),
        description: z.string(),
        target_customer: z.string(),
        positioning: z.string(),
        price_point_suggestion: z.string().describe("A suggested price point, clearly a suggestion"),
        things_to_validate: z
          .array(z.string())
          .describe("What the merchant should research or test before committing (no invented data)"),
      }),
    ),
  }),
  "homepage-copy": z.object({
    headlines: z.array(z.string()),
    subheadlines: z.array(z.string()),
    cta_labels: z.array(z.string()),
    sections: z.array(z.object({ heading: z.string(), body: z.string() })),
  }),
  "brand-story": z.object({
    headline: z.string(),
    story: z.string().describe("3-5 short paragraphs separated by blank lines"),
    mission: z.string(),
    values: z.array(z.object({ name: z.string(), description: z.string() })),
  }),
  seo: z.object({
    titles: z.array(z.string()).describe("Each max 60 characters"),
    meta_descriptions: z.array(z.string()).describe("Each max 155 characters"),
    keywords: z.array(z.string()),
    url_handle: z.string().describe("Lowercase, hyphen-separated URL handle"),
  }),
} satisfies Record<ToolId, z.ZodType>;

export type ToolOutput<T extends ToolId> = z.output<(typeof TOOL_OUTPUT_SCHEMAS)[T]>;

export type ToolMeta = {
  id: ToolId;
  name: string;
  description: string;
  icon: "sparkles" | "file-text" | "lightbulb" | "layout" | "book-open" | "search";
  fields: ToolField[];
};

export const TOOLS: ToolMeta[] = [
  {
    id: "brand-names",
    name: "Brand Name Generator",
    description: "Name ideas based on your niche, audience and brand style.",
    icon: "sparkles",
    fields: [
      { name: "niche", label: "Niche", type: "text", required: true, maxLength: 200, placeholder: "Sustainable yoga wear" },
      { name: "audience", label: "Target audience", type: "text", maxLength: 300, placeholder: "Eco-conscious women 25-40" },
      { name: "style", label: "Brand style", type: "text", maxLength: 200, placeholder: "Calm, natural, modern" },
      languageField,
    ],
  },
  {
    id: "product-description",
    name: "Product Description Writer",
    description: "Professional, benefit-led descriptions from your product details.",
    icon: "file-text",
    fields: [
      { name: "productName", label: "Product name", type: "text", required: true, maxLength: 200, placeholder: "Merino travel hoodie" },
      { name: "details", label: "Product details", type: "textarea", required: true, maxLength: 2000, placeholder: "Materials, size, features, what's included…" },
      { name: "audience", label: "Target audience", type: "text", maxLength: 300 },
      { name: "tone", label: "Tone", type: "text", maxLength: 120, placeholder: "Warm and confident" },
      languageField,
    ],
  },
  {
    id: "product-ideas",
    name: "Product Idea Generator",
    description: "Product concepts for a niche and market, with what to validate next.",
    icon: "lightbulb",
    fields: [
      { name: "niche", label: "Niche", type: "text", required: true, maxLength: 200, placeholder: "Home coffee brewing" },
      { name: "market", label: "Target market", type: "text", maxLength: 150, placeholder: "Germany" },
      { name: "audience", label: "Target audience", type: "text", maxLength: 300 },
      { name: "priceRange", label: "Price range", type: "text", maxLength: 120, placeholder: "€20–€80" },
      languageField,
    ],
  },
  {
    id: "homepage-copy",
    name: "Homepage Copywriter",
    description: "Conversion-focused headlines, subheadlines and section copy.",
    icon: "layout",
    fields: [
      { name: "storeName", label: "Store name", type: "text", maxLength: 120 },
      { name: "niche", label: "What you sell", type: "text", required: true, maxLength: 300, placeholder: "Handmade ceramic tableware" },
      { name: "audience", label: "Target audience", type: "text", maxLength: 300 },
      { name: "uniqueValue", label: "What makes you different", type: "textarea", maxLength: 500 },
      { name: "tone", label: "Tone", type: "text", maxLength: 120 },
      languageField,
    ],
  },
  {
    id: "brand-story",
    name: "Brand Story Generator",
    description: "A brand story, mission and values from your business details.",
    icon: "book-open",
    fields: [
      { name: "storeName", label: "Store name", type: "text", maxLength: 120 },
      { name: "businessDetails", label: "Business details", type: "textarea", required: true, maxLength: 2000, placeholder: "What you sell, why it exists, who it's for…" },
      { name: "founderContext", label: "Founder context (optional)", type: "textarea", maxLength: 1000, placeholder: "Only real facts — the AI won't invent a backstory." },
      { name: "values", label: "Values", type: "text", maxLength: 400 },
      { name: "tone", label: "Tone", type: "text", maxLength: 120 },
      languageField,
    ],
  },
  {
    id: "seo",
    name: "SEO Assistant",
    description: "SEO titles, meta descriptions, keywords and a URL handle.",
    icon: "search",
    fields: [
      {
        name: "pageType",
        label: "Page type",
        type: "select",
        required: true,
        maxLength: 20,
        options: [
          { value: "homepage", label: "Homepage" },
          { value: "product", label: "Product page" },
          { value: "collection", label: "Collection page" },
          { value: "about", label: "About page" },
          { value: "blog", label: "Blog post" },
        ],
      },
      { name: "subject", label: "Page subject", type: "textarea", required: true, maxLength: 500, placeholder: "What this page is about" },
      { name: "storeName", label: "Store name", type: "text", maxLength: 120 },
      { name: "keywords", label: "Seed keywords", type: "text", maxLength: 300 },
      { name: "market", label: "Target market", type: "text", maxLength: 150 },
      languageField,
    ],
  },
];

export function getToolMeta(id: ToolId): ToolMeta {
  return TOOLS.find((t) => t.id === id)!;
}
