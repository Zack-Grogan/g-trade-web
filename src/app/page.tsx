import { auth } from "@clerk/nextjs/server";

export default async function Home() {
  const { userId } = await auth();
  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui" }}>
      <h1>G-Trade</h1>
      {userId ? (
        <p>Internal analytics UI. Configure ANALYTICS_API_URL and ANALYTICS_API_KEY to load runs and events.</p>
      ) : (
        <p>Sign in to access the analytics dashboard.</p>
      )}
    </main>
  );
}
