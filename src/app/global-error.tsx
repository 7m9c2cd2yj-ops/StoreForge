"use client";

import "./globals.css";

/**
 * Last-resort error page (replaces the root layout). Shown only for errors no
 * other boundary handled; database setup problems have their own screens.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body className="flex min-h-dvh items-center justify-center bg-[#0b0b0f] px-6 text-[#f5f5f7]">
        <main className="max-w-md text-center">
          <p className="text-sm font-medium text-[#c4b5fd]">StoreForge AI</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">Something went wrong</h1>
          <p className="mt-2 text-[#a6a6b2]">
            The page hit an unexpected server error. Try again, or check the setup status page if you run this site.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              onClick={reset}
              className="h-11 rounded-lg bg-[#8b5cf6] px-5 text-sm font-medium text-white hover:bg-[#7c3aed]"
            >
              Try again
            </button>
            <a
              href="/api/health"
              className="flex h-11 items-center justify-center rounded-lg border border-white/15 px-5 text-sm hover:bg-white/5"
            >
              Setup status
            </a>
          </div>
          {error.digest && <p className="mt-8 font-mono text-xs text-[#8a8a96]">Error {error.digest}</p>}
        </main>
      </body>
    </html>
  );
}
