import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeBlueprint } from "../fixtures/blueprint";

// Captures the request and returns whatever the current test configures.
const streamMock = vi.fn();

vi.mock("@anthropic-ai/sdk", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@anthropic-ai/sdk")>();
  const Real = actual.default;
  class FakeAnthropic extends Real {
    constructor(opts: ConstructorParameters<typeof Real>[0]) {
      super(opts);
      // Only the network call is replaced; error classes etc. stay real.
      (this as unknown as { beta: unknown }).beta = { messages: { stream: streamMock } };
    }
  }
  return { ...actual, default: FakeAnthropic };
});

function respond(message: Partial<{ stop_reason: string; content: unknown[] }>) {
  streamMock.mockReturnValueOnce({
    finalMessage: async () => ({ stop_reason: "end_turn", content: [], ...message }),
  });
}

async function load() {
  vi.resetModules();
  vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test");
  vi.stubEnv("AI_MODEL", "");
  const client = await import("@/lib/ai/client");
  const generator = await import("@/lib/ai/store-generator");
  const errors = await import("@/lib/ai/errors");
  const { getPlan } = await import("@/lib/config/plans");
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  return { ...client, ...generator, ...errors, getPlan, Anthropic };
}

const input = {
  businessIdea: "Hand-poured soy candles for design-minded renters",
  productCategory: "", targetAudience: "", targetMarket: "", language: "",
  brandPersonality: "", preferredColors: "", storeStyle: "", pricePositioning: "" as const,
  existingBrandName: "", productTypes: "", productCount: undefined, priceRange: "", fulfillment: "" as const,
};

type AIErrorLike = { code: string; userMessage: string; refundable: boolean };

async function failure(promise: Promise<unknown>): Promise<AIErrorLike> {
  try {
    await promise;
  } catch (error) {
    return error as AIErrorLike;
  }
  throw new Error("Expected the promise to reject");
}

beforeEach(() => {
  streamMock.mockReset();
  vi.unstubAllEnvs();
});

describe("generateStructured", () => {
  it("sends a structured-output request with refusal fallbacks and returns parsed JSON", async () => {
    const { generateStructured } = await load();
    const { z } = await import("zod");
    respond({ content: [{ type: "thinking", thinking: "" }, { type: "text", text: '{"ok":true}' }] });

    const result = await generateStructured({ system: "sys", prompt: "hi", schema: z.object({ ok: z.boolean() }), effort: "low", maxTokens: 1000 });
    expect(result).toEqual({ ok: true });

    const request = streamMock.mock.calls[0][0];
    expect(request.model).toBe("claude-opus-5-5");
    expect(request.output_config.effort).toBe("low");
    expect(request.output_config.format.type).toBe("json_schema");
    expect(request.output_config.format.schema.properties.ok).toBeDefined();
    expect(request.fallbacks).toBe("default");
    expect(request.betas).toEqual(["server-side-fallback-2026-07-01"]);
    // Thinking can't be disabled on this model, and budget_tokens is rejected: never send either.
    expect(request.thinking).toBeUndefined();
  });

  it.each([
    [{ stop_reason: "refusal" }, "refused"],
    [{ stop_reason: "max_tokens", content: [{ type: "text", text: '{"ok":' }] }, "truncated"],
    [{ content: [{ type: "text", text: "not json" }] }, "invalid_output"],
    [{ content: [] }, "invalid_output"],
  ])("maps %j to %s", async (message, code) => {
    const { generateStructured, AIError } = await load();
    const { z } = await import("zod");
    respond(message);
    const err = await failure(generateStructured({ system: "s", prompt: "p", schema: z.object({}), effort: "low", maxTokens: 10 }));
    expect(err).toBeInstanceOf(AIError);
    expect(err.code).toBe(code);
    expect(err.refundable).toBe(true);
  });

  it("maps SDK errors to safe error codes", async () => {
    const { generateStructured, Anthropic } = await load();
    const { z } = await import("zod");
    streamMock.mockImplementationOnce(() => {
      throw new Anthropic.RateLimitError(429, { type: "error" }, "rate limited", new Headers());
    });
    const err = await failure(generateStructured({ system: "s", prompt: "p", schema: z.object({}), effort: "low", maxTokens: 10 }));
    expect(err.code).toBe("rate_limited");
    expect(err.userMessage).not.toMatch(/sk-ant|429/);
  });

  it("refuses to run without an API key", async () => {
    vi.resetModules();
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const { generateStructured } = await import("@/lib/ai/client");
    const { z } = await import("zod");
    const err = await failure(generateStructured({ system: "s", prompt: "p", schema: z.object({}), effort: "low", maxTokens: 10 }));
    expect(err.code).toBe("not_configured");
    expect(streamMock).not.toHaveBeenCalled();
  });
});

describe("generateStoreBlueprint", () => {
  it("returns only validated content", async () => {
    const { generateStoreBlueprint, getPlan } = await load();
    respond({ content: [{ type: "text", text: JSON.stringify(makeBlueprint()) }] });
    const result = await generateStoreBlueprint(input, getPlan("free"));
    expect(result.content.store_name).toBe("Ember & Oak");
    expect(result.products.length).toBeLessThanOrEqual(getPlan("free").limits.productsPerGeneration);
    const prompt: string = streamMock.mock.calls[0][0].messages[0].content;
    expect(prompt).toContain(`exactly ${getPlan("free").limits.productsPerGeneration} launch products`);
    expect(prompt).toContain("<merchant_input>");
  });

  it("rejects schema-invalid output", async () => {
    const { generateStoreBlueprint, getPlan } = await load();
    respond({ content: [{ type: "text", text: JSON.stringify(makeBlueprint({ products: [] })) }] });
    const err = await failure(generateStoreBlueprint(input, getPlan("pro")));
    expect(err.code).toBe("invalid_output");
  });
});
