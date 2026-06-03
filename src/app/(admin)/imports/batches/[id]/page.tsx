import { notFound } from "next/navigation";
import { AlertTriangle, Bot, CheckCircle2, FileSpreadsheet, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { ImportBatchDetailActions } from "@/components/import-batch-detail-actions";
import { getImportBatchById } from "@/lib/data";
import { formatDate } from "@/lib/format";
import {
  getBatchApprovalReadiness,
  getBatchDetailAiSummary,
  getBatchDetailNextActions,
  getBatchIssueBreakdown,
  getImportBatchPriority,
  getStoredRowPreview,
  importBatchPriorityClasses,
  importBatchStatusClasses,
  importBatchStatusLabels
} from "@/lib/import-batches";
import { getImportTemplates } from "@/lib/imports";

export const dynamic = "force-dynamic";

export default async function ImportBatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const batch = await getImportBatchById(id);
  if (!batch) notFound();

  const templates = getImportTemplates();
  const template = templates.find((item) => item.id === batch.templateType);
  const requiredFields = template?.requiredFields ?? [];
  const rowPreview = getStoredRowPreview(batch, 25);
  const headers = rowPreview[0] ? Object.keys(rowPreview[0]) : [...requiredFields, ...batch.optionalFieldsDetected, ...batch.extraFields];
  const breakdown = getBatchIssueBreakdown(batch);
  const readiness = getBatchApprovalReadiness(batch);
  const priority = getImportBatchPriority(batch);
  const aiSummary = getBatchDetailAiSummary(batch);
  const nextActions = getBatchDetailNextActions(batch);
  const issues = Array.isArray(batch.rowIssues) ? batch.rowIssues as Array<{ rowNumber?: number; field?: string; message?: string; type?: string }> : [];

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-lg border border-navy-800 bg-navy-950 p-5 text-white shadow-[0_28px_80px_rgba(6,21,38,0.22)] sm:p-6 xl:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.12),transparent_36%),linear-gradient(180deg,rgba(75,158,201,0.18),transparent_58%)]" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-clinical-100 ring-1 ring-white/15">
              <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden="true" />
              Stored Row Review
            </span>
            <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">Import Batch Detail</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-200">{batch.fileName}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge label={importBatchStatusLabels[batch.status]} className={importBatchStatusClasses[batch.status]} />
            <Badge label={`${priority} priority`} className={importBatchPriorityClasses[priority]} />
            <Badge label={readiness} className={readiness === "Ready for Approval" ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : readiness === "Blocked" ? "bg-rose-50 text-rose-700 ring-rose-200" : "bg-amber-50 text-amber-700 ring-amber-200"} />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <Metric label="Template type" value={batch.templateType.replace(/-/g, " ")} />
        <Metric label="Row count" value={String(batch.rowCount)} />
        <Metric label="Readiness score" value={`${batch.readinessScore}%`} />
        <Metric label="Validation status" value={batch.validationStatus} />
        <Metric label="Issue count" value={String(batch.issueCount)} />
        <Metric label="Created" value={formatDate(batch.createdAt)} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <Panel title="Batch Metadata" eyebrow="Validation summary" icon={<ShieldCheck className="h-5 w-5" />}>
          <FieldGroup title="Missing fields" fields={batch.missingFields} empty="No missing fields." tone="risk" />
          <FieldGroup title="Extra fields" fields={batch.extraFields} empty="No extra fields." tone="neutral" />
          <FieldGroup title="Optional fields detected" fields={batch.optionalFieldsDetected} empty="No optional fields detected." tone="success" />
          <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-700 ring-1 ring-slate-200">Notes: {batch.notes ?? "No notes yet."}</p>
        </Panel>

        <Panel title="AI Review Summary" eyebrow="Import advisor" icon={<Bot className="h-5 w-5" />}>
          <p className="rounded-lg bg-navy-950 p-4 text-sm leading-7 text-white">{aiSummary}</p>
          <div className="mt-4 space-y-2">
            {nextActions.map((action) => (
              <div key={action} className="flex items-start gap-2 rounded-lg bg-clinical-50 p-3 text-sm font-semibold leading-6 text-clinical-900">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                {action}
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel title="Data Quality Breakdown" eyebrow="Issue types" icon={<AlertTriangle className="h-5 w-5" />}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Metric label="Empty required fields" value={String(breakdown.emptyRequiredFields)} />
            <Metric label="Date warnings" value={String(breakdown.dateWarnings)} />
            <Metric label="Numeric warnings" value={String(breakdown.numericWarnings)} />
            <Metric label="Duplicate warnings" value={String(breakdown.duplicateWarnings)} />
            <Metric label="Branch warnings" value={String(breakdown.branchWarnings)} />
            <Metric label="Total issues" value={String(breakdown.totalIssues)} />
          </div>
        </Panel>

        <ImportBatchDetailActions batchId={batch.id} initialNotes={batch.notes ?? ""} />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clinical-700">Row preview</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-navy-950">First 25 Stored Rows</h2>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">{rowPreview.length} rows shown</span>
        </div>

        <div className="mt-5 overflow-x-auto">
          {rowPreview.length > 0 ? (
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="whitespace-nowrap px-3 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Row</th>
                  <th className="whitespace-nowrap px-3 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Warnings</th>
                  {headers.map((header) => (
                    <th key={header} className="whitespace-nowrap px-3 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rowPreview.map((row, index) => {
                  const rowNumber = index + 2;
                  const rowWarnings = issues.filter((issue) => issue.rowNumber === rowNumber);
                  return (
                    <tr key={index} className="border-b border-slate-100">
                      <td className="whitespace-nowrap px-3 py-3 font-semibold text-slate-700">{rowNumber}</td>
                      <td className="min-w-56 px-3 py-3 text-xs text-slate-600">{rowWarnings.length ? rowWarnings.map((issue) => `${issue.field}: ${issue.message}`).join("; ") : "None"}</td>
                      {headers.map((header) => {
                        const missingRequired = requiredFields.includes(header) && !row[header]?.trim();
                        return (
                          <td key={header} className={missingRequired ? "whitespace-nowrap bg-rose-50 px-3 py-3 text-rose-700" : "whitespace-nowrap px-3 py-3 text-slate-700"}>
                            {row[header] || (missingRequired ? "Missing" : "-")}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="rounded-lg bg-slate-50 p-6 text-center text-sm text-slate-500">No stored row preview is available for this batch.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function Badge({ label, className }: { label: string; className: string }) {
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ring-1 ${className}`}>{label}</span>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-soft">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</p>
      <p className="mt-2 line-clamp-2 text-lg font-semibold leading-6 text-navy-950">{value}</p>
    </div>
  );
}

function Panel({ title, eyebrow, icon, children }: { title: string; eyebrow: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
      <div className="flex items-center gap-2 text-clinical-700">
        {icon}
        <p className="text-xs font-semibold uppercase tracking-[0.12em]">{eyebrow}</p>
      </div>
      <h2 className="mt-2 text-xl font-semibold tracking-tight text-navy-950">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function FieldGroup({ title, fields, empty, tone }: { title: string; fields: string[]; empty: string; tone: "risk" | "success" | "neutral" }) {
  const className = tone === "risk" ? "bg-rose-50 text-rose-700 ring-rose-100" : tone === "success" ? "bg-emerald-50 text-emerald-700 ring-emerald-100" : "bg-slate-100 text-slate-700 ring-slate-200";
  return (
    <div className="mb-3 rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{title}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {fields.length ? fields.map((field) => <span key={field} className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${className}`}>{field}</span>) : <span className="text-sm text-slate-500">{empty}</span>}
      </div>
    </div>
  );
}
