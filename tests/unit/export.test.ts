import { describe, expect, it } from "vitest";
import { escapeCsvCell, slugify, toCsv } from "@/lib/export/csv";
import { blueprintToMarkdown, productsToCsv, productsToShopifyCsv } from "@/lib/export/blueprint-export";
import { normalizeBlueprint } from "@/lib/blueprint";
import { makeBlueprint } from "../fixtures/blueprint";

const product = (title: string, extra: Partial<{ description: string; price: number; category: string }> = {}) => ({
  title,
  description: extra.description ?? "Line one\n\nLine <two>",
  price: extra.price ?? 12.5,
  category: extra.category ?? "Mugs",
  seo: { title: `${title} SEO`, description: "desc" },
});

describe("csv", () => {
  it("quotes cells containing delimiters, quotes and newlines", () => {
    expect(escapeCsvCell('a,b')).toBe('"a,b"');
    expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsvCell("a\nb")).toBe('"a\nb"');
    expect(escapeCsvCell(null)).toBe("");
  });

  it("neutralises spreadsheet formulas", () => {
    expect(escapeCsvCell("=HYPERLINK(\"x\")")).toBe("\"'=HYPERLINK(\"\"x\"\")\"");
    expect(escapeCsvCell("+1")).toBe("'+1");
    expect(escapeCsvCell("@SUM")).toBe("'@SUM");
  });

  it("writes a BOM and CRLF rows", () => {
    const csv = toCsv(["A", "B"], [[1, 2]]);
    expect(csv.startsWith("﻿A,B\r\n1,2")).toBe(true);
  });

  it("slugifies to URL-safe handles", () => {
    expect(slugify("Café Crème — Large!")).toBe("cafe-creme-large");
    expect(slugify("***")).toBe("item");
  });
});

describe("product exports", () => {
  it("exports a simple product CSV", () => {
    const csv = productsToCsv([product("Mug")]);
    const lines = csv.replace("﻿", "").split("\r\n");
    expect(lines[0]).toBe("Title,Description,Price,Category,SEO title,SEO description");
    expect(lines[1]).toContain("Mug");
    expect(csv).toContain("12.50");
  });

  it("exports Shopify import CSV as drafts with unique handles and escaped HTML", () => {
    const csv = productsToShopifyCsv([product("Mug"), product("Mug")], "Ember & Oak");
    const rows = csv.replace("﻿", "").trim().split("\r\n");
    expect(rows[0].split(",")).toEqual(
      expect.arrayContaining(["Handle", "Title", "Body (HTML)", "Variant Price", "SEO Title", "Status"]),
    );
    expect(rows[1].startsWith("mug,Mug,")).toBe(true);
    expect(rows[2].startsWith("mug-2,Mug,")).toBe(true);
    expect(csv).toContain("<p>Line one</p><p>Line &lt;two&gt;</p>");
    expect(rows[1].endsWith(",draft")).toBe(true);
  });

  it("renders a markdown blueprint with a testimonial placeholder, not fake reviews", () => {
    const result = normalizeBlueprint(makeBlueprint(), { maxProducts: 10, maxAlternativeNames: 3 });
    if (!result.ok) throw new Error("fixture invalid");
    const md = blueprintToMarkdown(result.value.content, [product("Mug")], result.value.checklist);
    expect(md).toContain("# Ember & Oak — Store Blueprint");
    expect(md).toContain("12.50 EUR");
    expect(md).toMatch(/Placeholder — add real customer reviews/);
    expect(md).toContain("[ ] **Choose a domain**");
  });
});
