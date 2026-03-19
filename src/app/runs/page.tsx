import { auth } from "@clerk/nextjs/server";
import Link from "next/link";

import { Badge, DataRow, DataTable, Panel, formatCurrency, formatDate, formatShort } from "@/components/dashboard";
import { fetchDashboardData, isSyntheticRunId } from "@/lib/analytics";

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
  const data = userId ? await fetchDashboardData() : null;

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
        description="This index hides synthetic validation runs by default so the list reflects operator-relevant evidence."
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
            <div className="px-4 py-4 text-sm text-zinc-500">No real runs yet. If only validation rows exist, backfill account and run evidence first.</div>
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
