import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SETUP_SQL } from "@/lib/generated/setup-sql";

describe("embedded setup SQL", () => {
  it("matches the migration files (run `node scripts/embed-migration.mjs` if this fails)", () => {
    const dir = "supabase/migrations";
    const expected = readdirSync(dir)
      .filter((f) => f.endsWith(".sql"))
      .sort()
      .map((f) => readFileSync(`${dir}/${f}`, "utf8"))
      .join("\n");
    expect(SETUP_SQL).toBe(expected);
    expect(SETUP_SQL).toContain("create table if not exists public.subscriptions");
  });
});
