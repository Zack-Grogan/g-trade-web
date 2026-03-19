import { auth } from "@clerk/nextjs/server";
import Link from "next/link";

import { Badge, DataRow, DataTable, Panel, formatCurrency, formatDate, formatShort } from "@/components/dashboard";
import { fetchAccountSummaries, fetchAccountTrades, fetchDashboardData, isSyntheticRunId } from "@/lib/analytics";

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
  const { userId } = await auth();
  const [data, accountSummaries, accountTrades] = userId
    ? await Promise.all([fetchDashboardData(), fetchAccountSummaries(), fetchAccountTrades({ limit: 12 })])
    : [null, [], []];

  if (!userId) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-10 lg:px-8">
        <Panel eyebrow="Runs" title="Sign in to view run evidence" description="This page filters the operator run index down to real account-aware evidence.">
          <p className="text-sm text-zinc-400">Authenticate to inspect the run index.</p>
        </Panel>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-10 lg:px-8">
        <Panel eyebrow="Runs" title="No run data yet" description="Set `ANALYTICS_API_URL` and `ANALYTICS_API_KEY` on the web service to load runs from the analytics backend.">
          <p className="text-sm text-zinc-400">Once connected, the run index will populate automatically.</p>
        </Panel>
      </main>
    );
  }

  const realRuns = data.runs.filter((run) => !isSyntheticRunId(run.runId));
  const syntheticRuns = data.runs.length - realRuns.length;

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 lg:px-8">
      <Panel
        eyebrow="Runs"
        title="Real run records"
        description="This index hides synthetic validation runs by default and falls back to the live account ledger when no real runs are available."
        action={
          <Link
            href="/"
            className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 transition hover:border-cyan-400/30 hover:bg-cyan-400/10 hover:text-white"
          >
            Back to console
          </Link>
        }
      >
        <div className="mb-5 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Visible runs</p>
            <p className="mt-2 text-xl font-semibold text-zinc-50">{formatShort(realRuns.length)}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Synthetic hidden</p>
            <p className="mt-2 text-xl font-semibold text-zinc-50">{formatShort(syntheticRuns)}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Latest ledger P&L</p>
            <p className="mt-2 text-xl font-semibold text-zinc-50">{formatCurrency(data.summary.total_pnl)}</p>
          </div>
        </div>

        <DataTable columns={["Run", "Account", "Mode", "Last seen"]}>
          {realRuns.length === 0 ? (
            <div className="space-y-4 px-4 py-4 text-sm text-zinc-500">
              <p>No real runs yet. The account ledger below is the actual production evidence until run history backfill catches up.</p>
              {accountSummaries.length ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Active account</p>
                  <p className="mt-2 font-mono text-sm text-zinc-100">{accountSummaries[0]?.accountName ?? accountSummaries[0]?.accountId}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {accountSummaries[0]?.accountMode ?? "unknown"} · {formatShort(accountSummaries[0]?.tradeCount ?? 0)} trades ·{" "}
                    {formatCurrency(accountSummaries[0]?.realizedPnl ?? 0)}
                  </p>
                </div>
              ) : null}
              {accountTrades.length ? (
                <div className="rounded-2xl border border-white/10 bg-white/5">
                  <div className="grid grid-cols-4 gap-4 border-b border-white/10 px-4 py-3 text-[11px] uppercase tracking-[0.22em] text-zinc-500">
                    <span>Account</span>
                    <span>Side</span>
                    <span>PnL</span>
                    <span>Time</span>
                  </div>
                  {accountTrades.slice(0, 4).map((trade) => (
                    <div key={trade.id} className="grid grid-cols-4 gap-4 border-b border-white/5 px-4 py-3 text-sm text-zinc-200 last:border-b-0">
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
            </div>
          ) : (
            realRuns.map((run) => (
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
            ))
          )}
        </DataTable>
      </Panel>
    </main>
  );
}
