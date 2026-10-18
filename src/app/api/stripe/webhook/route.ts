import type Stripe from "stripe";
import { serverEnv, isStripeConfigured } from "@/lib/env.server";
import { getStripe } from "@/lib/billing/stripe";
import { syncSubscriptionById } from "@/lib/billing/sync";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Stripe webhook endpoint. Every event's signature is verified against
 * STRIPE_WEBHOOK_SECRET using the raw request body; unsigned or tampered
 * requests are rejected. Subscription state is then re-read from the Stripe
 * API, so the database always reflects Stripe's current truth.
 */
export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return new Response("Stripe is not configured", { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  const payload = await request.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(payload, signature, serverEnv.stripeWebhookSecret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  const admin = createAdminClient();
  const { data: seen } = await admin.from("stripe_events").select("id").eq("id", event.id).maybeSingle();
  if (seen) return Response.json({ received: true, duplicate: true });

  try {
    const subscriptionId = subscriptionIdFromEvent(event);
    if (subscriptionId) await syncSubscriptionById(subscriptionId);
  } catch (error) {
    console.error("[stripe] webhook processing failed", event.type, error instanceof Error ? error.message : error);
    // Non-2xx makes Stripe retry the delivery later.
    return new Response("Webhook processing failed", { status: 500 });
  }

  await admin.from("stripe_events").upsert({ id: event.id, type: event.type }, { onConflict: "id" });
  return Response.json({ received: true });
}

function subscriptionIdFromEvent(event: Stripe.Event): string | null {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
    case "checkout.session.async_payment_failed": {
      const session = event.data.object;
      if (session.mode !== "subscription" || !session.subscription) return null;
      return typeof session.subscription === "string" ? session.subscription : session.subscription.id;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
    case "customer.subscription.paused":
    case "customer.subscription.resumed":
      return event.data.object.id;
    case "invoice.paid":
    case "invoice.payment_failed":
    case "invoice.payment_action_required": {
      const subscription = event.data.object.parent?.subscription_details?.subscription;
      if (!subscription) return null;
      return typeof subscription === "string" ? subscription : subscription.id;
    }
    default:
      return null;
  }
}
