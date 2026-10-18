import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import { serverEnv, isAIConfigured, type Effort } from "@/lib/env.server";
import { AIError } from "@/lib/ai/errors";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!isAIConfigured()) throw new AIError("not_configured");
  if (!client) {
    client = new Anthropic({
      apiKey: serverEnv.anthropicApiKey,
      // Hard ceiling per attempt; generation routes declare a matching maxDuration.
      timeout: 240_000,
      maxRetries: 1,
    });
  }
  return client;
}

type StructuredRequest<T extends z.ZodType> = {
  system: string;
  prompt: string;
  /** Constraint-free schema sent to the API as the JSON output format. */
  schema: T;
  effort: Effort;
  maxTokens: number;
  /** Aborts the request when the client disconnects. */
  signal?: AbortSignal;
};

/**
 * Calls Claude with structured JSON output and returns the parsed (but not yet
 * app-validated) JSON. Callers must validate the result with their strict
 * schema before saving or displaying it.
 *
 * Uses streaming so long generations don't hit HTTP timeouts, and opts into
 * server-side refusal fallbacks (configurable via AI_REFUSAL_FALLBACK).
 */
export async function generateStructured<T extends z.ZodType>(req: StructuredRequest<T>): Promise<unknown> {
  const anthropic = getClient();

  // Use the SDK helper only for its Zod -> JSON Schema conversion; we parse and
  // validate the output ourselves so validation failures are handled uniformly.
  const { type, schema } = betaZodOutputFormat(req.schema);

  let message: Anthropic.Beta.Messages.BetaMessage;
  try {
    const stream = anthropic.beta.messages.stream(
      {
        model: serverEnv.aiModel,
        max_tokens: req.maxTokens,
        system: req.system,
        messages: [{ role: "user", content: req.prompt }],
        output_config: { effort: req.effort, format: { type, schema } },
        ...(serverEnv.aiRefusalFallback
          ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }
          : {}),
      },
      { signal: req.signal },
    );
    message = await stream.finalMessage();
  } catch (error) {
    throw toAIError(error);
  }

  if (message.stop_reason === "refusal") throw new AIError("refused");
  if (message.stop_reason === "max_tokens") throw new AIError("truncated");

  const text = message.content
    .flatMap((block) => (block.type === "text" ? [block.text] : []))
    .join("")
    .trim();

  if (!text) throw new AIError("invalid_output", "Empty response");

  try {
    return JSON.parse(text);
  } catch {
    throw new AIError("invalid_output", "Response was not valid JSON");
  }
}

function toAIError(error: unknown): AIError {
  if (error instanceof AIError) return error;
  if (error instanceof Anthropic.APIConnectionTimeoutError) return new AIError("timeout");
  if (error instanceof Anthropic.APIUserAbortError) return new AIError("timeout", "aborted");
  if (error instanceof Anthropic.RateLimitError) return new AIError("rate_limited");
  if (error instanceof Anthropic.AuthenticationError) return new AIError("not_configured", "Invalid API key");
  if (error instanceof Anthropic.PermissionDeniedError) return new AIError("not_configured", "Permission denied");
  if (error instanceof Anthropic.APIError) {
    // 529 overloaded and 5xx are transient provider-side failures.
    if (error.status === 529) return new AIError("rate_limited");
    console.error("[ai] provider error", error.status, error.name);
    return new AIError("provider_error", `status ${error.status}`);
  }
  if (error instanceof Anthropic.APIConnectionError) return new AIError("provider_error", "connection");
  console.error("[ai] unexpected error", error instanceof Error ? error.name : typeof error);
  return new AIError("provider_error");
}
