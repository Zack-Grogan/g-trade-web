import { auth } from "@clerk/nextjs/server";
import { SignInButton } from "@clerk/nextjs";
import Link from "next/link";

import { Badge, DataRow, DataTable, MiniBarChart, Panel, StatCard, formatCurrency, formatDate, formatShort } from "@/components/dashboard";
import { fetchDashboardData } from "@/lib/analytics";

export default async function Home() {
  const { userId } = await auth();
  const data = userId ? await fetchDashboardData() : null;

  if (!userId) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-7xl items-center px-6 py-16 lg:px-8">
        <div className="max-w-2xl rounded-3xl border border-white/10 bg-zinc-900/80 p-10 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
          <p className="text-[11px] uppercase tracking-[0.24em] text-emerald-400">G-Trade reports</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-zinc-50">Operational analytics and AI report reader</h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-zinc-400">
            Sign in to inspect runs, trades, and batch-generated AI reports. The web app is read-only and never invokes a live model during page render.
          </p>
          <div className="mt-6">
            <SignInButton mode="modal">
              <span className="inline-flex cursor-pointer items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-100 transition hover:border-emerald-400/30 hover:bg-emerald-400/10">
                Sign in to continue
              </span>
            </SignInButton>
          </div>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        <Panel
          eyebrow="Dashboard"
          title="No analytics data yet"
          description="Set ANALYTICS_API_URL and ANALYTICS_API_KEY on the web service so it can read the deployed analytics API."
        >
          <p className="text-sm text-zinc-400">Once the API is wired, the homepage will show runs, trades, and AI reports.</p>
        </Panel>
      </main>
    );
  }

  const recentTradeValues = data.trades.slice(0, 8).map((trade) => trade.pnl);
  const recentTradeLabels = data.trades.slice(0, 8).map((trade) => trade.runId.slice(-6));
  const latestReport = data.reports[0] ?? null;

  return (
    <main className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Panel
          eyebrow="Read-only dashboard"
          title="Runs, trades, and batch reports"
          description="A single-operator view of recent market activity and AI report bundles. No native chat, no live analysis on page load."
          action={
            <Link
              href="/rlm"
              className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 transition hover:border-emerald-400/30 hover:bg-emerald-400/10 hover:text-white"
            >
              Open RLM library
            </Link>
          }
        >
          <div className="flex flex-wrap gap-2">
            <Badge tone="success">Advisory only</Badge>
            <Badge tone="accent">OpenRouter reports</Badge>
            <Badge tone="neutral">Batch-generated artifacts</Badge>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <StatCard
              label="Runs"
              value={formatShort(data.summary.run_count)}
              note={`${data.summary.event_count} events · ${formatShort(data.summary.state_snapshot_count)} snapshots`}
            />
            <StatCard
              label="Trades"
              value={formatShort(data.summary.trade_count)}
              note={`${formatCurrency(data.summary.total_pnl)} · ${formatShort(data.summary.blocker_count)} blockers`}
            />
            <StatCard label="Reports" value={formatShort(data.summary.report_count)} note={formatDate(data.summary.latest_report_at)} />
            <StatCard label="Latest report" value={latestReport ? latestReport.title : "None yet"} note={latestReport ? latestReport.modelName : "Generate one on RLM"} />
          </div>
        </Panel>

        <Panel
          eyebrow="Signal strip"
          title="Recent trade P&L"
          description="Simple inline view of the latest closed trades. Positive bars are green, negative bars are rose."
        >
          <MiniBarChart values={recentTradeValues} labels={recentTradeLabels} />
        </Panel>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        <Panel eyebrow="Recent activity" title="Latest runs" description="The newest runs, ordered by creation time.">
          <DataTable columns={["Run", "Mode", "Symbol", "Created"]}>
            {data.runs.length === 0 ? (
              <div className="px-4 py-4 text-sm text-zinc-500">No runs yet.</div>
            ) : (
              data.runs.slice(0, 6).map((run) => (
                <DataRow
                  key={run.runId}
                  cells={[
                    <Link key="run" href={`/runs/${run.runId}`} className="font-mono text-xs text-zinc-100 transition hover:text-emerald-300">
                      {run.runId}
                    </Link>,
                    <span key="mode">{run.dataMode ?? "—"}</span>,
                    <span key="symbol">{run.symbol ?? "—"}</span>,
                    <span key="created">{formatDate(run.createdAt)}</span>,
                  ]}
                />
              ))
            )}
          </DataTable>
        </Panel>

        <Panel eyebrow="AI artifacts" title="Latest reports" description="Persisted report bundles rendered from the analytics database.">
          <div className="space-y-3">
            {data.reports.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-500">
                No reports have been generated yet.
              </div>
            ) : (
              data.reports.slice(0, 4).map((report) => (
                <article key={report.reportId} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.22em] text-emerald-400">{report.modelProvider}</p>
                      <Link href={`/reports/${report.reportId}`} className="mt-2 block text-base font-semibold text-zinc-50 transition hover:text-emerald-300">
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
              ))
            )}
          </div>
        </Panel>
      </section>
    </main>
  );
}
