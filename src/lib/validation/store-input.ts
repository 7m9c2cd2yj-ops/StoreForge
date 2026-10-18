import { z } from "zod";

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Must be ${max} characters or fewer`)
    .optional()
    .default("");

export const PRICE_POSITIONS = ["", "budget", "mid-range", "premium", "luxury"] as const;
export const FULFILLMENT_TYPES = ["", "physical", "digital", "both"] as const;

/**
 * Store generator input. Only the business idea is required, so users can
 * submit a partially completed form; the AI fills sensible gaps.
 */
export const storeInputSchema = z.object({
  businessIdea: z
    .string({ error: "Describe your business idea" })
    .trim()
    .min(10, "Describe your business idea in at least 10 characters")
    .max(1500, "Keep the business idea under 1500 characters"),
  productCategory: optional(120),
  targetAudience: optional(400),
  targetMarket: optional(120),
  language: optional(60),

  brandPersonality: optional(200),
  preferredColors: optional(200),
  storeStyle: optional(120),
  pricePositioning: z.enum(PRICE_POSITIONS).optional().default(""),
  existingBrandName: optional(80),

  productTypes: optional(500),
  productCount: z.coerce
    .number()
    .int()
    .min(1, "At least 1 product")
    .max(50, "At most 50 products")
    .optional(),
  priceRange: optional(120),
  fulfillment: z.enum(FULFILLMENT_TYPES).optional().default(""),
});

export type StoreInput = z.output<typeof storeInputSchema>;
export type StoreInputDraft = z.input<typeof storeInputSchema>;
