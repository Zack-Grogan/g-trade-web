import type { Metadata } from "next";
import { ClerkProvider, SignInButton, SignUpButton, Show, UserButton } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "G-Trade",
  description: "Internal analytics UI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ClerkProvider>
          <header className="flex items-center justify-between border-b border-zinc-200 px-8 py-4">
            <span className="font-semibold">G-Trade</span>
            <Show when="signed-out">
              <div className="flex gap-2">
                <SignInButton mode="modal" />
                <SignUpButton mode="modal" />
              </div>
            </Show>
            <Show when="signed-in">
              <UserButton />
            </Show>
          </header>
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
