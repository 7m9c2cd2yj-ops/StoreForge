"use client";

import Link from "next/link";
import { Braces, FileSpreadsheet, FileText, Lock, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/misc";
import { CopyButton, Section } from "@/components/workspace/fields";
import type { StoreContent } from "@/lib/blueprint";
import type { ExportAccess } from "@/components/workspace/workspace";

type Props = { projectId: string; content: StoreContent; access: ExportAccess };

export function ExportTab({ projectId, content, access }: Props) {
  const hp = content.homepage;
  const homepageText = [
    hp.hero_headline,
    hp.hero_subheadline,
    `[${hp.hero_cta}]`,
    "",
    hp.featured_heading,
    hp.featured_subheading,
    "",
    ...hp.benefits.map((b) => `${b.title}: ${b.description}`),
    "",
    hp.story_heading,
    hp.story_body,
    "",
    hp.faq_heading,
    ...content.faq.map((f) => `Q: ${f.question}\nA: ${f.answer}`),
    "",
    hp.newsletter_heading,
    hp.newsletter_body,
    "",
    hp.footer_tagline,
  ].join("\n");

  const exports = [
    { format: "shopify", title: "Shopify product CSV", body: "Import via Shopify admin → Products → Import. Products arrive as drafts.", icon: ShoppingBag, allowed: access.export },
    { format: "csv", title: "Product spreadsheet (CSV)", body: "Titles, descriptions, prices, categories and SEO in a simple spreadsheet.", icon: FileSpreadsheet, allowed: access.export },
    { format: "markdown", title: "Store blueprint (Markdown)", body: "The complete concept: brand, products, pages, SEO and checklist.", icon: FileText, allowed: access.export },
    { format: "json", title: "Full blueprint (JSON)", body: "Machine-readable export for agencies and integrations.", icon: Braces, allowed: access.jsonExport },
  ];

  return (
    <div className="space-y-4">
      {!access.export && (
        <Alert variant="neutral" title={`Exports aren't included in the ${access.planName} plan`}>
          Upgrade to Pro to download a Shopify-ready product CSV and your full blueprint.{" "}
          <Link href="/dashboard/billing" className="text-accent-text underline">View plans</Link>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {exports.map(({ format, title, body, icon: Icon, allowed }) => (
          <div key={format} className="flex flex-col rounded-2xl border border-border bg-surface p-5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-accent-soft text-accent-text">
              <Icon className="size-5" aria-hidden />
            </div>
            <h3 className="mt-4 font-semibold">{title}</h3>
            <p className="mt-1 flex-1 text-sm text-fg-muted">{body}</p>
            <div className="mt-5">
              {allowed ? (
                <Button asChild variant="secondary" className="w-full sm:w-auto">
                  {/* Plain link: the route returns an attachment, verified server-side. */}
                  <a href={`/api/projects/${projectId}/export?format=${format}`} download>
                    Download
                  </a>
                </Button>
              ) : (
                <Button asChild variant="ghost" className="w-full sm:w-auto">
                  <Link href="/dashboard/billing">
                    <Lock /> {format === "json" ? "Business plan" : "Pro plan"}
                  </Link>
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <Section title="Copy homepage content" description="Plain-text copy of every homepage section, ready to paste. Available on every plan." actions={<CopyButton text={homepageText} label="Copy all" />}>
        <pre className="max-h-80 overflow-auto rounded-xl border border-border bg-bg p-4 font-sans text-sm leading-relaxed whitespace-pre-wrap text-fg-muted">
          {homepageText}
        </pre>
      </Section>
    </div>
  );
}
