"use client";

import * as React from "react";
import { Check, Copy, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function CopyButton({ text, label = "Copy", className }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <Button
      type="button"
      size="sm"
      variant="secondary"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          toast.error("Couldn't access the clipboard. Select and copy the text manually.");
        }
      }}
    >
      {copied ? <Check /> : <Copy />}
      {copied ? "Copied" : label}
    </Button>
  );
}

export function CharCount({ value, max, recommended }: { value: string; max: number; recommended?: number }) {
  const over = recommended !== undefined && value.length > recommended;
  return (
    <span className={cn("text-xs tabular-nums", over ? "text-warning" : "text-fg-subtle")}>
      {value.length}/{recommended ?? max}
      {over && " (longer than recommended)"}
    </span>
  );
}

/** Editable list of short strings. */
export function StringListEditor({
  id,
  values,
  onChange,
  max,
  maxLength,
  placeholder,
  addLabel = "Add",
}: {
  id: string;
  values: string[];
  onChange: (values: string[]) => void;
  max: number;
  maxLength: number;
  placeholder?: string;
  addLabel?: string;
}) {
  return (
    <div className="space-y-2" id={id}>
      {values.map((value, index) => (
        <div key={index} className="flex gap-2">
          <Input
            aria-label={`${placeholder ?? "Item"} ${index + 1}`}
            value={value}
            maxLength={maxLength}
            placeholder={placeholder}
            onChange={(e) => onChange(values.map((v, i) => (i === index ? e.target.value : v)))}
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label={`Remove item ${index + 1}`}
            onClick={() => onChange(values.filter((_, i) => i !== index))}
          >
            <Trash2 />
          </Button>
        </div>
      ))}
      {values.length < max && (
        <Button type="button" size="sm" variant="ghost" onClick={() => onChange([...values, ""])}>
          <Plus /> {addLabel}
        </Button>
      )}
    </div>
  );
}

export function Section({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl border border-border bg-surface p-5 sm:p-6", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-semibold">{title}</h3>
          {description && <p className="mt-1 text-sm text-fg-muted">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
      </div>
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}
