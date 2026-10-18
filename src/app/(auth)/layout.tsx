import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="relative flex min-h-dvh flex-col bg-page-glow">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center px-4 sm:px-6">
        <Logo />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pt-8 pb-16 sm:items-center sm:pt-0">
        <div className="w-full max-w-md animate-fade-in">{children}</div>
      </main>
      <footer className="pb-8 text-center text-xs text-fg-subtle">
        <Link href="/privacy" className="hover:text-fg">Privacy</Link>
        <span className="mx-2">·</span>
        <Link href="/terms" className="hover:text-fg">Terms</Link>
      </footer>
    </div>
  );
}
