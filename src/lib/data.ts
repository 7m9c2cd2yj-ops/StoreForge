import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getEntitlements } from "@/lib/billing/entitlements";
import { getUsageSummary } from "@/lib/credits";
import type { ProjectStatus } from "@/lib/database.types";

export type ProjectSummary = {
  id: string;
  store_name: string;
  niche: string;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
};

/** Account-level data shared by dashboard pages (cached per request). */
export const getAccount = cache(async (userId: string) => {
  const supabase = await createClient();
  const [entitlements, profile] = await Promise.all([
    getEntitlements(userId),
    supabase.from("profiles").select("display_name").eq("id", userId).maybeSingle(),
  ]);
  const usage = await getUsageSummary(userId, entitlements.plan);
  return { entitlements, usage, displayName: profile.data?.display_name ?? null };
});

export async function listProjects(): Promise<ProjectSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id, store_name, niche, status, created_at, updated_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error("Could not load projects");
  return data ?? [];
}
