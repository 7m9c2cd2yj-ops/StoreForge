import { beforeEach, describe, expect, it, vi } from "vitest";
import Stripe from "stripe";

const SECRET = "whsec_test_secret";

const mocks = vi.hoisted(() => ({
  sync: vi.fn(),
  seen: new Set<string>(),
}));

vi.mock("@/lib/env.server", () => ({
  isStripeConfigured: () => true,
  serverEnv: { stripeSecretKey: "sk_test_123", stripeWebhookSecret: "whsec_test_secret", stripePricePro: "price_pro", stripePriceBusiness: "price_biz" },
}));
vi.mock("@/lib/billing/sync", () => ({ syncSubscriptionById: mocks.sync }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => {
      let id = "";
      const b = {
        select: () => b,
        eq: (_c: string, v: string) => ((id = v), b),
        maybeSingle: async () => ({ data: mocks.seen.has(id) ? { id } : null }),
        upsert: async (row: { id: string }) => (mocks.seen.add(row.id), { error: null }),
      };
      return b;
    },
  }),
}));

const { POST } = await import("@/app/api/stripe/webhook/route");
const stripe = new Stripe("sk_test_123");

function signed(event: object, secret = SECRET) {
  const payload = JSON.stringify(event);
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret });
  return new Request("http://localhost/api/stripe/webhook", {
    method: "POST",
    body: payload,
    headers: { "stripe-signature": header },
  });
}

const subscriptionEvent = (id = "evt_1") => ({
  id,
  object: "event",
  type: "customer.subscription.updated",
  data: { object: { id: "sub_123", object: "subscription" } },
});

beforeEach(() => {
  mocks.sync.mockReset();
  mocks.seen.clear();
});

describe("POST /api/stripe/webhook", () => {
  it("rejects requests without a signature", async () => {
    const res = await POST(new Request("http://localhost/api/stripe/webhook", { method: "POST", body: "{}" }));
    expect(res.status).toBe(400);
    expect(mocks.sync).not.toHaveBeenCalled();
  });

  it("rejects forged signatures", async () => {
    const res = await POST(signed(subscriptionEvent(), "whsec_attacker"));
    expect(res.status).toBe(400);
    expect(mocks.sync).not.toHaveBeenCalled();
  });

  it("rejects tampered payloads", async () => {
    const req = signed(subscriptionEvent());
    const tampered = new Request(req.url, {
      method: "POST",
      headers: req.headers,
      body: JSON.stringify({ ...subscriptionEvent(), data: { object: { id: "sub_attacker" } } }),
    });
    expect((await POST(tampered)).status).toBe(400);
    expect(mocks.sync).not.toHaveBeenCalled();
  });

  it("syncs the subscription from Stripe for valid events", async () => {
    const res = await POST(signed(subscriptionEvent()));
    expect(res.status).toBe(200);
    expect(mocks.sync).toHaveBeenCalledWith("sub_123");
  });

  it("handles checkout completion and payment failures", async () => {
    await POST(signed({ id: "evt_2", object: "event", type: "checkout.session.completed", data: { object: { mode: "subscription", subscription: "sub_from_checkout" } } }));
    await POST(signed({ id: "evt_3", object: "event", type: "invoice.payment_failed", data: { object: { parent: { subscription_details: { subscription: "sub_past_due" } } } } }));
    expect(mocks.sync).toHaveBeenNthCalledWith(1, "sub_from_checkout");
    expect(mocks.sync).toHaveBeenNthCalledWith(2, "sub_past_due");
  });

  it("ignores duplicate deliveries", async () => {
    await POST(signed(subscriptionEvent("evt_dup")));
    const second = await POST(signed(subscriptionEvent("evt_dup")));
    expect(await second.json()).toMatchObject({ duplicate: true });
    expect(mocks.sync).toHaveBeenCalledTimes(1);
  });

  it("returns 500 so Stripe retries when processing fails", async () => {
    mocks.sync.mockRejectedValueOnce(new Error("db down"));
    const res = await POST(signed(subscriptionEvent("evt_fail")));
    expect(res.status).toBe(500);
    expect(mocks.seen.has("evt_fail")).toBe(false);
  });
});
