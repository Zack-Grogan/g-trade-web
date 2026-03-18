import { auth } from "@clerk/nextjs/server";
import { SignInButton } from "@clerk/nextjs";
import Link from "next/link";

import { Badge, DataRow, DataTable, MiniBarChart, Panel, StatCard, formatCurrency, formatDate, formatShort } from "@/components/dashboard";
import { OperatorChat } from "@/components/operator-chat";
import { fetchDashboardData, fetchRlmLibrary, fetchRunDetail, fetchSearchResults } from "@/lib/analytics";

function summarizeRun(runId: string, activeRun: NonNullable<Awaited<ReturnType<typeof fetchRunDetail>>>) {
  return [
    `Run ${runId}`,
    `${activeRun.events.length} events`,
    `${activeRun.stateSnapshots.length} snapshots`,
    `${activeRun.decisionSnapshots.length} decisions`,
    `${activeRun.orderLifecycle.length} order events`,
    `${activeRun.bridgeHealth.length} bridge checks`,
  ].join(" · ");
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    runId?: string;
  }>;
}) {
  const { userId } = await auth();
  const params = await searchParams;
  const query = (params.q || "").trim();
  const requestedRunId = (params.runId || "").trim();

  if (!userId) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-7xl items-center px-6 py-16 lg:px-8">
        <div className="max-w-2xl rounded-3xl border border-white/10 bg-zinc-900/80 p-10 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
          <p className="text-[11px] uppercase tracking-[0.24em] text-emerald-400">G-Trade operator console</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-zinc-50">Investigate runs, bridge health, and RLM artifacts</h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-zinc-400">
            Sign in to inspect live operator evidence, review RLM lineage, and trigger advisory analysis. The web app stays read-only for execution.
          </p>
          <div className="mt-6">
            <SignInButton mode="modal">
              <span className="inline-flex cursor-pointer items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-100 transition hover:border-cyan-400/30 hover:bg-cyan-400/10">
                Sign in to continue
              </span>
            </SignInButton>
          </div>
        </div>
      </main>
    );
  }

  const [dashboard, rlmLibrary, searchResults] = await Promise.all([
    fetchDashboardData(),
    fetchRlmLibrary(),
    fetchSearchResults(query),
  ]);

  if (!dashboard) {
    return (
      <main className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        <Panel
          eyebrow="Operator console"
          title="No analytics data yet"
          description="Set `ANALYTICS_API_URL` and `ANALYTICS_API_KEY` on the web service so it can read the analytics backend."
        >
          <p className="text-sm text-zinc-400">Once the API is wired, the console will show run evidence, bridge health, and RLM artifacts.</p>
        </Panel>
      </main>
    );
  }

  const activeRunId = requestedRunId || searchResults?.runs[0]?.runId || dashboard.runs[0]?.runId || null;
  const activeRun = activeRunId ? await fetchRunDetail(activeRunId) : null;
  const latestReport = dashboard.reports[0] ?? null;
  const latestHypothesis = rlmLibrary?.hypotheses[0] ?? null;
  const recentTradeValues = dashboard.trades.slice(0, 8).map((trade) => trade.pnl);
  const recentTradeLabels = dashboard.trades.slice(0, 8).map((trade) => trade.runId.slice(-6));

  return (
    <main className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
      <section className="grid gap-6 lg:grid-cols-[1.35fr_0.95fr]">
        <Panel
          eyebrow="Operator console"
          title="Runs, bridge health, and RLM analysis"
          description="Single-operator investigation surfaces for ES hot-zone trader. All backend calls stay server-side and advisory-only."
          action={
            <Link
              href="/rlm"
              className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 transition hover:border-cyan-400/30 hover:bg-cyan-400/10 hover:text-white"
            >
              Open lineage explorer
            </Link>
          }
        >
          <div className="flex flex-wrap gap-2">
            <Badge tone="success">Clerk-authenticated</Badge>
            <Badge tone="accent">Server-side backend calls</Badge>
            <Badge tone="neutral">Advisory only</Badge>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Runs"
              value={formatShort(dashboard.summary.run_count)}
              note={`${dashboard.summary.event_count} events · ${formatShort(dashboard.summary.state_snapshot_count)} snapshots`}
            />
            <StatCard
              label="Trades"
              value={formatShort(dashboard.summary.trade_count)}
              note={`${formatCurrency(dashboard.summary.total_pnl)} · ${formatShort(dashboard.summary.blocker_count)} blockers`}
            />
            <StatCard
              label="Reports"
              value={formatShort(dashboard.summary.report_count)}
              note={formatDate(dashboard.summary.latest_report_at)}
            />
            <StatCard
              label="Latest evidence"
              value={activeRun?.run?.runId ? activeRun.run.runId.slice(-8) : "—"}
              note={activeRun?.run?.dataMode ?? "No run selected"}
            />
          </div>
        </Panel>

        <Panel eyebrow="Signal strip" title="Recent trade P&L" description="Quick view of the latest closed trades. Green bars are profitable, rose bars are losing trades.">
          <MiniBarChart values={recentTradeValues} labels={recentTradeLabels} />
        </Panel>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        <Panel eyebrow="Investigation workspace" title="Search runs and events" description="Search is server-rendered from the analytics API. Clicking a run opens the same console scoped to that run id.">
          <form className="grid gap-3 md:grid-cols-[1fr_auto]">
            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.22em] text-zinc-500">Search query</span>
              <input
                name="q"
                defaultValue={query}
                placeholder="Search by run id, event type, reason, or symbol"
                className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/20"
              />
            </label>
            <button
              type="submit"
              className="mt-auto inline-flex items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-400/15 px-4 py-3 text-sm font-medium text-cyan-100 transition hover:bg-cyan-400/20"
            >
              Search evidence
            </button>
          </form>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-zinc-50">Matching runs</h3>
                {query ? <span className="text-xs text-zinc-500">{searchResults?.runs.length ?? 0} results</span> : null}
              </div>
              <DataTable columns={["Run", "Mode", "Symbol", "Created"]}>
                {query && searchResults?.runs.length ? (
                  searchResults.runs.slice(0, 6).map((run) => (
                    <DataRow
                      key={run.runId}
                      cells={[
                        <Link key="run" href={`/?runId=${encodeURIComponent(run.runId)}${query ? `&q=${encodeURIComponent(query)}` : ""}`} className="font-mono text-xs text-zinc-100 transition hover:text-cyan-300">
                          {run.runId}
                        </Link>,
                        <span key="mode">{run.dataMode ?? "—"}</span>,
                        <span key="symbol">{run.symbol ?? "—"}</span>,
                        <span key="created">{formatDate(run.createdAt)}</span>,
                      ]}
                    />
                  ))
                ) : (
                  <div className="px-4 py-4 text-sm text-zinc-500">Enter a query to search runs.</div>
                )}
              </DataTable>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-zinc-50">Matching events</h3>
                {query ? <span className="text-xs text-zinc-500">{searchResults?.events.length ?? 0} results</span> : null}
              </div>
              <DataTable columns={["Type", "Reason", "Symbol", "Time"]}>
                {query && searchResults?.events.length ? (
                  searchResults.events.slice(0, 6).map((event) => (
                    <DataRow
                      key={event.id}
                      cells={[
                        <Badge key="type" tone={event.eventType?.includes("blocked") ? "warning" : "neutral"}>
                          {event.eventType ?? "—"}
                        </Badge>,
                        <span key="reason" className="truncate">
                          {event.reason ?? "—"}
                        </span>,
                        <span key="symbol">{event.symbol ?? "—"}</span>,
                        <span key="time">{formatDate(event.eventTimestamp)}</span>,
                      ]}
                    />
                  ))
                ) : (
                  <div className="px-4 py-4 text-sm text-zinc-500">Search by reason, symbol, or event type to inspect telemetry.</div>
                )}
              </DataTable>
            </div>
          </div>
        </Panel>

        <Panel eyebrow="Active run" title={activeRun?.run?.runId ?? "Latest run"} description={activeRun?.run ? summarizeRun(activeRun.run.runId, activeRun) : "No active run evidence loaded."}>
          {activeRun?.run ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge tone="accent">{activeRun.run.dataMode ?? "unknown"}</Badge>
                <Badge tone="neutral">{activeRun.run.symbol ?? "n/a"}</Badge>
                <Badge tone="success">{formatDate(activeRun.run.createdAt)}</Badge>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Last block</p>
                  <p className="mt-2 text-sm text-zinc-200">{activeRun.run.lastEntryBlockReason ?? "None"}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">State snapshots</p>
                  <p className="mt-2 text-sm text-zinc-200">{formatShort(activeRun.stateSnapshots.length)}</p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Decision snapshots</p>
                  <p className="mt-2 text-sm text-zinc-200">{formatShort(activeRun.decisionSnapshots.length)}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Order lifecycle</p>
                  <p className="mt-2 text-sm text-zinc-200">{formatShort(activeRun.orderLifecycle.length)}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Bridge checks</p>
                  <p className="mt-2 text-sm text-zinc-200">{formatShort(activeRun.bridgeHealth.length)}</p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Latest bridge status</p>
                  <p className="mt-2 text-sm text-zinc-200">{activeRun.bridgeHealth[0]?.bridgeStatus ?? "unknown"}</p>
                  <p className="mt-1 text-xs text-zinc-500">{activeRun.bridgeHealth[0]?.lastError ?? "No bridge error"}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Latest decision outcome</p>
                  <p className="mt-2 text-sm text-zinc-200">
                    {activeRun.decisionSnapshots[0]?.outcome ?? activeRun.decisionSnapshots[0]?.reason ?? "No decision snapshot"}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">{activeRun.decisionSnapshots[0]?.decisionId ?? "No decision id"}</p>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Link
                  href={`/runs/${activeRun.run.runId}`}
                  className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-200 transition hover:border-cyan-400/30 hover:bg-cyan-400/10 hover:text-white"
                >
                  Open full run detail
                </Link>
                <span className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-400">
                  {activeRun.events.length} telemetry rows loaded
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">No run selected. Use search or open a run from the latest list.</p>
          )}
        </Panel>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Panel eyebrow="Recent activity" title="Latest runs" description="The newest runs, ordered by creation time.">
          <DataTable columns={["Run", "Mode", "Symbol", "Created"]}>
            {dashboard.runs.length === 0 ? (
              <div className="px-4 py-4 text-sm text-zinc-500">No runs yet.</div>
            ) : (
              dashboard.runs.slice(0, 6).map((run) => (
                <DataRow
                  key={run.runId}
                  cells={[
                    <Link key="run" href={`/runs/${run.runId}`} className="font-mono text-xs text-zinc-100 transition hover:text-cyan-300">
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

        <Panel eyebrow="RLM library" title="Latest reports and lineage" description="Persisted RLM artifacts, hypotheses, and knowledge-store entries. Open the lineage explorer for graph-style review.">
          <div className="space-y-3">
            {dashboard.reports.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-500">No reports have been generated yet.</div>
            ) : (
              dashboard.reports.slice(0, 3).map((report) => (
                <article key={report.reportId} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.22em] text-emerald-400">{report.modelProvider}</p>
                      <Link href={`/reports/${report.reportId}`} className="mt-2 block text-base font-semibold text-zinc-50 transition hover:text-cyan-300">
                        {report.title}
                      </Link>
                    </div>
                    <Badge tone={report.status === "completed" ? "success" : "neutral"}>{report.status}</Badge>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-zinc-400">
                    {report.summaryText.slice(0, 200)}
                    {report.summaryText.length > 200 ? "…" : ""}
                  </p>
                </article>
              ))
            )}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <StatCard label="Hypotheses" value={formatShort(rlmLibrary?.hypotheses.length ?? 0)} note={latestHypothesis ? latestHypothesis.claimText : "No hypotheses yet"} />
            <StatCard
              label="Knowledge entries"
              value={formatShort(rlmLibrary?.knowledgeStore.length ?? 0)}
              note={rlmLibrary?.metaLearnerStats ? `${rlmLibrary.metaLearnerStats.survivalCount} survive / ${rlmLibrary.metaLearnerStats.rejectionCount} reject` : "No stats yet"}
            />
            <StatCard label="Latest report" value={latestReport ? latestReport.title : "None"} note={latestReport ? formatDate(latestReport.completedAt ?? latestReport.createdAt) : "No persisted report"} />
          </div>
        </Panel>
      </section>

      <section className="mt-6">
        <OperatorChat
          defaultRunId={activeRun?.run?.runId ?? dashboard.runs[0]?.runId ?? null}
          defaultPrompt={query ? `Investigate ${query}` : "Summarize the current run and highlight blocker patterns."}
        />
      </section>
    </main>
  );
}
