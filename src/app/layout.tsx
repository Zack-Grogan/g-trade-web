import { ClerkProvider, SignInButton, SignUpButton, Show, UserButton } from "@clerk/nextjs";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ClerkProvider>
          <header style={{ padding: "1rem 2rem", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 600 }}>G-Trade</span>
            <Show when="signed-out">
              <SignInButton mode="modal" />
              <SignUpButton mode="modal" />
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
