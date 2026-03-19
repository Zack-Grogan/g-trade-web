import Link from "next/link";

import { Badge, DataRow, DataTable, MiniBarChart, Panel, StatCard, formatCurrency, formatDate, formatShort } from "@/components/dashboard";
import { PageShell } from "@/components/page-shell";
import { OperatorChat } from "@/components/operator-chat";
import {
  fetchAccountSummaries,
  fetchAccountTrades,
  fetchBridgeFailures,
  fetchDashboardData,
  fetchRlmLibrary,
  fetchRunDetail,
  fetchSearchResults,
  fetchServiceHealth,
  isSyntheticRunId,
  type RunRow,
} from "@/lib/analytics";
import { isSignedInRequest } from "@/lib/session";

function toneForMode(mode: string | null) {
  if (mode === "practice") {
    return "warning" as const;
  }
  if (mode === "live") {
    return "success" as const;
  }
  return "neutral" as const;
}

function latestRunText(run: RunRow | null) {
  if (!run) {
    return "No real run selected";
  }
  return [run.accountName ?? "Unknown account", run.accountMode ?? "mode unknown", run.status ?? "status unknown"].join(" · ");
}

function buildOperatorActions(args: {
  realRuns: RunRow[];
  syntheticRuns: RunRow[];
  bridgeFailureCount: number;
  accountTradeCount: number;
  selectedRunBlockers: number;
}) {
  const actions: string[] = [];
  if (args.bridgeFailureCount > 0) {
    actions.push(`Bridge failures are present (${args.bridgeFailureCount}). Review queue depth and auth/runtime errors before trusting cloud visibility.`);
  }
  if (args.accountTradeCount === 0) {
    actions.push("No broker account-trade history is visible yet. Run the local account sync path before using web trade views as truth.");
  }
  if (args.selectedRunBlockers > 0) {
    actions.push(`The selected run still has ${args.selectedRunBlockers} blocker events in its timeline. Investigate those before changing strategy logic.`);
  }
  if (args.realRuns.length === 0 && args.syntheticRuns.length > 0) {
    actions.push("Only synthetic validation runs are visible in the console. Filter them out operationally and backfill real account evidence.");
  }
  if (actions.length === 0) {
    actions.push("No immediate telemetry blocker is obvious. Compare recent account-trade P&L against the latest run’s blocker and bridge timelines.");
  }
  return actions.slice(0, 4);
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    runId?: string;
  }>;
}) {
  const signedIn = await isSignedInRequest();
  const params = await searchParams;
  const query = (params.q || "").trim();
  const requestedRunId = (params.runId || "").trim();

  if (!signedIn) {
    return <PageShell authenticated={false} />;
  }

  const [dashboard, rlmLibrary, searchResults, accountSummaries, accountTrades, bridgeFailures, serviceHealth] = await Promise.all([
    fetchDashboardData(),
    fetchRlmLibrary(),
    fetchSearchResults(query),
    fetchAccountSummaries(),
    fetchAccountTrades({ limit: 12 }),
    fetchBridgeFailures(),
    fetchServiceHealth(),
  ]);

  if (!dashboard) {
    return (
      <main className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        <Panel
          eyebrow="Operator console"
          title="No analytics data yet"
          description="Set `ANALYTICS_API_URL` and `ANALYTICS_API_KEY` on the web service so it can read the analytics backend."
        >
          <p className="text-sm text-zinc-400">Once the API is wired, the console will show account trade history, bridge freshness, run blockers, and RLM artifacts.</p>
        </Panel>
      </main>
    );
  }

  const syntheticRuns = dashboard.runs.filter((run) => isSyntheticRunId(run.runId));
  const realRuns = dashboard.runs.filter((run) => !isSyntheticRunId(run.runId));
  const candidateRuns = query && searchResults?.runs.length ? searchResults.runs.filter((run) => !isSyntheticRunId(run.runId)) : realRuns;
  const selectedRunId = requestedRunId || candidateRuns[0]?.runId || realRuns[0]?.runId || dashboard.runs[0]?.runId || null;
  const activeRun = selectedRunId ? await fetchRunDetail(selectedRunId) : null;
  const latestReport = dashboard.reports[0] ?? null;
  const latestHypothesis = rlmLibrary?.hypotheses[0] ?? null;
  const accountTradeBars = accountTrades.slice(0, 8).map((trade) => trade.profitAndLoss ?? 0);
  const accountTradeLabels = accountTrades.slice(0, 8).map((trade) => trade.accountName ?? trade.accountId);
  const operatorActions = buildOperatorActions({
    realRuns,
    syntheticRuns,
    bridgeFailureCount: bridgeFailures.length,
    accountTradeCount: accountTrades.length,
    selectedRunBlockers: activeRun?.blockers.length ?? 0,
  });

  return (
    <PageShell authenticated>
      <main className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel
          eyebrow="Operator cockpit"
          title="Use the web to judge account health, not just browse artifacts"
          description="The account ledger, bridge freshness, and latest blocker pressure are the first things to inspect before touching strategy code."
          action={
            <Link
              href="/runs"
              className="inline-flex items-center rounded-full border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 transition hover:border-cyan-500/30 hover:bg-cyan-500/10 hover:text-white"
            >
              Open run index
            </Link>
          }
        >
          <div className="flex flex-wrap gap-2">
            <Badge tone="success">Clerk-authenticated</Badge>
            <Badge tone="accent">Account-aware</Badge>
            <Badge tone="neutral">Advisory only</Badge>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <StatCard label="Accounts" value={formatShort(accountSummaries.length)} note={accountSummaries[0] ? `${accountSummaries[0].accountName ?? accountSummaries[0].accountId} active most recently` : "No account summary"} />
            <StatCard label="Real runs" value={formatShort(realRuns.length)} note={syntheticRuns.length ? `${syntheticRuns.length} synthetic runs hidden from default focus` : "No synthetic noise detected"} />
            <StatCard label="Account trades" value={formatShort(accountTrades.length)} note={dashboard.summary.latest_trade_at ? `Latest ${formatDate(dashboard.summary.latest_trade_at)}` : "No trade timestamp"} />
            <StatCard label="Bridge failures" value={formatShort(bridgeFailures.length)} note={dashboard.summary.latest_bridge_failure_at ? formatDate(dashboard.summary.latest_bridge_failure_at) : "No recent failures"} />
          </div>
        </Panel>

        <Panel eyebrow="Selected run" title={selectedRunId ?? "No run selected"} description={latestRunText(activeRun?.run ?? null)}>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {activeRun?.run?.accountName ? <Badge tone={toneForMode(activeRun.run.accountMode)}>{activeRun.run.accountName}</Badge> : null}
              {activeRun?.run?.accountMode ? <Badge tone={toneForMode(activeRun.run.accountMode)}>{activeRun.run.accountMode}</Badge> : null}
              <Badge tone="accent">{activeRun?.run?.symbol ?? "n/a"}</Badge>
              <Badge tone="neutral">{activeRun?.run?.status ?? "status unknown"}</Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Last seen</p>
                <p className="mt-2 text-sm text-zinc-200">{formatDate(activeRun?.run?.lastSeenAt ?? activeRun?.run?.createdAt ?? null)}</p>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Timeline blockers</p>
                <p className="mt-2 text-sm text-zinc-200">{formatShort(activeRun?.blockers.length ?? 0)}</p>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Bridge status</p>
                <p className="mt-2 text-sm text-zinc-200">{activeRun?.bridgeHealth[0]?.bridgeStatus ?? "unknown"}</p>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Decision pressure</p>
                <p className="mt-2 text-sm text-zinc-200">{activeRun?.decisionSnapshots[0]?.outcome ?? activeRun?.decisionSnapshots[0]?.reason ?? "No decision snapshot"}</p>
              </div>
            </div>
            {activeRun?.run ? (
              <Link
                href={`/runs/${activeRun.run.runId}`}
                className="inline-flex items-center rounded-full border border-cyan-500/30 bg-cyan-500/15 px-4 py-2 text-sm text-cyan-100 transition hover:bg-cyan-500/20"
              >
                Open full investigation view
              </Link>
            ) : (
              <p className="text-sm text-zinc-500">No run detail is loaded yet.</p>
            )}
          </div>
        </Panel>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Panel eyebrow="Decision board" title="What needs operator attention next" description="These prompts are derived from real telemetry gaps, not generic productivity filler.">
          <div className="space-y-3">
            {operatorActions.map((action) => (
              <div key={action} className="rounded-2xl border border-zinc-800 bg-zinc-950/80 px-4 py-3 text-sm text-zinc-200">
                {action}
              </div>
            ))}
          </div>
        </Panel>

        <Panel eyebrow="Ledger pulse" title="Recent account-trade P&L" description="This is broker account history, not only run-scoped completed trades. Use it to verify that the web reflects the actual account.">
          {accountTrades.length ? (
            <MiniBarChart values={accountTradeBars} labels={accountTradeLabels} />
          ) : (
              <p className="text-sm text-zinc-500">No account-trade history is visible yet.</p>
          )}
        </Panel>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Panel eyebrow="Accounts" title="Account modes and recent activity" description="Practice vs live must be explicit or the rest of the product becomes misleading.">
          <DataTable columns={["Account", "Mode", "Trades", "Last activity"]}>
            {accountSummaries.length === 0 ? (
              <div className="px-4 py-4 text-sm text-zinc-500">No account summaries found yet.</div>
            ) : (
              accountSummaries.map((account) => (
                <DataRow
                  key={account.accountId}
                  cells={[
                    <div key="account">
                      <p className="font-mono text-xs text-zinc-100">{account.accountName ?? account.accountId}</p>
                      <p className="text-xs text-zinc-500">{account.accountId}</p>
                    </div>,
                    <Badge key="mode" tone={toneForMode(account.accountMode)}>
                      {account.accountMode ?? "unknown"}
                    </Badge>,
                    <div key="trades">
                      <p className={account.realizedPnl >= 0 ? "text-emerald-300" : "text-rose-300"}>{formatCurrency(account.realizedPnl)}</p>
                      <p className="text-xs text-zinc-500">{formatShort(account.tradeCount)} trades</p>
                    </div>,
                    <span key="time">{formatDate(account.latestTradeAt ?? account.latestRunSeenAt)}</span>,
                  ]}
                />
              ))
            )}
          </DataTable>
        </Panel>

        <Panel eyebrow="Recent broker trades" title="Account-trade ledger" description="These rows prove whether the practice account is backfilled and whether Railway is compatible with account-level history.">
          <DataTable columns={["Account", "Side", "PnL", "Time"]}>
            {accountTrades.length === 0 ? (
              <div className="px-4 py-4 text-sm text-zinc-500">No account trades found yet.</div>
            ) : (
              accountTrades.map((trade) => (
                <DataRow
                  key={`${trade.accountId}-${trade.brokerTradeId}`}
                  cells={[
                    <div key="account">
                      <p className="text-sm text-zinc-100">{trade.accountName ?? trade.accountId}</p>
                      <p className="text-xs text-zinc-500">{trade.contractId ?? trade.brokerTradeId}</p>
                    </div>,
                    <Badge key="side" tone="neutral">
                      {trade.side === 1 ? "buy" : trade.side === 0 ? "sell" : "unknown"}
                    </Badge>,
                    <span key="pnl" className={(trade.profitAndLoss ?? 0) >= 0 ? "text-emerald-300" : "text-rose-300"}>
                      {formatCurrency(trade.profitAndLoss ?? 0)}
                    </span>,
                    <span key="time">{formatDate(trade.occurredAt)}</span>,
                  ]}
                />
              ))
            )}
          </DataTable>
        </Panel>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Panel eyebrow="Runs" title="Real run evidence" description="Synthetic validation rows are excluded from the default operator focus so the table reflects what matters.">
          <form className="mb-4 grid gap-3 md:grid-cols-[1fr_auto]">
            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.22em] text-zinc-500">Search evidence</span>
              <input
                name="q"
                defaultValue={query}
                placeholder="Search by run id, account, event type, reason, or symbol"
                className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/20"
              />
            </label>
            <button
              type="submit"
              className="mt-auto inline-flex items-center justify-center rounded-full border border-cyan-500/30 bg-cyan-500/15 px-4 py-3 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/20"
            >
              Search
            </button>
          </form>
          <DataTable columns={["Run", "Account", "Status", "Last seen"]}>
            {(candidateRuns.length ? candidateRuns : realRuns).length === 0 ? (
              <div className="px-4 py-4 text-sm text-zinc-500">No real runs found. If only synthetic rows exist, run backfill and hide validation data from production views.</div>
            ) : (
              (candidateRuns.length ? candidateRuns : realRuns).slice(0, 8).map((run) => (
                <DataRow
                  key={run.runId}
                  cells={[
                    <Link key="run" href={`/?runId=${encodeURIComponent(run.runId)}${query ? `&q=${encodeURIComponent(query)}` : ""}`} className="font-mono text-xs text-zinc-100 transition hover:text-cyan-300">
                      {run.runId}
                    </Link>,
                    <div key="account">
                      <p>{run.accountName ?? "Unknown account"}</p>
                      <p className="text-xs text-zinc-500">{run.accountMode ?? "unknown mode"}</p>
                    </div>,
                    <Badge key="status" tone={run.status === "running" ? "success" : "neutral"}>
                      {run.status ?? "unknown"}
                    </Badge>,
                    <span key="time">{formatDate(run.lastSeenAt ?? run.createdAt)}</span>,
                  ]}
                />
              ))
            )}
          </DataTable>
        </Panel>

        <Panel eyebrow="Service health" title="Can you trust what you are seeing?" description="If the bridge is stale or runtime logs stopped arriving, the web should tell you before you trust any analysis.">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Latest bridge</p>
              <p className="mt-2 text-sm text-zinc-200">{serviceHealth?.bridge ? String(serviceHealth.bridge.bridge_status ?? "unknown") : "No bridge heartbeat"}</p>
              <p className="mt-1 text-xs text-zinc-500">{serviceHealth?.bridge ? formatDate(String(serviceHealth.bridge.observed_at ?? "")) : "No timestamp"}</p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Runtime logs</p>
              <p className="mt-2 text-sm text-zinc-200">{formatShort(serviceHealth?.runtimeLogs?.count ?? 0)}</p>
              <p className="mt-1 text-xs text-zinc-500">{formatDate(serviceHealth?.runtimeLogs?.latestLoggedAt ?? null)}</p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Latest bridge error</p>
              <p className="mt-2 text-sm text-zinc-200">{bridgeFailures[0]?.lastError ?? "No active bridge failure"}</p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Latest report</p>
              <p className="mt-2 text-sm text-zinc-200">{latestReport?.title ?? "No report yet"}</p>
              <p className="mt-1 text-xs text-zinc-500">{formatDate(latestReport?.createdAt ?? null)}</p>
            </div>
          </div>
        </Panel>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Panel eyebrow="RLM" title="Latest advisory artifacts" description="Keep RLM visible, but tie it back to real telemetry rather than letting it float as an isolated artifact browser.">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Latest hypothesis</p>
              <p className="mt-2 text-sm text-zinc-200">{latestHypothesis?.claimText ?? "No hypothesis yet"}</p>
              <p className="mt-1 text-xs text-zinc-500">{latestHypothesis?.status ?? "no status"}</p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Latest report</p>
              <p className="mt-2 text-sm text-zinc-200">{latestReport?.summaryText ?? "No report summary yet"}</p>
              <p className="mt-1 text-xs text-zinc-500">{latestReport?.reportType ?? "no report type"}</p>
            </div>
          </div>
        </Panel>

        <OperatorChat defaultRunId={activeRun?.run?.runId ?? realRuns[0]?.runId ?? null} />
      </section>
      </main>
    </PageShell>
  );
}
