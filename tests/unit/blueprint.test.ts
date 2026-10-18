import { describe, expect, it } from "vitest";
import { CORE_CHECKLIST, normalizeBlueprint, storeContentSchema, productInputSchema } from "@/lib/blueprint";
import { makeBlueprint } from "../fixtures/blueprint";

const opts = { maxProducts: 10, maxAlternativeNames: 3 };

describe("normalizeBlueprint", () => {
  it("accepts a valid response and normalises it", () => {
    const result = normalizeBlueprint(makeBlueprint(), opts);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { content, products, checklist } = result.value;

    expect(content.store_name).toBe("Ember & Oak");
    expect(content.currency).toBe("EUR");
    expect(content.brand_story).toBe("We started with one question.");
    // Invalid hex colors are dropped; valid ones are lower-cased.
    expect(content.brand_colors.map((c) => c.hex)).toEqual(["#1f1d1b", "#c2410c"]);
    // Alternative names are capped by plan.
    expect(content.alternative_names).toHaveLength(3);

    // Blank-title product is rejected, negative price clamped, price rounded.
    expect(products.map((p) => p.title)).toEqual(["Cedar Hearth Candle", "Fig Travel Tin", "Negative Price"]);
    expect(products[0].price).toBe(34);
    expect(products[2].price).toBe(0);
    expect(products[0].seo).toEqual({ title: "Cedar candle", description: "Soy candle" });

    // Core steps first, AI extras appended, duplicates of core steps skipped.
    expect(checklist.slice(0, CORE_CHECKLIST.length).map((c) => c.id)).toEqual(CORE_CHECKLIST.map((c) => c.id));
    expect(checklist.slice(CORE_CHECKLIST.length).map((c) => c.title)).toEqual(["Order product samples"]);
    expect(checklist.every((c) => c.done === false)).toBe(true);
  });

  it("caps products at the plan limit", () => {
    const result = normalizeBlueprint(makeBlueprint(), { ...opts, maxProducts: 1 });
    expect(result.ok && result.value.products).toHaveLength(1);
  });

  it("rejects responses without usable products", () => {
    const result = normalizeBlueprint(makeBlueprint({ products: [] }), opts);
    expect(result).toEqual({ ok: false, error: "No valid products in response" });
  });

  it("rejects structurally invalid responses", () => {
    expect(normalizeBlueprint(null, opts).ok).toBe(false);
    expect(normalizeBlueprint("text", opts).ok).toBe(false);
    expect(normalizeBlueprint(makeBlueprint({ homepage: "oops" }), opts).ok).toBe(false);
    expect(normalizeBlueprint(makeBlueprint({ store_name: "  " }), opts).ok).toBe(false);
  });

  it("clamps overly long strings instead of failing", () => {
    const result = normalizeBlueprint(makeBlueprint({ tagline: "x".repeat(1000) }), opts);
    expect(result.ok && result.value.content.tagline).toHaveLength(200);
  });

  it("falls back to USD for malformed currencies", () => {
    const result = normalizeBlueprint(makeBlueprint({ currency: "euros" }), opts);
    expect(result.ok && result.value.content.currency).toBe("USD");
  });
});

describe("edit validation", () => {
  it("rejects an empty store name on save", () => {
    const valid = normalizeBlueprint(makeBlueprint(), opts);
    if (!valid.ok) throw new Error("fixture invalid");
    expect(storeContentSchema.safeParse({ ...valid.value.content, store_name: "" }).success).toBe(false);
  });

  it("validates product input", () => {
    expect(productInputSchema.safeParse({ title: "" }).success).toBe(false);
    expect(productInputSchema.safeParse({ title: "Mug", price: Number.NaN }).success).toBe(false);
    const parsed = productInputSchema.parse({ title: " Mug ", price: 12.345 });
    expect(parsed).toMatchObject({ title: "Mug", price: 12.35, description: "", category: "" });
  });
});
