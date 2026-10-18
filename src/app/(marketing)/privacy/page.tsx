import type { Metadata } from "next";
import { ProsePage, TemplateNotice } from "@/components/marketing/prose-page";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <ProsePage title="Privacy Policy">
      <TemplateNotice />
      <h2>Data we collect</h2>
      <ul>
        <li>Account data: your email address, an optional display name, and a securely hashed password (managed by our authentication provider, Supabase).</li>
        <li>Project data: the business details you enter and the store content you generate and edit.</li>
        <li>Usage data: counts of AI generations, used to enforce plan limits.</li>
        <li>Billing data: subscription status and identifiers from Stripe. We never receive or store your full card details.</li>
      </ul>
      <h2>How we use it</h2>
      <p>
        To provide the service: authenticating you, saving your projects, generating content, enforcing usage limits
        and processing payments. We don&apos;t sell personal data.
      </p>
      <h2>Processors</h2>
      <ul>
        <li>Supabase: authentication and database hosting.</li>
        <li>Anthropic: AI generation. The details you submit for a generation are sent to the AI provider to produce your content.</li>
        <li>Stripe: subscription payments.</li>
        <li>Our hosting provider, for serving the application.</li>
      </ul>
      <h2>Your rights</h2>
      <p>
        You can edit or delete your projects at any time. Depending on where you live, you may have rights to
        access, correct, export or delete your personal data. Contact us via the contact page to exercise them.
      </p>
      <h2>Retention</h2>
      <p>We keep your data while your account is active. Deleting your account removes your projects and profile.</p>
    </ProsePage>
  );
}
