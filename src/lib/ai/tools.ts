import "server-only";
import { generateStructured } from "@/lib/ai/client";
import { AIError } from "@/lib/ai/errors";
import { HONESTY_RULES } from "@/lib/ai/store-generator";
import {
  TOOL_INPUT_SCHEMAS,
  TOOL_OUTPUT_SCHEMAS,
  type ToolId,
  type ToolInput,
  type ToolOutput,
} from "@/lib/ai/tool-definitions";
import { serverEnv } from "@/lib/env.server";

const SYSTEM = `You are StoreForge AI, an expert e-commerce copywriter and brand strategist for Shopify merchants. Produce specific, polished, ready-to-use output for the tool the merchant is using.

${HONESTY_RULES}`;

const TASKS: { [K in ToolId]: (input: ToolInput<K>) => string } = {
  "brand-names": () =>
    "Generate 10 distinctive brand name ideas. Each must be short, pronounceable and plausible as a .com domain (availability is NOT checked: do not claim it is available). Avoid existing well-known brands.",
  "product-description": () =>
    "Write a product description with a clear title, a one-line summary, a persuasive benefit-led description, 3-6 key benefits and SEO title/description. Only use features present in the details; do not invent specifications, certifications or claims.",
  "product-ideas": () =>
    "Suggest 6 product concepts for this niche and market. For each, list what the merchant should validate (demand, sourcing, margins, regulations). Do not state any market data, sales figures or supplier availability as fact.",
  "homepage-copy": () =>
    "Write conversion-focused homepage copy: 3 headline options, 3 subheadline options, 3 CTA button labels and 4-5 homepage sections (heading + body), e.g. benefits, how it works, brand promise, featured collection intro. No testimonials.",
  "brand-story": () =>
    "Write a brand story, a one-sentence mission and 3-5 values. Use only facts given by the merchant; where personal history isn't provided, focus on purpose and the customer instead of inventing a founder backstory.",
  seo: (input) =>
    `Write SEO metadata for a ${input.pageType} page: 3 title options, 3 meta description options, 10-15 relevant keywords (no search volumes) and a URL handle.`,
};

/**
 * Runs one AI tool with validated input. Output is validated against the tool's
 * schema; long strings are clamped so the UI never renders unbounded text.
 */
export async function runTool<T extends ToolId>(
  toolId: T,
  rawInput: unknown,
  signal?: AbortSignal,
): Promise<{ ok: true; output: ToolOutput<T> } | { ok: false; error: string }> {
  const parsedInput = TOOL_INPUT_SCHEMAS[toolId].safeParse(rawInput);
  if (!parsedInput.success) {
    return { ok: false, error: parsedInput.error.issues[0]?.message ?? "Invalid input" };
  }
  const input = parsedInput.data as ToolInput<T>;
  const task = (TASKS[toolId] as (i: ToolInput<T>) => string)(input);

  const raw = await generateStructured({
    system: SYSTEM,
    prompt: `${task}

Write in ${("language" in input && input.language) || "English"}.

<merchant_input>
${JSON.stringify(input, null, 2)}
</merchant_input>`,
    schema: TOOL_OUTPUT_SCHEMAS[toolId],
    effort: serverEnv.aiToolEffort,
    maxTokens: 16_000,
    signal,
  });

  const parsed = TOOL_OUTPUT_SCHEMAS[toolId].safeParse(clampStrings(raw));
  if (!parsed.success) throw new AIError("invalid_output");
  return { ok: true, output: parsed.data as ToolOutput<T> };
}

/** Recursively trims strings to 4000 chars and arrays to 20 items. */
export function clampStrings(value: unknown, depth = 0): unknown {
  if (depth > 6) return value;
  if (typeof value === "string") return value.trim().slice(0, 4000);
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => clampStrings(v, depth + 1));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, clampStrings(v, depth + 1)]));
  }
  return value;
}
