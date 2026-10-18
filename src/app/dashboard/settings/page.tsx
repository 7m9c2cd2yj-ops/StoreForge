import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getAccount } from "@/lib/data";
import { ResetPasswordForm } from "@/components/auth/auth-forms";
import { DisplayNameForm } from "@/components/dashboard/display-name-form";
import { Section } from "@/components/workspace/fields";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/lib/actions/auth";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser("/dashboard/settings");
  const { displayName } = await getAccount(user.id);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Account settings</h1>
        <p className="mt-1 text-fg-muted">Signed in as {user.email}</p>
      </div>
      <Section title="Profile">
        <DisplayNameForm initialName={displayName ?? ""} />
      </Section>
      <Section title="Change password">
        <ResetPasswordForm />
      </Section>
      <Section title="Session">
        <form action={signOutAction}>
          <Button type="submit" variant="secondary">Sign out</Button>
        </form>
      </Section>
    </div>
  );
}
