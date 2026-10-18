import type { Metadata } from "next";
import { Alert } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { PricingCards } from "@/components/marketing/pricing-cards";
import { CheckoutButton, CheckoutComplete, PortalButton } from "@/components/dashboard/billing-actions";
import { requireUser } from "@/lib/auth";
import { getAccount } from "@/lib/data";
import { getPlans, PLAN_IDS, isPaidPlanId } from "@/lib/config/plans";
import { isStripeConfigured } from "@/lib/env.server";
import { syncCheckoutSession } from "@/lib/billing/sync";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Billing" };

export default async function BillingPage({ searchParams }: PageProps<"/dashboard/billing">) {
  const user = await requireUser("/dashboard/billing");
  const params = await searchParams;
  const stripeReady = isStripeConfigured();

  // Returning from Stripe Checkout: verify the session with Stripe's API.
  let verified: boolean | null = null;
  if (params.checkout === "success" && typeof params.session_id === "string" && stripeReady) {
    try {
      verified = await syncCheckoutSession(params.session_id, user.id);
    } catch {
      verified = false;
    }
  }

  const [{ entitlements }, { data: billingRow }] = await Promise.all([
    getAccount(user.id),
    createAdminClient().from("subscriptions").select("stripe_customer_id").eq("user_id", user.id).maybeSingle(),
  ]);
  const plans = getPlans();
  const current = entitlements.plan;
  const hasCustomer = Boolean(billingRow?.stripe_customer_id);
  const suggested = isPaidPlanId(params.plan) ? params.plan : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Billing</h1>
        <p className="mt-1 text-fg-muted">Manage your plan, invoices and payment method.</p>
      </div>

      {verified === true && <CheckoutComplete />}
      {(verified === true || params.checkout === "done") && (
        <Alert variant="success" title="Thanks for subscribing">
          Your payment was confirmed by Stripe and your plan is active.
        </Alert>
      )}
      {verified === false && (
        <Alert variant="warning" title="We're confirming your payment">
          Stripe hasn&apos;t confirmed this checkout yet. Your plan will update automatically once it does. Refresh in a minute.
        </Alert>
      )}
      {params.checkout === "canceled" && <Alert>Checkout was canceled. You haven&apos;t been charged.</Alert>}
      {!stripeReady && (
        <Alert variant="warning" title="Paid plans require configuration">
          Stripe isn&apos;t configured on this server, so upgrades are unavailable. Set{" "}
          <code className="font-mono">STRIPE_SECRET_KEY</code>, <code className="font-mono">STRIPE_WEBHOOK_SECRET</code>,{" "}
          <code className="font-mono">STRIPE_PRICE_PRO</code> and <code className="font-mono">STRIPE_PRICE_BUSINESS</code>.
        </Alert>
      )}
      {entitlements.paymentIssue && (
        <Alert variant="danger" title="Payment problem">
          Your last payment didn&apos;t go through. Update your payment method in the billing portal to keep your{" "}
          {current.name} plan. Stripe will retry automatically.
        </Alert>
      )}

      <section className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <p className="text-sm text-fg-subtle">Current plan</p>
          <p className="mt-1 text-xl font-semibold">{current.name}</p>
          <p className="mt-1 text-sm text-fg-muted">
            {current.id === "free"
              ? "You're on the free plan."
              : entitlements.cancelAtPeriodEnd && entitlements.currentPeriodEnd
                ? `Cancels on ${formatDate(entitlements.currentPeriodEnd)}. You keep access until then.`
                : entitlements.currentPeriodEnd
                  ? `Renews on ${formatDate(entitlements.currentPeriodEnd)}.`
                  : `Status: ${entitlements.status}`}
          </p>
        </div>
        {hasCustomer && stripeReady && (
          <PortalButton variant="secondary">Manage billing</PortalButton>
        )}
      </section>

      <PricingCards
        plans={PLAN_IDS.map((id) => plans[id])}
        currentPlanId={current.id}
        renderAction={(plan) => {
          if (plan.id === current.id) {
            return <Button className="w-full" size="lg" variant="secondary" disabled>Current plan</Button>;
          }
          if (plan.id === "free") {
            return hasCustomer && stripeReady ? (
              <PortalButton className="w-full" size="lg" variant="ghost">Downgrade in portal</PortalButton>
            ) : (
              <Button className="w-full" size="lg" variant="ghost" disabled>Included</Button>
            );
          }
          // Existing subscribers switch plans in the Billing Portal (handled by the checkout route).
          return (
            <CheckoutButton
              plan={plan.id as "pro" | "business"}
              className="w-full"
              size="lg"
              variant={suggested === plan.id || (!suggested && plan.highlighted) ? "primary" : "secondary"}
              disabled={!stripeReady}
            >
              {current.id === "free" ? `Upgrade to ${plan.name}` : `Switch to ${plan.name}`}
            </CheckoutButton>
          );
        }}
      />

      <p className="text-xs text-fg-subtle">
        Payments are processed securely by Stripe. StoreForge never sees or stores your card details. Plan changes made in
        the billing portal are prorated by Stripe.
      </p>
    </div>
  );
}
