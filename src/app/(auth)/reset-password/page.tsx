import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { ResetPasswordForm } from "@/components/auth/auth-forms";
import { Alert } from "@/components/ui/misc";
import { getCurrentUser } from "@/lib/auth";

// Per-user, session-dependent content: never prerender.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage() {
  // The reset link signs the user in via /auth/callback before landing here.
  const user = await getCurrentUser();

  return (
    <AuthCard title="Choose a new password" description={user?.email ? `For ${user.email}` : undefined}>
      {user ? (
        <ResetPasswordForm />
      ) : (
        <Alert variant="warning" title="Reset link required">
          Open the link from your password reset email to continue.{" "}
          <Link href="/forgot-password" className="underline">
            Request a new link
          </Link>
          .
        </Alert>
      )}
    </AuthCard>
  );
}
