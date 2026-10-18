/**
 * Single source of truth for plan pricing, limits and features.
 *
 * Prices and limits can be overridden with environment variables so they are
 * never hardcoded across the UI. Read these on the server (Server Components,
 * Route Handlers, Server Actions) and pass the resolved values to the client.
 *
 * Limits are monthly allowances that reset at the start of each calendar month
 * (UTC). They are enforced server-side in `lib/credits.ts`.
 */

export type PlanId = "free" | "pro" | "business";

export const PLAN_IDS: PlanId[] = ["free", "pro", "business"];
export const PAID_PLAN_IDS = ["pro", "business"] as const;
export type PaidPlanId = (typeof PAID_PLAN_IDS)[number];

export type PlanLimits = {
  /** Full AI store generations per month. */
  storeGenerations: number;
  /** Runs of the individual AI tools per month (brand names, SEO, ...). */
  aiToolRuns: number;
  /** Maximum number of saved projects at any time. */
  projects: number;
  /** Products generated per store generation. */
  productsPerGeneration: number;
  /** Alternative brand names generated per store generation. */
  alternativeNames: number;
};

export type PlanFeatures = {
  /** Shopify-compatible product CSV + Markdown blueprint export. */
  export: boolean;
  /** Full JSON blueprint export (premium export option). */
  jsonExport: boolean;
  /** Deeper branding & copywriting depth in generations. */
  advancedCopy: boolean;
};

export type Plan = {
  id: PlanId;
  name: string;
  description: string;
  priceMonthly: number;
  currency: string;
  highlighted: boolean;
  limits: PlanLimits;
  features: PlanFeatures;
  marketingBullets: string[];
};

function envNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export function getPlans(): Record<PlanId, Plan> {
  const currency = process.env.PLAN_CURRENCY || "EUR";

  const free: Plan = {
    id: "free",
    name: "Free",
    description: "Explore the generator and preview a store concept.",
    priceMonthly: envNumber("PLAN_FREE_PRICE", 0),
    currency,
    highlighted: false,
    limits: {
      storeGenerations: envNumber("PLAN_FREE_STORE_GENERATIONS", 3),
      aiToolRuns: envNumber("PLAN_FREE_TOOL_RUNS", 15),
      projects: envNumber("PLAN_FREE_PROJECTS", 1),
      productsPerGeneration: envNumber("PLAN_FREE_PRODUCTS_PER_GENERATION", 4),
      alternativeNames: 3,
    },
    features: { export: false, jsonExport: false, advancedCopy: false },
    marketingBullets: [],
  };

  const pro: Plan = {
    id: "pro",
    name: "Pro",
    description: "For founders launching a serious store.",
    priceMonthly: envNumber("PLAN_PRO_PRICE", 19),
    currency,
    highlighted: true,
    limits: {
      storeGenerations: envNumber("PLAN_PRO_STORE_GENERATIONS", 30),
      aiToolRuns: envNumber("PLAN_PRO_TOOL_RUNS", 300),
      projects: envNumber("PLAN_PRO_PROJECTS", 15),
      productsPerGeneration: envNumber("PLAN_PRO_PRODUCTS_PER_GENERATION", 10),
      alternativeNames: 6,
    },
    features: { export: true, jsonExport: false, advancedCopy: true },
    marketingBullets: [],
  };

  const business: Plan = {
    id: "business",
    name: "Business",
    description: "For agencies and multi-store operators.",
    priceMonthly: envNumber("PLAN_BUSINESS_PRICE", 39),
    currency,
    highlighted: false,
    limits: {
      storeGenerations: envNumber("PLAN_BUSINESS_STORE_GENERATIONS", 100),
      aiToolRuns: envNumber("PLAN_BUSINESS_TOOL_RUNS", 1000),
      projects: envNumber("PLAN_BUSINESS_PROJECTS", 75),
      productsPerGeneration: envNumber("PLAN_BUSINESS_PRODUCTS_PER_GENERATION", 20),
      alternativeNames: 10,
    },
    features: { export: true, jsonExport: true, advancedCopy: true },
    marketingBullets: [],
  };

  free.marketingBullets = [
    `${free.limits.storeGenerations} store generations per month`,
    "Basic brand names and product descriptions",
    `${free.limits.projects} saved project`,
    `Preview of generated results (up to ${free.limits.productsPerGeneration} products)`,
  ];
  pro.marketingBullets = [
    `${pro.limits.storeGenerations} store generations per month`,
    `Up to ${pro.limits.projects} saved projects`,
    "Complete store blueprints",
    "Advanced branding and copywriting",
    "CSV and Markdown blueprint export",
  ];
  business.marketingBullets = [
    `${business.limits.storeGenerations} store generations per month`,
    `Up to ${business.limits.projects} projects and advanced customization`,
    `Product catalog generation (up to ${business.limits.productsPerGeneration} products per store)`,
    "Premium export options, including full JSON blueprint",
  ];

  return { free, pro, business };
}

export function getPlan(id: PlanId): Plan {
  return getPlans()[id];
}

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === "string" && (PLAN_IDS as string[]).includes(value);
}

export function isPaidPlanId(value: unknown): value is PaidPlanId {
  return typeof value === "string" && (PAID_PLAN_IDS as readonly string[]).includes(value);
}

export function formatPlanPrice(plan: Plan, locale = "en-IE"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: plan.currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(plan.priceMonthly);
}
