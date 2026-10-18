import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanEnvValue, normalizeBaseUrl } from "@/lib/env";

describe("normalizeBaseUrl", () => {
  it.each([
    ["https://abcdefgh.supabase.co", "https://abcdefgh.supabase.co"],
    ["abcdefgh.supabase.co", "https://abcdefgh.supabase.co"],
    ["  https://abcdefgh.supabase.co/  ", "https://abcdefgh.supabase.co"],
    ['"https://abcdefgh.supabase.co"', "https://abcdefgh.supabase.co"],
    ["https://abcdefgh.supabase.co/rest/v1/", "https://abcdefgh.supabase.co"],
    ["http://localhost:54321", "http://localhost:54321"],
    ["storeforge-ten.vercel.app", "https://storeforge-ten.vercel.app"],
  ])("%s -> %s", (input, expected) => {
    expect(normalizeBaseUrl(input)).toBe(expected);
  });

  it.each(["", undefined, "abcdefgh", "your-project-url", "ftp://x.supabase.co", "https://"])("rejects %s", (input) => {
    expect(normalizeBaseUrl(input)).toBeNull();
  });
});

describe("cleanEnvValue", () => {
  it("strips whitespace and surrounding quotes only", () => {
    expect(cleanEnvValue("  'sk_test_123'\n")).toBe("sk_test_123");
    expect(cleanEnvValue('ab"c')).toBe('ab"c');
    expect(cleanEnvValue(undefined)).toBe("");
  });
});

describe("supabase configuration", () => {
  afterEach(() => vi.unstubAllEnvs());

  async function load(url: string, key = "anon-key") {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", url);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", key);
    return import("@/lib/env");
  }

  it("treats a malformed URL as not configured instead of crashing", async () => {
    const env = await load("my project url");
    expect(env.isSupabaseConfigured()).toBe(false);
    expect(env.supabaseConfigProblem()).toMatch(/not a valid URL/);
  });

  it("repairs a URL pasted without https://", async () => {
    const env = await load("abcdefgh.supabase.co");
    expect(env.isSupabaseConfigured()).toBe(true);
    expect(env.publicEnv.supabaseUrl).toBe("https://abcdefgh.supabase.co");
    expect(env.supabaseConfigProblem()).toBeNull();
  });

  it("reports a missing key", async () => {
    const env = await load("https://abcdefgh.supabase.co", "");
    expect(env.supabaseConfigProblem()).toMatch(/ANON_KEY is not set/);
  });
});
