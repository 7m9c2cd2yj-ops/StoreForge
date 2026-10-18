"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <AlertTriangle className="mx-auto size-8 text-warning" aria-hidden />
      <h1 className="mt-4 text-xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-sm text-fg-muted">
        We couldn&apos;t load this page. Your data is safe — please try again.
      </p>
      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        <Button onClick={reset}>Try again</Button>
        <Button asChild variant="secondary">
          <a href="/api/health">Setup status</a>
        </Button>
      </div>
      {error.digest && <p className="mt-6 font-mono text-xs text-fg-subtle">Error {error.digest}</p>}
    </div>
  );
}
