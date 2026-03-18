"use client";

import { useState, useTransition, type FormEvent } from "react";

type OperatorMode = "report" | "hypothesis" | "feedback";

type OperatorAnalysisResult = {
  ok: boolean;
  mode: OperatorMode;
  prompt: string;
  title: string;
  summary: string;
  recommendation: string;
  nextActions: string[];
  supportingData: {
    runId: string | null;
    latestReportId: string | null;
    latestHypothesisId: string | null;
  };
  artifact: Record<string, unknown> | null;
  error?: string;
};

const MODE_LABELS: Record<OperatorMode, string> = {
  report: "Generate report",
  hypothesis: "Generate hypothesis",
  feedback: "Recursive feedback",
};

const QUICK_PROMPTS = [
  "Summarize the most recent run and call out bridge failures.",
  "Generate a report on the latest adverse execution path.",
  "Review the current hypothesis lineage for stale or repeated claims.",
  "Find the highest-signal blockers in the current timeline.",
];

export function OperatorChat({
  defaultRunId,
  defaultPrompt,
}: {
  defaultRunId?: string | null;
  defaultPrompt?: string;
}) {
  const [mode, setMode] = useState<OperatorMode>("report");
  const [runId, setRunId] = useState(defaultRunId ?? "");
  const [prompt, setPrompt] = useState(defaultPrompt ?? "");
  const [result, setResult] = useState<OperatorAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submitAnalysis(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch("/api/operator", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              mode,
              prompt,
              runId: runId.trim() || null,
              investigationQuery: prompt,
            }),
          });

          const payload = (await response.json()) as OperatorAnalysisResult & { error?: string };
          if (!response.ok) {
            setResult(payload);
            setError(payload.error ?? "Operator analysis failed.");
            return;
          }

          setResult(payload);
        } catch (requestError) {
          const message = requestError instanceof Error ? requestError.message : "Operator analysis request failed.";
          setError(message);
        }
      })();
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <form onSubmit={submitAnalysis} className="rounded-3xl border border-white/10 bg-zinc-950/50 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-300">Operator chat</p>
            <h3 className="mt-2 text-xl font-semibold tracking-tight text-zinc-50">Trigger RLM-backed analysis</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              Advisory only. The request stays server-side and returns a report, hypothesis, or feedback cycle with supporting context.
            </p>
          </div>
          <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-400">
            Clerk-authenticated
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto]">
          <label className="space-y-2">
            <span className="text-xs uppercase tracking-[0.22em] text-zinc-500">Prompt</span>
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={5}
              placeholder="Describe what you want investigated."
              className="min-h-[10rem] w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/20"
            />
          </label>

          <div className="space-y-3">
            <label className="block space-y-2">
              <span className="text-xs uppercase tracking-[0.22em] text-zinc-500">Run id</span>
              <input
                value={runId}
                onChange={(event) => setRunId(event.target.value)}
                placeholder="Optional run id"
                className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/20"
              />
            </label>

            <div className="grid gap-2">
              {(Object.keys(MODE_LABELS) as OperatorMode[]).map((currentMode) => (
                <button
                  key={currentMode}
                  type="button"
                  onClick={() => setMode(currentMode)}
                  className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                    mode === currentMode
                      ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-100"
                      : "border-white/10 bg-white/5 text-zinc-300 hover:border-white/20 hover:bg-white/10"
                  }`}
                >
                  <span className="block text-[11px] uppercase tracking-[0.22em] text-zinc-500">Mode</span>
                  <span className="mt-1 block font-medium">{MODE_LABELS[currentMode]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {QUICK_PROMPTS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => setPrompt(suggestion)}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-cyan-400/30 hover:bg-cyan-400/10 hover:text-cyan-100"
            >
              {suggestion}
            </button>
          ))}
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button
            type="submit"
            disabled={isPending || !prompt.trim()}
            className="inline-flex items-center rounded-full border border-cyan-400/30 bg-cyan-400/15 px-4 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "Analyzing..." : "Run analysis"}
          </button>
          <p className="text-sm text-zinc-500">The request runs through the web server and RLM service, not the browser.</p>
        </div>

        {error ? <p className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{error}</p> : null}
      </form>

      <div className="space-y-5">
        <article className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.25)]">
          <p className="text-[11px] uppercase tracking-[0.24em] text-emerald-400">Result</p>
          {result ? (
            <div className="mt-3 space-y-4">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">{result.mode}</span>
                <span className={`rounded-full border px-3 py-1 text-xs ${result.ok ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200" : "border-amber-400/20 bg-amber-400/10 text-amber-100"}`}>
                  {result.ok ? "Completed" : "Needs attention"}
                </span>
              </div>
              <h4 className="text-lg font-semibold tracking-tight text-zinc-50">{result.title}</h4>
              <p className="text-sm leading-6 text-zinc-300">{result.summary}</p>
              <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Recommendation</p>
                <p className="mt-2 text-sm leading-6 text-zinc-200">{result.recommendation}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Next actions</p>
                <ul className="mt-2 space-y-2 text-sm text-zinc-300">
                  {result.nextActions.map((item) => (
                    <li key={item} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Run</p>
                  <p className="mt-1 text-sm text-zinc-100">{result.supportingData.runId ?? "—"}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Report</p>
                  <p className="mt-1 text-sm text-zinc-100">{result.supportingData.latestReportId ?? "—"}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Hypothesis</p>
                  <p className="mt-1 text-sm text-zinc-100">{result.supportingData.latestHypothesisId ?? "—"}</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              Run a prompt to generate a report bundle, hypothesis, or recursive feedback cycle. Results stay in the operator console and the backend services.
            </p>
          )}
        </article>

        <article className="rounded-3xl border border-white/10 bg-zinc-950/60 p-5">
          <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-300">Artifact payload</p>
          {result?.artifact ? (
            <pre className="mt-3 max-h-[24rem] overflow-auto rounded-2xl border border-white/10 bg-black/40 p-4 text-xs leading-6 text-zinc-300">
              {JSON.stringify(result.artifact, null, 2)}
            </pre>
          ) : (
            <p className="mt-3 text-sm text-zinc-500">No artifact payload yet.</p>
          )}
        </article>
      </div>
    </div>
  );
}
