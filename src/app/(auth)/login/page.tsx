import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { SignInForm } from "@/components/auth/auth-forms";
import { Alert } from "@/components/ui/misc";
import { safeRedirectPath } from "@/lib/utils";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = safeRedirectPath(typeof params.next === "string" ? params.next : null);
  const linkInvalid = params.error === "link_invalid";

  return (
    <AuthCard
      title="Welcome back"
      description="Sign in to your StoreForge workspace."
      footer={
        <>
          New to StoreForge?{" "}
          <Link href="/signup" className="text-accent-text hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      {linkInvalid && (
        <Alert variant="warning" className="mb-4">
          That link is invalid or has expired. Please sign in or request a new link.
        </Alert>
      )}
      <SignInForm next={next} />
    </AuthCard>
  );
}
