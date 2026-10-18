"use client";

import * as React from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Alert, Spinner } from "@/components/ui/misc";
import {
  requestPasswordResetAction,
  signInAction,
  signUpAction,
  updatePasswordAction,
  type AuthFormState,
} from "@/lib/actions/auth";

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending && <Spinner />}
      {children}
    </Button>
  );
}

function FormMessages({ state }: { state: AuthFormState }) {
  if (state.error) return <Alert variant="danger">{state.error}</Alert>;
  if (state.message) return <Alert variant="success">{state.message}</Alert>;
  return null;
}

export function SignInForm({ next }: { next?: string }) {
  const [state, action] = React.useActionState(signInAction, {});
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessages state={state} />
      <input type="hidden" name="next" value={next ?? "/dashboard"} />
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" required defaultValue={state.email} />
      </Field>
      <Field label="Password" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-sm text-accent-text hover:underline">
          Forgot password?
        </Link>
      </div>
      <SubmitButton>Sign in</SubmitButton>
    </form>
  );
}

export function SignUpForm({ next }: { next?: string }) {
  const [state, action] = React.useActionState(signUpAction, {});
  if (state.message) return <Alert variant="success" title="Almost there">{state.message}</Alert>;
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessages state={state} />
      <input type="hidden" name="next" value={next ?? "/dashboard"} />
      <Field label="Name" htmlFor="displayName" optional>
        <Input id="displayName" name="displayName" autoComplete="name" maxLength={80} />
      </Field>
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" required defaultValue={state.email} />
      </Field>
      <Field label="Password" htmlFor="password" hint="At least 8 characters.">
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      <SubmitButton>Create account</SubmitButton>
      <p className="text-center text-xs text-fg-subtle">
        By creating an account you agree to the{" "}
        <Link href="/terms" className="underline hover:text-fg">Terms</Link> and{" "}
        <Link href="/privacy" className="underline hover:text-fg">Privacy Policy</Link>.
      </p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action] = React.useActionState(requestPasswordResetAction, {});
  if (state.message) return <Alert variant="success">{state.message}</Alert>;
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessages state={state} />
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" required />
      </Field>
      <SubmitButton>Send reset link</SubmitButton>
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, action] = React.useActionState(updatePasswordAction, {});
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessages state={state} />
      <Field label="New password" htmlFor="password" hint="At least 8 characters.">
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      <Field label="Confirm new password" htmlFor="confirm">
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      <SubmitButton>Update password</SubmitButton>
    </form>
  );
}
