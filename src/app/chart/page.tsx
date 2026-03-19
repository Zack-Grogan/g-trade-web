import Link from "next/link";

import { Badge, DataRow, DataTable, EmptyState, Panel, StatCard, formatCurrency, formatDate, formatShort } from "@/components/dashboard";
import { MarketChart, type ChartMarker, type ChartReferenceLine } from "@/components/market-chart";
import { PageShell } from "@/components/page-shell";
import { fetchDashboardData, fetchRunDetail, isSyntheticRunId } from "@/lib/analytics";
import { isSignedInRequest } from "@/lib/session";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function pickIndicator(featureSnapshot: Record<string, unknown>, diagnostics: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const candidate = diagnostics[key] ?? featureSnapshot[key];
    if (candidate !== undefined && candidate !== null && candidate !== "") {
      return candidate;
    }
  }
  return null;
}

function formatMetric(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.abs(value) >= 100 ? value.toFixed(0) : value.toFixed(2);
  }
  if (typeof value === "boolean") {
    return value ? "yes" : "no";
  }
  return String(value);
}

export default async function ChartPage({
  searchParams,
}: {
  searchParams: Promise<{
    runId?: string;
  }>;
}) {
  const signedIn = await isSignedInRequest();
  if (!signedIn) {
    return <PageShell authenticated={false} />;
  }

  const params = await searchParams;
  const requestedRunId = (params.runId || "").trim();
  const dashboard = await fetchDashboardData();

  if (!dashboard) {
    return (
      <PageShell authenticated>
        <main className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
          <Panel eyebrow="Chart" title="No analytics data yet" description="Set `ANALYTICS_API_URL` and `ANALYTICS_API_KEY` on the web service to load the market analysis view.">
            <p className="text-sm text-zinc-400">Once data is available, this page will show price action, indicator overlays, and executor-derived projections.</p>
          </Panel>
        </main>
      </PageShell>
    );
  }

  const realRuns = dashboard.runs.filter((run) => !isSyntheticRunId(run.runId));
  const selectedRunId = requestedRunId || realRuns[0]?.runId || dashboard.runs[0]?.runId || null;
  const runDetail = selectedRunId ? await fetchRunDetail(selectedRunId) : null;
  const run = runDetail?.run ?? null;
  const latestDecision = runDetail?.decisionSnapshots[0] ?? null;
  const latestSnapshot = runDetail?.stateSnapshots[0] ?? null;
  const latestTrade = runDetail?.trades[0] ?? null;
  const marketSeries = runDetail?.marketTape ?? [];
  const featureSnapshot = asRecord(latestDecision?.featureSnapshot);
  const diagnostics = asRecord(featureSnapshot.diagnostics);
  const signedFeatures = asRecord(featureSnapshot.signed_features ?? featureSnapshot.signedFeatures);
  const currentPrice = asNumber(latestDecision?.currentPrice) ?? asNumber(diagnostics.current_price) ?? marketSeries[0]?.last ?? marketSeries[0]?.bid ?? marketSeries[0]?.ask ?? null;

  const pricePoints = marketSeries
    .slice()
    .reverse()
    .map((row) => ({
      timestamp: row.capturedAt,
      value: row.last ?? row.bid ?? row.ask,
    }))
    .filter((point) => point.value !== null);

  const referenceLines: ChartReferenceLine[] = [
    { label: "Decision", value: latestDecision?.decisionPrice ?? latestSnapshot?.decisionPrice ?? null, tone: "accent" as const },
    { label: "VWAP", value: asNumber(diagnostics.rth_vwap) ?? asNumber(diagnostics.eth_vwap) ?? null, tone: "neutral" as const },
    { label: "POC", value: asNumber(diagnostics.poc), tone: "success" as const },
    { label: "VAH", value: asNumber(diagnostics.vah), tone: "warning" as const },
    { label: "VAL", value: asNumber(diagnostics.val), tone: "warning" as const },
  ].filter((line) => line.value !== null);

  const markers: ChartMarker[] = [];
  if (latestTrade?.entryTime && latestTrade.entryPrice) {
    markers.push({ label: "Entry", timestamp: latestTrade.entryTime, value: latestTrade.entryPrice, tone: latestTrade.direction >= 0 ? "success" : "warning" });
  }
  if (latestTrade?.exitTime && latestTrade.exitPrice) {
    markers.push({ label: "Exit", timestamp: latestTrade.exitTime, value: latestTrade.exitPrice, tone: "accent" });
  }

  const executorProjection = [
    latestDecision?.dominantSide ? `Dominant side leans ${latestDecision.dominantSide}.` : null,
    latestDecision?.allowEntries === false ? "Entries are blocked by the current executor snapshot." : latestDecision?.allowEntries ? "Entries are currently allowed by the executor snapshot." : null,
    latestDecision?.executionTradeable === false ? "Market is not currently tradeable according to the snapshot." : latestDecision?.executionTradeable ? "Market is currently tradeable." : null,
    latestDecision?.regimeState ? `Regime state: ${latestDecision.regimeState}${latestDecision.regimeReason ? ` (${latestDecision.regimeReason})` : ""}.` : null,
    latestDecision?.activeSession ? `Active session: ${latestDecision.activeSession}.` : null,
    latestDecision?.scoreGap !== null && latestDecision?.scoreGap !== undefined ? `Score gap: ${Number(latestDecision.scoreGap).toFixed(2)}.` : null,
    asNumber(diagnostics.atr_value) !== null ? `ATR: ${asNumber(diagnostics.atr_value)?.toFixed(2)}.` : null,
    asNumber(diagnostics.rsi) !== null ? `RSI: ${asNumber(diagnostics.rsi)?.toFixed(1)}.` : null,
    asNumber(diagnostics.spread) !== null ? `Spread: ${asNumber(diagnostics.spread)?.toFixed(2)}.` : null,
  ].filter((item): item is string => Boolean(item));

  const indicatorRows: Array<[string, unknown, string]> = [
    ["Current price", currentPrice, "Latest market tape / decision snapshot"],
    ["ATR", pickIndicator(featureSnapshot, diagnostics, ["atr_value", "atr", "atrValue"]), "Volatility context"],
    ["RSI", pickIndicator(featureSnapshot, diagnostics, ["rsi", "rsi_value", "rsiValue"]), "Momentum"],
    ["RTH VWAP", pickIndicator(featureSnapshot, diagnostics, ["rth_vwap", "rthVwap"]), "Session anchor"],
    ["ETH VWAP", pickIndicator(featureSnapshot, diagnostics, ["eth_vwap", "ethVwap"]), "Session anchor"],
    ["POC", pickIndicator(featureSnapshot, diagnostics, ["poc"]), "Volume profile"],
    ["VAH", pickIndicator(featureSnapshot, diagnostics, ["vah"]), "Volume profile"],
    ["VAL", pickIndicator(featureSnapshot, diagnostics, ["val"]), "Volume profile"],
    ["EMA slope", pickIndicator(featureSnapshot, diagnostics, ["ema", "ema_slope", "emaSlope"]), "Trend context"],
    ["Price vs EMA", pickIndicator(featureSnapshot, diagnostics, ["price_vs_ema", "priceVsEma"]), "Trend context"],
    ["Value area position", signedFeatures.value_area_position ?? featureSnapshot.value_area_position, "Profile context"],
    ["ATR percentile", signedFeatures.atr_percentile ?? featureSnapshot.atr_percentile, "Volatility rank"],
    ["Quote age", signedFeatures.quote_age_seconds ?? featureSnapshot.quote_age_seconds, "Execution freshness"],
    ["Spread ticks", signedFeatures.spread_ticks ?? featureSnapshot.spread_ticks, "Microstructure"],
    ["Dominant side", latestDecision?.dominantSide, "Executor bias"],
    ["Score gap", latestDecision?.scoreGap, "Executor bias"],
    ["Allow entries", latestDecision?.allowEntries, "Entry gate"],
    ["Tradeable", latestDecision?.executionTradeable, "Entry gate"],
    ["Regime", latestDecision?.regimeState, "Regime classifier"],
  ];

  const chartLabel = run?.accountName ?? run?.accountId ?? "Unknown account";

  return (
    <PageShell authenticated>
      <main className="mx-auto max-w-7xl space-y-6 px-6 py-10 lg:px-8">
        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <Panel
            eyebrow="Chart"
            title="Market chart and executor overlay"
            description="This view combines price action, stored indicators, and executor-derived projections. It is advisory only and never controls execution."
            action={
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/runs"
                  className="inline-flex items-center rounded-full border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 transition hover:border-cyan-500/30 hover:bg-cyan-500/10 hover:text-white"
                >
                  Back to runs
                </Link>
                {latestTrade ? (
                  <Link
                    href={`/trades/${latestTrade.tradeId ?? latestTrade.id}`}
                    className="inline-flex items-center rounded-full border border-cyan-500/30 bg-cyan-500/15 px-3 py-2 text-sm text-cyan-100 transition hover:bg-cyan-500/20"
                  >
                    Open latest trade review
                  </Link>
                ) : null}
              </div>
            }
          >
            <div className="flex flex-wrap gap-2">
              <Badge tone={run?.accountMode === "live" ? "success" : "warning"}>{chartLabel}</Badge>
              <Badge tone="accent">{run?.accountMode ?? "unknown mode"}</Badge>
              <Badge tone="neutral">{run?.symbol ?? "ES"}</Badge>
              <Badge tone="neutral">{formatDate(run?.lastSeenAt ?? run?.createdAt)}</Badge>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Latest price" value={currentPrice === null ? "—" : formatCurrency(currentPrice)} note="Most recent market tape sample" />
              <StatCard label="Trend" value={latestDecision?.dominantSide ?? "—"} note={latestDecision?.regimeState ?? "No regime state"} />
              <StatCard label="Score gap" value={latestDecision?.scoreGap === null || latestDecision?.scoreGap === undefined ? "—" : formatShort(Number(latestDecision.scoreGap))} note="Executor side separation" />
              <StatCard label="Market tape" value={formatShort(marketSeries.length)} note={runDetail?.timeline.length ? `${formatShort(runDetail.timeline.length)} timeline rows` : "No timeline rows"} />
            </div>
          </Panel>

          <Panel eyebrow="Projection" title="Executor-derived next view" description="These hints are based on stored snapshots and diagnostics. They are not new execution logic.">
            <div className="space-y-3">
              {executorProjection.length ? (
                executorProjection.map((line) => (
                  <div key={line} className="rounded-2xl border border-zinc-800 bg-zinc-950/80 px-4 py-3 text-sm leading-6 text-zinc-200">
                    {line}
                  </div>
                ))
              ) : (
                <EmptyState title="No projection data" description="The current run has no decision snapshot to project from yet." />
              )}
            </div>
          </Panel>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <MarketChart
            title="Price chart"
            subtitle="Market tape with stored executor overlays"
            points={pricePoints}
            markers={markers}
            referenceLines={referenceLines}
            height={320}
          />

          <Panel eyebrow="Snapshot" title="Primary indicator stack" description="The strongest stored indicators surfaced from the executor snapshot.">
            <DataTable columns={["Indicator", "Value", "Context"]}>
              {indicatorRows.map(([label, value, context]) => (
                <DataRow
                  key={label}
                  cells={[
                    <span key="label" className="font-medium text-zinc-100">
                      {label}
                    </span>,
                    <span key="value" className="text-zinc-200">
                      {formatMetric(value)}
                    </span>,
                    <span key="context" className="text-zinc-500">
                      {context}
                    </span>,
                  ]}
                />
              ))}
            </DataTable>
          </Panel>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <Panel eyebrow="State" title="Latest snapshot context" description="The most recent trader state and decision context for this run.">
            {latestSnapshot ? (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge tone="accent">{latestSnapshot.status ?? "unknown"}</Badge>
                  <Badge tone="neutral">{latestSnapshot.zone ?? "zone unknown"}</Badge>
                  <Badge tone="success">{latestSnapshot.riskState ?? "risk unknown"}</Badge>
                  <Badge tone={latestDecision?.allowEntries ? "success" : "warning"}>{latestDecision?.allowEntries ? "entry allowed" : "entry gated"}</Badge>
                </div>
                <div className="grid gap-3 text-sm text-zinc-300 sm:grid-cols-2">
                  <p>Position: {formatMetric(latestSnapshot.position)}</p>
                  <p>Position PnL: {latestSnapshot.positionPnl === null ? "—" : formatCurrency(latestSnapshot.positionPnl)}</p>
                  <p>Daily PnL: {latestSnapshot.dailyPnl === null ? "—" : formatCurrency(latestSnapshot.dailyPnl)}</p>
                  <p>Last block: {latestSnapshot.lastEntryBlockReason ?? "—"}</p>
                </div>
                <pre className="max-h-[18rem] overflow-auto rounded-2xl border border-zinc-800 bg-black/40 p-4 text-xs leading-6 text-zinc-300">
                  {JSON.stringify(latestSnapshot.payloadJson ?? {}, null, 2)}
                </pre>
              </div>
            ) : (
              <EmptyState title="No state snapshot" description="There is no local snapshot to anchor the chart yet." />
            )}
          </Panel>

          <Panel eyebrow="Trade bridge" title="Latest closed trade" description="When there is a real trade, this route should link directly into the trade reviewer.">
            {latestTrade ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Badge tone={latestTrade.pnl >= 0 ? "success" : "warning"}>{formatCurrency(latestTrade.pnl)}</Badge>
                  <Badge tone="neutral">{latestTrade.direction > 0 ? "long" : latestTrade.direction < 0 ? "short" : "flat"}</Badge>
                  <Badge tone="accent">{latestTrade.strategy ?? "no strategy"}</Badge>
                </div>
                <div className="grid gap-3 text-sm text-zinc-300 sm:grid-cols-2">
                  <p>Entry: {latestTrade.entryTime ? formatDate(latestTrade.entryTime) : "—"}</p>
                  <p>Exit: {latestTrade.exitTime ? formatDate(latestTrade.exitTime) : "—"}</p>
                  <p>Entry price: {latestTrade.entryPrice === null ? "—" : formatCurrency(latestTrade.entryPrice)}</p>
                  <p>Exit price: {latestTrade.exitPrice === null ? "—" : formatCurrency(latestTrade.exitPrice)}</p>
                </div>
                <Link
                  href={`/trades/${latestTrade.tradeId ?? latestTrade.id}`}
                  className="inline-flex items-center rounded-full border border-cyan-500/30 bg-cyan-500/15 px-4 py-2 text-sm text-cyan-100 transition hover:bg-cyan-500/20"
                >
                  Open trade reviewer
                </Link>
              </div>
            ) : (
              <EmptyState title="No completed trade yet" description="The chart will still show the live market tape and indicator overlays when trade history is empty." />
            )}
          </Panel>
        </section>
      </main>
    </PageShell>
  );
}
