"use client";

import { Plus, Trash2, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { CopyButton, Section } from "@/components/workspace/fields";
import type { StoreContent } from "@/lib/blueprint";
import type { ProductRow } from "@/lib/actions/projects";
import type { ContentUpdater } from "@/components/workspace/workspace";
import { formatMoney } from "@/lib/utils";

type Props = { content: StoreContent; update: ContentUpdater; products: ProductRow[]; currency: string };

export function HomepageTab({ content, update, products, currency }: Props) {
  const hp = content.homepage;
  const setHp = (patch: Partial<StoreContent["homepage"]>) => update("homepage", { ...hp, ...patch });

  return (
    <div className="space-y-4">
      <p className="text-sm text-fg-muted">
        Homepage structure in recommended order. Edit the copy here, then paste each section into your Shopify theme editor.
      </p>

      <Section title="1 · Hero" actions={<CopyButton text={`${hp.hero_headline}\n\n${hp.hero_subheadline}\n\n${hp.hero_cta}`} />}>
        <Field label="Headline" htmlFor="hero_headline">
          <Input id="hero_headline" maxLength={200} value={hp.hero_headline} onChange={(e) => setHp({ hero_headline: e.target.value })} />
        </Field>
        <Field label="Subheadline" htmlFor="hero_subheadline">
          <Textarea id="hero_subheadline" rows={2} maxLength={400} value={hp.hero_subheadline} onChange={(e) => setHp({ hero_subheadline: e.target.value })} />
        </Field>
        <Field label="Button label" htmlFor="hero_cta">
          <Input id="hero_cta" maxLength={60} value={hp.hero_cta} onChange={(e) => setHp({ hero_cta: e.target.value })} />
        </Field>
      </Section>

      <Section title="2 · Featured products" actions={<CopyButton text={`${hp.featured_heading}\n\n${hp.featured_subheading}`} />}>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Heading" htmlFor="featured_heading">
            <Input id="featured_heading" maxLength={150} value={hp.featured_heading} onChange={(e) => setHp({ featured_heading: e.target.value })} />
          </Field>
          <Field label="Subheading" htmlFor="featured_subheading">
            <Input id="featured_subheading" maxLength={300} value={hp.featured_subheading} onChange={(e) => setHp({ featured_subheading: e.target.value })} />
          </Field>
        </div>
        <ul className="grid gap-2 sm:grid-cols-2">
          {products.slice(0, 4).map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm">
              <span className="truncate">{p.title}</span>
              <span className="shrink-0 text-fg-subtle tabular-nums">{formatMoney(p.price, currency)}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-fg-subtle">Shows your first four products. Edit them in the Products tab.</p>
      </Section>

      <Section
        title="3 · Benefits"
        actions={<CopyButton text={hp.benefits.map((b) => `${b.title}\n${b.description}`).join("\n\n")} />}
      >
        {hp.benefits.map((benefit, index) => (
          <div key={index} className="grid gap-2 rounded-xl border border-border bg-surface-2 p-3 sm:grid-cols-[1fr_2fr_auto]">
            <Input aria-label={`Benefit ${index + 1} title`} value={benefit.title} maxLength={120} onChange={(e) => setHp({ benefits: hp.benefits.map((b, i) => (i === index ? { ...b, title: e.target.value } : b)) })} />
            <Input aria-label={`Benefit ${index + 1} description`} value={benefit.description} maxLength={400} onChange={(e) => setHp({ benefits: hp.benefits.map((b, i) => (i === index ? { ...b, description: e.target.value } : b)) })} />
            <Button size="icon" variant="ghost" aria-label={`Remove benefit ${index + 1}`} onClick={() => setHp({ benefits: hp.benefits.filter((_, i) => i !== index) })}>
              <Trash2 />
            </Button>
          </div>
        ))}
        {hp.benefits.length < 8 && (
          <Button size="sm" variant="ghost" onClick={() => setHp({ benefits: [...hp.benefits, { title: "", description: "" }] })}>
            <Plus /> Add benefit
          </Button>
        )}
      </Section>

      <Section title="4 · Brand story" actions={<CopyButton text={`${hp.story_heading}\n\n${hp.story_body}`} />}>
        <Field label="Heading" htmlFor="story_heading">
          <Input id="story_heading" maxLength={150} value={hp.story_heading} onChange={(e) => setHp({ story_heading: e.target.value })} />
        </Field>
        <Field label="Body" htmlFor="story_body">
          <Textarea id="story_body" rows={5} maxLength={2000} value={hp.story_body} onChange={(e) => setHp({ story_body: e.target.value })} />
        </Field>
      </Section>

      <section className="rounded-2xl border border-dashed border-border-strong p-5 sm:p-6" aria-labelledby="testimonials-heading">
        <div className="flex items-center gap-2">
          <Quote className="size-4 text-fg-subtle" aria-hidden />
          <h3 id="testimonials-heading" className="font-semibold">5 · Testimonials</h3>
          <span className="rounded-full border border-amber-400/25 bg-amber-400/10 px-2 py-0.5 text-xs text-amber-300">Placeholder</span>
        </div>
        <p className="mt-2 text-sm text-fg-muted">
          Reserve this section for genuine reviews from real customers after launch (for example via a Shopify reviews app).
          StoreForge never generates testimonials, and publishing invented reviews is misleading and often illegal.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3" aria-hidden>
          {[1, 2, 3].map((n) => (
            <div key={n} className="rounded-xl border border-border bg-surface-2/50 p-4 text-sm text-fg-subtle italic">
              [Real customer review {n}]
            </div>
          ))}
        </div>
      </section>

      <Section
        title={`6 · ${hp.faq_heading || "FAQ"}`}
        actions={<CopyButton text={content.faq.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n")} />}
      >
        <Field label="Section heading" htmlFor="faq_heading">
          <Input id="faq_heading" maxLength={150} value={hp.faq_heading} onChange={(e) => setHp({ faq_heading: e.target.value })} />
        </Field>
        {content.faq.map((item, index) => (
          <div key={index} className="space-y-2 rounded-xl border border-border bg-surface-2 p-3">
            <div className="flex gap-2">
              <Input aria-label={`Question ${index + 1}`} value={item.question} maxLength={300} placeholder="Question" onChange={(e) => update("faq", content.faq.map((f, i) => (i === index ? { ...f, question: e.target.value } : f)))} />
              <Button size="icon" variant="ghost" aria-label={`Remove question ${index + 1}`} onClick={() => update("faq", content.faq.filter((_, i) => i !== index))}>
                <Trash2 />
              </Button>
            </div>
            <Textarea aria-label={`Answer ${index + 1}`} rows={3} value={item.answer} maxLength={1500} placeholder="Answer" onChange={(e) => update("faq", content.faq.map((f, i) => (i === index ? { ...f, answer: e.target.value } : f)))} />
          </div>
        ))}
        {content.faq.length < 15 && (
          <Button size="sm" variant="ghost" onClick={() => update("faq", [...content.faq, { question: "New question", answer: "" }])}>
            <Plus /> Add question
          </Button>
        )}
      </Section>

      <Section title="7 · Newsletter & footer" actions={<CopyButton text={`${hp.newsletter_heading}\n${hp.newsletter_body}\n\n${hp.footer_tagline}`} />}>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Newsletter heading" htmlFor="newsletter_heading">
            <Input id="newsletter_heading" maxLength={150} value={hp.newsletter_heading} onChange={(e) => setHp({ newsletter_heading: e.target.value })} />
          </Field>
          <Field label="Newsletter text" htmlFor="newsletter_body">
            <Input id="newsletter_body" maxLength={300} value={hp.newsletter_body} onChange={(e) => setHp({ newsletter_body: e.target.value })} />
          </Field>
        </div>
        <Field label="Footer tagline" htmlFor="footer_tagline">
          <Input id="footer_tagline" maxLength={300} value={hp.footer_tagline} onChange={(e) => setHp({ footer_tagline: e.target.value })} />
        </Field>
      </Section>

      <Section title="About page" actions={<CopyButton text={`${content.about_page.heading}\n\n${content.about_page.body}`} />}>
        <Field label="Heading" htmlFor="about_heading">
          <Input id="about_heading" maxLength={150} value={content.about_page.heading} onChange={(e) => update("about_page", { ...content.about_page, heading: e.target.value })} />
        </Field>
        <Field label="Body" htmlFor="about_body">
          <Textarea id="about_body" rows={10} maxLength={6000} value={content.about_page.body} onChange={(e) => update("about_page", { ...content.about_page, body: e.target.value })} />
        </Field>
      </Section>
    </div>
  );
}
