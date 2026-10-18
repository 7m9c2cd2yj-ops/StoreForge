import { NextResponse } from "next/server";
import { apiError, authenticate, readJson, withBackendErrors } from "@/lib/api";
import { isToolId, TOOL_INPUT_SCHEMAS } from "@/lib/ai/tool-definitions";
import { isAIConfigured } from "@/lib/env.server";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { getEntitlements } from "@/lib/billing/entitlements";
import { consumeCredits, refundCredits, reserveCredits } from "@/lib/credits";
import { runTool } from "@/lib/ai/tools";
import { AIError, aiErrorStatus } from "@/lib/ai/errors";

export const maxDuration = 120;

async function handlePOST(request: Request, ctx: RouteContext<"/api/tools/[tool]">) {
  const { tool } = await ctx.params;
  if (!isToolId(tool)) return apiError(404, "not_found", "Unknown tool.");

  const auth = await authenticate();
  if ("response" in auth) return auth.response;
  const { user } = auth;

  const input = await readJson(request);
  const parsed = TOOL_INPUT_SCHEMAS[tool].safeParse(input);
  if (!parsed.success) {
    return apiError(400, "invalid_input", parsed.error.issues[0]?.message ?? "Invalid input");
  }

  if (!isAIConfigured()) {
    return apiError(503, "not_configured", new AIError("not_configured").userMessage);
  }
  if (!(await checkRateLimit(`tool:${user.id}`, RATE_LIMITS.aiTool))) {
    return apiError(429, "rate_limited", "You're going a little fast. Please wait a minute and try again.");
  }

  const { plan } = await getEntitlements(user.id);
  const reservation = await reserveCredits(user.id, plan, "ai_tool", { tool });
  if (!reservation.ok) {
    return apiError(
      402,
      "limit_reached",
      `You've used all ${reservation.limit} AI tool runs included in your ${plan.name} plan this month.`,
    );
  }

  try {
    const result = await runTool(tool, parsed.data, request.signal);
    if (!result.ok) {
      await refundCredits(reservation.reservationId);
      return apiError(400, "invalid_input", result.error);
    }
    await consumeCredits(reservation.reservationId);
    return NextResponse.json({ output: result.output });
  } catch (error) {
    await refundCredits(reservation.reservationId);
    if (error instanceof AIError) {
      return apiError(aiErrorStatus(error.code), error.code, `${error.userMessage} Your credit was refunded.`);
    }
    console.error("[tools] failed", error instanceof Error ? error.message : error);
    return apiError(500, "server_error", "Something went wrong. Your credit was refunded.");
  }
}

export const POST = withBackendErrors(handlePOST);
