import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, authenticate, readJson, withBackendErrors } from "@/lib/api";
import { isStripeConfigured } from "@/lib/env.server";
import { publicEnv } from "@/lib/env";
import { getStripe, priceIdForPlan } from "@/lib/billing/stripe";
import { getEntitlements } from "@/lib/billing/entitlements";
import { getOrCreateStripeCustomer } from "@/lib/billing/customer";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { PAID_PLAN_IDS } from "@/lib/config/plans";
import { BackendError } from "@/lib/backend-errors";

const bodySchema = z.object({ plan: z.enum(PAID_PLAN_IDS) });

async function handlePOST(request: Request) {
  const auth = await authenticate();
  if ("response" in auth) return auth.response;
  const { user } = auth;

  if (!isStripeConfigured()) {
    return apiError(
      503,
      "billing_not_configured",
      "Paid plans aren't available yet: Stripe is not configured on this server.",
    );
  }

  const parsed = bodySchema.safeParse(await readJson(request));
  if (!parsed.success) return apiError(400, "invalid_plan", "Choose a valid plan.");

  if (!(await checkRateLimit(`checkout:${user.id}`, RATE_LIMITS.checkout))) {
    return apiError(429, "rate_limited", "Too many attempts. Please wait a minute.");
  }

  try {
    const stripe = getStripe();
    const customerId = await getOrCreateStripeCustomer(user);
    const entitlements = await getEntitlements(user.id);

    // Existing subscribers change plans (upgrade/downgrade, with proration) in
    // the Billing Portal instead of starting a second subscription.
    if (entitlements.planId !== "free") {
      const portal = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${publicEnv.appUrl}/dashboard/billing`,
      });
      return NextResponse.json({ url: portal.url });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: priceIdForPlan(parsed.data.plan), quantity: 1 }],
      subscription_data: { metadata: { user_id: user.id } },
      metadata: { user_id: user.id },
      allow_promotion_codes: true,
      success_url: `${publicEnv.appUrl}/dashboard/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${publicEnv.appUrl}/dashboard/billing?checkout=canceled`,
    });

    if (!session.url) return apiError(502, "stripe_error", "Could not start checkout.");
    return NextResponse.json({ url: session.url });
  } catch (error) {
    if (error instanceof BackendError) throw error;
    console.error("[stripe] checkout failed", error instanceof Error ? error.message : error);
    return apiError(502, "stripe_error", "Could not start checkout. Please try again.");
  }
}

export const POST = withBackendErrors(handlePOST);
