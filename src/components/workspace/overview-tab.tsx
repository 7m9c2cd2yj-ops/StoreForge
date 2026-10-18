"use client";

import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/misc";
import { Section } from "@/components/workspace/fields";
import type { ChecklistItem, StoreContent } from "@/lib/blueprint";
import type { ProductRow } from "@/lib/actions/projects";
import { formatMoney } from "@/lib/utils";

type Props = {
  content: StoreContent;
  products: ProductRow[];
  checklist: ChecklistItem[];
  currency: string;
  onUseName: (name: string) => void;
  onNavigate: (tab: string) => void;
};

export function OverviewTab({ content, products, checklist, currency, onUseName, onNavigate }: Props) {
  const done = checklist.filter((c) => c.done).length;
  const prices = products.map((p) => p.price).filter((p) => p > 0);
  const priceRange = prices.length
    ? `${formatMoney(Math.min(...prices), currency)} – ${formatMoney(Math.max(...prices), currency)}`
    : "—";

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <Section title="Store concept">
          <div>
            <p className="text-2xl font-semibold tracking-tight">{content.store_name}</p>
            <p className="mt-1 text-fg-muted">{content.tagline}</p>
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-line text-fg-muted">{content.positioning.statement}</p>
          {content.brand_colors.length > 0 && (
            <div className="flex flex-wrap gap-2" aria-label="Brand colors">
              {content.brand_colors.map((c) => (
                <span key={c.hex + c.name} className="flex items-center gap-2 rounded-full border border-border bg-surface-2 py-1 pr-3 pl-1 text-xs">
                  <span className="size-5 rounded-full border border-white/10" style={{ backgroundColor: c.hex }} />
                  {c.name}
                </span>
              ))}
            </div>
          )}
        </Section>

        <Section title="Target audience">
          <p className="text-sm leading-relaxed text-fg-muted">{content.target_audience.summary}</p>
          {content.target_audience.segments.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {content.target_audience.segments.map((s) => (
                <Badge key={s}>{s}</Badge>
              ))}
            </div>
          )}
        </Section>

        <Section title="Brand story">
          <p className="line-clamp-6 text-sm leading-relaxed whitespace-pre-line text-fg-muted">{content.brand_story}</p>
          <Button variant="link" onClick={() => onNavigate("branding")}>
            Edit branding <ArrowRight />
          </Button>
        </Section>

        {content.product_ideas.length > 0 && (
          <Section title="More product ideas" description="Concepts to consider after launch. Validate demand and sourcing yourself.">
            <ul className="space-y-3">
              {content.product_ideas.map((idea) => (
                <li key={idea.name} className="rounded-xl border border-border bg-surface-2 px-4 py-3">
                  <p className="text-sm font-medium">{idea.name}</p>
                  <p className="mt-1 text-sm text-fg-muted">{idea.rationale}</p>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>

      <div className="space-y-4">
        <Section title="At a glance">
          <dl className="grid grid-cols-2 gap-3">
            <Glance label="Products" value={String(products.length)} />
            <Glance label="Categories" value={String(new Set(products.map((p) => p.category).filter(Boolean)).size)} />
            <Glance label="FAQs" value={String(content.faq.length)} />
            <Glance label="Price range" value={priceRange} />
          </dl>
          <div>
            <div className="flex justify-between text-sm">
              <span className="text-fg-muted">Launch progress</span>
              <span className="tabular-nums">
                {done}/{checklist.length}
              </span>
            </div>
            <Progress className="mt-2" value={(done / Math.max(1, checklist.length)) * 100} label="Launch progress" />
          </div>
        </Section>

        {content.alternative_names.length > 0 && (
          <Section title="Alternative names" description="Domain and trademark availability are not checked.">
            <ul className="space-y-2">
              {content.alternative_names.map((n) => (
                <li key={n.name} className="flex items-start justify-between gap-3 rounded-xl border border-border bg-surface-2 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{n.name}</p>
                    <p className="mt-0.5 text-xs text-fg-subtle">{n.rationale}</p>
                  </div>
                  {n.name !== content.store_name && (
                    <Button size="sm" variant="ghost" onClick={() => onUseName(n.name)}>
                      Use
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </Section>
        )}

        <Section title="Shopify theme">
          <p className="text-sm text-fg-muted">{content.theme.style}</p>
          <ul className="space-y-1.5 text-sm text-fg-muted">
            {content.theme.characteristics.map((c) => (
              <li key={c} className="flex gap-2">
                <span className="mt-2 size-1 shrink-0 rounded-full bg-accent-text" aria-hidden />
                {c}
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </div>
  );
}

function Glance({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface-2 px-3 py-2.5">
      <dt className="text-xs text-fg-subtle">{label}</dt>
      <dd className="mt-0.5 truncate text-sm font-medium tabular-nums" title={value}>{value}</dd>
    </div>
  );
}
