import { auth } from "@clerk/nextjs/server";

const ANALYTICS_URL = process.env.ANALYTICS_API_URL || "";
const ANALYTICS_KEY = process.env.ANALYTICS_API_KEY || "";

async function fetchRlmAnalytics() {
  if (!ANALYTICS_URL || !ANALYTICS_KEY) return null;
  const url = `${ANALYTICS_URL.replace(/\/$/, "")}/graphql`;
  const query = `
    query RlmAnalytics {
      hypotheses(limit: 10) {
        id
        hypothesis_id
        generation
        claim_text
        regime_context
        status
        created_at
      }
      knowledge_store(limit: 10) {
        id
        hypothesis_id
        verdict
        confidence_score
        mutation_directive
        survival_count
        rejection_count
        created_at
      }
      meta_learner_stats {
        survival_count
        rejection_count
        stats
      }
    }
  `;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ANALYTICS_KEY}`,
      },
      body: JSON.stringify({ query }),
      next: { revalidate: 30 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data ?? null;
  } catch {
    return null;
  }
}

export default async function RlmPage() {
  const { userId } = await auth();
  const data = userId ? await fetchRlmAnalytics() : null;

  return (
    <main className="p-8 font-sans max-w-4xl">
      <h1 className="text-xl font-semibold">RLM Analytics</h1>
      <p className="mt-1 text-zinc-600 text-sm">
        Hypotheses, knowledge store, and meta-learner stats. Advisory-only; no execution changes.
      </p>
      {!userId ? (
        <p className="mt-4 text-zinc-500">Sign in to view RLM analytics.</p>
      ) : !data ? (
        <p className="mt-4 text-zinc-500">
          No data. Set ANALYTICS_API_URL and ANALYTICS_API_KEY to point at g-trade-analytics.
        </p>
      ) : (
        <div className="mt-6 space-y-8">
          <section>
            <h2 className="text-lg font-medium">Meta-learner</h2>
            <pre className="mt-2 p-4 bg-zinc-100 rounded text-sm overflow-auto">
              {JSON.stringify(data.meta_learner_stats ?? {}, null, 2)}
            </pre>
          </section>
          <section>
            <h2 className="text-lg font-medium">Recent hypotheses</h2>
            <ul className="mt-2 list-disc list-inside space-y-1 text-sm">
              {(data.hypotheses ?? []).length === 0 ? (
                <li className="text-zinc-500">None yet.</li>
              ) : (
                (data.hypotheses ?? []).map((h: { hypothesis_id: string; claim_text: string; status: string }) => (
                  <li key={h.hypothesis_id}>
                    <span className="font-mono text-zinc-600">{h.status}</span> {h.claim_text?.slice(0, 80)}…
                  </li>
                ))
              )}
            </ul>
          </section>
          <section>
            <h2 className="text-lg font-medium">Knowledge store</h2>
            <ul className="mt-2 list-disc list-inside space-y-1 text-sm">
              {(data.knowledge_store ?? []).length === 0 ? (
                <li className="text-zinc-500">None yet.</li>
              ) : (
                (data.knowledge_store ?? []).map((k: { id: number; verdict: string; mutation_directive: string | null }) => (
                  <li key={k.id}>
                    <span className="font-mono text-zinc-600">{k.verdict}</span> {k.mutation_directive ?? ""}
                  </li>
                ))
              )}
            </ul>
          </section>
        </div>
      )}
    </main>
  );
}
