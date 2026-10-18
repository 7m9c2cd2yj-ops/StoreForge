import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  FileDown,
  FileText,
  LayoutTemplate,
  Lightbulb,
  Palette,
  PenLine,
  Sparkles,
  Store,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardPreview } from "@/components/marketing/dashboard-preview";
import { PricingCards } from "@/components/marketing/pricing-cards";
import { getPlans, PLAN_IDS } from "@/lib/config/plans";

const FEATURES = [
  { icon: Store, title: "AI Store Generator", body: "Describe your idea and get a complete store concept: brand, products, pages and SEO in one pass." },
  { icon: Sparkles, title: "AI Brand Name Generator", body: "Short, memorable name ideas shaped by your niche, audience and brand personality." },
  { icon: FileText, title: "Product Description Writer", body: "Benefit-led product copy built only from the details you provide, never invented specs." },
  { icon: LayoutTemplate, title: "Homepage Copy Generator", body: "Hero headlines, section copy and calls to action written to convert." },
  { icon: Palette, title: "Store Branding Assistant", body: "Color palettes, typography pairings and positioning that fit together." },
  { icon: Lightbulb, title: "Product Research & Ideas", body: "Product concepts with clear notes on what to validate before you invest." },
  { icon: PenLine, title: "Editable Store Workspace", body: "Refine every word, price and color. Changes save to your project automatically." },
  { icon: FileDown, title: "Exportable Store Blueprint", body: "Download a Shopify-ready product CSV and a full Markdown blueprint." },
];

const STEPS = [
  { title: "Describe your business", body: "Tell us what you want to sell, who it's for and how it should feel. Only the idea is required." },
  { title: "Let AI generate your store concept", body: "StoreForge drafts your brand, products, homepage, about page, FAQ, SEO and launch plan." },
  { title: "Customize and export your blueprint", body: "Edit everything in your workspace, then export products to Shopify and follow your checklist." },
];

export default function LandingPage() {
  const plans = getPlans();

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-page-glow">
        <div aria-hidden className="absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)]" />
        <div className="relative mx-auto max-w-6xl px-4 pt-16 pb-20 sm:px-6 sm:pt-24 lg:pb-28">
          <div className="mx-auto max-w-3xl text-center">
            <p className="inline-flex items-center gap-2 rounded-full border border-border-strong bg-surface/80 px-3 py-1 text-xs text-fg-muted">
              <span className="size-1.5 rounded-full bg-accent" aria-hidden />
              Your next store starts with one prompt.
            </p>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
              Build Your Shopify Store With <span className="text-accent-text">AI</span>.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-fg-muted text-balance sm:text-lg">
              Turn your business idea into a complete store concept, with branding, product descriptions, and a
              launch-ready plan in minutes.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/dashboard/new">
                  Generate My Store <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="#features">Explore Features</Link>
              </Button>
            </div>
          </div>

          <div className="mt-16 sm:mt-20">
            <DashboardPreview />
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-20 border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <SectionHeading
            eyebrow="Features"
            title="Everything you need to go from idea to launch plan"
            body="Purpose-built AI tools for Shopify merchants, working together in one workspace."
          />
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="group rounded-2xl border border-border bg-surface p-6 transition-colors hover:border-border-strong hover:bg-surface-2"
              >
                <div className="flex size-10 items-center justify-center rounded-xl bg-accent-soft text-accent-text transition-transform group-hover:-translate-y-0.5">
                  <Icon className="size-5" aria-hidden />
                </div>
                <h3 className="mt-5 font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-fg-muted">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-20 border-t border-border bg-surface/40">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <SectionHeading eyebrow="How it works" title="Three steps to a launch-ready concept" />
          <ol className="mt-14 grid gap-4 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="relative rounded-2xl border border-border bg-surface p-6 sm:p-7">
                <span className="flex size-9 items-center justify-center rounded-full border border-accent/40 bg-accent-soft text-sm font-semibold text-accent-text tabular-nums">
                  {index + 1}
                </span>
                <h3 className="mt-5 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-fg-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-20 border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <SectionHeading
            eyebrow="Pricing"
            title="Simple plans that grow with you"
            body="Monthly allowances reset on the first of every month. Cancel anytime."
          />
          <div className="mt-14">
            <PricingCards plans={PLAN_IDS.map((id) => plans[id])} />
          </div>
          <div className="mx-auto mt-8 flex max-w-3xl gap-3 rounded-xl border border-border bg-surface px-5 py-4 text-sm text-fg-muted">
            <Info className="mt-0.5 size-4 shrink-0 text-accent-text" aria-hidden />
            <p>
              StoreForge AI creates store concepts and Shopify-compatible exports. It does not create or publish a
              live store for you: you&apos;ll need to create or connect your own Shopify store to publish.
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl border border-border-strong bg-surface px-6 py-14 text-center sm:px-12">
            <div aria-hidden className="absolute inset-0 bg-page-glow" />
            <div className="relative">
              <BadgeCheck className="mx-auto size-8 text-accent-text" aria-hidden />
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                Your next store starts with one prompt.
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-fg-muted">
                Start free. Generate your first store concept in a few minutes.
              </p>
              <Button asChild size="lg" className="mt-8">
                <Link href="/signup">
                  Build Your Store <ArrowRight />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function SectionHeading({ eyebrow, title, body }: { eyebrow: string; title: string; body?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-sm font-medium text-accent-text">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{title}</h2>
      {body && <p className="mt-4 text-fg-muted text-balance">{body}</p>}
    </div>
  );
}
