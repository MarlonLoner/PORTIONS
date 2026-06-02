import { FileText } from "lucide-react";
import { formatDate } from "@/lib/format";

export function ReportCard({
  report
}: {
  report: {
    title: string;
    description: string;
    lastGeneratedAt: Date;
    keyMetric: string;
  };
}) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-clinical-50 p-2 text-clinical-700">
          <FileText className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-navy-950">{report.title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{report.description}</p>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Last generated</p>
          <p className="mt-1 font-semibold text-slate-800">{formatDate(report.lastGeneratedAt)}</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Key metric</p>
          <p className="mt-1 font-semibold text-slate-800">{report.keyMetric}</p>
        </div>
      </div>
      <button type="button" className="focus-ring mt-5 w-full rounded-lg bg-navy-950 px-4 py-2.5 text-sm font-semibold text-white">
        View Report
      </button>
    </article>
  );
}
