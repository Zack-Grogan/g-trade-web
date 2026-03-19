import Link from "next/link";

import { Badge, EmptyState, Panel, formatDate } from "@/components/dashboard";
import { PageShell } from "@/components/page-shell";
import { fetchRlmLibrary } from "@/lib/analytics";
import { isSignedInRequest } from "@/lib/session";

export default async function ReportsPage() {
  const signedIn = await isSignedInRequest();
  const data = signedIn ? await fetchRlmLibrary() : null;

  if (!signedIn) {
    return <PageShell authenticated={false} />;
  }

  if (!data) {
    return (
      <PageShell authenticated>
        <main className="mx-auto max-w-6xl px-6 py-10 lg:px-8">
          <Panel eyebrow="Reports" title="No reports yet" description="Set `ANALYTICS_API_URL` and `ANALYTICS_API_KEY` on the web service to load persisted report bundles.">
            <p className="text-sm text-zinc-400">Once the analytics backend has data, this page becomes a report index.</p>
          </Panel>
        </main>
      </PageShell>
    );
  }

  return (
    <PageShell authenticated>
      <main className="mx-auto max-w-6xl space-y-6 px-6 py-10 lg:px-8">
      <Panel
        eyebrow="Reports"
        title="Persisted AI report bundles"
        description="The latest stored reports with direct links to the full detail view."
        action={
          <Link
            href="/"
            className="inline-flex items-center rounded-full border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 transition hover:border-cyan-500/30 hover:bg-cyan-500/10 hover:text-white"
          >
            Back to console
          </Link>
        }
      >
        {data.reports.length === 0 ? (
          <EmptyState title="No reports yet" description="Persisted report bundles will appear here once the advisory RLM flow writes to analytics." />
        ) : (
          <div className="space-y-3">
            {data.reports.map((report) => (
              <article key={report.reportId} className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-300">{report.modelProvider}</p>
                    <Link href={`/reports/${report.reportId}`} className="mt-2 block text-base font-semibold text-zinc-50 transition hover:text-cyan-300">
                      {report.title}
                    </Link>
                  </div>
                  <Badge tone={report.status === "completed" ? "success" : "neutral"}>{report.status}</Badge>
                </div>
                <p className="mt-3 text-sm leading-6 text-zinc-400">
                  {report.summaryText.slice(0, 220)}
                  {report.summaryText.length > 220 ? "…" : ""}
                </p>
                <p className="mt-3 text-xs text-zinc-500">
                  {formatDate(report.completedAt ?? report.createdAt)} · {report.modelName}
                </p>
              </article>
            ))}
          </div>
        )}
      </Panel>
      </main>
    </PageShell>
  );
}
