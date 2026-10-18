import type { Metadata } from "next";
import { ProsePage } from "@/components/marketing/prose-page";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  const email = process.env.CONTACT_EMAIL;
  return (
    <ProsePage title="Contact" intro="Questions about StoreForge AI, billing or your account?">
      {email ? (
        <p>
          Email us at{" "}
          <a className="text-accent-text underline underline-offset-4" href={`mailto:${email}`}>
            {email}
          </a>
          . We aim to reply within two business days.
        </p>
      ) : (
        <div className="rounded-xl border border-border-strong bg-surface px-5 py-4">
          <p className="text-fg">Contact details haven&apos;t been configured for this deployment yet.</p>
          <p className="mt-1 text-sm">
            Site operators: set the <code className="font-mono text-accent-text">CONTACT_EMAIL</code> environment
            variable to publish a support address here.
          </p>
        </div>
      )}
      <p>
        Signed-in customers can manage their subscription, invoices and payment methods at any time from{" "}
        <strong className="text-fg">Dashboard → Billing</strong>.
      </p>
    </ProsePage>
  );
}
