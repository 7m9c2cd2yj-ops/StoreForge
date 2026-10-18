import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/billing/stripe";
import type { SessionUser } from "@/lib/auth";

/** Returns the user's Stripe customer id, creating the customer once if needed. */
export async function getOrCreateStripeCustomer(user: SessionUser): Promise<string> {
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing?.stripe_customer_id) return existing.stripe_customer_id;

  // Idempotency key prevents duplicate customers from concurrent requests.
  const customer = await getStripe().customers.create(
    { email: user.email ?? undefined, metadata: { user_id: user.id } },
    { idempotencyKey: `storeforge-customer-${user.id}` },
  );

  const { error } = await admin
    .from("subscriptions")
    .upsert({ user_id: user.id, stripe_customer_id: customer.id }, { onConflict: "user_id" });
  if (error) throw new Error(`Failed to store customer: ${error.message}`);

  return customer.id;
}
