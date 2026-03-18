import { auth } from "@clerk/nextjs/server";
import Link from "next/link";

import { Badge, DataRow, DataTable, Panel, formatDate } from "@/components/dashboard";
import { fetchDashboardData } from "@/lib/analytics";

export default async function RunsPage() {
  const { userId } = await auth();
  const data = userId ? await fetchDashboardData() : null;

  if (!userId) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-10 lg:px-8">
        <Panel eyebrow="Runs" title="Sign in to view run evidence" description="This page shows the latest run records and links to the investigation detail view.">
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

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 lg:px-8">
      <Panel
        eyebrow="Runs"
        title="Latest run records"
        description="A compact index for investigations, with links back into the full console detail view."
        action={
          <Link
            href="/"
            className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 transition hover:border-cyan-400/30 hover:bg-cyan-400/10 hover:text-white"
          >
            Back to console
          </Link>
        }
      >
        <DataTable columns={["Run", "Mode", "Symbol", "Created"]}>
          {data.runs.length === 0 ? (
            <div className="px-4 py-4 text-sm text-zinc-500">No runs yet.</div>
          ) : (
            data.runs.map((run) => (
              <DataRow
                key={run.runId}
                cells={[
                  <Link key="run" href={`/runs/${run.runId}`} className="font-mono text-xs text-zinc-100 transition hover:text-cyan-300">
                    {run.runId}
                  </Link>,
                  <Badge key="mode" tone="neutral">
                    {run.dataMode ?? "—"}
                  </Badge>,
                  <span key="symbol">{run.symbol ?? "—"}</span>,
                  <span key="created">{formatDate(run.createdAt)}</span>,
                ]}
              />
            ))
          )}
        </DataTable>
      </Panel>
    </main>
  );
}
