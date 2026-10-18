import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-7", className)}>
      <rect width="32" height="32" rx="8" fill="#8b5cf6" />
      <path d="M10 12.5 16 9l6 3.5v7L16 23l-6-3.5z" fill="none" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
      <path d="m10 12.5 6 3.5 6-3.5M16 16v7" fill="none" stroke="#fff" strokeWidth="2" strokeLinejoin="round" opacity=".7" />
    </svg>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2.5 font-semibold tracking-tight", className)}>
      <LogoMark />
      <span>
        StoreForge <span className="text-accent-text">AI</span>
      </span>
    </Link>
  );
}
