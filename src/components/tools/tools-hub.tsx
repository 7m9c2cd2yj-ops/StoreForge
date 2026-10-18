"use client";

import * as React from "react";
import Link from "next/link";
import { BookOpen, FileText, LayoutTemplate, Lightbulb, Search, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Alert, EmptyState, Spinner } from "@/components/ui/misc";
import { CopyButton } from "@/components/workspace/fields";
import { TOOL_INPUT_SCHEMAS, TOOLS, type ToolId, type ToolMeta, type ToolOutput } from "@/lib/ai/tool-definitions";
import { cn } from "@/lib/utils";

const ICONS = {
  sparkles: Sparkles,
  "file-text": FileText,
  lightbulb: Lightbulb,
  layout: LayoutTemplate,
  "book-open": BookOpen,
  search: Search,
} as const;

type Props = { initialTool?: ToolId; remaining: number; limit: number; aiConfigured: boolean };

export function ToolsHub({ initialTool, remaining: initialRemaining, limit, aiConfigured }: Props) {
  const [toolId, setToolId] = React.useState<ToolId>(initialTool ?? "brand-names");
  const [remaining, setRemaining] = React.useState(initialRemaining);
  const tool = TOOLS.find((t) => t.id === toolId)!;

  return (
    <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
      <nav aria-label="AI tools" className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible [scrollbar-width:none]">
        {TOOLS.map((t) => {
          const Icon = ICONS[t.icon];
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setToolId(t.id)}
              aria-current={t.id === toolId ? "true" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors lg:w-full",
                t.id === toolId ? "border-accent/40 bg-accent-soft text-fg" : "border-border bg-surface text-fg-muted hover:border-border-strong hover:text-fg",
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              {t.name}
            </button>
          );
        })}
        <p className="hidden px-1 pt-3 text-xs text-fg-subtle lg:block">
          {remaining} of {limit} tool runs left this month. Failed runs are refunded.
        </p>
      </nav>

      <ToolRunner key={tool.id} tool={tool} aiConfigured={aiConfigured} remaining={remaining} onUsed={() => setRemaining((r) => Math.max(0, r - 1))} />
    </div>
  );
}

function ToolRunner({ tool, aiConfigured, remaining, onUsed }: { tool: ToolMeta; aiConfigured: boolean; remaining: number; onUsed: () => void }) {
  const [values, setValues] = React.useState<Record<string, string>>(() =>
    Object.fromEntries(tool.fields.map((f) => [f.name, f.options?.[0]?.value ?? ""])),
  );
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [output, setOutput] = React.useState<unknown>(null);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = TOOL_INPUT_SCHEMAS[tool.id].safeParse(values);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) errs[String(issue.path[0])] ??= issue.message;
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    setPending(true);
    try {
      const res = await fetch(`/api/tools/${tool.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error?.message ?? "Something went wrong. Please try again.");
        return;
      }
      setOutput(body.output);
      onUsed();
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  const disabled = pending || !aiConfigured || remaining <= 0;

  return (
    <div className="min-w-0 space-y-6">
      <form onSubmit={run} className="rounded-2xl border border-border bg-surface p-5 sm:p-6" noValidate>
        <h2 className="text-lg font-semibold">{tool.name}</h2>
        <p className="mt-1 text-sm text-fg-muted">{tool.description}</p>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {tool.fields.map((field) => {
            const id = `${tool.id}-${field.name}`;
            const common = {
              id,
              value: values[field.name] ?? "",
              maxLength: field.maxLength,
              placeholder: field.placeholder,
              "aria-invalid": Boolean(fieldErrors[field.name]),
              onChange: (ev: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
                setValues((v) => ({ ...v, [field.name]: ev.target.value })),
            };
            return (
              <Field
                key={field.name}
                label={field.label}
                htmlFor={id}
                optional={!field.required}
                error={fieldErrors[field.name]}
                className={field.type === "textarea" ? "sm:col-span-2" : undefined}
              >
                {field.type === "textarea" ? (
                  <Textarea rows={4} {...common} />
                ) : field.type === "select" ? (
                  <Select {...common}>
                    {field.options?.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <Input {...common} />
                )}
              </Field>
            );
          })}
        </div>
        {error && <Alert variant="danger" className="mt-5">{error}</Alert>}
        {!aiConfigured && (
          <Alert variant="warning" className="mt-5">
            AI isn&apos;t configured on this server (missing <code className="font-mono">ANTHROPIC_API_KEY</code>).
          </Alert>
        )}
        {aiConfigured && remaining <= 0 && (
          <Alert variant="warning" className="mt-5">
            You&apos;ve used this month&apos;s AI tool runs. <Link href="/dashboard/billing" className="underline">Upgrade</Link> for more.
          </Alert>
        )}
        <div className="mt-6 flex items-center justify-between gap-3 border-t border-border pt-5">
          <p className="text-xs text-fg-subtle lg:hidden">{remaining} runs left</p>
          <Button type="submit" disabled={disabled} className="ml-auto">
            {pending ? <Spinner /> : <Wand2 />}
            {pending ? "Generating…" : "Generate"}
          </Button>
        </div>
      </form>

      <div aria-live="polite">
        {pending ? (
          <div className="rounded-2xl border border-border bg-surface p-8 text-center text-sm text-fg-muted">
            <Spinner className="mx-auto mb-3 size-6 text-accent-text" />
            Writing… this usually takes 10–40 seconds.
          </div>
        ) : output ? (
          <ToolOutputView toolId={tool.id} output={output} />
        ) : (
          <EmptyState icon={<Wand2 />} title="Results appear here" description="Fill in the details above and click Generate." />
        )}
      </div>
    </div>
  );
}

function Card({ title, copy, children }: { title: string; copy?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold">{title}</h3>
        {copy && <CopyButton text={copy} />}
      </div>
      <div className="mt-3 text-sm leading-relaxed text-fg-muted">{children}</div>
    </div>
  );
}

function ToolOutputView({ toolId, output }: { toolId: ToolId; output: unknown }) {
  switch (toolId) {
    case "brand-names": {
      const o = output as ToolOutput<"brand-names">;
      return (
        <div className="space-y-3">
          <p className="text-xs text-fg-subtle">Domain and trademark availability are not checked. Verify before you commit.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {o.names.map((n) => (
              <Card key={n.name} title={n.name} copy={n.name}>
                <p className="text-xs tracking-wide text-accent-text uppercase">{n.style}</p>
                <p className="mt-1">{n.rationale}</p>
              </Card>
            ))}
          </div>
        </div>
      );
    }
    case "product-description": {
      const o = output as ToolOutput<"product-description">;
      const full = `${o.title}\n\n${o.description}\n\n${o.key_benefits.map((b) => `• ${b}`).join("\n")}`;
      return (
        <div className="space-y-3">
          <Card title={o.title} copy={full}>
            <p className="text-fg">{o.short_description}</p>
            <p className="mt-3 whitespace-pre-line">{o.description}</p>
            <ul className="mt-3 list-disc space-y-1 pl-5">
              {o.key_benefits.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </Card>
          <Card title="SEO" copy={`${o.seo_title}\n${o.seo_description}`}>
            <p className="text-fg">{o.seo_title}</p>
            <p className="mt-1">{o.seo_description}</p>
          </Card>
        </div>
      );
    }
    case "product-ideas": {
      const o = output as ToolOutput<"product-ideas">;
      return (
        <div className="space-y-3">
          <p className="text-xs text-fg-subtle">Ideas only: no market data is implied. Validate demand, sourcing and margins yourself.</p>
          {o.ideas.map((idea) => (
            <Card key={idea.name} title={idea.name}>
              <p>{idea.description}</p>
              <dl className="mt-3 grid gap-2 sm:grid-cols-3">
                <div><dt className="text-xs text-fg-subtle">Customer</dt><dd>{idea.target_customer}</dd></div>
                <div><dt className="text-xs text-fg-subtle">Positioning</dt><dd>{idea.positioning}</dd></div>
                <div><dt className="text-xs text-fg-subtle">Suggested price point</dt><dd>{idea.price_point_suggestion}</dd></div>
              </dl>
              <p className="mt-3 text-xs text-fg-subtle">Validate before launching</p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {idea.things_to_validate.map((t) => <li key={t}>{t}</li>)}
              </ul>
            </Card>
          ))}
        </div>
      );
    }
    case "homepage-copy": {
      const o = output as ToolOutput<"homepage-copy">;
      return (
        <div className="space-y-3">
          <Card title="Headlines" copy={o.headlines.join("\n")}>
            <ul className="space-y-2 text-fg">{o.headlines.map((h) => <li key={h}>{h}</li>)}</ul>
          </Card>
          <Card title="Subheadlines" copy={o.subheadlines.join("\n")}>
            <ul className="space-y-2">{o.subheadlines.map((h) => <li key={h}>{h}</li>)}</ul>
          </Card>
          <Card title="Button labels" copy={o.cta_labels.join("\n")}>
            <div className="flex flex-wrap gap-2">{o.cta_labels.map((c) => <span key={c} className="rounded-lg border border-border-strong px-3 py-1.5 text-fg">{c}</span>)}</div>
          </Card>
          {o.sections.map((s) => (
            <Card key={s.heading} title={s.heading} copy={`${s.heading}\n\n${s.body}`}>
              <p className="whitespace-pre-line">{s.body}</p>
            </Card>
          ))}
        </div>
      );
    }
    case "brand-story": {
      const o = output as ToolOutput<"brand-story">;
      return (
        <div className="space-y-3">
          <Card title={o.headline} copy={`${o.headline}\n\n${o.story}`}>
            <p className="whitespace-pre-line">{o.story}</p>
          </Card>
          <Card title="Mission" copy={o.mission}><p className="text-fg">{o.mission}</p></Card>
          <Card title="Values" copy={o.values.map((v) => `${v.name}: ${v.description}`).join("\n")}>
            <ul className="space-y-2">{o.values.map((v) => <li key={v.name}><span className="text-fg">{v.name}</span> — {v.description}</li>)}</ul>
          </Card>
        </div>
      );
    }
    case "seo": {
      const o = output as ToolOutput<"seo">;
      return (
        <div className="space-y-3">
          <Card title="Titles" copy={o.titles.join("\n")}>
            <ul className="space-y-2">{o.titles.map((t) => <li key={t} className="flex justify-between gap-3"><span className="text-fg">{t}</span><span className="shrink-0 text-xs tabular-nums">{t.length}</span></li>)}</ul>
          </Card>
          <Card title="Meta descriptions" copy={o.meta_descriptions.join("\n")}>
            <ul className="space-y-2">{o.meta_descriptions.map((t) => <li key={t} className="flex justify-between gap-3"><span>{t}</span><span className="shrink-0 text-xs tabular-nums">{t.length}</span></li>)}</ul>
          </Card>
          <Card title="Keywords" copy={o.keywords.join(", ")}>
            <div className="flex flex-wrap gap-2">{o.keywords.map((k) => <span key={k} className="rounded-full border border-border-strong px-2.5 py-0.5 text-xs">{k}</span>)}</div>
          </Card>
          <Card title="URL handle" copy={o.url_handle}><code className="font-mono text-accent-text">/{o.url_handle}</code></Card>
        </div>
      );
    }
  }
}
