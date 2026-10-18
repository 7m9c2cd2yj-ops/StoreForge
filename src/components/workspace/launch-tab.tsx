"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { Progress } from "@/components/ui/misc";
import { Section } from "@/components/workspace/fields";
import { useAutosave } from "@/components/workspace/save-status";
import { updateChecklist } from "@/lib/actions/projects";
import type { ChecklistItem } from "@/lib/blueprint";
import { cn } from "@/lib/utils";

export function LaunchTab({ projectId, initialChecklist }: { projectId: string; initialChecklist: ChecklistItem[] }) {
  const [items, setItems] = React.useState(initialChecklist);
  useAutosave(`checklist:${projectId}`, items, (value) => updateChecklist(projectId, value).then((r) => (r.ok ? { ok: true } : r)), 300);

  const done = items.filter((i) => i.done).length;
  const groups = React.useMemo(() => {
    const map = new Map<string, ChecklistItem[]>();
    for (const item of items) map.set(item.category || "Launch", [...(map.get(item.category || "Launch") ?? []), item]);
    return [...map.entries()];
  }, [items]);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Launch progress</span>
            <span className="text-fg-muted tabular-nums">
              {done} of {items.length} done
            </span>
          </div>
          <Progress className="mt-3" value={(done / Math.max(1, items.length)) * 100} label="Launch progress" />
        </div>

        {groups.map(([category, list]) => (
          <Section key={category} title={category}>
            <ul className="space-y-2">
              {list.map((item) => (
                <li key={item.id}>
                  <label className="flex cursor-pointer gap-3 rounded-xl border border-border bg-surface-2 p-4 transition-colors hover:border-border-strong">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={item.done}
                      onChange={(e) => setItems((all) => all.map((i) => (i.id === item.id ? { ...i, done: e.target.checked } : i)))}
                    />
                    <span
                      aria-hidden
                      className={cn(
                        "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-accent",
                        item.done ? "border-accent bg-accent text-white" : "border-border-strong",
                      )}
                    >
                      {item.done && <Check className="size-3.5" />}
                    </span>
                    <span>
                      <span className={cn("block text-sm font-medium", item.done && "text-fg-muted line-through")}>{item.title}</span>
                      <span className="mt-1 block text-sm text-fg-muted">{item.description}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </Section>
        ))}
      </div>

      <Section title="Setting up Shopify" description="StoreForge doesn't create your Shopify store. Here's how to set it up yourself.">
        <ol className="list-decimal space-y-3 pl-5 text-sm text-fg-muted marker:text-fg-subtle">
          <li>Create a Shopify account at shopify.com (or sign in to your existing store) and choose a plan.</li>
          <li>Pick a theme in Online Store → Themes that matches the theme recommendations in the Overview tab.</li>
          <li>Apply your brand colors and fonts in the theme editor (Theme settings → Colors / Typography).</li>
          <li>Import products: Products → Import → upload the Shopify CSV from the Export tab. Products arrive as drafts.</li>
          <li>Add product photos and review every title, description and price before setting products to Active.</li>
          <li>Paste your homepage and About page copy into the theme editor and Online Store → Pages.</li>
          <li>Complete shipping, payments, taxes and policies in Settings, then place a test order.</li>
        </ol>
      </Section>
    </div>
  );
}
