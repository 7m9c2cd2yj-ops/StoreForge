import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPlan } from "@/lib/config/plans";

/*
 * Exercises the generation route's orchestration: auth, limits, credit
 * reservation, and the guarantee that failed generations are refunded and
 * successful ones consumed. External services are mocked.
 */

const mocks = vi.hoisted(() => ({
  user: { id: "11111111-1111-4111-8111-111111111111", email: "a@example.test" } as { id: string; email: string } | null,
  rateLimitOk: true,
  plan: "free" as "free" | "pro",
  projectCount: 0,
  reserve: vi.fn(),
  consume: vi.fn(),
  refund: vi.fn(),
  generate: vi.fn(),
  writes: [] as { table: string; op: string; payload?: unknown }[],
}));

vi.mock("@/lib/api", async (orig) => ({
  ...(await orig<typeof import("@/lib/api")>()),
  authenticate: async () => {
    const { apiError } = await orig<typeof import("@/lib/api")>();
    return mocks.user ? { user: mocks.user } : { response: apiError(401, "unauthorized", "Please sign in") };
  },
}));
vi.mock("@/lib/env.server", () => ({ isAIConfigured: () => true, serverEnv: { aiStoreEffort: "medium" } }));
vi.mock("@/lib/rate-limit", () => ({ RATE_LIMITS: { storeGeneration: {} }, checkRateLimit: async () => mocks.rateLimitOk }));
vi.mock("@/lib/billing/entitlements", () => ({
  getEntitlements: async () => ({ planId: mocks.plan, plan: getPlan(mocks.plan) }),
}));
vi.mock("@/lib/credits", () => ({
  reserveCredits: mocks.reserve,
  consumeCredits: mocks.consume,
  refundCredits: mocks.refund,
}));
vi.mock("@/lib/ai/store-generator", () => ({ generateStoreBlueprint: mocks.generate }));

// Minimal chainable stand-in for the Supabase query builder.
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from(table: string) {
      const builder = {
        op: "select",
        payload: undefined as unknown,
        result: { error: null } as Record<string, unknown>,
        select(_cols?: string, opts?: { head?: boolean }) {
          if (opts?.head) builder.result = { count: mocks.projectCount, error: null };
          return builder;
        },
        insert(payload: unknown) {
          builder.op = "insert";
          builder.payload = payload;
          mocks.writes.push({ table, op: "insert", payload });
          return builder;
        },
        update(payload: unknown) {
          builder.op = "update";
          builder.payload = payload;
          mocks.writes.push({ table, op: "update", payload });
          return builder;
        },
        delete() {
          mocks.writes.push({ table, op: "delete" });
          return builder;
        },
        eq() {
          return builder;
        },
        maybeSingle: async () => ({ data: null, error: null }),
        single: async () => ({ data: { id: "22222222-2222-4222-8222-222222222222" }, error: null }),
        then(resolve: (v: unknown) => void) {
          resolve(builder.result);
        },
      };
      return builder;
    },
  }),
}));

const { POST } = await import("@/app/api/generate/route");
const { AIError } = await import("@/lib/ai/errors");

const validBody = { input: { businessIdea: "Hand-poured soy candles for design-minded renters" } };
const call = (body: unknown) =>
  POST(new Request("http://localhost/api/generate", { method: "POST", body: JSON.stringify(body) }));

beforeEach(() => {
  mocks.user = { id: "11111111-1111-4111-8111-111111111111", email: "a@example.test" };
  mocks.rateLimitOk = true;
  mocks.plan = "free";
  mocks.projectCount = 0;
  mocks.writes = [];
  mocks.reserve.mockReset().mockResolvedValue({ ok: true, reservationId: "res-1" });
  mocks.consume.mockReset();
  mocks.refund.mockReset();
  mocks.generate.mockReset();
});

describe("POST /api/generate", () => {
  it("requires authentication", async () => {
    mocks.user = null;
    expect((await call(validBody)).status).toBe(401);
    expect(mocks.reserve).not.toHaveBeenCalled();
  });

  it("validates input before spending credits", async () => {
    const res = await call({ input: { businessIdea: "short" } });
    expect(res.status).toBe(400);
    expect(mocks.reserve).not.toHaveBeenCalled();
  });

  it("rate limits", async () => {
    mocks.rateLimitOk = false;
    expect((await call(validBody)).status).toBe(429);
    expect(mocks.reserve).not.toHaveBeenCalled();
  });

  it("enforces the plan's project limit", async () => {
    mocks.projectCount = getPlan("free").limits.projects;
    const res = await call(validBody);
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe("project_limit");
    expect(mocks.reserve).not.toHaveBeenCalled();
  });

  it("returns 402 when the monthly allowance is used up", async () => {
    mocks.reserve.mockResolvedValue({ ok: false, reason: "limit_reached", limit: 3 });
    const res = await call(validBody);
    expect(res.status).toBe(402);
    expect(mocks.generate).not.toHaveBeenCalled();
  });

  it("consumes the credit and saves the project on success", async () => {
    mocks.generate.mockResolvedValue({
      content: { store_name: "Ember & Oak" },
      products: [{ title: "Candle", description: "", price: 30, category: "", seo: { title: "", description: "" } }],
      checklist: [],
    });
    const res = await call(validBody);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ projectId: "22222222-2222-4222-8222-222222222222" });
    expect(mocks.consume).toHaveBeenCalledWith("res-1");
    expect(mocks.refund).not.toHaveBeenCalled();
    expect(mocks.writes).toContainEqual(expect.objectContaining({ table: "projects", op: "update", payload: expect.objectContaining({ status: "ready" }) }));
    expect(mocks.writes).toContainEqual(expect.objectContaining({ table: "products", op: "insert" }));
  });

  it.each(["timeout", "invalid_output", "provider_error", "refused"] as const)(
    "refunds the credit when generation fails (%s)",
    async (code) => {
      mocks.generate.mockRejectedValue(new AIError(code));
      const res = await call(validBody);
      expect(res.status).toBeGreaterThanOrEqual(400);
      const body = await res.json();
      expect(body.error.code).toBe(code);
      expect(body.error.message).toMatch(/refunded/);
      expect(mocks.refund).toHaveBeenCalledWith("res-1");
      expect(mocks.consume).not.toHaveBeenCalled();
      expect(mocks.writes).toContainEqual(expect.objectContaining({ table: "projects", op: "update", payload: expect.objectContaining({ status: "failed" }) }));
    },
  );

  it("refunds on unexpected errors without leaking details", async () => {
    mocks.generate.mockRejectedValue(new Error("db password is hunter2"));
    const res = await call(validBody);
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("hunter2");
    expect(mocks.refund).toHaveBeenCalledOnce();
  });
});
