import Link from "next/link";

import { Badge, DataRow, DataTable, EmptyState, Panel, formatCurrency, formatDate, formatShort } from "@/components/dashboard";
import { PageShell } from "@/components/page-shell";
import { fetchAccountSummaries, fetchAccountTrades, fetchDashboardData, isSyntheticRunId } from "@/lib/analytics";
import { isSignedInRequest } from "@/lib/session";

function modeTone(mode: string | null) {
  if (mode === "practice") {
    return "warning" as const;
  }
  if (mode === "live") {
    return "success" as const;
  }
  return "neutral" as const;
}

export default async function RunsPage() {
  const signedIn = await isSignedInRequest();
  const [data, accountSummaries, accountTrades] = signedIn
    ? await Promise.all([fetchDashboardData(), fetchAccountSummaries(), fetchAccountTrades({ limit: 12 })])
    : [null, [], []];

  if (!signedIn) {
    return <PageShell authenticated={false} />;
  }

  if (!data) {
    return (
      <PageShell authenticated>
        <main className="mx-auto max-w-6xl px-6 py-10 lg:px-8">
          <Panel eyebrow="Runs" title="No run data yet" description="Set `ANALYTICS_API_URL` and `ANALYTICS_API_KEY` on the web service to load runs from the analytics backend.">
            <p className="text-sm text-zinc-400">Once connected, the run index will populate automatically.</p>
          </Panel>
        </main>
      </PageShell>
    );
  }

  const realRuns = data.runs.filter((run) => !isSyntheticRunId(run.runId));
  const syntheticRuns = data.runs.length - realRuns.length;
  const accountLedgerPnl = accountSummaries[0]?.realizedPnl ?? data.summary.total_pnl;

  return (
    <PageShell authenticated>
      <main className="mx-auto max-w-6xl space-y-6 px-6 py-10 lg:px-8">
      <Panel
        eyebrow="Runs"
        title="Real run records"
        description="This index hides synthetic validation runs by default and falls back to the live account ledger when no real runs are available."
        action={
          <Link
            href="/"
            className="inline-flex items-center rounded-full border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 transition hover:border-cyan-500/30 hover:bg-cyan-500/10 hover:text-white"
          >
            Back to console
          </Link>
        }
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Visible runs</p>
            <p className="mt-2 text-xl font-semibold text-zinc-50">{formatShort(realRuns.length)}</p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Synthetic hidden</p>
            <p className="mt-2 text-xl font-semibold text-zinc-50">{formatShort(syntheticRuns)}</p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Latest ledger P&L</p>
            <p className="mt-2 text-xl font-semibold text-zinc-50">{formatCurrency(accountLedgerPnl)}</p>
          </div>
        </div>

        {realRuns.length === 0 ? (
          <EmptyState
            title="No real runs yet"
            description="The account ledger below is the production evidence until run history backfill catches up."
          />
        ) : (
          <DataTable columns={["Run", "Account", "Mode", "Last seen"]}>
            {realRuns.map((run) => (
              <DataRow
                key={run.runId}
                cells={[
                  <Link key="run" href={`/runs/${run.runId}`} className="font-mono text-xs text-zinc-100 transition hover:text-cyan-300">
                    {run.runId}
                  </Link>,
                  <div key="account">
                    <p>{run.accountName ?? "Unknown account"}</p>
                    <p className="text-xs text-zinc-500">{run.accountId ?? "no account id"}</p>
                  </div>,
                  <Badge key="mode" tone={modeTone(run.accountMode)}>
                    {run.accountMode ?? "unknown"}
                  </Badge>,
                  <span key="created">{formatDate(run.lastSeenAt ?? run.createdAt)}</span>,
                ]}
              />
            ))}
          </DataTable>
        )}

        {!realRuns.length && accountSummaries.length ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Active account</p>
            <p className="mt-2 font-mono text-sm text-zinc-100">{accountSummaries[0]?.accountName ?? accountSummaries[0]?.accountId}</p>
            <p className="mt-1 text-xs text-zinc-500">
              {accountSummaries[0]?.accountMode ?? "unknown"} · {formatShort(accountSummaries[0]?.tradeCount ?? 0)} trades · {formatCurrency(accountSummaries[0]?.realizedPnl ?? 0)}
            </p>
          </div>
        ) : null}

        {!realRuns.length && accountTrades.length ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80">
            <div className="grid grid-cols-4 gap-4 border-b border-zinc-800 px-4 py-3 text-[11px] uppercase tracking-[0.22em] text-zinc-500">
              <span>Account</span>
              <span>Side</span>
              <span>PnL</span>
              <span>Time</span>
            </div>
            {accountTrades.slice(0, 4).map((trade) => (
              <div key={trade.id} className="grid grid-cols-4 gap-4 border-b border-zinc-800 px-4 py-3 text-sm text-zinc-200 last:border-b-0">
                <div>
                  <p className="font-mono text-xs text-zinc-100">{trade.accountName ?? trade.accountId}</p>
                  <p className="text-xs text-zinc-500">{trade.brokerTradeId}</p>
                </div>
                <span>{trade.side === 1 ? "long" : trade.side === 0 ? "flat" : trade.side === -1 ? "short" : "unknown"}</span>
                <span className={typeof trade.profitAndLoss === "number" && trade.profitAndLoss >= 0 ? "text-emerald-300" : "text-rose-300"}>
                  {trade.profitAndLoss === null ? "—" : formatCurrency(trade.profitAndLoss)}
                </span>
                <span>{formatDate(trade.occurredAt)}</span>
              </div>
            ))}
          </div>
        ) : null}
      </Panel>
      </main>
    </PageShell>
  );
}
