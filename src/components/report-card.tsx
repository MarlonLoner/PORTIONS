import clsx from "clsx";
import { AlertTriangle, CheckCircle2, FileText, Eye } from "lucide-react";
import { formatDate } from "@/lib/format";

const statusClasses = {
  Ready: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  "Needs Review": "bg-amber-50 text-amber-700 ring-amber-200",
  "Action Required": "bg-rose-50 text-rose-700 ring-rose-200"
};

const statusIcons = {
  Ready: CheckCircle2,
  "Needs Review": Eye,
  "Action Required": AlertTriangle
};

export function ReportCard({
  report
}: {
  report: {
    title: string;
    description: string;
    lastGeneratedAt: Date;
    keyMetric: string;
    status: keyof typeof statusClasses;
    suggestedUseCase: string;
    aiSummary: string;
  };
}) {
  const StatusIcon = statusIcons[report.status];

  return (
    <article className="group relative overflow-hidden rounded-lg border border-slate-200 bg-white p-5 shadow-soft transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_55px_rgba(6,21,38,0.12)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-clinical-50 to-transparent" />
      <div className="relative flex items-start justify-between gap-4">
        <div className="rounded-lg bg-navy-950 p-2.5 text-white">
          <FileText className="h-5 w-5" aria-hidden="true" />
        </div>
        <span className={clsx("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ring-1", statusClasses[report.status])}>
          <StatusIcon className="h-3.5 w-3.5" aria-hidden="true" />
          {report.status}
        </span>
      </div>

      <div className="relative mt-5">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-navy-950">{report.title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{report.description}</p>
        </div>
      </div>

      <div className="relative mt-5 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Last generated</p>
          <p className="mt-1 font-semibold text-slate-800">{formatDate(report.lastGeneratedAt)}</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Key metric</p>
          <p className="mt-1 font-semibold text-slate-800">{report.keyMetric}</p>
        </div>
      </div>

      <div className="relative mt-4 rounded-lg border border-clinical-100 bg-clinical-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-clinical-700">Suggested use</p>
        <p className="mt-2 text-sm leading-6 text-clinical-950">{report.suggestedUseCase}</p>
      </div>

      <p className="relative mt-4 text-sm leading-6 text-slate-600">{report.aiSummary}</p>

      <button type="button" className="focus-ring relative mt-5 w-full rounded-lg bg-navy-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-800">
        View Report
      </button>
    </article>
  );
}
