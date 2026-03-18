import Link from "next/link";
import { auth } from "@clerk/nextjs/server";

import { Badge, DataRow, DataTable, Panel, StatCard, formatDate, formatShort } from "@/components/dashboard";
import { fetchRlmLibrary } from "@/lib/analytics";

export default async function RlmPage() {
  const { userId } = await auth();
  const data = userId ? await fetchRlmLibrary() : null;

  if (!userId) {
    return (
      <main className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        <Panel eyebrow="RLM library" title="Sign in to view AI reports" description="This area shows batch-generated report bundles, hypotheses, and knowledge-store entries.">
          <p className="text-sm text-zinc-400">Authenticate to open the read-only AI report library.</p>
        </Panel>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        <Panel
          eyebrow="RLM library"
          title="No RLM data yet"
          description="Set ANALYTICS_API_URL and ANALYTICS_API_KEY on the web service to load report artifacts from the analytics API."
        >
          <p className="text-sm text-zinc-400">Once reports exist, they will appear here without any live model calls.</p>
        </Panel>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Panel
          eyebrow="RLM library"
          title="Batch reports and research artifacts"
          description="The AI layer is deliberately on-demand only. This page surfaces completed report bundles, generated hypotheses, and knowledge-store entries for review."
          action={
            <Link
              href="/"
              className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 transition hover:border-emerald-400/30 hover:bg-emerald-400/10 hover:text-white"
            >
              Back to dashboard
            </Link>
          }
        >
          <div className="flex flex-wrap gap-2">
            <Badge tone="accent">No chat surface</Badge>
            <Badge tone="success">Persisted artifacts</Badge>
            <Badge tone="neutral">OpenRouter-backed reports</Badge>
          </div>
        </Panel>

        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard label="Hypotheses" value={formatShort(data.hypotheses.length)} note="Latest generated claims" />
          <StatCard label="Knowledge entries" value={formatShort(data.knowledgeStore.length)} note="Persisted verdicts" />
          <StatCard label="Reports" value={formatShort(data.reports.length)} note="Stored AI report bundles" />
          <StatCard
            label="Meta learner"
            value={`${data.metaLearnerStats?.survivalCount ?? 0}/${data.metaLearnerStats?.rejectionCount ?? 0}`}
            note="Survival / rejection"
          />
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Panel eyebrow="Reports" title="Latest AI reports" description="Structured report bundles rendered from the analytics database.">
          <div className="space-y-3">
            {data.reports.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-500">No reports yet.</div>
            ) : (
              data.reports.slice(0, 5).map((report) => (
                <article key={report.reportId} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-300">{report.modelProvider}</p>
                      <Link href={`/reports/${report.reportId}`} className="mt-2 block text-base font-semibold text-zinc-50 transition hover:text-emerald-300">
                        {report.title}
                      </Link>
                    </div>
                    <Badge tone={report.status === "completed" ? "success" : "neutral"}>{report.status}</Badge>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-zinc-400">
                    {report.summaryText.slice(0, 240)}
                    {report.summaryText.length > 240 ? "…" : ""}
                  </p>
                  <p className="mt-3 text-xs text-zinc-500">
                    {formatDate(report.completedAt ?? report.createdAt)} · {report.modelName}
                  </p>
                </article>
              ))
            )}
          </div>
        </Panel>

        <Panel eyebrow="Research" title="Knowledge store and hypotheses" description="Supporting evidence for the reports above.">
          <div className="space-y-5">
            <DataTable columns={["Verdict", "Confidence", "Directive", "Created"]}>
              {data.knowledgeStore.length === 0 ? (
                <div className="px-4 py-4 text-sm text-zinc-500">No knowledge-store entries yet.</div>
              ) : (
                data.knowledgeStore.slice(0, 4).map((entry) => (
                  <DataRow
                    key={entry.id}
                    cells={[
                      <Badge key="verdict" tone={entry.verdict === "supported" ? "success" : entry.verdict === "rejected" ? "warning" : "neutral"}>
                        {entry.verdict}
                      </Badge>,
                      <span key="confidence">{entry.confidenceScore ?? "—"}</span>,
                      <span key="directive" className="truncate">
                        {entry.mutationDirective ?? "—"}
                      </span>,
                      <span key="created">{formatDate(entry.createdAt)}</span>,
                    ]}
                  />
                ))
              )}
            </DataTable>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <h3 className="text-sm font-semibold text-zinc-50">Latest hypotheses</h3>
              <div className="mt-3 space-y-3">
                {data.hypotheses.length === 0 ? (
                  <p className="text-sm text-zinc-500">No hypotheses yet.</p>
                ) : (
                  data.hypotheses.slice(0, 5).map((item) => (
                    <article key={item.id} className="rounded-xl border border-white/10 bg-zinc-950/50 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <Badge tone={item.status === "supported" ? "success" : item.status === "rejected" ? "warning" : "neutral"}>
                          {item.status}
                        </Badge>
                        <span className="text-xs text-zinc-500">G{item.generation}</span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-zinc-300">{item.claimText}</p>
                      <p className="mt-2 text-xs text-zinc-500">{formatDate(item.createdAt)}</p>
                    </article>
                  ))
                )}
              </div>
            </div>
          </div>
        </Panel>
      </section>
    </main>
  );
}
