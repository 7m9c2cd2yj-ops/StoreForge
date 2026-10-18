import * as React from "react";
import { Progress } from "@/components/ui/misc";

export function StatCard({
  label,
  value,
  detail,
  progress,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
  progress?: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between text-fg-subtle">
        <p className="text-sm">{label}</p>
        <span className="[&_svg]:size-4" aria-hidden>{icon}</span>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      {progress !== undefined && <Progress value={progress} className="mt-3" label={label} />}
      {detail && <p className="mt-2 text-xs text-fg-subtle">{detail}</p>}
    </div>
  );
}
