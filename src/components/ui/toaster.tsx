"use client";

import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      theme="dark"
      position="bottom-center"
      toastOptions={{
        classNames: {
          toast: "!bg-surface-2 !border !border-border-strong !text-fg !rounded-xl",
          description: "!text-fg-muted",
        },
      }}
    />
  );
}
