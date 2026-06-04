"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import {
  getImportBatchAiSummary,
  getImportBatchNextAction,
  getImportBatchPriority,
  importBatchPriorityClasses,
  importBatchStatusClasses,
  importBatchStatusLabels,
  importBatchStatuses,
  type ImportBatchStatusValue
} from "@/lib/import-batches";
import { formatDate } from "@/lib/format";

export type ImportBatchRecord = {
  id: string;
  templateType: string;
  fileName: string;
  rowCount: number;
  readinessScore: number;
  validationStatus: string;
  missingFields: string[];
  extraFields: string[];
  optionalFieldsDetected: string[];
  issueCount: number;
  dateWarningCount: number;
  numericWarningCount: number;
  duplicateWarningCount: number;
  branchWarningCount: number;
  status: ImportBatchStatusValue;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export function ImportBatchesReview({ initialBatches }: { initialBatches: ImportBatchRecord[] }) {
  const [batches, setBatches] = useState(initialBatches);
  const [templateFilter, setTemplateFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [validationFilter, setValidationFilter] = useState("ALL");
  const [busyId, setBusyId] = useState("");
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const templateOptions = useMemo(() => Array.from(new Set(batches.map((batch) => batch.templateType))).sort(), [batches]);
  const validationOptions = useMemo(() => Array.from(new Set(batches.map((batch) => batch.validationStatus))).sort(), [batches]);
  const filteredBatches = batches.filter((batch) =>
    (templateFilter === "ALL" || batch.templateType === templateFilter) &&
    (statusFilter === "ALL" || batch.status === statusFilter) &&
    (validationFilter === "ALL" || batch.validationStatus === validationFilter)
  );

  async function updateBatch(id: string, payload: Partial<Pick<ImportBatchRecord, "status" | "notes">>, message: string) {
    setBusyId(id);
    const response = await fetch(`/api/import-batches/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    setBusyId("");

    if (!response.ok) {
      const result = await response.json().catch(() => ({ error: "Update failed." }));
      setFeedback((current) => ({ ...current, [id]: result.error ?? "Update failed." }));
      return;
    }

    const updated = await response.json();
    setBatches((current) => current.map((batch) => batch.id === id ? { ...batch, ...updated, createdAt: updated.createdAt, updatedAt: updated.updatedAt } : batch));
    setFeedback((current) => ({ ...current, [id]: message }));
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clinical-700">Batch review</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-navy-950">Saved Import Batches</h2>
        </div>
        <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">Summary only</span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <Filter label="Template type" value={templateFilter} onChange={setTemplateFilter} options={["ALL", ...templateOptions]} />
        <Filter label="Status" value={statusFilter} onChange={setStatusFilter} options={["ALL", ...importBatchStatuses]} labels={importBatchStatusLabels} />
        <Filter label="Validation status" value={validationFilter} onChange={setValidationFilter} options={["ALL", ...validationOptions]} />
      </div>

      <div className="mt-6 grid gap-4">
        {filteredBatches.length > 0 ? filteredBatches.map((batch) => (
          <BatchCard key={batch.id} batch={batch} busy={busyId === batch.id} feedback={feedback[batch.id]} onUpdate={updateBatch} />
        )) : <p className="rounded-lg bg-slate-50 p-6 text-center text-sm text-slate-500">No import batches match these filters.</p>}
      </div>
    </section>
  );
}

function BatchCard({ batch, busy, feedback, onUpdate }: { batch: ImportBatchRecord; busy: boolean; feedback?: string; onUpdate: (id: string, payload: Partial<Pick<ImportBatchRecord, "status" | "notes">>, message: string) => Promise<void> }) {
  const [notes, setNotes] = useState(batch.notes ?? "");
  const priority = getImportBatchPriority(batch);

  return (
    <article className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-navy-950">{batch.templateType.replace(/-/g, " ")}</h3>
          <p className="mt-1 text-sm text-slate-500">{batch.fileName}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge label={importBatchStatusLabels[batch.status]} className={importBatchStatusClasses[batch.status]} />
          <Badge label={`${priority} priority`} className={importBatchPriorityClasses[priority]} />
          <Badge label={batch.validationStatus} className={batch.validationStatus === "Ready" ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : batch.validationStatus === "Invalid" ? "bg-rose-50 text-rose-700 ring-rose-200" : "bg-amber-50 text-amber-700 ring-amber-200"} />
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Mini label="Rows" value={String(batch.rowCount)} />
        <Mini label="Readiness" value={`${batch.readinessScore}%`} />
        <Mini label="Issues" value={String(batch.issueCount)} />
        <Mini label="Missing fields" value={batch.missingFields.length ? batch.missingFields.join(", ") : "None"} />
        <Mini label="Created" value={formatDate(batch.createdAt)} />
      </div>

      <p className="mt-4 rounded-lg bg-white p-3 text-sm leading-6 text-slate-700 ring-1 ring-slate-200">{getImportBatchAiSummary(batch)}</p>
      <p className="mt-3 rounded-lg bg-clinical-50 p-3 text-sm font-semibold leading-6 text-clinical-900">{getImportBatchNextAction(batch)}</p>

      <label className="mt-4 block">
        <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Notes</span>
        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} className="focus-ring mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-navy-950" />
      </label>

      <div className="mt-4 flex flex-wrap gap-2">
        <Action label="Mark Needs Cleanup" status="NEEDS_CLEANUP" busy={busy} onClick={() => onUpdate(batch.id, { status: "NEEDS_CLEANUP" }, "Marked needs cleanup.")} />
        <Action label="Mark Ready" status="READY" busy={busy} onClick={() => onUpdate(batch.id, { status: "READY" }, "Marked ready.")} />
        <Action label="Mark Approved" status="APPROVED" busy={busy} onClick={() => onUpdate(batch.id, { status: "APPROVED" }, "Marked approved.")} />
        <Action label="Mark Imported" status="IMPORTED" busy={busy} onClick={() => onUpdate(batch.id, { status: "IMPORTED" }, "Marked imported.")} />
        <button type="button" disabled={busy} onClick={() => onUpdate(batch.id, { notes }, "Notes updated.")} className="focus-ring inline-flex items-center gap-2 rounded-lg bg-navy-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-navy-800 disabled:opacity-60">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />}
          Update notes
        </button>
      </div>
      {feedback ? <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-100">{feedback}</p> : null}
    </article>
  );
}

function Filter({ label, value, onChange, options, labels }: { label: string; value: string; onChange: (value: string) => void; options: string[]; labels?: Record<string, string> }) {
  return (
    <label>
      <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="focus-ring mt-2 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-navy-950">
        {options.map((option) => <option key={option} value={option}>{option === "ALL" ? "All" : labels?.[option] ?? option}</option>)}
      </select>
    </label>
  );
}

function Badge({ label, className }: { label: string; className: string }) {
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ring-1 ${className}`}>{label}</span>;
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white p-3 ring-1 ring-slate-200">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</p>
      <p className="mt-2 line-clamp-2 text-sm font-semibold leading-5 text-navy-950">{value}</p>
    </div>
  );
}

function Action({ label, status, busy, onClick }: { label: string; status: ImportBatchStatusValue; busy: boolean; onClick: () => void }) {
  return (
    <button type="button" disabled={busy} onClick={onClick} className="focus-ring inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:opacity-60">
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
      {label}
    </button>
  );
}
