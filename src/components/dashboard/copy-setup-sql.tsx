"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SETUP_SQL } from "@/lib/generated/setup-sql";

export function CopySetupSql() {
  const [copied, setCopied] = React.useState(false);
  const [showManual, setShowManual] = React.useState(false);

  return (
    <div className="mt-6 space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          size="lg"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(SETUP_SQL);
              setCopied(true);
            } catch {
              setShowManual(true);
            }
          }}
        >
          {copied ? <Check /> : <Copy />}
          {copied ? "SQL copied: paste it in Supabase" : "Copy database setup SQL"}
        </Button>
        <Button size="lg" variant="secondary" onClick={() => setShowManual((v) => !v)}>
          {showManual ? "Hide SQL" : "Show SQL"}
        </Button>
      </div>
      {showManual && (
        <textarea
          readOnly
          aria-label="Database setup SQL"
          value={SETUP_SQL}
          onFocus={(e) => e.currentTarget.select()}
          className="h-64 w-full rounded-xl border border-border-strong bg-bg p-3 font-mono text-xs text-fg-muted"
        />
      )}
      <p className="text-xs text-fg-subtle">
        If Supabase warns about “destructive operations”, that refers to safely replacing this script&apos;s own
        access policies. Choose “Run this query”.
      </p>
    </div>
  );
}
