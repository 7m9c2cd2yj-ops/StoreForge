import * as React from "react";

export function ProsePage({ title, intro, children }: { title: string; intro?: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
      {intro && <p className="mt-4 text-lg text-fg-muted">{intro}</p>}
      <div className="mt-10 space-y-6 text-[15px] leading-relaxed text-fg-muted [&_h2]:mt-10 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-fg [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-2">
        {children}
      </div>
    </div>
  );
}

export function TemplateNotice() {
  return (
    <div className="rounded-xl border border-amber-400/25 bg-amber-400/[0.07] px-4 py-3 text-sm text-amber-100">
      This is a starting template provided with the StoreForge AI codebase. The operator of this site must
      review and adapt it with qualified legal counsel before relying on it.
    </div>
  );
}
