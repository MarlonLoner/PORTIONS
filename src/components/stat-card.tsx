import clsx from "clsx";
import type { ReactNode } from "react";

const toneClasses = {
  navy: "bg-navy-950 text-white border-navy-900",
  blue: "bg-white text-navy-950 border-clinical-100",
  emerald: "bg-white text-navy-950 border-emerald-100",
  amber: "bg-white text-navy-950 border-amber-100",
  rose: "bg-white text-navy-950 border-rose-100",
  white: "bg-white text-navy-950 border-slate-200"
};

const accentClasses = {
  navy: "from-clinical-200/25 to-transparent",
  blue: "from-clinical-100/80 to-transparent",
  emerald: "from-emerald-100/80 to-transparent",
  amber: "from-amber-100/80 to-transparent",
  rose: "from-rose-100/80 to-transparent",
  white: "from-slate-100/90 to-transparent"
};

const iconClasses = {
  navy: "bg-white/10 text-white ring-white/15",
  blue: "bg-clinical-50 text-clinical-700 ring-clinical-100",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  amber: "bg-amber-50 text-amber-700 ring-amber-100",
  rose: "bg-rose-50 text-rose-700 ring-rose-100",
  white: "bg-slate-50 text-clinical-700 ring-slate-100"
};

export function StatCard({
  title,
  value,
  helper,
  icon,
  tone = "white",
  trend
}: {
  title: string;
  value: string;
  helper?: string;
  icon?: ReactNode;
  tone?: keyof typeof toneClasses;
  trend?: string;
}) {
  return (
    <article className={clsx("group relative overflow-hidden rounded-lg border p-5 shadow-soft transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_55px_rgba(6,21,38,0.12)]", toneClasses[tone])}>
      <div className={clsx("pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b", accentClasses[tone])} />
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className={clsx("text-[11px] font-semibold uppercase tracking-[0.12em]", tone === "navy" ? "text-clinical-100" : "text-slate-500")}>{title}</p>
          <p className="mt-3 text-3xl font-semibold leading-none tracking-tight">{value}</p>
        </div>
        {icon ? (
          <div className={clsx("rounded-lg p-2.5 ring-1", iconClasses[tone])}>
            {icon}
          </div>
        ) : null}
      </div>
      <div className="relative mt-4 flex min-h-8 items-end justify-between gap-3">
        {helper ? <p className={clsx("text-xs leading-5", tone === "navy" ? "text-clinical-100" : "text-slate-500")}>{helper}</p> : <span />}
        {trend ? (
          <span className={clsx("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1", tone === "navy" ? "bg-white/10 text-white ring-white/15" : "bg-white text-slate-700 ring-slate-200")}>
            {trend}
          </span>
        ) : null}
      </div>
    </article>
  );
}
