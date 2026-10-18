import { describe, expect, it } from "vitest";
import { BACKEND_ISSUE_COPY, BackendError, backendIssueOf, classifyDbError, throwDbError } from "@/lib/backend-errors";

describe("classifyDbError", () => {
  it.each([
    // Real Supabase / PostgREST responses
    [{ code: "PGRST205", message: "Could not find the table 'public.subscriptions' in the schema cache" }, "missing_schema"],
    [{ code: "PGRST202", message: "Could not find the function public.reserve_usage without parameters in the schema cache" }, "missing_schema"],
    [{ code: "42P01", message: 'relation "public.usage_events" does not exist' }, "missing_schema"],
    [{ message: "Invalid API key", hint: "Double check your Supabase `anon` or `service_role` API key." }, "invalid_service_key"],
    [{ code: "PGRST301", message: "JWSError JWSInvalidSignature" }, "invalid_service_key"],
    [{ code: "42501", message: "permission denied for table subscriptions" }, "service_key_not_privileged"],
    [{ code: "", message: "TypeError: fetch failed", details: "getaddrinfo ENOTFOUND abc.supabase.co" }, "unreachable"],
    [{ code: "XX000", message: "something odd" }, "unknown"],
    [null, "unknown"],
  ])("%j -> %s", (error, expected) => {
    expect(classifyDbError(error)).toBe(expected);
  });
});

describe("BackendError helpers", () => {
  it("throws a classified error and exposes its issue", () => {
    let caught: unknown;
    try {
      throwDbError("load subscription", { code: "PGRST205", message: "schema cache" });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(BackendError);
    expect(backendIssueOf(caught)).toBe("missing_schema");
    expect(backendIssueOf(new Error("other"))).toBeNull();
  });

  it("has user-facing copy for every issue", () => {
    for (const copy of Object.values(BACKEND_ISSUE_COPY)) {
      expect(copy.title.length).toBeGreaterThan(5);
      expect(copy.steps.length).toBeGreaterThan(0);
    }
  });
});
