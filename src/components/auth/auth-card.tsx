import * as React from "react";
import { Alert } from "@/components/ui/misc";
import { isSupabaseConfigured } from "@/lib/env";

export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <>
      <div className="rounded-2xl border border-border bg-surface/90 p-6 shadow-[var(--shadow-card)] backdrop-blur sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-fg-muted">{description}</p>}
        {!isSupabaseConfigured() && (
          <Alert variant="warning" title="Authentication isn't configured" className="mt-6">
            Set <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code className="font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to enable sign-in. See the README.
          </Alert>
        )}
        <div className="mt-6">{children}</div>
      </div>
      {footer && <div className="mt-6 text-center text-sm text-fg-muted">{footer}</div>}
    </>
  );
}
