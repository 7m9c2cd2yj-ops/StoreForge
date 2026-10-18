"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { CharCount, Section, StringListEditor } from "@/components/workspace/fields";
import type { StoreContent } from "@/lib/blueprint";
import type { ContentUpdater } from "@/components/workspace/workspace";

const HEX = /^#[0-9a-f]{6}$/i;

export function BrandingTab({ content, update }: { content: StoreContent; update: ContentUpdater }) {
  const colors = content.brand_colors;
  const setColor = (index: number, patch: Partial<StoreContent["brand_colors"][number]>) =>
    update("brand_colors", colors.map((c, i) => (i === index ? { ...c, ...patch } : c)));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Section title="Identity" className="lg:col-span-2">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Store name" htmlFor="store_name" error={content.store_name.trim() ? undefined : "Store name is required"}>
            <Input id="store_name" maxLength={120} value={content.store_name} onChange={(e) => update("store_name", e.target.value)} />
          </Field>
          <Field label="Tagline" htmlFor="tagline">
            <Input id="tagline" maxLength={200} value={content.tagline} onChange={(e) => update("tagline", e.target.value)} />
          </Field>
        </div>
        <Field label="Brand story" htmlFor="brand_story">
          <Textarea id="brand_story" rows={8} maxLength={5000} value={content.brand_story} onChange={(e) => update("brand_story", e.target.value)} />
        </Field>
        <div className="flex justify-end">
          <CharCount value={content.brand_story} max={5000} />
        </div>
      </Section>

      <Section title="Colors" description="Up to 8 colors. Use these in your Shopify theme settings.">
        <ul className="space-y-3">
          {colors.map((color, index) => (
            <li key={index} className="grid grid-cols-[auto_1fr_auto] items-start gap-3 rounded-xl border border-border bg-surface-2 p-3">
              <label className="relative mt-0.5 block size-10 cursor-pointer overflow-hidden rounded-lg border border-white/10" style={{ backgroundColor: HEX.test(color.hex) ? color.hex : "#000" }}>
                <span className="sr-only">Pick color {index + 1}</span>
                <input
                  type="color"
                  value={HEX.test(color.hex) ? color.hex : "#000000"}
                  onChange={(e) => setColor(index, { hex: e.target.value })}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
              </label>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input aria-label={`Color ${index + 1} name`} value={color.name} maxLength={60} placeholder="Name" onChange={(e) => setColor(index, { name: e.target.value })} />
                <Input
                  aria-label={`Color ${index + 1} hex`}
                  value={color.hex}
                  maxLength={7}
                  className="font-mono"
                  aria-invalid={!HEX.test(color.hex)}
                  onChange={(e) => setColor(index, { hex: e.target.value.trim() })}
                />
                <Input aria-label={`Color ${index + 1} usage`} className="sm:col-span-2" value={color.usage} maxLength={200} placeholder="Where it's used" onChange={(e) => setColor(index, { usage: e.target.value })} />
              </div>
              <Button size="icon-sm" variant="ghost" aria-label={`Remove color ${index + 1}`} onClick={() => update("brand_colors", colors.filter((_, i) => i !== index))}>
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
        {colors.some((c) => !HEX.test(c.hex)) && (
          <p className="text-sm text-warning">Colors with an invalid hex code (use #RRGGBB) are not saved.</p>
        )}
        {colors.length < 8 && (
          <Button size="sm" variant="ghost" onClick={() => update("brand_colors", [...colors, { name: "New color", hex: "#8b5cf6", usage: "" }])}>
            <Plus /> Add color
          </Button>
        )}
      </Section>

      <div className="space-y-4">
        <Section title="Typography">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Heading font" htmlFor="heading_font">
              <Input id="heading_font" maxLength={80} value={content.typography.heading_font} onChange={(e) => update("typography", { ...content.typography, heading_font: e.target.value })} />
            </Field>
            <Field label="Body font" htmlFor="body_font">
              <Input id="body_font" maxLength={80} value={content.typography.body_font} onChange={(e) => update("typography", { ...content.typography, body_font: e.target.value })} />
            </Field>
          </div>
          <Field label="Rationale" htmlFor="type_rationale">
            <Textarea id="type_rationale" rows={3} maxLength={500} value={content.typography.rationale} onChange={(e) => update("typography", { ...content.typography, rationale: e.target.value })} />
          </Field>
        </Section>

        <Section title="Positioning">
          <Field label="Positioning statement" htmlFor="positioning">
            <Textarea id="positioning" rows={4} maxLength={1000} value={content.positioning.statement} onChange={(e) => update("positioning", { ...content.positioning, statement: e.target.value })} />
          </Field>
          <Field label="Price positioning" htmlFor="price_positioning">
            <Input id="price_positioning" maxLength={200} value={content.positioning.price_positioning} onChange={(e) => update("positioning", { ...content.positioning, price_positioning: e.target.value })} />
          </Field>
          <Field label="Differentiators" htmlFor="differentiators">
            <StringListEditor
              id="differentiators"
              values={content.positioning.differentiators}
              onChange={(values) => update("positioning", { ...content.positioning, differentiators: values })}
              max={8}
              maxLength={300}
              placeholder="Differentiator"
              addLabel="Add differentiator"
            />
          </Field>
        </Section>
      </div>

      <Section title="Target audience" className="lg:col-span-2">
        <Field label="Summary" htmlFor="audience_summary">
          <Textarea id="audience_summary" rows={3} maxLength={1000} value={content.target_audience.summary} onChange={(e) => update("target_audience", { ...content.target_audience, summary: e.target.value })} />
        </Field>
        <Field label="Segments" htmlFor="segments">
          <StringListEditor
            id="segments"
            values={content.target_audience.segments}
            onChange={(values) => update("target_audience", { ...content.target_audience, segments: values })}
            max={8}
            maxLength={200}
            placeholder="Segment"
            addLabel="Add segment"
          />
        </Field>
      </Section>
    </div>
  );
}
