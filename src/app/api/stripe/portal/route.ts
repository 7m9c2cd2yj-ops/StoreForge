import { NextResponse } from "next/server";
import { apiError, authenticate } from "@/lib/api";
import { isStripeConfigured } from "@/lib/env.server";
import { publicEnv } from "@/lib/env";
import { getStripe } from "@/lib/billing/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  const auth = await authenticate();
  if ("response" in auth) return auth.response;

  if (!isStripeConfigured()) {
    return apiError(503, "billing_not_configured", "Billing is not configured on this server.");
  }

  const { data } = await createAdminClient()
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (!data?.stripe_customer_id) {
    return apiError(400, "no_customer", "You don't have a billing account yet. Choose a plan first.");
  }

  try {
    const session = await getStripe().billingPortal.sessions.create({
      customer: data.stripe_customer_id,
      return_url: `${publicEnv.appUrl}/dashboard/billing`,
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[stripe] portal failed", error instanceof Error ? error.message : error);
    return apiError(502, "stripe_error", "Could not open the billing portal. Please try again.");
  }
}
