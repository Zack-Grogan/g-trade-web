import Link from "next/link";

import { Badge, DataRow, DataTable, EmptyState, Panel, StatCard, formatDate, formatShort } from "@/components/dashboard";
import { PageShell } from "@/components/page-shell";
import { fetchRlmLibrary } from "@/lib/analytics";
import { isSignedInRequest } from "@/lib/session";

type LineageNode = {
  id: string;
  label: string;
  status: string;
  generation: number;
  regimeContext: string | null;
  children: LineageNode[];
};

function buildLineage(nodes: Array<{ hypothesisId: string; parentHypothesisId: string | null; claimText: string; status: string; generation: number; regimeContext: string | null }>) {
  const lookup = new Map<string, LineageNode>();
  const roots: LineageNode[] = [];

  for (const item of nodes) {
    lookup.set(item.hypothesisId, {
      id: item.hypothesisId,
      label: item.claimText,
      status: item.status,
      generation: item.generation,
      regimeContext: item.regimeContext,
      children: [],
    });
  }

  for (const item of nodes) {
    const node = lookup.get(item.hypothesisId);
    if (!node) {
      continue;
    }

    if (item.parentHypothesisId && lookup.has(item.parentHypothesisId)) {
      lookup.get(item.parentHypothesisId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots.sort((left, right) => right.generation - left.generation || left.id.localeCompare(right.id));
}

function LineageTree({ node, depth = 0 }: { node: LineageNode; depth?: number }) {
  return (
    <div className={`rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4 ${depth > 0 ? "ml-4" : ""}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={node.status === "supported" ? "success" : node.status === "rejected" ? "warning" : "neutral"}>{node.status}</Badge>
        <Badge tone="accent">G{node.generation}</Badge>
      </div>
      <p className="mt-3 text-sm leading-6 text-zinc-200">{node.label}</p>
      <p className="mt-2 text-xs text-zinc-500">{node.regimeContext ?? "No regime context"}</p>
      {node.children.length ? (
        <div className="mt-4 space-y-3 border-l border-zinc-800 pl-4">
          {node.children.map((child) => (
            <LineageTree key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default async function RlmPage() {
  const signedIn = await isSignedInRequest();
  const data = signedIn ? await fetchRlmLibrary() : null;

  if (!signedIn) {
    return <PageShell authenticated={false} />;
  }

  if (!data) {
    return (
      <PageShell authenticated>
        <main className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
          <Panel
            eyebrow="RLM library"
            title="No RLM data yet"
            description="Set `ANALYTICS_API_URL` and `ANALYTICS_API_KEY` on the web service to load report artifacts from the analytics API."
          >
            <p className="text-sm text-zinc-400">Once artifacts exist, the lineage explorer will render the recursive graph on this page.</p>
          </Panel>
        </main>
      </PageShell>
    );
  }

  const lineage = buildLineage(
    data.hypotheses.map((item) => ({
      hypothesisId: item.hypothesisId,
      parentHypothesisId: item.parentHypothesisId,
      claimText: item.claimText,
      status: item.status,
      generation: item.generation,
      regimeContext: item.regimeContext,
    })),
  );

  return (
    <PageShell authenticated>
      <main className="mx-auto max-w-7xl space-y-6 px-6 py-10 lg:px-8">
      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Panel
          eyebrow="RLM library"
          title="Recursive analysis artifacts"
          description="Batch reports, generated hypotheses, and knowledge-store entries rendered as a lineage-first view."
          action={
            <Link
              href="/"
              className="inline-flex items-center rounded-full border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 transition hover:border-cyan-500/30 hover:bg-cyan-500/10 hover:text-white"
            >
            Back to console
          </Link>
        }
      >
        <div className="flex flex-wrap gap-2">
            <Badge tone="accent">Graph-first</Badge>
            <Badge tone="success">Persisted artifacts</Badge>
            <Badge tone="neutral">Advisory only</Badge>
          </div>
        </Panel>

        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard label="Hypotheses" value={formatShort(data.hypotheses.length)} note="Latest generated claims" />
          <StatCard label="Knowledge entries" value={formatShort(data.knowledgeStore.length)} note="Persisted verdicts" />
          <StatCard label="Reports" value={formatShort(data.reports.length)} note="Stored AI report bundles" />
          <StatCard
            label="Meta learner"
            value={`${data.metaLearnerStats?.survivalCount ?? 0}/${data.metaLearnerStats?.rejectionCount ?? 0}`}
            note="Survival / rejection"
          />
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Panel eyebrow="Lineage graph" title="Hypothesis tree" description="Parents, children, and generations laid out as recursive clusters.">
          <div className="space-y-4">
            {lineage.length === 0 ? (
              <EmptyState title="No hypotheses yet" description="RLM has not persisted any hypothesis nodes." />
            ) : (
              lineage.map((node) => <LineageTree key={node.id} node={node} />)
            )}
          </div>
        </Panel>

        <Panel eyebrow="Reports" title="Latest AI reports" description="Structured report bundles rendered from the analytics database.">
          <div className="space-y-3">
            {data.reports.length === 0 ? (
              <EmptyState title="No reports yet" description="The report index is empty until RLM persists bundles." />
            ) : (
              data.reports.slice(0, 5).map((report) => (
                <article key={report.reportId} className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-300">{report.modelProvider}</p>
                      <Link href={`/reports/${report.reportId}`} className="mt-2 block text-base font-semibold text-zinc-50 transition hover:text-cyan-300">
                        {report.title}
                      </Link>
                    </div>
                    <Badge tone={report.status === "completed" ? "success" : "neutral"}>{report.status}</Badge>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-zinc-400">
                    {report.summaryText.slice(0, 240)}
                    {report.summaryText.length > 240 ? "…" : ""}
                  </p>
                  <p className="mt-3 text-xs text-zinc-500">
                    {formatDate(report.completedAt ?? report.createdAt)} · {report.modelName}
                  </p>
                </article>
              ))
            )}
          </div>
        </Panel>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Panel eyebrow="Research" title="Knowledge store" description="Survival and rejection history for the recursive loop.">
          <DataTable columns={["Verdict", "Confidence", "Directive", "Created"]}>
            {data.knowledgeStore.length === 0 ? (
              <EmptyState title="No knowledge entries" description="Knowledge store rows appear here after recursive evaluation." />
            ) : (
              data.knowledgeStore.slice(0, 6).map((entry) => (
                <DataRow
                  key={entry.id}
                  cells={[
                    <Badge key="verdict" tone={entry.verdict === "supported" ? "success" : entry.verdict === "rejected" ? "warning" : "neutral"}>
                      {entry.verdict}
                    </Badge>,
                    <span key="confidence">{entry.confidenceScore ?? "—"}</span>,
                    <span key="directive" className="truncate">
                      {entry.mutationDirective ?? "—"}
                    </span>,
                    <span key="created">{formatDate(entry.createdAt)}</span>,
                  ]}
                />
              ))
            )}
          </DataTable>
        </Panel>

        <Panel eyebrow="Artifact summary" title="Latest hypotheses" description="The newest claims rendered with their current status.">
          <div className="space-y-3">
            {data.hypotheses.length === 0 ? (
              <EmptyState title="No hypotheses" description="There are no hypothesis rows in the current RLM snapshot." />
            ) : (
              data.hypotheses.slice(0, 5).map((item) => (
                <article key={item.id} className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <Badge tone={item.status === "supported" ? "success" : item.status === "rejected" ? "warning" : "neutral"}>{item.status}</Badge>
                    <span className="text-xs text-zinc-500">G{item.generation}</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-zinc-300">{item.claimText}</p>
                  <p className="mt-2 text-xs text-zinc-500">{formatDate(item.createdAt)}</p>
                </article>
              ))
            )}
          </div>
        </Panel>
      </section>
      </main>
    </PageShell>
  );
}
