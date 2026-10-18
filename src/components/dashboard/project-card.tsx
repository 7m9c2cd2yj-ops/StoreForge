"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteProject } from "@/lib/actions/projects";
import { formatDate } from "@/lib/utils";
import type { DisplayStatus } from "@/lib/projects";

const STATUS: Record<DisplayStatus, { label: string; variant: "success" | "accent" | "danger" }> = {
  ready: { label: "Ready", variant: "success" },
  generating: { label: "Generating", variant: "accent" },
  failed: { label: "Needs attention", variant: "danger" },
};

type Props = {
  project: { id: string; storeName: string; niche: string; createdAt: string; status: DisplayStatus };
};

export function ProjectCard({ project }: Props) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const status = STATUS[project.status];

  return (
    <div className="group flex flex-col rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-border-strong">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold">{project.storeName}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-fg-muted">{project.niche || "—"}</p>
        </div>
        <Badge variant={status.variant}>{status.label}</Badge>
      </div>
      <p className="mt-4 text-xs text-fg-subtle">Created {formatDate(project.createdAt)}</p>
      <div className="mt-4 flex items-center gap-2 border-t border-border pt-4">
        <Button asChild size="sm" variant="secondary" className="flex-1">
          <Link href={`/dashboard/projects/${project.id}`}>
            Open project <ArrowUpRight />
          </Link>
        </Button>
        <ConfirmDialog
          title={`Delete “${project.storeName}”?`}
          description="This permanently deletes the project, its products and all edits. This can't be undone."
          confirmLabel="Delete project"
          pending={pending}
          onConfirm={() =>
            new Promise<void>((resolve) =>
              startTransition(async () => {
                const result = await deleteProject(project.id);
                if (result.ok) {
                  toast.success("Project deleted");
                  router.refresh();
                } else {
                  toast.error(result.error);
                }
                resolve();
              }),
            )
          }
          trigger={
            <Button size="icon-sm" variant="ghost" aria-label={`Delete ${project.storeName}`}>
              <Trash2 />
            </Button>
          }
        />
      </div>
    </div>
  );
}
