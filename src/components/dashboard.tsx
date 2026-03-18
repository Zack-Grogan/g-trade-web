import type { ReactNode } from "react";

function formatValue(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(value);
}

export function formatDate(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export function StatCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.25)] backdrop-blur">
      <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-400">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-zinc-50">{value}</p>
      {note ? <p className="mt-2 text-sm text-zinc-400">{note}</p> : null}
    </article>
  );
}

export function Panel({
  eyebrow,
  title,
  description,
  children,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-zinc-900/70 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div>
          {eyebrow ? <p className="text-[11px] uppercase tracking-[0.24em] text-emerald-400">{eyebrow}</p> : null}
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-zinc-50">{title}</h2>
          {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "accent";
}) {
  const toneClasses = {
    neutral: "border-white/10 bg-white/5 text-zinc-300",
    success: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
    warning: "border-amber-400/20 bg-amber-400/10 text-amber-200",
    accent: "border-cyan-400/20 bg-cyan-400/10 text-cyan-200",
  }[tone];

  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${toneClasses}`}>{children}</span>;
}

export function MiniBarChart({
  values,
  labels,
}: {
  values: number[];
  labels: string[];
}) {
  const max = Math.max(...values.map((value) => Math.abs(value)), 1);

  return (
    <div className="space-y-3">
      <div className="flex h-32 items-end gap-2">
        {values.map((value, index) => {
          const height = `${Math.max((Math.abs(value) / max) * 100, 8)}%`;
          const isPositive = value >= 0;
          return (
            <div key={`${labels[index]}-${index}`} className="flex-1">
              <div className="relative flex h-full items-end rounded-xl bg-white/5 p-1">
                <div
                  className={`w-full rounded-lg ${isPositive ? "bg-emerald-400/80" : "bg-rose-400/80"}`}
                  style={{ height }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-500 sm:grid-cols-4 md:grid-cols-8">
        {labels.map((label) => (
          <span key={label} className="truncate">
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function DataTable({
  columns,
  children,
}: {
  columns: string[];
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
      <div className="grid grid-cols-2 gap-3 border-b border-white/10 px-4 py-3 text-[11px] uppercase tracking-[0.22em] text-zinc-500 sm:grid-cols-4">
        {columns.map((column) => (
          <span key={column}>{column}</span>
        ))}
      </div>
      <div className="divide-y divide-white/5">{children}</div>
    </div>
  );
}

export function DataRow({
  cells,
}: {
  cells: ReactNode[];
}) {
  return (
    <div className="grid grid-cols-2 gap-3 px-4 py-3 text-sm text-zinc-300 sm:grid-cols-4">
      {cells.map((cell, index) => (
        <div key={index} className="min-w-0">
          {cell}
        </div>
      ))}
    </div>
  );
}

export function formatShort(value: number) {
  return formatValue(value);
}
