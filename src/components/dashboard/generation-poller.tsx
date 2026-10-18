"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

/** Refreshes server data periodically while a generation is running. */
export function GenerationPoller({ intervalMs = 5000 }: { intervalMs?: number }) {
  const router = useRouter();
  React.useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);
  return null;
}
