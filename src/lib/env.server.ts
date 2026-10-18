import "server-only";

/**
 * Server-only secrets. Importing this module from a Client Component fails the
 * build (via `server-only`), so these values can never reach the browser.
 */
export const serverEnv = {
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",

  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  aiModel: process.env.AI_MODEL || "claude-opus-5-5",
  aiStoreEffort: parseEffort(process.env.AI_STORE_EFFORT, "medium"),
  aiToolEffort: parseEffort(process.env.AI_TOOL_EFFORT, "low"),
  aiRefusalFallback: process.env.AI_REFUSAL_FALLBACK !== "off",

  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  stripePricePro: process.env.STRIPE_PRICE_PRO ?? "",
  stripePriceBusiness: process.env.STRIPE_PRICE_BUSINESS ?? "",
};

export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

function parseEffort(value: string | undefined, fallback: Effort): Effort {
  const allowed: Effort[] = ["low", "medium", "high", "xhigh", "max"];
  return allowed.includes(value as Effort) ? (value as Effort) : fallback;
}

export function isAIConfigured(): boolean {
  return Boolean(serverEnv.anthropicApiKey);
}

export function isServiceRoleConfigured(): boolean {
  return Boolean(serverEnv.supabaseServiceRoleKey);
}

export function isStripeConfigured(): boolean {
  return Boolean(
    serverEnv.stripeSecretKey &&
      serverEnv.stripeWebhookSecret &&
      serverEnv.stripePricePro &&
      serverEnv.stripePriceBusiness,
  );
}
