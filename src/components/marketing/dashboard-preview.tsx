"use client";

import * as React from "react";
import { LayoutGrid, Package, Palette, Rocket, Check } from "lucide-react";
import { cn } from "@/lib/utils";

/*
 * Interactive preview of the workspace with a fixed, illustrative example.
 * It is clearly labelled as an example; nothing here is live data.
 */

const EXAMPLE = {
  name: "Ember & Oak",
  tagline: "Slow-burning comfort for considered homes.",
  niche: "Hand-poured soy candles",
  colors: [
    { name: "Charcoal", hex: "#1f1d1b" },
    { name: "Ember", hex: "#c2410c" },
    { name: "Oat", hex: "#e7dccb" },
    { name: "Moss", hex: "#4d5b3c" },
  ],
  products: [
    { title: "Cedar Hearth Candle", price: "€34", category: "Signature" },
    { title: "Fig & Amber Travel Tin", price: "€18", category: "Travel" },
    { title: "Wick Trimmer — Brass", price: "€22", category: "Care" },
  ],
  checklist: [
    { label: "Choose a domain", done: true },
    { label: "Import product CSV", done: true },
    { label: "Add product photography", done: false },
    { label: "Configure shipping", done: false },
  ],
};

const TABS = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "brand", label: "Branding", icon: Palette },
  { id: "products", label: "Products", icon: Package },
  { id: "launch", label: "Launch", icon: Rocket },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function DashboardPreview() {
  const [tab, setTab] = React.useState<TabId>("overview");

  return (
    <div className="relative mx-auto w-full max-w-4xl">
      <div aria-hidden className="absolute -inset-x-8 -top-8 -bottom-8 rounded-[2rem] bg-accent/10 blur-3xl" />
      <div className="relative overflow-hidden rounded-2xl border border-border-strong bg-surface shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex items-center gap-1.5" aria-hidden>
            <span className="size-2.5 rounded-full bg-white/15" />
            <span className="size-2.5 rounded-full bg-white/15" />
            <span className="size-2.5 rounded-full bg-white/15" />
          </div>
          <span className="truncate text-xs text-fg-subtle">Example output · {EXAMPLE.niche}</span>
          <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2 py-0.5 text-[11px] text-emerald-300">
            Ready
          </span>
        </div>

        <div className="flex gap-1 overflow-x-auto border-b border-border px-3 py-2 [scrollbar-width:none]" role="tablist" aria-label="Preview sections">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                tab === id ? "bg-surface-3 text-fg" : "text-fg-muted hover:text-fg",
              )}
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </button>
          ))}
        </div>

        <div className="min-h-[300px] p-5 sm:p-6" role="tabpanel">
          {tab === "overview" && (
            <div className="grid animate-fade-in gap-4 sm:grid-cols-5">
              <div className="rounded-xl border border-border bg-surface-2 p-5 sm:col-span-3">
                <p className="text-xs tracking-wider text-fg-subtle uppercase">Store concept</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight">{EXAMPLE.name}</p>
                <p className="mt-1 text-fg-muted">{EXAMPLE.tagline}</p>
                <p className="mt-4 text-sm leading-relaxed text-fg-muted">
                  A premium candle house for design-minded renters who want warmth without clutter. Clean soy
                  wax, natural cotton wicks and scents built around a single memory each.
                </p>
              </div>
              <div className="grid gap-4 sm:col-span-2">
                <Stat label="Products drafted" value="12" />
                <Stat label="Homepage sections" value="7" />
                <Stat label="Launch steps" value="11" />
              </div>
            </div>
          )}

          {tab === "brand" && (
            <div className="animate-fade-in">
              <p className="text-sm text-fg-muted">Palette</p>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {EXAMPLE.colors.map((c) => (
                  <div key={c.hex} className="overflow-hidden rounded-xl border border-border">
                    <div className="h-16" style={{ backgroundColor: c.hex }} />
                    <div className="bg-surface-2 px-3 py-2">
                      <p className="text-sm">{c.name}</p>
                      <p className="font-mono text-xs text-fg-subtle">{c.hex}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-border bg-surface-2 p-4">
                  <p className="text-xs text-fg-subtle">Headings</p>
                  <p className="mt-1 font-serif text-xl">Fraunces</p>
                </div>
                <div className="rounded-xl border border-border bg-surface-2 p-4">
                  <p className="text-xs text-fg-subtle">Body</p>
                  <p className="mt-1 text-xl">Inter</p>
                </div>
              </div>
            </div>
          )}

          {tab === "products" && (
            <ul className="animate-fade-in divide-y divide-border rounded-xl border border-border bg-surface-2">
              {EXAMPLE.products.map((p) => (
                <li key={p.title} className="flex items-center justify-between gap-4 px-4 py-3.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{p.title}</p>
                    <p className="text-xs text-fg-subtle">{p.category}</p>
                  </div>
                  <span className="text-sm tabular-nums text-fg-muted">{p.price}</span>
                </li>
              ))}
            </ul>
          )}

          {tab === "launch" && (
            <ul className="animate-fade-in space-y-2">
              {EXAMPLE.checklist.map((item) => (
                <li key={item.label} className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 px-4 py-3">
                  <span
                    className={cn(
                      "flex size-5 items-center justify-center rounded-md border",
                      item.done ? "border-accent bg-accent text-white" : "border-border-strong",
                    )}
                  >
                    {item.done && <Check className="size-3.5" aria-hidden />}
                  </span>
                  <span className={cn("text-sm", item.done && "text-fg-muted line-through")}>{item.label}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface-2 px-4 py-3">
      <p className="text-xs text-fg-subtle">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
