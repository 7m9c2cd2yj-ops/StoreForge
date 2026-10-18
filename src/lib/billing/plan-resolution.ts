import type { PlanId } from "@/lib/config/plans";

export type SubscriptionSnapshot = {
  plan: PlanId;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
};

/**
 * Stripe statuses that grant paid access. `past_due` keeps access while Stripe
 * retries the payment (Smart Retries); the UI shows a payment warning. Once
 * Stripe gives up the subscription becomes `unpaid`/`canceled` and access ends.
 */
const ACCESS_STATUSES = new Set(["active", "trialing", "past_due"]);

/** Grace window after the recorded period end, to absorb webhook delays. */
const PERIOD_GRACE_MS = 3 * 24 * 60 * 60 * 1000;

export type EffectivePlan = {
  planId: PlanId;
  status: string;
  paymentIssue: boolean;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
};

/** Pure function: derives the plan a user is entitled to right now. */
export function resolveEffectivePlan(
  subscription: SubscriptionSnapshot | null,
  now: Date = new Date(),
): EffectivePlan {
  if (!subscription || subscription.plan === "free") {
    return {
      planId: "free",
      status: subscription?.status ?? "none",
      paymentIssue: false,
      cancelAtPeriodEnd: false,
      currentPeriodEnd: null,
    };
  }

  const periodEnd = subscription.current_period_end ? new Date(subscription.current_period_end) : null;
  const periodValid = !periodEnd || periodEnd.getTime() + PERIOD_GRACE_MS > now.getTime();
  const hasAccess = ACCESS_STATUSES.has(subscription.status) && periodValid;

  return {
    planId: hasAccess ? subscription.plan : "free",
    status: subscription.status,
    paymentIssue: ["past_due", "unpaid", "incomplete"].includes(subscription.status),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    currentPeriodEnd: subscription.current_period_end,
  };
}
