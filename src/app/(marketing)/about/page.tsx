import type { Metadata } from "next";
import { ProsePage } from "@/components/marketing/prose-page";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <ProsePage
      title="About StoreForge AI"
      intro="StoreForge AI helps founders turn a business idea into a complete, editable Shopify store concept."
    >
      <p>
        Starting an online store involves dozens of creative decisions before the first sale: a name, a visual
        identity, product copy, a homepage, policies and a launch plan. StoreForge AI drafts all of it from a single
        description, so you can spend your time refining instead of staring at a blank page.
      </p>
      <h2>What we do</h2>
      <ul>
        <li>Generate brand names, taglines, stories, color palettes and typography recommendations.</li>
        <li>Draft products with descriptions, suggested prices and SEO copy.</li>
        <li>Write homepage, about page and FAQ copy in your brand voice.</li>
        <li>Export a Shopify-compatible product CSV and a full blueprint you can share.</li>
      </ul>
      <h2>What we don&apos;t do</h2>
      <p>
        StoreForge AI doesn&apos;t publish a live Shopify store, and it never invents sales figures, market data,
        supplier availability or customer reviews. AI output is a starting point. Always review copy, prices and
        claims before publishing them.
      </p>
    </ProsePage>
  );
}
