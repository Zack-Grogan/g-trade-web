import type { Metadata } from "next";
import Link from "next/link";

import { ClerkProvider, SignInButton, SignUpButton, Show, UserButton } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "G-Trade Reports",
  description: "Internal analytics, charts, and AI reports",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.12),_transparent_26%),linear-gradient(180deg,#020617_0%,#020617_42%,#040711_100%)] text-zinc-100">
        <ClerkProvider>
          <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/75 backdrop-blur">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4 lg:px-8">
              <div className="flex items-center gap-6">
                <Link href="/" className="text-sm font-semibold tracking-[0.2em] text-zinc-50 uppercase">
                  G-Trade
                </Link>
                <nav className="hidden items-center gap-4 text-sm text-zinc-400 md:flex">
                  <Link href="/" className="transition hover:text-zinc-100">
                    Dashboard
                  </Link>
                  <Link href="/rlm" className="transition hover:text-zinc-100">
                    RLM
                  </Link>
                </nav>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Show when="signed-out">
                  <div className="flex gap-2">
                    <SignInButton mode="modal" />
                    <SignUpButton mode="modal" />
                  </div>
                </Show>
                <Show when="signed-in">
                  <UserButton />
                </Show>
              </div>
            </div>
          </header>
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
