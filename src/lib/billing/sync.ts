import "server-only";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe, planForPriceId } from "@/lib/billing/stripe";

const LIVE_STATUSES = new Set(["active", "trialing", "past_due", "unpaid", "incomplete", "paused"]);

function toIso(seconds: number | null | undefined): string | null {
  return seconds ? new Date(seconds * 1000).toISOString() : null;
}

function customerId(customer: string | Stripe.Customer | Stripe.DeletedCustomer): string {
  return typeof customer === "string" ? customer : customer.id;
}

/**
 * Writes Stripe's current view of a subscription into `subscriptions`.
 *
 * Always call this with a subscription freshly retrieved from the Stripe API
 * (not a webhook payload), so out-of-order webhook deliveries can never roll
 * the state back.
 */
export async function upsertSubscriptionFromStripe(subscription: Stripe.Subscription): Promise<void> {
  const admin = createAdminClient();
  const stripeCustomerId = customerId(subscription.customer);

  // Resolve the user: prefer our metadata, fall back to the stored customer id.
  let userId = subscription.metadata?.user_id || null;
  const { data: existingByCustomer } = await admin
    .from("subscriptions")
    .select("user_id, stripe_subscription_id, status")
    .eq("stripe_customer_id", stripeCustomerId)
    .maybeSingle();
  if (!userId) userId = existingByCustomer?.user_id ?? null;
  if (!userId) {
    console.warn("[stripe] subscription without a known user", subscription.id);
    return;
  }

  // Don't let an old, ended subscription overwrite a different live one.
  const { data: current } = await admin
    .from("subscriptions")
    .select("stripe_subscription_id, status")
    .eq("user_id", userId)
    .maybeSingle();
  if (
    current?.stripe_subscription_id &&
    current.stripe_subscription_id !== subscription.id &&
    LIVE_STATUSES.has(current.status) &&
    !LIVE_STATUSES.has(subscription.status)
  ) {
    return;
  }

  const item = subscription.items.data[0];
  const priceId = item?.price?.id ?? null;

  const { error } = await admin.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: subscription.id,
      plan: planForPriceId(priceId),
      status: subscription.status,
      price_id: priceId,
      current_period_start: toIso(item?.current_period_start),
      current_period_end: toIso(item?.current_period_end),
      cancel_at_period_end: subscription.cancel_at_period_end || Boolean(subscription.cancel_at),
    },
    { onConflict: "user_id" },
  );

  if (error) throw new Error(`Failed to store subscription: ${error.message}`);
}

/** Retrieves the latest subscription state from Stripe and stores it. */
export async function syncSubscriptionById(subscriptionId: string): Promise<void> {
  const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
  await upsertSubscriptionFromStripe(subscription);
}

/**
 * Verifies a completed Checkout Session server-side (used on the success
 * redirect so the UI updates even before the webhook lands). The session must
 * belong to `userId`; the browser's claim of success is never trusted alone.
 */
export async function syncCheckoutSession(sessionId: string, userId: string): Promise<boolean> {
  const session = await getStripe().checkout.sessions.retrieve(sessionId);
  if (session.client_reference_id !== userId) return false;
  if (session.mode !== "subscription" || session.status !== "complete" || !session.subscription) return false;

  const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
  await syncSubscriptionById(subscriptionId);
  return true;
}
