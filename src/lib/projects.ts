import type { ProjectStatus } from "@/lib/database.types";

/** A generation that hasn't finished after this long was interrupted. */
export const STALE_GENERATION_MS = 10 * 60 * 1000;

export function isStaleGeneration(status: ProjectStatus, updatedAt: string, now = Date.now()): boolean {
  return status === "generating" && now - new Date(updatedAt).getTime() > STALE_GENERATION_MS;
}

export type DisplayStatus = "generating" | "ready" | "failed";

export function displayStatus(status: ProjectStatus, updatedAt: string, now = Date.now()): DisplayStatus {
  return isStaleGeneration(status, updatedAt, now) ? "failed" : status;
}
