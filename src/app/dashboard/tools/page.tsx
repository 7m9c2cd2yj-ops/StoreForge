import type { Metadata } from "next";
import { ToolsHub } from "@/components/tools/tools-hub";
import { requireUser } from "@/lib/auth";
import { getAccount } from "@/lib/data";
import { isAIConfigured } from "@/lib/env.server";
import { isToolId } from "@/lib/ai/tool-definitions";

export const metadata: Metadata = { title: "AI tools" };

export default async function ToolsPage({ searchParams }: PageProps<"/dashboard/tools">) {
  const user = await requireUser("/dashboard/tools");
  const [{ usage }, { tool }] = await Promise.all([getAccount(user.id), searchParams]);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">AI tools</h1>
      <p className="mt-1 text-fg-muted">Focused generators for names, copy and SEO. Each run uses one AI tool credit.</p>
      <div className="mt-8">
        <ToolsHub
          initialTool={typeof tool === "string" && isToolId(tool) ? tool : undefined}
          remaining={usage.aiToolRuns.remaining}
          limit={usage.aiToolRuns.limit}
          aiConfigured={isAIConfigured()}
        />
      </div>
    </div>
  );
}
