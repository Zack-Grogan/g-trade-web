import Link from "next/link";
import { auth } from "@clerk/nextjs/server";

export default async function Home() {
  const { userId } = await auth();
  return (
    <main className="p-8 font-sans">
      <h1 className="text-xl font-semibold">G-Trade</h1>
      {userId ? (
        <>
          <p className="mt-2 text-zinc-600">
            Internal analytics UI. Configure ANALYTICS_API_URL and ANALYTICS_API_KEY to load runs and events.
          </p>
          <nav className="mt-4 flex gap-4">
            <Link href="/rlm" className="text-blue-600 hover:underline">
              RLM Analytics
            </Link>
          </nav>
        </>
      ) : (
        <p className="mt-2 text-zinc-600">Sign in to access the analytics dashboard.</p>
      )}
    </main>
  );
}
