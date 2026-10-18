import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { SignUpForm } from "@/components/auth/auth-forms";
import { isPaidPlanId } from "@/lib/config/plans";

export const metadata: Metadata = { title: "Create your account" };

export default async function SignUpPage({ searchParams }: PageProps<"/signup">) {
  const { plan } = await searchParams;
  const next = isPaidPlanId(plan) ? `/dashboard/billing?plan=${plan}` : "/dashboard/new";

  return (
    <AuthCard
      title="Create your account"
      description="Start free. No credit card required."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="text-accent-text hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <SignUpForm next={next} />
    </AuthCard>
  );
}
