"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import {
  checklistSchema,
  parseStoredContent,
  productInputSchema,
  storeContentPatchSchema,
  storeContentSchema,
  type ChecklistItem,
  type ProductInput,
  type StoreContentPatch,
} from "@/lib/blueprint";
import type { Json } from "@/lib/database.types";

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const id = z.uuid();

function fail(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

async function session() {
  const user = await getCurrentUser();
  if (!user) return null;
  return { user, supabase: await createClient() };
}

/** Merges a validated patch into the project's stored content. */
export async function updateProjectContent(
  projectId: string,
  patch: StoreContentPatch,
): Promise<ActionResult<{ updatedAt: string }>> {
  const ctx = await session();
  if (!ctx) return fail("Your session has expired. Please sign in again.");
  if (!id.safeParse(projectId).success) return fail("Invalid project.");

  const parsedPatch = storeContentPatchSchema.safeParse(patch);
  if (!parsedPatch.success) return fail(parsedPatch.error.issues[0]?.message ?? "Invalid content.");

  const { data: project } = await ctx.supabase
    .from("projects")
    .select("content")
    .eq("id", projectId)
    .maybeSingle();
  const current = parseStoredContent(project?.content);
  if (!project || !current) return fail("Project not found.");

  const merged = storeContentSchema.safeParse({ ...current, ...parsedPatch.data });
  if (!merged.success) return fail(merged.error.issues[0]?.message ?? "Invalid content.");

  const { data, error } = await ctx.supabase
    .from("projects")
    .update({ content: merged.data as unknown as Json, store_name: merged.data.store_name })
    .eq("id", projectId)
    .select("updated_at")
    .single();
  if (error || !data) return fail("Could not save changes. Please try again.");

  return { ok: true, data: { updatedAt: data.updated_at } };
}

export async function updateChecklist(
  projectId: string,
  checklist: ChecklistItem[],
): Promise<ActionResult> {
  const ctx = await session();
  if (!ctx) return fail("Your session has expired. Please sign in again.");
  if (!id.safeParse(projectId).success) return fail("Invalid project.");

  const parsed = checklistSchema.safeParse(checklist);
  if (!parsed.success) return fail("Invalid checklist.");

  const { error, count } = await ctx.supabase
    .from("projects")
    .update({ checklist: parsed.data as unknown as Json }, { count: "exact" })
    .eq("id", projectId);
  if (error || count === 0) return fail("Could not save the checklist.");
  return { ok: true, data: undefined };
}

export type ProductRow = {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  seo: { title: string; description: string };
  position: number;
};

export async function createProduct(
  projectId: string,
  input: Partial<ProductInput> & { title: string },
): Promise<ActionResult<ProductRow>> {
  const ctx = await session();
  if (!ctx) return fail("Your session has expired. Please sign in again.");
  if (!id.safeParse(projectId).success) return fail("Invalid project.");

  const parsed = productInputSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid product.");

  const { data: last } = await ctx.supabase
    .from("products")
    .select("position")
    .eq("project_id", projectId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await ctx.supabase
    .from("products")
    .insert({
      project_id: projectId,
      owner_id: ctx.user.id,
      ...parsed.data,
      position: (last?.position ?? -1) + 1,
    })
    .select("id, title, description, price, category, seo, position")
    .single();
  if (error || !data) {
    return fail(error?.message.includes("at most 200") ? "A project can contain at most 200 products." : "Could not add the product.");
  }

  return {
    ok: true,
    data: { ...data, price: Number(data.price), seo: parsed.data.seo },
  };
}

export async function updateProduct(
  productId: string,
  input: ProductInput,
): Promise<ActionResult> {
  const ctx = await session();
  if (!ctx) return fail("Your session has expired. Please sign in again.");
  if (!id.safeParse(productId).success) return fail("Invalid product.");

  const parsed = productInputSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid product.");

  const { error, count } = await ctx.supabase
    .from("products")
    .update(parsed.data, { count: "exact" })
    .eq("id", productId);
  if (error || count === 0) return fail("Could not save the product.");
  return { ok: true, data: undefined };
}

export async function deleteProduct(productId: string): Promise<ActionResult> {
  const ctx = await session();
  if (!ctx) return fail("Your session has expired. Please sign in again.");
  if (!id.safeParse(productId).success) return fail("Invalid product.");

  const { error, count } = await ctx.supabase
    .from("products")
    .delete({ count: "exact" })
    .eq("id", productId);
  if (error || count === 0) return fail("Could not delete the product.");
  return { ok: true, data: undefined };
}

export async function deleteProject(projectId: string): Promise<ActionResult> {
  const ctx = await session();
  if (!ctx) return fail("Your session has expired. Please sign in again.");
  if (!id.safeParse(projectId).success) return fail("Invalid project.");

  const { error, count } = await ctx.supabase
    .from("projects")
    .delete({ count: "exact" })
    .eq("id", projectId);
  if (error || count === 0) return fail("Could not delete the project.");

  revalidatePath("/dashboard");
  return { ok: true, data: undefined };
}

export async function updateDisplayName(displayName: string): Promise<ActionResult> {
  const ctx = await session();
  if (!ctx) return fail("Your session has expired. Please sign in again.");

  const parsed = z.string().trim().max(80, "Name must be 80 characters or fewer").safeParse(displayName);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid name.");

  const { error } = await ctx.supabase
    .from("profiles")
    .update({ display_name: parsed.data || null })
    .eq("id", ctx.user.id);
  if (error) return fail("Could not update your name.");

  revalidatePath("/dashboard", "layout");
  return { ok: true, data: undefined };
}
