import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, authenticate, readJson } from "@/lib/api";
import { storeInputSchema } from "@/lib/validation/store-input";
import { isAIConfigured } from "@/lib/env.server";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { getEntitlements } from "@/lib/billing/entitlements";
import { consumeCredits, refundCredits, reserveCredits } from "@/lib/credits";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateStoreBlueprint } from "@/lib/ai/store-generator";
import { AIError, aiErrorStatus } from "@/lib/ai/errors";
import type { Json } from "@/lib/database.types";
import { isStaleGeneration } from "@/lib/projects";

// Long-running: store generations can take a few minutes.
export const maxDuration = 300;

const requestSchema = z.object({
  input: storeInputSchema,
  /** Retry generation for an existing failed/interrupted project. */
  projectId: z.uuid().optional(),
});

export async function POST(request: Request) {
  const auth = await authenticate();
  if ("response" in auth) return auth.response;
  const { user } = auth;

  const parsed = requestSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return apiError(400, "invalid_input", parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const { input, projectId } = parsed.data;

  if (!isAIConfigured()) {
    return apiError(503, "not_configured", new AIError("not_configured").userMessage);
  }

  if (!(await checkRateLimit(`generate:${user.id}`, RATE_LIMITS.storeGeneration))) {
    return apiError(429, "rate_limited", "Too many generation requests. Please wait a minute and try again.");
  }

  const admin = createAdminClient();
  const entitlements = await getEntitlements(user.id);
  const { plan } = entitlements;

  // Either retry an existing project of this user, or check the project limit.
  if (projectId) {
    const { data: existing } = await admin
      .from("projects")
      .select("id, status, updated_at")
      .eq("id", projectId)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (!existing) return apiError(404, "not_found", "Project not found.");
    const retryable = existing.status === "failed" || isStaleGeneration(existing.status, existing.updated_at);
    if (!retryable) {
      return apiError(409, "not_retryable", "This project is not in a state that can be regenerated.");
    }
  } else {
    const { count, error } = await admin
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", user.id);
    if (error) return apiError(500, "server_error", "Could not check your projects. Please try again.");
    if ((count ?? 0) >= plan.limits.projects) {
      return apiError(
        403,
        "project_limit",
        `Your ${plan.name} plan includes ${plan.limits.projects} saved project${plan.limits.projects === 1 ? "" : "s"}. Delete a project or upgrade to create more.`,
      );
    }
  }

  const reservation = await reserveCredits(user.id, plan, "store_generation", {
    project_id: projectId ?? null,
  });
  if (!reservation.ok) {
    return apiError(
      402,
      "limit_reached",
      `You've used all ${reservation.limit} store generations included in your ${plan.name} plan this month.`,
    );
  }

  const placeholderName = (input.existingBrandName || "New store").slice(0, 120);
  const niche = (input.productCategory || input.businessIdea).slice(0, 200);

  // Record the project before calling the AI, so a refresh shows its progress.
  let id = projectId;
  if (id) {
    const { error } = await admin
      .from("projects")
      .update({ status: "generating", error_message: null, input: input as unknown as Json, niche })
      .eq("id", id)
      .eq("owner_id", user.id);
    if (error) {
      await refundCredits(reservation.reservationId);
      return apiError(500, "server_error", "Could not start generation. Your credit was refunded.");
    }
  } else {
    const { data, error } = await admin
      .from("projects")
      .insert({
        owner_id: user.id,
        store_name: placeholderName,
        niche,
        status: "generating",
        input: input as unknown as Json,
      })
      .select("id")
      .single();
    if (error || !data) {
      await refundCredits(reservation.reservationId);
      return apiError(500, "server_error", "Could not create the project. Your credit was refunded.");
    }
    id = data.id;
  }

  try {
    // Deliberately not tied to request.signal: if the user refreshes or leaves,
    // generation still completes and is saved to their project.
    const blueprint = await generateStoreBlueprint(input, plan);

    await admin.from("products").delete().eq("project_id", id);
    const { error: productsError } = await admin.from("products").insert(
      blueprint.products.map((p, index) => ({
        project_id: id!,
        owner_id: user.id,
        title: p.title,
        description: p.description,
        price: p.price,
        category: p.category,
        seo: p.seo,
        position: index,
      })),
    );
    if (productsError) throw new Error(`products insert failed: ${productsError.message}`);

    const { error: updateError } = await admin
      .from("projects")
      .update({
        status: "ready",
        store_name: blueprint.content.store_name,
        content: blueprint.content as unknown as Json,
        checklist: blueprint.checklist as unknown as Json,
        error_message: null,
      })
      .eq("id", id);
    if (updateError) throw new Error(`project update failed: ${updateError.message}`);

    await consumeCredits(reservation.reservationId);
    return NextResponse.json({ projectId: id });
  } catch (error) {
    // Every failure of the generation itself is refund-eligible.
    await refundCredits(reservation.reservationId);

    const aiError = error instanceof AIError ? error : null;
    const message = aiError?.userMessage ?? "Something went wrong while saving your store. Please try again.";
    if (!aiError) console.error("[generate] failed", error instanceof Error ? error.message : error);

    await admin
      .from("projects")
      .update({ status: "failed", error_message: `${message} Your credit was refunded.`.slice(0, 500) })
      .eq("id", id);

    return NextResponse.json(
      { error: { code: aiError?.code ?? "server_error", message: `${message} Your credit was refunded.` }, projectId: id },
      { status: aiError ? aiErrorStatus(aiError.code) : 500 },
    );
  }
}
