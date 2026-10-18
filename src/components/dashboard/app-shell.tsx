"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, Home, LogOut, Menu, Plus, Settings, Wand2, X } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: Home, exact: true },
  { href: "/dashboard/new", label: "New store", icon: Plus },
  { href: "/dashboard/tools", label: "AI tools", icon: Wand2 },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

type ShellProps = {
  children: React.ReactNode;
  email: string | null;
  planName: string;
  generationsRemaining: number;
};

export function AppShell({ children, email, planName, generationsRemaining }: ShellProps) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  const nav = (
    <nav aria-label="Dashboard" className="flex flex-col gap-1">
      {NAV.map(({ href, label, icon: Icon, exact }) => (
        <Link
          key={href}
          href={href}
          aria-current={isActive(href, exact) ? "page" : undefined}
          onClick={() => setOpen(false)}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
            isActive(href, exact) ? "bg-surface-3 text-fg" : "text-fg-muted hover:bg-surface-2 hover:text-fg",
          )}
        >
          <Icon className="size-4" aria-hidden />
          {label}
        </Link>
      ))}
    </nav>
  );

  const account = (
    <div className="rounded-xl border border-border bg-surface-2 p-3">
      <p className="truncate text-sm" title={email ?? undefined}>{email}</p>
      <p className="mt-0.5 text-xs text-fg-subtle">
        {planName} plan · {generationsRemaining} generation{generationsRemaining === 1 ? "" : "s"} left
      </p>
      <form action={signOutAction} className="mt-3">
        <Button type="submit" variant="ghost" size="sm" className="w-full justify-start px-2">
          <LogOut /> Sign out
        </Button>
      </form>
    </div>
  );

  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col justify-between border-r border-border bg-surface/60 p-4 lg:flex">
        <div>
          <div className="px-2 py-2">
            <Logo href="/dashboard" />
          </div>
          <div className="mt-6">{nav}</div>
        </div>
        {account}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-bg/80 px-4 backdrop-blur-xl lg:hidden">
          <Logo href="/dashboard" />
          <Button
            variant="ghost"
            size="icon"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="dashboard-mobile-nav"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X /> : <Menu />}
          </Button>
        </header>
        {open && (
          <div id="dashboard-mobile-nav" className="animate-fade-in space-y-4 border-b border-border bg-bg px-4 py-4 lg:hidden">
            {nav}
            {account}
          </div>
        )}
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-10">{children}</main>
      </div>
    </div>
  );
}
