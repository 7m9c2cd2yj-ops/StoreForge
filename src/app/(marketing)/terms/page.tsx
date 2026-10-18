import type { Metadata } from "next";
import { ProsePage, TemplateNotice } from "@/components/marketing/prose-page";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <ProsePage title="Terms of Service">
      <TemplateNotice />
      <h2>The service</h2>
      <p>
        StoreForge AI provides AI-assisted tools for creating e-commerce store concepts and content. It does not
        create, host or operate a Shopify store on your behalf. Shopify is a trademark of Shopify Inc.; StoreForge AI
        is not affiliated with Shopify.
      </p>
      <h2>AI-generated content</h2>
      <p>
        Generated content may be inaccurate, incomplete or similar to content generated for others. You are
        responsible for reviewing it, verifying claims, prices and trademarks, and complying with applicable laws
        before publishing anything.
      </p>
      <h2>Plans, limits and billing</h2>
      <p>
        Paid plans renew monthly until cancelled. Each plan includes the monthly allowances shown on the pricing
        page; unused allowances don&apos;t roll over. You can cancel or change plans from the billing portal.
      </p>
      <h2>Acceptable use</h2>
      <ul>
        <li>Don&apos;t use the service to create unlawful, deceptive or infringing content.</li>
        <li>Don&apos;t publish fabricated reviews, testimonials or endorsements.</li>
        <li>Don&apos;t attempt to bypass usage limits or access other users&apos; data.</li>
      </ul>
      <h2>Liability</h2>
      <p>The service is provided as-is, to the extent permitted by law.</p>
    </ProsePage>
  );
}
