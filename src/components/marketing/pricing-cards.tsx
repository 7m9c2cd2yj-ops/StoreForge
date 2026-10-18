import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPlanPrice, type Plan } from "@/lib/config/plans";
import { cn } from "@/lib/utils";

type PricingCardsProps = {
  plans: Plan[];
  /** Renders a custom action per plan (used on the billing page). */
  renderAction?: (plan: Plan) => React.ReactNode;
  currentPlanId?: string;
};

export function PricingCards({ plans, renderAction, currentPlanId }: PricingCardsProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {plans.map((plan) => (
        <div
          key={plan.id}
          className={cn(
            "relative flex flex-col rounded-2xl border bg-surface p-6 sm:p-7",
            plan.highlighted ? "border-accent/50 shadow-[0_0_0_1px_rgb(139_92_246/0.25),0_24px_48px_-24px_rgb(139_92_246/0.45)]" : "border-border",
          )}
        >
          {plan.highlighted && (
            <span className="absolute -top-3 left-6 rounded-full border border-accent/40 bg-accent px-2.5 py-0.5 text-xs font-medium text-white">
              Most popular
            </span>
          )}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{plan.name}</h3>
            {currentPlanId === plan.id && (
              <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs text-accent-text">Current plan</span>
            )}
          </div>
          <p className="mt-1 text-sm text-fg-muted">{plan.description}</p>
          <p className="mt-6 flex items-baseline gap-1">
            <span className="text-4xl font-semibold tracking-tight tabular-nums">{formatPlanPrice(plan)}</span>
            <span className="text-sm text-fg-subtle">/month</span>
          </p>
          <ul className="mt-6 flex-1 space-y-3">
            {plan.marketingBullets.map((bullet) => (
              <li key={bullet} className="flex gap-3 text-sm text-fg-muted">
                <Check className="mt-0.5 size-4 shrink-0 text-accent-text" aria-hidden />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
          <div className="mt-8">
            {renderAction ? (
              renderAction(plan)
            ) : (
              <Button asChild className="w-full" size="lg" variant={plan.highlighted ? "primary" : "secondary"}>
                <Link href={plan.id === "free" ? "/signup" : `/signup?plan=${plan.id}`}>
                  {plan.id === "free" ? "Start for free" : `Choose ${plan.name}`}
                </Link>
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
