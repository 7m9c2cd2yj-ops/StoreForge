import "server-only";
import Stripe from "stripe";
import { serverEnv, isStripeConfigured } from "@/lib/env.server";
import type { PaidPlanId, PlanId } from "@/lib/config/plans";

let stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!isStripeConfigured()) {
    throw new Error("Stripe is not configured");
  }
  if (!stripe) {
    stripe = new Stripe(serverEnv.stripeSecretKey, {
      appInfo: { name: "StoreForge AI" },
      maxNetworkRetries: 2,
    });
  }
  return stripe;
}

export function priceIdForPlan(plan: PaidPlanId): string {
  return plan === "pro" ? serverEnv.stripePricePro : serverEnv.stripePriceBusiness;
}

/** Maps a Stripe price back to a plan. Unknown prices grant nothing. */
export function planForPriceId(priceId: string | null | undefined): PlanId {
  if (!priceId) return "free";
  if (priceId === serverEnv.stripePricePro) return "pro";
  if (priceId === serverEnv.stripePriceBusiness) return "business";
  return "free";
}
