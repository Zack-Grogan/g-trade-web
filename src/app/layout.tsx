import type { Metadata } from "next";
import Link from "next/link";

import { ClerkProvider, SignInButton, SignUpButton, Show, UserButton } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "G-Trade Operator Console",
  description: "Internal analytics, bridge investigation, and advisory RLM tooling",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased text-zinc-100">
        <ClerkProvider>
          <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4 lg:px-8">
              <div className="flex items-center gap-6">
                <Link href="/" className="text-sm font-semibold tracking-[0.2em] text-zinc-50 uppercase">
                  G-Trade
                </Link>
                <nav className="hidden items-center gap-4 text-sm text-zinc-400 md:flex">
                  <Link href="/" className="transition hover:text-zinc-100">
                    Console
                  </Link>
                  <Link href="/runs" className="transition hover:text-zinc-100">
                    Runs
                  </Link>
                  <Link href="/rlm" className="transition hover:text-zinc-100">
                    RLM
                  </Link>
                  <Link href="/reports" className="transition hover:text-zinc-100">
                    Reports
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
