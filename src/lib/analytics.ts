type GraphQLResponse<T> = {
  data?: T;
  errors?: Array<{ message: string }>;
};

export type AnalyticsSummary = {
  run_count: number;
  event_count: number;
  state_snapshot_count: number;
  blocker_count: number;
  trade_count: number;
  total_pnl: number;
  report_count: number;
  latest_report_at: string | null;
  latest_state_at: string | null;
  latest_run_seen_at: string | null;
};

export type RunRow = {
  runId: string;
  createdAt: string;
  lastSeenAt: string | null;
  processId: number | null;
  dataMode: string | null;
  symbol: string | null;
  status: string | null;
  zone: string | null;
  zoneState: string | null;
  position: number | null;
  positionPnl: number | null;
  dailyPnl: number | null;
  riskState: string | null;
  lastEntryBlockReason: string | null;
  payloadJson: Record<string, unknown> | null;
};

export type EventRow = {
  id: number;
  runId: string;
  eventTimestamp: string;
  insertedAt: string;
  category: string | null;
  eventType: string | null;
  source: string | null;
  symbol: string | null;
  zone: string | null;
  action: string | null;
  reason: string | null;
  orderId: string | null;
  riskState: string | null;
  contracts: number | null;
  orderStatus: string | null;
  guardReason: string | null;
  decisionSide: string | null;
  decisionPrice: number | null;
  expectedFillPrice: number | null;
  entryGuardJson: Record<string, unknown> | null;
  unresolvedEntryJson: Record<string, unknown> | null;
  executionJson: Record<string, unknown> | null;
  payloadJson: Record<string, unknown> | null;
};

export type TradeRow = {
  id: number;
  runId: string;
  insertedAt?: string;
  entryTime: string | null;
  exitTime: string | null;
  direction: number;
  contracts: number;
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  zone: string | null;
  strategy: string | null;
  regime: string | null;
  eventTagsJson?: unknown;
  source: string | null;
  backfilled: boolean | null;
  payloadJson: Record<string, unknown> | null;
};

export type StateSnapshotRow = {
  id: number;
  runId: string;
  capturedAt: string;
  status: string | null;
  dataMode: string | null;
  symbol: string | null;
  zone: string | null;
  zoneState: string | null;
  position: number | null;
  positionPnl: number | null;
  dailyPnl: number | null;
  riskState: string | null;
  lastSignalJson: Record<string, unknown> | null;
  lastEntryReason: string | null;
  lastEntryBlockReason: string | null;
  decisionPrice: number | null;
  entryGuardJson: Record<string, unknown> | null;
  unresolvedEntryJson: Record<string, unknown> | null;
  executionJson: Record<string, unknown> | null;
  heartbeatJson: Record<string, unknown> | null;
  lifecycleJson: Record<string, unknown> | null;
  observabilityJson: Record<string, unknown> | null;
  payloadJson: Record<string, unknown> | null;
};

export type TimelineEntry = {
  kind: "event" | "state_snapshot" | "trade";
  timestamp: string | null;
  runId: string;
  [key: string]: unknown;
};

export type HypothesisRow = {
  id: number;
  hypothesisId: string;
  generation: number;
  parentHypothesisId: string | null;
  claimText: string;
  regimeContext: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type KnowledgeRow = {
  id: number;
  hypothesisId: string;
  verdict: string;
  confidenceScore: number | null;
  mutationDirective: string | null;
  regimeTags: Record<string, unknown> | null;
  survivalCount: number;
  rejectionCount: number;
  createdAt: string;
};

export type ReportRow = {
  id: number;
  reportId: string;
  title: string;
  reportType: string;
  modelProvider: string;
  modelName: string;
  status: string;
  summaryText: string;
  reportJson: Record<string, unknown> | null;
  createdAt: string;
  completedAt: string | null;
};

export type MetaLearnerStats = {
  survivalCount: number;
  rejectionCount: number;
  stats: Record<string, unknown>;
};

export type DashboardData = {
  summary: AnalyticsSummary;
  runs: RunRow[];
  trades: TradeRow[];
  hypotheses: HypothesisRow[];
  knowledgeStore: KnowledgeRow[];
  reports: ReportRow[];
  metaLearnerStats: MetaLearnerStats | null;
};

export type RunDetail = {
  run: RunRow | null;
  events: EventRow[];
  trades: TradeRow[];
  stateSnapshots: StateSnapshotRow[];
  timeline: TimelineEntry[];
  blockers: TimelineEntry[];
};

export type ReportDetail = ReportRow | null;

const ANALYTICS_URL = process.env.ANALYTICS_API_URL || "";
const ANALYTICS_KEY = process.env.ANALYTICS_API_KEY || "";

function analyticsFetchInit() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${ANALYTICS_KEY}`,
  };
}

async function queryAnalytics<T>(query: string, variables?: Record<string, unknown>): Promise<T | null> {
  if (!ANALYTICS_URL || !ANALYTICS_KEY) {
    return null;
  }

  try {
    const response = await fetch(`${ANALYTICS_URL.replace(/\/$/, "")}/graphql`, {
      method: "POST",
      headers: analyticsFetchInit(),
      body: JSON.stringify({ query, variables }),
      next: { revalidate: 30 },
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as GraphQLResponse<T>;
    if (payload.errors?.length) {
      return null;
    }

    return payload.data ?? null;
  } catch {
    return null;
  }
}

async function fetchAnalyticsJson<T>(path: string, params?: Record<string, string | number | null | undefined>): Promise<T | null> {
  if (!ANALYTICS_URL || !ANALYTICS_KEY) {
    return null;
  }

  try {
    const url = new URL(`${ANALYTICS_URL.replace(/\/$/, "")}${path}`);
    for (const [key, value] of Object.entries(params ?? {})) {
      if (value !== null && value !== undefined && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }

    const response = await fetch(url.toString(), {
      headers: analyticsFetchInit(),
      next: { revalidate: 30 },
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function normalizeRunRow(run: any): RunRow {
  return {
    runId: run?.run_id ?? run?.runId ?? "",
    createdAt: run?.created_at ?? run?.createdAt ?? "",
    lastSeenAt: run?.last_seen_at ?? run?.lastSeenAt ?? null,
    processId: run?.process_id ?? run?.processId ?? null,
    dataMode: run?.data_mode ?? run?.dataMode ?? null,
    symbol: run?.symbol ?? null,
    status: run?.status ?? null,
    zone: run?.zone ?? null,
    zoneState: run?.zone_state ?? run?.zoneState ?? null,
    position: run?.position ?? null,
    positionPnl: run?.position_pnl ?? run?.positionPnl ?? null,
    dailyPnl: run?.daily_pnl ?? run?.dailyPnl ?? null,
    riskState: run?.risk_state ?? run?.riskState ?? null,
    lastEntryBlockReason: run?.last_entry_block_reason ?? run?.lastEntryBlockReason ?? null,
    payloadJson: run?.payload_json ?? run?.payloadJson ?? null,
  };
}

function normalizeEventRow(event: any): EventRow {
  return {
    id: event?.id ?? 0,
    runId: event?.run_id ?? event?.runId ?? "",
    eventTimestamp: event?.event_timestamp ?? event?.eventTimestamp ?? "",
    insertedAt: event?.inserted_at ?? event?.insertedAt ?? "",
    category: event?.category ?? null,
    eventType: event?.event_type ?? event?.eventType ?? null,
    source: event?.source ?? null,
    symbol: event?.symbol ?? null,
    zone: event?.zone ?? null,
    action: event?.action ?? null,
    reason: event?.reason ?? null,
    orderId: event?.order_id ?? event?.orderId ?? null,
    riskState: event?.risk_state ?? event?.riskState ?? null,
    contracts: event?.contracts ?? null,
    orderStatus: event?.order_status ?? event?.orderStatus ?? null,
    guardReason: event?.guard_reason ?? event?.guardReason ?? null,
    decisionSide: event?.decision_side ?? event?.decisionSide ?? null,
    decisionPrice: event?.decision_price ?? event?.decisionPrice ?? null,
    expectedFillPrice: event?.expected_fill_price ?? event?.expectedFillPrice ?? null,
    entryGuardJson: event?.entry_guard_json ?? event?.entryGuardJson ?? null,
    unresolvedEntryJson: event?.unresolved_entry_json ?? event?.unresolvedEntryJson ?? null,
    executionJson: event?.execution_json ?? event?.executionJson ?? null,
    payloadJson: event?.payload_json ?? event?.payloadJson ?? null,
  };
}

function normalizeTradeRow(trade: any): TradeRow {
  return {
    id: trade?.id ?? 0,
    runId: trade?.run_id ?? trade?.runId ?? "",
    insertedAt: trade?.inserted_at ?? trade?.insertedAt ?? null,
    entryTime: trade?.entry_time ?? trade?.entryTime ?? null,
    exitTime: trade?.exit_time ?? trade?.exitTime ?? null,
    direction: trade?.direction ?? 0,
    contracts: trade?.contracts ?? 0,
    entryPrice: trade?.entry_price ?? trade?.entryPrice ?? 0,
    exitPrice: trade?.exit_price ?? trade?.exitPrice ?? 0,
    pnl: trade?.pnl ?? 0,
    zone: trade?.zone ?? null,
    strategy: trade?.strategy ?? null,
    regime: trade?.regime ?? null,
    eventTagsJson: trade?.event_tags_json ?? trade?.eventTagsJson ?? null,
    source: trade?.source ?? null,
    backfilled: trade?.backfilled ?? null,
    payloadJson: trade?.payload_json ?? trade?.payloadJson ?? null,
  };
}

function normalizeStateSnapshotRow(snapshot: any): StateSnapshotRow {
  return {
    id: snapshot?.id ?? 0,
    runId: snapshot?.run_id ?? snapshot?.runId ?? "",
    capturedAt: snapshot?.captured_at ?? snapshot?.capturedAt ?? "",
    status: snapshot?.status ?? null,
    dataMode: snapshot?.data_mode ?? snapshot?.dataMode ?? null,
    symbol: snapshot?.symbol ?? null,
    zone: snapshot?.zone ?? null,
    zoneState: snapshot?.zone_state ?? snapshot?.zoneState ?? null,
    position: snapshot?.position ?? null,
    positionPnl: snapshot?.position_pnl ?? snapshot?.positionPnl ?? null,
    dailyPnl: snapshot?.daily_pnl ?? snapshot?.dailyPnl ?? null,
    riskState: snapshot?.risk_state ?? snapshot?.riskState ?? null,
    lastSignalJson: snapshot?.last_signal_json ?? snapshot?.lastSignalJson ?? null,
    lastEntryReason: snapshot?.last_entry_reason ?? snapshot?.lastEntryReason ?? null,
    lastEntryBlockReason: snapshot?.last_entry_block_reason ?? snapshot?.lastEntryBlockReason ?? null,
    decisionPrice: snapshot?.decision_price ?? snapshot?.decisionPrice ?? null,
    entryGuardJson: snapshot?.entry_guard_json ?? snapshot?.entryGuardJson ?? null,
    unresolvedEntryJson: snapshot?.unresolved_entry_json ?? snapshot?.unresolvedEntryJson ?? null,
    executionJson: snapshot?.execution_json ?? snapshot?.executionJson ?? null,
    heartbeatJson: snapshot?.heartbeat_json ?? snapshot?.heartbeatJson ?? null,
    lifecycleJson: snapshot?.lifecycle_json ?? snapshot?.lifecycleJson ?? null,
    observabilityJson: snapshot?.observability_json ?? snapshot?.observabilityJson ?? null,
    payloadJson: snapshot?.payload_json ?? snapshot?.payloadJson ?? null,
  };
}

function normalizeTimelineEntry(entry: any): TimelineEntry {
  return {
    ...entry,
    kind: entry?.kind ?? "event",
    timestamp: entry?.timestamp ?? null,
    runId: entry?.run_id ?? entry?.runId ?? "",
  };
}

export async function fetchAnalyticsSummary(): Promise<AnalyticsSummary | null> {
  if (!ANALYTICS_URL || !ANALYTICS_KEY) {
    return null;
  }

  try {
    const response = await fetch(`${ANALYTICS_URL.replace(/\/$/, "")}/analytics/summary`, {
      headers: analyticsFetchInit(),
      next: { revalidate: 30 },
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as AnalyticsSummary;
  } catch {
    return null;
  }
}

export async function fetchDashboardData(): Promise<DashboardData | null> {
  const query = `
    query Dashboard($limit: Int!, $reportLimit: Int!) {
      runs(limit: $limit) {
        runId
        createdAt
        processId
        dataMode
        symbol
        payloadJson
      }
      trades(limit: $limit) {
        id
        runId
        entryTime
        exitTime
        direction
        contracts
        entryPrice
        exitPrice
        pnl
        zone
        strategy
        regime
        source
        backfilled
        payloadJson
      }
      hypotheses(limit: $limit) {
        id
        hypothesisId
        generation
        parentHypothesisId
        claimText
        regimeContext
        status
        createdAt
        updatedAt
      }
      knowledgeStore(limit: $limit) {
        id
        hypothesisId
        verdict
        confidenceScore
        mutationDirective
        survivalCount
        rejectionCount
        createdAt
      }
      reports(limit: $reportLimit) {
        id
        reportId
        title
        reportType
        modelProvider
        modelName
        status
        summaryText
        reportJson
        createdAt
        completedAt
      }
      metaLearnerStats {
        survivalCount
        rejectionCount
        stats
      }
    }
  `;

  const data = await queryAnalytics<{
    runs: RunRow[];
    trades: TradeRow[];
    hypotheses: HypothesisRow[];
    knowledgeStore: KnowledgeRow[];
    reports: ReportRow[];
    metaLearnerStats: MetaLearnerStats | null;
  }>(query, { limit: 8, reportLimit: 5 });

  const summary = await fetchAnalyticsSummary();
  if (!data || !summary) {
    return null;
  }

  return {
    summary,
    runs: data.runs ?? [],
    trades: data.trades ?? [],
    hypotheses: data.hypotheses ?? [],
    knowledgeStore: data.knowledgeStore ?? [],
    reports: data.reports ?? [],
    metaLearnerStats: data.metaLearnerStats ?? null,
  };
}

export async function fetchRunDetail(runId: string): Promise<RunDetail | null> {
  const [run, events, trades, snapshots, timeline] = await Promise.all([
    fetchAnalyticsJson<Record<string, unknown>>(`/runs/${runId}`),
    fetchAnalyticsJson<{ events: Record<string, unknown>[] }>(`/runs/${runId}/events`, { limit: 100 }),
    fetchAnalyticsJson<{ trades: Record<string, unknown>[] }>(`/runs/${runId}/trades`, { limit: 100 }),
    fetchAnalyticsJson<{ stateSnapshots: Record<string, unknown>[] }>(`/runs/${runId}/state_snapshots`, { limit: 50 }),
    fetchAnalyticsJson<{ timeline: Record<string, unknown>[]; blockers: Record<string, unknown>[] }>(`/runs/${runId}/timeline`, {
      limit: 300,
    }),
  ]);

  if (!run && !events && !trades && !snapshots && !timeline) {
    return null;
  }

  return {
    run: run ? normalizeRunRow(run) : null,
    events: (events?.events ?? []).map(normalizeEventRow),
    trades: (trades?.trades ?? []).map(normalizeTradeRow),
    stateSnapshots: (snapshots?.stateSnapshots ?? []).map(normalizeStateSnapshotRow),
    timeline: (timeline?.timeline ?? []).map(normalizeTimelineEntry),
    blockers: (timeline?.blockers ?? []).map(normalizeTimelineEntry),
  };
}

export async function fetchReportDetail(reportId: string): Promise<ReportDetail> {
  const query = `
    query ReportDetail($reportId: String!) {
      report(reportId: $reportId) {
        id
        reportId
        title
        reportType
        modelProvider
        modelName
        status
        summaryText
        reportJson
        createdAt
        completedAt
      }
    }
  `;

  const data = await queryAnalytics<{ report: ReportRow | null }>(query, { reportId });
  return data?.report ?? null;
}

export async function fetchRlmLibrary(): Promise<{
  hypotheses: HypothesisRow[];
  knowledgeStore: KnowledgeRow[];
  reports: ReportRow[];
  metaLearnerStats: MetaLearnerStats | null;
} | null> {
  const query = `
    query RlmLibrary($limit: Int!) {
      hypotheses(limit: $limit) {
        id
        hypothesisId
        generation
        parentHypothesisId
        claimText
        regimeContext
        status
        createdAt
        updatedAt
      }
      knowledgeStore(limit: $limit) {
        id
        hypothesisId
        verdict
        confidenceScore
        mutationDirective
        survivalCount
        rejectionCount
        createdAt
      }
      reports(limit: $limit) {
        id
        reportId
        title
        reportType
        modelProvider
        modelName
        status
        summaryText
        reportJson
        createdAt
        completedAt
      }
      metaLearnerStats {
        survivalCount
        rejectionCount
        stats
      }
    }
  `;

  return queryAnalytics<{
    hypotheses: HypothesisRow[];
    knowledgeStore: KnowledgeRow[];
    reports: ReportRow[];
    metaLearnerStats: MetaLearnerStats | null;
  }>(query, { limit: 10 });
}
