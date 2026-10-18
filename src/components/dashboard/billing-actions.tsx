"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Spinner } from "@/components/ui/misc";

async function redirectTo(endpoint: string, body?: unknown): Promise<string | null> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.url) return data?.error?.message ?? "Something went wrong. Please try again.";
  window.location.assign(data.url);
  return null;
}

export function CheckoutButton({ plan, children, ...props }: ButtonProps & { plan: "pro" | "business" }) {
  const [pending, setPending] = React.useState(false);
  return (
    <Button
      {...props}
      disabled={pending || props.disabled}
      onClick={async () => {
        setPending(true);
        const error = await redirectTo("/api/stripe/checkout", { plan });
        if (error) {
          toast.error(error);
          setPending(false);
        }
      }}
    >
      {pending && <Spinner />}
      {children}
    </Button>
  );
}

export function PortalButton({ children, ...props }: ButtonProps) {
  const [pending, setPending] = React.useState(false);
  return (
    <Button
      {...props}
      disabled={pending || props.disabled}
      onClick={async () => {
        setPending(true);
        const error = await redirectTo("/api/stripe/portal");
        if (error) {
          toast.error(error);
          setPending(false);
        }
      }}
    >
      {pending && <Spinner />}
      {children}
    </Button>
  );
}

/** After a verified checkout, refresh server data once and drop the session id from the URL. */
export function CheckoutComplete() {
  const router = useRouter();
  React.useEffect(() => {
    router.replace("/dashboard/billing?checkout=done");
    router.refresh();
  }, [router]);
  return null;
}
