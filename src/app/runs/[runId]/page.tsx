import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge, DataRow, DataTable, MiniBarChart, Panel, formatCurrency, formatDate, formatShort } from "@/components/dashboard";
import { fetchAccountTrades, fetchRunDetail } from "@/lib/analytics";

function asText(value: unknown) {
  if (value === null || value === undefined || value === "") {
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
  if (entry.kind === "decision_snapshot") {
    return `${entry.outcome ?? "decision"} · ${entry.reason ?? entry.outcome_reason ?? "no reason"}`;
  }
  if (entry.kind === "order_lifecycle") {
    return `${entry.event_type ?? entry.eventType ?? "order"} · ${entry.status ?? "unknown"} · ${entry.reason ?? "no reason"}`;
  }
  if (entry.kind === "bridge_health") {
    return `bridge ${entry.bridge_status ?? "unknown"} · queue ${entry.queue_depth ?? "—"} · ${entry.last_error ?? "no error"}`;
  }
  if (entry.kind === "trade") {
    return `trade pnl ${asText(entry.pnl)} · ${asText(entry.zone)} · ${asText(entry.strategy)}`;
  }
  return [entry.event_type ?? entry.eventType ?? "event", entry.category ?? "unknown", entry.action ?? entry.reason ?? "—"].join(" · ");
}

export default async function RunDetailPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;
  const [data, accountTrades] = await Promise.all([fetchRunDetail(runId), fetchAccountTrades({ runId, limit: 12 })]);

  if (!data?.run) {
    notFound();
  }

  const tradeValues = data.trades.slice(0, 8).map((trade) => trade.pnl);
  const tradeLabels = data.trades.slice(0, 8).map((trade) => trade.id.toString());
  const latestSnapshot = data.stateSnapshots[0] ?? null;
  const latestDecision = data.decisionSnapshots[0] ?? null;
  const latestLifecycle = data.orderLifecycle[0] ?? null;
  const latestBridge = data.bridgeHealth[0] ?? null;

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 lg:px-8">
      <Panel
        eyebrow="Run detail"
        title={data.run.runId}
        description="The run record, its event stream, bridge health, and the trades that were closed under it."
        action={
          <Link
            href="/"
            className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 transition hover:border-cyan-400/30 hover:bg-cyan-400/10 hover:text-white"
          >
            Back to console
          </Link>
        }
      >
        <div className="flex flex-wrap gap-2">
          <Badge tone="neutral">{data.run.dataMode ?? "unknown"}</Badge>
          <Badge tone="accent">{data.run.symbol ?? "n/a"}</Badge>
          {data.run.accountName ? <Badge tone={data.run.accountMode === "practice" ? "warning" : "success"}>{data.run.accountName}</Badge> : null}
          {data.run.accountMode ? <Badge tone={data.run.accountMode === "practice" ? "warning" : "success"}>{data.run.accountMode}</Badge> : null}
          <Badge tone="success">{formatDate(data.run.createdAt)}</Badge>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Panel eyebrow="Run facts" title="Metadata" description="Process id and payload snapshot.">
            <p className="text-sm text-zinc-300">Process: {asText(data.run.processId)}</p>
            <p className="mt-2 text-sm text-zinc-300">Mode: {asText(data.run.dataMode)}</p>
            <p className="mt-2 text-sm text-zinc-300">Symbol: {asText(data.run.symbol)}</p>
            <p className="mt-2 text-sm text-zinc-300">Account: {asText(data.run.accountName ?? data.run.accountId)}</p>
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

        <Panel eyebrow="Decision trace" title="Latest decision" description="The most recent decision snapshot and its context.">
          {latestDecision ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge tone={latestDecision.outcome === "order_submitted" ? "success" : latestDecision.outcome === "blocked" ? "warning" : "neutral"}>
                  {latestDecision.outcome ?? "unknown"}
                </Badge>
                <Badge tone="accent">{latestDecision.decisionId.slice(-8) || `D${latestDecision.id}`}</Badge>
                <Badge tone="neutral">{latestDecision.regimeState ?? "no regime"}</Badge>
              </div>
              <div className="grid gap-3 text-sm text-zinc-300 sm:grid-cols-2">
                <p>Decision: {asText(latestDecision.decisionId)}</p>
                <p>Reason: {asText(latestDecision.reason ?? latestDecision.outcomeReason)}</p>
                <p>Score gap: {asText(latestDecision.scoreGap)}</p>
                <p>Dominant side: {asText(latestDecision.dominantSide)}</p>
              </div>
              <pre className="max-h-[18rem] overflow-auto rounded-2xl border border-white/10 bg-zinc-950/60 p-4 text-xs leading-6 text-zinc-300">
                {JSON.stringify(latestDecision.payloadJson ?? {}, null, 2)}
              </pre>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">No decision snapshots found for this run.</p>
          )}
        </Panel>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel eyebrow="Bridge health" title="Latest bridge diagnostics" description="Telemetry sync and outbox health for this run.">
          {latestBridge ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge tone={latestBridge.bridgeStatus === "running" ? "success" : "warning"}>{latestBridge.bridgeStatus ?? "unknown"}</Badge>
                <Badge tone="neutral">Queue {asText(latestBridge.queueDepth)}</Badge>
                <Badge tone="accent">{formatDate(latestBridge.observedAt)}</Badge>
              </div>
              <div className="grid gap-3 text-sm text-zinc-300 sm:grid-cols-2">
                <p>Last flush: {formatDate(latestBridge.lastFlushAt)}</p>
                <p>Last success: {formatDate(latestBridge.lastSuccessAt)}</p>
              </div>
              <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-200">
                {latestBridge.lastError ?? "No bridge error recorded."}
              </p>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">No bridge health records found for this run.</p>
          )}
        </Panel>

        <Panel eyebrow="Order lifecycle" title="Latest order events" description="Order submissions, fills, cancellations, and protective state changes.">
          {latestLifecycle ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge tone="neutral">{latestLifecycle.eventType ?? "unknown"}</Badge>
                <Badge tone={latestLifecycle.isProtective ? "warning" : "accent"}>{latestLifecycle.role ?? "role unknown"}</Badge>
                <Badge tone="success">{formatDate(latestLifecycle.observedAt)}</Badge>
              </div>
              <div className="grid gap-3 text-sm text-zinc-300 sm:grid-cols-2">
                <p>Order: {asText(latestLifecycle.orderId)}</p>
                <p>Status: {asText(latestLifecycle.status)}</p>
                <p>Reason: {asText(latestLifecycle.reason)}</p>
                <p>Protective: {latestLifecycle.isProtective === null ? "—" : latestLifecycle.isProtective ? "yes" : "no"}</p>
              </div>
              <pre className="max-h-[18rem] overflow-auto rounded-2xl border border-white/10 bg-zinc-950/60 p-4 text-xs leading-6 text-zinc-300">
                {JSON.stringify(latestLifecycle.payloadJson ?? {}, null, 2)}
              </pre>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">No order lifecycle rows found for this run.</p>
          )}
        </Panel>
      </section>

      <section className="mt-6">
        <Panel eyebrow="Timeline" title="Reconstructed run timeline" description="Signals, blocker events, state snapshots, decisions, order lifecycle, bridge health, and trades in one chronological stream.">
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
                      {asText((entry.reason as string | undefined) ?? (entry.guard_reason as string | undefined) ?? (entry.guardReason as string | undefined) ?? (entry.outcome_reason as string | undefined))}
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

        <Panel eyebrow="Account ledger" title="Broker account trades" description="Account-level broker history captured under this run, useful for backfill verification.">
          <DataTable columns={["Trade", "Side", "PnL", "Time"]}>
            {accountTrades.length === 0 ? (
              <div className="px-4 py-4 text-sm text-zinc-500">No broker account trades found for this run.</div>
            ) : (
              accountTrades.slice(0, 8).map((trade) => (
                <DataRow
                  key={`${trade.accountId}-${trade.brokerTradeId}`}
                  cells={[
                    <span key="trade">{trade.brokerTradeId}</span>,
                    <span key="side">{trade.side === 1 ? "buy" : trade.side === 0 ? "sell" : "unknown"}</span>,
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

      <section className="mt-6">
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
