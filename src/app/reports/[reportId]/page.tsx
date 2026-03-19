import Link from "next/link";

import { Badge, EmptyState, Panel, formatDate } from "@/components/dashboard";
import { PageShell } from "@/components/page-shell";
import { fetchReportDetail } from "@/lib/analytics";
import { isSignedInRequest } from "@/lib/session";

function listFromValue(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const signedIn = await isSignedInRequest();
  if (!signedIn) {
    return <PageShell authenticated={false} />;
  }

  const { reportId } = await params;
  const report = await fetchReportDetail(reportId);

  if (!report) {
    return (
      <PageShell authenticated>
        <main className="mx-auto max-w-4xl px-6 py-10 lg:px-8">
          <Panel
            eyebrow="AI report"
            title="Report not found"
            description="This report id is not present in analytics right now. The reports index is healthy, but there is no stored bundle for this identifier."
            action={
              <Link
                href="/reports"
                className="inline-flex items-center rounded-full border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 transition hover:border-cyan-500/30 hover:bg-cyan-500/10 hover:text-white"
              >
                Back to reports
              </Link>
            }
          >
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4 text-sm text-zinc-300">
              Requested report id: <span className="font-mono text-zinc-100">{reportId}</span>
            </div>
            <p className="mt-4 text-sm text-zinc-400">If you expected a report here, verify that RLM persisted it and that analytics can see the latest report rows.</p>
          </Panel>
        </main>
      </PageShell>
    );
  }

  const reportJson = (report.reportJson ?? {}) as Record<string, unknown>;
  const highlights = listFromValue(reportJson.highlights);
  const risks = listFromValue(reportJson.risks);
  const nextActions = listFromValue(reportJson.next_actions ?? reportJson.nextActions);
  const hypotheses = Array.isArray(reportJson.hypotheses) ? (reportJson.hypotheses as Array<Record<string, unknown>>) : [];
  const conclusion = reportJson.conclusion as Record<string, unknown> | undefined;

  return (
    <PageShell authenticated>
      <main className="mx-auto max-w-6xl space-y-6 px-6 py-10 lg:px-8">
      <Panel
        eyebrow="AI report"
        title={report.title}
        description="Persisted report bundle, rendered without any live model call."
        action={
          <Link
            href="/"
            className="inline-flex items-center rounded-full border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 transition hover:border-cyan-500/30 hover:bg-cyan-500/10 hover:text-white"
          >
            Back to console
          </Link>
        }
      >
        <div className="flex flex-wrap gap-2">
          <Badge tone={report.status === "completed" ? "success" : "neutral"}>{report.status}</Badge>
          <Badge tone="accent">{report.modelProvider}</Badge>
          <Badge tone="neutral">{report.modelName}</Badge>
        </div>
        <p className="mt-5 max-w-4xl text-sm leading-7 text-zinc-300">{report.summaryText}</p>
        <p className="mt-4 text-xs text-zinc-500">
          {formatDate(report.completedAt ?? report.createdAt)} · {report.reportType}
        </p>
      </Panel>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Panel eyebrow="Highlights" title="What the model called out">
          <div className="space-y-3">
            {highlights.length === 0 ? (
              <EmptyState title="No highlights" description="This report payload did not persist a highlight list." />
            ) : (
              highlights.map((item) => (
                <p key={item} className="rounded-xl border border-zinc-800 bg-zinc-950/80 px-4 py-3 text-sm leading-6 text-zinc-300">
                  {item}
                </p>
              ))
            )}
          </div>
        </Panel>

        <Panel eyebrow="Risks" title="Risks and next actions">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold text-zinc-50">Risks</h3>
              <div className="mt-3 space-y-3">
                {risks.length === 0 ? (
                  <EmptyState title="No risks" description="The report payload did not persist any risk bullets." />
                ) : (
                  risks.map((item) => (
                    <p key={item} className="rounded-xl border border-zinc-800 bg-zinc-950/80 px-4 py-3 text-sm leading-6 text-zinc-300">
                      {item}
                    </p>
                  ))
                )}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-50">Next actions</h3>
              <div className="mt-3 space-y-3">
                {nextActions.length === 0 ? (
                  <EmptyState title="No next actions" description="The report payload did not persist any next-step bullets." />
                ) : (
                  nextActions.map((item) => (
                    <p key={item} className="rounded-xl border border-zinc-800 bg-zinc-950/80 px-4 py-3 text-sm leading-6 text-zinc-300">
                      {item}
                    </p>
                  ))
                )}
              </div>
            </div>
          </div>
        </Panel>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Panel eyebrow="Report context" title="Metrics used to write the report">
          <pre className="overflow-auto rounded-2xl border border-zinc-800 bg-black/40 p-4 text-xs leading-6 text-zinc-300">
            {JSON.stringify(reportJson.summary ?? reportJson.analysis_snapshot ?? {}, null, 2)}
          </pre>
        </Panel>

        <Panel eyebrow="Conclusion" title="Verdict and generated hypotheses">
          <div className="space-y-4">
            <pre className="overflow-auto rounded-2xl border border-zinc-800 bg-black/40 p-4 text-xs leading-6 text-zinc-300">
              {JSON.stringify(conclusion ?? {}, null, 2)}
            </pre>
            <div className="space-y-3">
              {hypotheses.length === 0 ? (
                <EmptyState title="No hypotheses" description="The report payload did not persist any generated hypothesis rows." />
              ) : (
                hypotheses.map((item, index) => (
                  <article key={index} className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
                    <div className="flex flex-wrap gap-2">
                      <Badge tone="neutral">{String(item.status ?? "unknown")}</Badge>
                      <Badge tone="accent">G{String(item.generation ?? "1")}</Badge>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-zinc-300">{String(item.claim_text ?? item.claimText ?? "")}</p>
                  </article>
                ))
              )}
            </div>
          </div>
        </Panel>
      </section>
      </main>
    </PageShell>
  );
}
