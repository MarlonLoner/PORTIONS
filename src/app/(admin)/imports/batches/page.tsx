import { CheckCircle2, ClipboardList, FileSpreadsheet, Rows3, ShieldCheck, TrendingUp } from "lucide-react";
import { ImportBatchesReview, type ImportBatchRecord } from "@/components/import-batches-review";
import { StatCard } from "@/components/stat-card";
import { getImportBatchesData } from "@/lib/data";
import { getImportBatchMetrics } from "@/lib/import-batches";

export const dynamic = "force-dynamic";

export default async function ImportBatchesPage() {
  const batches = await getImportBatchesData();
  const records: ImportBatchRecord[] = batches.map((batch) => ({
    id: batch.id,
    templateType: batch.templateType,
    fileName: batch.fileName,
    rowCount: batch.rowCount,
    readinessScore: batch.readinessScore,
    validationStatus: batch.validationStatus,
    missingFields: batch.missingFields,
    extraFields: batch.extraFields,
    optionalFieldsDetected: batch.optionalFieldsDetected,
    issueCount: batch.issueCount,
    dateWarningCount: batch.dateWarningCount,
    numericWarningCount: batch.numericWarningCount,
    duplicateWarningCount: batch.duplicateWarningCount,
    branchWarningCount: batch.branchWarningCount,
    status: batch.status,
    notes: batch.notes,
    createdAt: batch.createdAt.toISOString(),
    updatedAt: batch.updatedAt.toISOString()
  }));
  const metrics = getImportBatchMetrics(records);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-lg border border-navy-800 bg-navy-950 p-5 text-white shadow-[0_28px_80px_rgba(6,21,38,0.22)] sm:p-6 xl:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.12),transparent_36%),linear-gradient(180deg,rgba(75,158,201,0.18),transparent_58%)]" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-clinical-100 ring-1 ring-white/15">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Pilot Data Control Room
            </span>
            <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">Import Batches</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-200">
              Review uploaded CSV validation results before approving pilot imports.
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clinical-100">Average readiness</p>
            <p className="mt-2 text-4xl font-semibold tracking-tight">{metrics.averageReadinessScore}%</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <StatCard title="Total batches" value={String(metrics.totalBatches)} helper="Saved validation summaries" icon={<FileSpreadsheet className="h-5 w-5" />} tone="navy" trend="Batches" />
        <StatCard title="Ready batches" value={String(metrics.readyBatches)} helper="Clean enough for review" icon={<CheckCircle2 className="h-5 w-5" />} tone={metrics.readyBatches > 0 ? "emerald" : "white"} trend="Ready" />
        <StatCard title="Needs cleanup" value={String(metrics.needsCleanup)} helper="Requires source file fixes" icon={<ClipboardList className="h-5 w-5" />} tone={metrics.needsCleanup > 0 ? "amber" : "emerald"} trend="Cleanup" />
        <StatCard title="Approved" value={String(metrics.approved)} helper="Approved for pilot import" icon={<ShieldCheck className="h-5 w-5" />} tone={metrics.approved > 0 ? "emerald" : "white"} trend="Approved" />
        <StatCard title="Average readiness" value={`${metrics.averageReadinessScore}%`} helper="Across saved batches" icon={<TrendingUp className="h-5 w-5" />} tone="blue" trend="Score" />
        <StatCard title="Rows reviewed" value={String(metrics.totalRowsReviewed)} helper="CSV rows validated" icon={<Rows3 className="h-5 w-5" />} tone="white" trend="Rows" />
      </section>

      <ImportBatchesReview initialBatches={records} />
    </div>
  );
}
