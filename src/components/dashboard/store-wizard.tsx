"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Sparkles, AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Alert, Spinner } from "@/components/ui/misc";
import {
  FULFILLMENT_TYPES,
  PRICE_POSITIONS,
  storeInputSchema,
  type StoreInputDraft,
} from "@/lib/validation/store-input";
import { cn } from "@/lib/utils";

const DRAFT_KEY = "storeforge:wizard-draft";

const STEPS = [
  { id: "business", title: "Business", description: "What are you building?" },
  { id: "brand", title: "Brand", description: "How should it feel?" },
  { id: "products", title: "Products", description: "What will you sell?" },
  { id: "generate", title: "Generate", description: "Review and create" },
] as const;

type Draft = Record<keyof StoreInputDraft, string>;

const EMPTY: Draft = {
  businessIdea: "",
  productCategory: "",
  targetAudience: "",
  targetMarket: "",
  language: "",
  brandPersonality: "",
  preferredColors: "",
  storeStyle: "",
  pricePositioning: "",
  existingBrandName: "",
  productTypes: "",
  productCount: "",
  priceRange: "",
  fulfillment: "",
};

type WizardProps = {
  aiConfigured: boolean;
  generationsRemaining: number;
  maxProducts: number;
  planName: string;
  atProjectLimit: boolean;
  retry?: { projectId: string; input: Partial<Draft> };
};

type Phase = { kind: "editing" } | { kind: "generating"; startedAt: number } | { kind: "error"; message: string; projectId?: string };

export function StoreWizard({ aiConfigured, generationsRemaining, maxProducts, planName, atProjectLimit, retry }: WizardProps) {
  const router = useRouter();
  const [step, setStep] = React.useState(retry ? 3 : 0);
  const [draft, setDraft] = React.useState<Draft>(() => ({ ...EMPTY, ...retry?.input }));
  const [errors, setErrors] = React.useState<Partial<Record<keyof Draft, string>>>({});
  const [phase, setPhase] = React.useState<Phase>({ kind: "editing" });
  const [retryProjectId, setRetryProjectId] = React.useState(retry?.projectId);

  // Restore an unsent draft (per-browser convenience only).
  React.useEffect(() => {
    if (retry) return;
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      // Browser storage is only readable after hydration, so restoring here is intentional.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved) setDraft((d) => ({ ...d, ...JSON.parse(saved) }));
    } catch {
      /* storage unavailable */
    }
  }, [retry]);

  React.useEffect(() => {
    if (retry) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      /* storage unavailable */
    }
  }, [draft, retry]);

  const set = (key: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setDraft((d) => ({ ...d, [key]: e.target.value }));
    setErrors((errs) => ({ ...errs, [key]: undefined }));
  };

  function validate(): ReturnType<typeof storeInputSchema.safeParse> {
    const result = storeInputSchema.safeParse({
      ...draft,
      productCount: draft.productCount === "" ? undefined : draft.productCount,
    });
    if (!result.success) {
      const next: Partial<Record<keyof Draft, string>> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof Draft;
        next[key] ??= issue.message;
      }
      setErrors(next);
    } else {
      setErrors({});
    }
    return result;
  }

  function goNext() {
    // Only the business idea is required; validate it before leaving step 1.
    if (step === 0) {
      const result = validate();
      if (!result.success && result.error.issues.some((i) => i.path[0] === "businessIdea")) return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  async function generate() {
    const result = validate();
    if (!result.success) {
      const firstKey = result.error.issues[0]?.path[0];
      const stepIndex = ["businessIdea", "productCategory", "targetAudience", "targetMarket", "language"].includes(String(firstKey))
        ? 0
        : ["brandPersonality", "preferredColors", "storeStyle", "pricePositioning", "existingBrandName"].includes(String(firstKey))
          ? 1
          : 2;
      setStep(stepIndex);
      return;
    }

    setPhase({ kind: "generating", startedAt: Date.now() });
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: result.data, projectId: retryProjectId }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        if (body?.projectId) setRetryProjectId(body.projectId);
        setPhase({
          kind: "error",
          message: body?.error?.message ?? "Generation failed. Please try again.",
          projectId: body?.projectId,
        });
        return;
      }
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        /* ignore */
      }
      router.push(`/dashboard/projects/${body.projectId}`);
    } catch {
      setPhase({
        kind: "error",
        message:
          "We lost the connection while generating. If it finished, your store will appear on your dashboard shortly.",
      });
    }
  }

  if (phase.kind === "generating") return <GeneratingScreen startedAt={phase.startedAt} />;

  const blocked = !aiConfigured || generationsRemaining <= 0 || (atProjectLimit && !retryProjectId);

  return (
    <div className="mx-auto max-w-3xl">
      <ol className="grid grid-cols-4 gap-2" aria-label="Steps">
        {STEPS.map((s, i) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => (i <= step || draft.businessIdea.trim().length >= 10 ? setStep(i) : undefined)}
              className="group w-full text-left"
              aria-current={i === step ? "step" : undefined}
            >
              <span
                className={cn(
                  "block h-1 rounded-full transition-colors",
                  i < step ? "bg-accent" : i === step ? "bg-accent/70" : "bg-surface-3",
                )}
              />
              <span className={cn("mt-2 block text-xs font-medium sm:text-sm", i === step ? "text-fg" : "text-fg-subtle")}>
                <span className="hidden sm:inline">{i + 1}. </span>
                {s.title}
              </span>
            </button>
          </li>
        ))}
      </ol>

      <div className="mt-8 rounded-2xl border border-border bg-surface p-5 sm:p-8">
        <h2 className="text-xl font-semibold tracking-tight">{STEPS[step].description}</h2>

        {phase.kind === "error" && (
          <Alert variant="danger" title="Generation didn't complete" className="mt-5">
            {phase.message}
          </Alert>
        )}

        <div className="mt-6 grid gap-5">
          {step === 0 && (
            <>
              <Field label="Business idea" htmlFor="businessIdea" error={errors.businessIdea} hint="The only required field. The more specific, the better.">
                <Textarea
                  id="businessIdea"
                  rows={5}
                  maxLength={1500}
                  value={draft.businessIdea}
                  onChange={set("businessIdea")}
                  aria-invalid={Boolean(errors.businessIdea)}
                  placeholder="e.g. A premium brand of hand-poured soy candles inspired by Scandinavian forests, sold online to design-minded renters."
                />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Product category" htmlFor="productCategory" optional error={errors.productCategory}>
                  <Input id="productCategory" maxLength={120} value={draft.productCategory} onChange={set("productCategory")} placeholder="Home fragrance" />
                </Field>
                <Field label="Target market" htmlFor="targetMarket" optional error={errors.targetMarket}>
                  <Input id="targetMarket" maxLength={120} value={draft.targetMarket} onChange={set("targetMarket")} placeholder="Sweden, EU" />
                </Field>
              </div>
              <Field label="Target audience" htmlFor="targetAudience" optional error={errors.targetAudience}>
                <Input id="targetAudience" maxLength={400} value={draft.targetAudience} onChange={set("targetAudience")} placeholder="Urban professionals aged 25-40" />
              </Field>
              <Field label="Preferred language" htmlFor="language" optional hint="Language for all customer-facing copy." error={errors.language}>
                <Input id="language" maxLength={60} value={draft.language} onChange={set("language")} placeholder="English" />
              </Field>
            </>
          )}

          {step === 1 && (
            <>
              <Field label="Brand personality" htmlFor="brandPersonality" optional error={errors.brandPersonality}>
                <Input id="brandPersonality" maxLength={200} value={draft.brandPersonality} onChange={set("brandPersonality")} placeholder="Calm, warm, quietly luxurious" />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Preferred colors" htmlFor="preferredColors" optional error={errors.preferredColors}>
                  <Input id="preferredColors" maxLength={200} value={draft.preferredColors} onChange={set("preferredColors")} placeholder="Earthy greens, off-white" />
                </Field>
                <Field label="Store style" htmlFor="storeStyle" optional error={errors.storeStyle}>
                  <Input id="storeStyle" maxLength={120} value={draft.storeStyle} onChange={set("storeStyle")} placeholder="Minimal, editorial" />
                </Field>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Price positioning" htmlFor="pricePositioning" optional>
                  <Select id="pricePositioning" value={draft.pricePositioning} onChange={set("pricePositioning")}>
                    {PRICE_POSITIONS.map((v) => (
                      <option key={v} value={v}>
                        {v ? v[0].toUpperCase() + v.slice(1) : "Let AI decide"}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Existing brand name" htmlFor="existingBrandName" optional hint="Leave empty to get name ideas." error={errors.existingBrandName}>
                  <Input id="existingBrandName" maxLength={80} value={draft.existingBrandName} onChange={set("existingBrandName")} />
                </Field>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <Field label="Type of products" htmlFor="productTypes" optional error={errors.productTypes}>
                <Textarea id="productTypes" rows={3} maxLength={500} value={draft.productTypes} onChange={set("productTypes")} placeholder="Candles in 3 sizes, travel tins, wick trimmers, gift sets" />
              </Field>
              <div className="grid gap-5 sm:grid-cols-3">
                <Field label="Number of products" htmlFor="productCount" optional hint={`Up to ${maxProducts} on ${planName}.`} error={errors.productCount}>
                  <Input id="productCount" type="number" inputMode="numeric" min={1} max={50} value={draft.productCount} onChange={set("productCount")} placeholder={String(maxProducts)} />
                </Field>
                <Field label="Price range" htmlFor="priceRange" optional error={errors.priceRange}>
                  <Input id="priceRange" maxLength={120} value={draft.priceRange} onChange={set("priceRange")} placeholder="€15–€60" />
                </Field>
                <Field label="Physical or digital" htmlFor="fulfillment" optional>
                  <Select id="fulfillment" value={draft.fulfillment} onChange={set("fulfillment")}>
                    {FULFILLMENT_TYPES.map((v) => (
                      <option key={v} value={v}>
                        {v === "" ? "Let AI decide" : v === "both" ? "Both" : v[0].toUpperCase() + v.slice(1)}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            </>
          )}

          {step === 3 && (
            <Review draft={draft} maxProducts={maxProducts} generationsRemaining={generationsRemaining} />
          )}
        </div>

        {step === 3 && blocked && (
          <div className="mt-6">
            {!aiConfigured ? (
              <Alert variant="warning" title="AI generation isn't configured">
                The server needs an <code className="font-mono">ANTHROPIC_API_KEY</code> to generate stores.
              </Alert>
            ) : generationsRemaining <= 0 ? (
              <Alert variant="warning" title="You've used this month's generations">
                <Link href="/dashboard/billing" className="underline">Upgrade your plan</Link> for more, or wait until your allowance resets.
              </Alert>
            ) : (
              <Alert variant="warning" title="Project limit reached">
                Delete a project or <Link href="/dashboard/billing" className="underline">upgrade</Link> to create another store.
              </Alert>
            )}
          </div>
        )}

        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            <ArrowLeft /> Back
          </Button>
          <div className="flex flex-col gap-3 sm:flex-row">
            {step < 3 && step > 0 && (
              <Button variant="secondary" onClick={() => setStep(3)}>
                Skip to review
              </Button>
            )}
            {step < 3 ? (
              <Button onClick={goNext}>
                Continue <ArrowRight />
              </Button>
            ) : (
              <Button size="lg" onClick={generate} disabled={blocked}>
                {phase.kind === "error" ? <RotateCcw /> : <Sparkles />}
                {phase.kind === "error" ? "Try again" : "Generate My Store"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Review({ draft, maxProducts, generationsRemaining }: { draft: Draft; maxProducts: number; generationsRemaining: number }) {
  const rows: [string, string][] = [
    ["Business idea", draft.businessIdea],
    ["Category", draft.productCategory],
    ["Audience", draft.targetAudience],
    ["Market", draft.targetMarket],
    ["Language", draft.language || "English"],
    ["Personality", draft.brandPersonality],
    ["Colors", draft.preferredColors],
    ["Style", draft.storeStyle],
    ["Price positioning", draft.pricePositioning],
    ["Brand name", draft.existingBrandName],
    ["Products", draft.productTypes],
    ["Number of products", draft.productCount || `${maxProducts} (plan maximum)`],
    ["Price range", draft.priceRange],
    ["Fulfillment", draft.fulfillment],
  ];
  return (
    <>
      <dl className="divide-y divide-border rounded-xl border border-border bg-surface-2">
        {rows.map(([label, value]) => (
          <div key={label} className="grid gap-1 px-4 py-3 sm:grid-cols-3 sm:gap-4">
            <dt className="text-sm text-fg-subtle">{label}</dt>
            <dd className={cn("text-sm break-words sm:col-span-2", value ? "text-fg" : "text-fg-subtle italic")}>
              {value || "AI will decide"}
            </dd>
          </div>
        ))}
      </dl>
      <p className="text-sm text-fg-muted">
        Uses 1 store generation ({generationsRemaining} remaining this month). If generation fails, the credit is
        refunded automatically.
      </p>
    </>
  );
}

const DRAFTING = [
  "brand identity and name ideas",
  "positioning and target audience",
  "products, descriptions and prices",
  "homepage and about page copy",
  "FAQ and SEO metadata",
  "your launch checklist",
];

/**
 * Honest loading state: generation is a single AI request, so we show elapsed
 * time and what the blueprint will contain, without pretending individual
 * steps have completed.
 */
function GeneratingScreen({ startedAt }: { startedAt: number }) {
  const [elapsed, setElapsed] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  const focus = DRAFTING[Math.floor(elapsed / 6) % DRAFTING.length];
  const minutes = Math.floor(elapsed / 60);
  const seconds = String(elapsed % 60).padStart(2, "0");

  return (
    <div className="mx-auto max-w-xl py-10 text-center" role="status" aria-live="polite">
      <div className="relative mx-auto size-16">
        <div className="absolute inset-0 animate-ping rounded-2xl bg-accent/20" aria-hidden />
        <div className="relative flex size-16 items-center justify-center rounded-2xl bg-accent-soft text-accent-text">
          <Sparkles className="size-7" aria-hidden />
        </div>
      </div>
      <h2 className="mt-8 text-2xl font-semibold tracking-tight">Generating your store</h2>
      <p className="mt-2 text-fg-muted">
        This usually takes one to three minutes. You can leave this page: the result is saved to your dashboard.
      </p>
      <div className="mt-8 h-1.5 overflow-hidden rounded-full bg-surface-3" aria-hidden>
        <div className="h-full w-1/3 animate-shimmer rounded-full bg-[linear-gradient(90deg,transparent,var(--color-accent),transparent)] bg-[length:200%_100%]" />
      </div>
      <p className="mt-4 flex items-center justify-center gap-2 text-sm text-fg-muted">
        <Spinner /> Elapsed {minutes}:{seconds}
      </p>

      <div className="mt-10 rounded-2xl border border-border bg-surface p-5 text-left">
        <p className="text-xs tracking-wider text-fg-subtle uppercase">Your blueprint will include</p>
        <ul className="mt-3 space-y-2">
          {DRAFTING.map((item) => (
            <li key={item} className={cn("flex items-center gap-2.5 text-sm transition-colors", item === focus ? "text-fg" : "text-fg-subtle")}>
              <span className="size-1.5 shrink-0 rounded-full bg-accent-text/60" aria-hidden />
              {item[0].toUpperCase() + item.slice(1)}
            </li>
          ))}
        </ul>
      </div>
      {elapsed > 200 && (
        <p className="mt-6 flex items-center justify-center gap-2 text-sm text-warning">
          <AlertTriangle className="size-4" aria-hidden /> Taking longer than usual. Still working…
        </p>
      )}
    </div>
  );
}
