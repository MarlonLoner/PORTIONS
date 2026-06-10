import { formatCurrency } from "@/lib/format";

export type ChartDatum = {
  label: string;
  value: number;
  detail?: string;
  secondaryValue?: number;
};

function maxValue(data: ChartDatum[]) {
  return Math.max(1, ...data.map((item) => Number(item.value) || 0));
}

function width(value: number, max: number) {
  return `${Math.max(3, Math.min(100, (value / max) * 100))}%`;
}

function displayValue(value: number, valueType: "number" | "currency" | "percent") {
  if (valueType === "currency") return formatCurrency(value);
  if (valueType === "percent") return `${Math.round(value)}%`;
  return String(Math.round(value));
}

export function HorizontalBarChart({
  data,
  valueType = "number",
  tone = "clinical"
}: {
  data: ChartDatum[];
  valueType?: "number" | "currency" | "percent";
  tone?: "clinical" | "emerald" | "amber" | "rose" | "navy";
}) {
  const max = maxValue(data);
  const barClass =
    tone === "emerald" ? "bg-emerald-500" :
    tone === "amber" ? "bg-amber-500" :
    tone === "rose" ? "bg-rose-500" :
    tone === "navy" ? "bg-navy-950" :
    "bg-clinical-600";

  return (
    <div className="space-y-3">
      {data.length ? data.map((item) => (
        <div key={item.label} className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
          <div className="flex items-center justify-between gap-3">
            <p className="truncate text-sm font-semibold text-navy-950">{item.label}</p>
            <p className="shrink-0 text-sm font-semibold text-slate-700">{displayValue(item.value, valueType)}</p>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white ring-1 ring-slate-200">
            <div className={`h-full rounded-full ${barClass}`} style={{ width: width(item.value, max) }} />
          </div>
          {item.detail || item.secondaryValue !== undefined ? (
            <p className="mt-2 text-xs font-medium text-slate-500">
              {item.detail}
              {item.secondaryValue !== undefined ? `${item.detail ? " | " : ""}${item.secondaryValue} secondary` : ""}
            </p>
          ) : null}
        </div>
      )) : (
        <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500 ring-1 ring-slate-200">No chart data available yet.</p>
      )}
    </div>
  );
}

export function ProgressTimelineChart({ data }: { data: ChartDatum[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {data.map((item) => (
        <div key={item.label} className="rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-navy-950">{item.label}</p>
              {item.detail ? <p className="mt-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{item.detail}</p> : null}
            </div>
            <p className="text-sm font-semibold text-clinical-800">{Math.round(item.value)}%</p>
          </div>
          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white ring-1 ring-slate-200">
            <div className="h-full rounded-full bg-navy-950" style={{ width: `${Math.max(3, Math.min(100, item.value))}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SnapshotGrid({
  data,
  valueType = "number"
}: {
  data: ChartDatum[];
  valueType?: "number" | "currency" | "percent";
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {data.map((item) => (
        <div key={item.label} className="rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{item.label}</p>
          <p className="mt-2 text-xl font-semibold text-navy-950">{displayValue(item.value, valueType)}</p>
          {item.detail ? <p className="mt-2 text-sm leading-6 text-slate-600">{item.detail}</p> : null}
        </div>
      ))}
    </div>
  );
}
