import { describe, expect, it } from "vitest";
import { storeInputSchema } from "@/lib/validation/store-input";
import { TOOL_INPUT_SCHEMAS } from "@/lib/ai/tool-definitions";
import { safeRedirectPath } from "@/lib/utils";
import { displayStatus, isStaleGeneration } from "@/lib/projects";

describe("storeInputSchema", () => {
  it("accepts a partial form with only the business idea", () => {
    const parsed = storeInputSchema.parse({ businessIdea: "Hand-poured soy candles for renters" });
    expect(parsed.language).toBe("");
    expect(parsed.productCount).toBeUndefined();
  });

  it("requires a meaningful business idea", () => {
    expect(storeInputSchema.safeParse({ businessIdea: "candles" }).success).toBe(false);
    expect(storeInputSchema.safeParse({}).success).toBe(false);
  });

  it("coerces and bounds the product count", () => {
    expect(storeInputSchema.parse({ businessIdea: "x".repeat(20), productCount: "8" }).productCount).toBe(8);
    expect(storeInputSchema.safeParse({ businessIdea: "x".repeat(20), productCount: 500 }).success).toBe(false);
  });

  it("rejects unknown enum values", () => {
    expect(storeInputSchema.safeParse({ businessIdea: "x".repeat(20), pricePositioning: "free" }).success).toBe(false);
  });
});

describe("tool input schemas", () => {
  it("validates required fields with readable messages", () => {
    const result = TOOL_INPUT_SCHEMAS["product-description"].safeParse({ productName: "Mug" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toMatch(/Product details/);
  });

  it("restricts SEO page types", () => {
    expect(TOOL_INPUT_SCHEMAS.seo.safeParse({ pageType: "admin", subject: "Mugs" }).success).toBe(false);
    expect(TOOL_INPUT_SCHEMAS.seo.safeParse({ pageType: "product", subject: "Mugs" }).success).toBe(true);
  });
});

describe("safeRedirectPath", () => {
  it.each([
    ["/dashboard/billing", "/dashboard/billing"],
    ["https://evil.example", "/dashboard"],
    ["//evil.example", "/dashboard"],
    ["/\\evil.example", "/dashboard"],
    [null, "/dashboard"],
  ])("%s -> %s", (input, expected) => {
    expect(safeRedirectPath(input)).toBe(expected);
  });
});

describe("generation staleness", () => {
  const now = Date.parse("2026-10-18T12:00:00Z");
  it("treats long-running generations as interrupted", () => {
    expect(isStaleGeneration("generating", "2026-10-18T11:45:00Z", now)).toBe(true);
    expect(isStaleGeneration("generating", "2026-10-18T11:55:00Z", now)).toBe(false);
    expect(displayStatus("generating", "2026-10-18T11:00:00Z", now)).toBe("failed");
    expect(displayStatus("ready", "2026-10-18T11:00:00Z", now)).toBe("ready");
  });
});
