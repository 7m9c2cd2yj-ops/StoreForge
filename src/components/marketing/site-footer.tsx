import Link from "next/link";
import { Logo } from "@/components/ui/logo";

const LINKS = [
  { href: "/about", label: "About" },
  { href: "/#features", label: "Features" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-3 text-sm text-fg-muted">Your next store starts with one prompt.</p>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-10 gap-y-3 sm:grid-cols-3">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm text-fg-muted transition-colors hover:text-fg">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="border-t border-border">
        <p className="mx-auto max-w-6xl px-4 py-6 text-xs text-fg-subtle sm:px-6">
          © {new Date().getFullYear()} StoreForge AI. Shopify is a trademark of Shopify Inc. StoreForge AI is not
          affiliated with or endorsed by Shopify.
        </p>
      </div>
    </footer>
  );
}
