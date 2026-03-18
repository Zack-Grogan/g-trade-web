import { notFound } from "next/navigation";

import { Badge, DataRow, DataTable, MiniBarChart, Panel, formatCurrency, formatDate, formatShort } from "@/components/dashboard";
import { fetchRunDetail } from "@/lib/analytics";

function asText(value: unknown) {
  if (value === null || value === undefined) {
    return "—";
  }
  return String(value);
}

function describeTimelineEntry(entry: Record<string, unknown>) {
  if (entry.kind === "state_snapshot") {
    const position = entry.position ?? entry.position_pnl ?? "—";
    const riskState = entry.risk_state ?? entry.riskState ?? "—";
    return `state ${entry.status ?? "unknown"} · pos ${position} · risk ${riskState}`;
  }
  if (entry.kind === "trade") {
    return `trade pnl ${asText(entry.pnl)} · ${asText(entry.zone)} · ${asText(entry.strategy)}`;
  }
  return [
    entry.event_type ?? entry.eventType ?? "event",
    entry.category ?? "unknown",
    entry.action ?? entry.reason ?? "—",
  ].join(" · ");
}

export default async function RunDetailPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;
  const data = await fetchRunDetail(runId);

  if (!data?.run) {
    notFound();
  }

  const tradeValues = data.trades.slice(0, 8).map((trade) => trade.pnl);
  const tradeLabels = data.trades.slice(0, 8).map((trade) => trade.id.toString());
  const latestSnapshot = data.stateSnapshots[0] ?? null;
  const latestBlocker = data.blockers[0] ?? null;

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 lg:px-8">
      <Panel
        eyebrow="Run detail"
        title={data.run.runId}
        description="The run record, its events, and the trades that were closed under it."
      >
        <div className="flex flex-wrap gap-2">
          <Badge tone="neutral">{data.run.dataMode ?? "unknown"}</Badge>
          <Badge tone="accent">{data.run.symbol ?? "n/a"}</Badge>
          <Badge tone="success">{formatDate(data.run.createdAt)}</Badge>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Panel eyebrow="Run facts" title="Metadata" description="Process id and payload snapshot.">
            <p className="text-sm text-zinc-300">Process: {asText(data.run.processId)}</p>
            <p className="mt-2 text-sm text-zinc-300">Mode: {asText(data.run.dataMode)}</p>
            <p className="mt-2 text-sm text-zinc-300">Symbol: {asText(data.run.symbol)}</p>
          </Panel>
          <Panel eyebrow="Trades" title="Closed trades" description="P&L from the latest trades on this run.">
            <p className="text-2xl font-semibold text-zinc-50">{formatShort(data.trades.length)}</p>
            <p className="mt-2 text-sm text-zinc-400">{formatCurrency(data.trades.reduce((sum, trade) => sum + trade.pnl, 0))}</p>
          </Panel>
          <Panel eyebrow="Events" title="Event count" description="Telemetry captured for this run.">
            <p className="text-2xl font-semibold text-zinc-50">{formatShort(data.events.length)}</p>
            <p className="mt-2 text-sm text-zinc-400">{formatShort(data.blockers.length)} blockers in reconstructed timeline.</p>
          </Panel>
        </div>
      </Panel>

      <section className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel eyebrow="Signal strip" title="Trade P&L" description="Quick view of the latest closed trades on this run.">
          <MiniBarChart values={tradeValues} labels={tradeLabels} />
        </Panel>

        <Panel eyebrow="Payload" title="Run payload JSON" description="Raw run payload captured in analytics.">
          <pre className="max-h-[24rem] overflow-auto rounded-2xl border border-white/10 bg-zinc-950/60 p-4 text-xs leading-6 text-zinc-300">
            {JSON.stringify(data.run.payloadJson ?? {}, null, 2)}
          </pre>
        </Panel>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel eyebrow="Current state" title="Latest snapshot" description="The most recent trader state received by analytics.">
          {latestSnapshot ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge tone="accent">{latestSnapshot.status ?? "unknown"}</Badge>
                <Badge tone="neutral">{latestSnapshot.zone ?? "no zone"}</Badge>
                <Badge tone="success">{latestSnapshot.riskState ?? "risk unknown"}</Badge>
              </div>
              <div className="grid gap-3 text-sm text-zinc-300 sm:grid-cols-2">
                <p>Position: {asText(latestSnapshot.position)}</p>
                <p>PnL: {formatCurrency(latestSnapshot.positionPnl ?? 0)}</p>
                <p>Daily PnL: {formatCurrency(latestSnapshot.dailyPnl ?? 0)}</p>
                <p>Last block: {asText(latestSnapshot.lastEntryBlockReason)}</p>
              </div>
              <pre className="max-h-[18rem] overflow-auto rounded-2xl border border-white/10 bg-zinc-950/60 p-4 text-xs leading-6 text-zinc-300">
                {JSON.stringify(latestSnapshot.payloadJson ?? {}, null, 2)}
              </pre>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">No state snapshots found for this run.</p>
          )}
        </Panel>

        <Panel eyebrow="Blockers" title="Recent blockers" description="Reasons the engine did not enter or had to protect the position.">
          {latestBlocker ? (
            <div className="space-y-3">
              <Badge tone="warning">{asText(latestBlocker.eventType ?? latestBlocker.reason ?? latestBlocker.category)}</Badge>
              <p className="text-sm text-zinc-300">{describeTimelineEntry(latestBlocker)}</p>
              <pre className="max-h-[18rem] overflow-auto rounded-2xl border border-white/10 bg-zinc-950/60 p-4 text-xs leading-6 text-zinc-300">
                {JSON.stringify(latestBlocker, null, 2)}
              </pre>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">No blockers were reconstructed for this run.</p>
          )}
        </Panel>
      </section>

      <section className="mt-6">
        <Panel eyebrow="Timeline" title="Reconstructed run timeline" description="Signals, blocker events, state snapshots, and trades in one chronological stream.">
          <DataTable columns={["Kind", "Time", "Detail", "Reason"]}>
            {data.timeline.length === 0 ? (
              <div className="px-4 py-4 text-sm text-zinc-500">No timeline entries found for this run.</div>
            ) : (
              data.timeline.slice(0, 12).map((entry, index) => (
                <DataRow
                  key={`${entry.kind}-${entry.timestamp ?? index}`}
                  cells={[
                    <Badge key="kind" tone={entry.kind === "trade" ? "success" : entry.kind === "state_snapshot" ? "accent" : "neutral"}>
                      {entry.kind}
                    </Badge>,
                    <span key="time">{asText(entry.timestamp)}</span>,
                    <span key="detail" className="truncate">
                      {describeTimelineEntry(entry)}
                    </span>,
                    <span key="reason" className="truncate">
                      {asText((entry.reason as string | undefined) ?? (entry.guard_reason as string | undefined) ?? (entry.guardReason as string | undefined))}
                    </span>,
                  ]}
                />
              ))
            )}
          </DataTable>
        </Panel>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel eyebrow="Trades" title="Closed trades" description="The trades associated with this run.">
          <DataTable columns={["PnL", "Zone", "Strategy", "Exit"]}>
            {data.trades.length === 0 ? (
              <div className="px-4 py-4 text-sm text-zinc-500">No trades found for this run.</div>
            ) : (
              data.trades.slice(0, 8).map((trade) => (
                <DataRow
                  key={trade.id}
                  cells={[
                    <span key="pnl" className={trade.pnl >= 0 ? "text-emerald-300" : "text-rose-300"}>
                      {formatCurrency(trade.pnl)}
                    </span>,
                    <span key="zone">{trade.zone ?? "—"}</span>,
                    <span key="strategy">{trade.strategy ?? "—"}</span>,
                    <span key="exit">{formatDate(trade.exitTime ?? trade.entryTime)}</span>,
                  ]}
                />
              ))
            )}
          </DataTable>
        </Panel>

        <Panel eyebrow="Events" title="Latest telemetry" description="Most recent events captured during the run.">
          <DataTable columns={["Type", "Category", "Symbol", "Time"]}>
            {data.events.length === 0 ? (
              <div className="px-4 py-4 text-sm text-zinc-500">No events found for this run.</div>
            ) : (
              data.events.slice(0, 8).map((event) => (
                <DataRow
                  key={event.id}
                  cells={[
                    <span key="type">{event.eventType ?? "—"}</span>,
                    <span key="category">{event.category ?? "—"}</span>,
                    <span key="symbol">{event.symbol ?? "—"}</span>,
                    <span key="time">{formatDate(event.eventTimestamp)}</span>,
                  ]}
                />
              ))
            )}
          </DataTable>
        </Panel>
      </section>
    </main>
  );
}
