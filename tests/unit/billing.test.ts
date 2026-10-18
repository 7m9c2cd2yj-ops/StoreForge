import { describe, expect, it } from "vitest";
import { resolveEffectivePlan } from "@/lib/billing/plan-resolution";
import { currentUsagePeriod } from "@/lib/usage-period";
import { getPlans, formatPlanPrice } from "@/lib/config/plans";

const now = new Date("2026-10-18T12:00:00Z");
const future = "2026-11-10T00:00:00Z";

describe("resolveEffectivePlan", () => {
  it("defaults to free with no subscription", () => {
    expect(resolveEffectivePlan(null, now).planId).toBe("free");
  });

  it.each([
    ["active", "pro"],
    ["trialing", "pro"],
    ["past_due", "pro"],
    ["canceled", "free"],
    ["unpaid", "free"],
    ["incomplete", "free"],
    ["incomplete_expired", "free"],
    ["paused", "free"],
  ])("status %s grants %s", (status, expected) => {
    const result = resolveEffectivePlan(
      { plan: "pro", status, current_period_end: future, cancel_at_period_end: false },
      now,
    );
    expect(result.planId).toBe(expected);
  });

  it("flags payment problems", () => {
    const result = resolveEffectivePlan({ plan: "business", status: "past_due", current_period_end: future, cancel_at_period_end: false }, now);
    expect(result).toMatchObject({ planId: "business", paymentIssue: true });
  });

  it("revokes access when the period ended long ago (missed webhooks)", () => {
    const result = resolveEffectivePlan(
      { plan: "pro", status: "active", current_period_end: "2026-09-01T00:00:00Z", cancel_at_period_end: false },
      now,
    );
    expect(result.planId).toBe("free");
  });
});

describe("currentUsagePeriod", () => {
  it("uses the UTC calendar month", () => {
    const { start, end } = currentUsagePeriod(now);
    expect(start.toISOString()).toBe("2026-10-01T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-11-01T00:00:00.000Z");
  });

  it("rolls over the year in December", () => {
    const { start, end } = currentUsagePeriod(new Date("2026-12-31T23:59:59Z"));
    expect(start.toISOString()).toBe("2026-12-01T00:00:00.000Z");
    expect(end.toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });
});

describe("plans", () => {
  it("exposes the configured defaults", () => {
    const plans = getPlans();
    expect(plans.free.limits.storeGenerations).toBe(3);
    expect(plans.pro.limits.storeGenerations).toBe(30);
    expect(plans.business.limits.storeGenerations).toBe(100);
    expect(formatPlanPrice(plans.pro)).toBe("€19");
    expect(plans.free.features.export).toBe(false);
    expect(plans.business.features.jsonExport).toBe(true);
  });

  it("can be overridden by environment variables", () => {
    process.env.PLAN_PRO_PRICE = "24";
    process.env.PLAN_PRO_STORE_GENERATIONS = "50";
    try {
      const plans = getPlans();
      expect(plans.pro.priceMonthly).toBe(24);
      expect(plans.pro.limits.storeGenerations).toBe(50);
      expect(plans.pro.marketingBullets[0]).toContain("50");
    } finally {
      delete process.env.PLAN_PRO_PRICE;
      delete process.env.PLAN_PRO_STORE_GENERATIONS;
    }
  });

  it("ignores invalid overrides", () => {
    process.env.PLAN_FREE_STORE_GENERATIONS = "lots";
    try {
      expect(getPlans().free.limits.storeGenerations).toBe(3);
    } finally {
      delete process.env.PLAN_FREE_STORE_GENERATIONS;
    }
  });
});
