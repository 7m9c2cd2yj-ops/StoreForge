"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, publicEnv } from "@/lib/env";
import { safeRedirectPath } from "@/lib/utils";

export type AuthFormState = { error?: string; message?: string; email?: string };

const email = z.email("Enter a valid email address").max(254);
const password = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be 72 characters or fewer");

const NOT_CONFIGURED: AuthFormState = {
  error: "Authentication is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
};

export async function signInAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;
  const parsed = z.object({ email, password: z.string().min(1, "Enter your password") }).safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  const submittedEmail = String(formData.get("email") ?? "");
  if (!parsed.success) return { error: parsed.error.issues[0]?.message, email: submittedEmail };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    const message =
      error.code === "email_not_confirmed"
        ? "Please confirm your email address first — check your inbox for the link."
        : "Incorrect email or password.";
    return { error: message, email: submittedEmail };
  }

  redirect(safeRedirectPath(String(formData.get("next") ?? "")));
}

export async function signUpAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;
  const parsed = z
    .object({
      displayName: z.string().trim().max(80, "Name must be 80 characters or fewer").optional(),
      email,
      password,
    })
    .safeParse({
      displayName: formData.get("displayName") || undefined,
      email: formData.get("email"),
      password: formData.get("password"),
    });
  const submittedEmail = String(formData.get("email") ?? "");
  if (!parsed.success) return { error: parsed.error.issues[0]?.message, email: submittedEmail };
  const next = safeRedirectPath(String(formData.get("next") ?? ""));

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${publicEnv.appUrl}/auth/callback?next=${encodeURIComponent(next)}`,
      data: { display_name: parsed.data.displayName ?? "" },
    },
  });

  if (error) {
    const message =
      error.code === "weak_password"
        ? "Please choose a stronger password."
        : error.code === "over_email_send_rate_limit"
          ? "Too many attempts. Please wait a few minutes and try again."
          : "We couldn't create your account. Please check your details and try again.";
    return { error: message, email: submittedEmail };
  }

  // With email confirmation enabled there's no session yet.
  if (!data.session) {
    return {
      message: "Check your inbox: we sent a confirmation link to finish creating your account.",
      email: submittedEmail,
    };
  }

  redirect(next);
}

export async function requestPasswordResetAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;
  const parsed = email.safeParse(formData.get("email"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${publicEnv.appUrl}/auth/callback?next=/reset-password`,
  });

  // Same response whether or not the account exists (prevents account enumeration).
  return { message: "If an account exists for that email, we've sent a password reset link." };
}

export async function updatePasswordAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;
  const parsed = z
    .object({ password, confirm: z.string() })
    .refine((v) => v.password === v.confirm, { message: "Passwords don't match", path: ["confirm"] })
    .safeParse({ password: formData.get("password"), confirm: formData.get("confirm") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) {
    return { error: "Your reset link has expired. Please request a new one." };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return {
      error:
        error.code === "same_password"
          ? "Choose a password different from your current one."
          : "Could not update your password. Please request a new reset link.",
    };
  }

  redirect("/dashboard?password=updated");
}

export async function signOutAction(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}
