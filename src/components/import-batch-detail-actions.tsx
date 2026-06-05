"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ImportRowResult } from "@/lib/import-execution";
import { importBatchStatusClasses, importBatchStatusLabels, type ImportBatchStatusValue } from "@/lib/import-batches";

export function ImportBatchDetailActions({
  batchId,
  initialNotes,
  templateType,
  canExecute,
  executionMessage,
  alreadyImported
}: {
  batchId: string;
  initialNotes: string;
  templateType: string;
  canExecute: boolean;
  executionMessage: string;
  alreadyImported: boolean;
}) {
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes);
  const [busy, setBusy] = useState("");
  const [feedback, setFeedback] = useState("");
  const [feedbackTone, setFeedbackTone] = useState<"success" | "error">("success");
  const [executionResult, setExecutionResult] = useState<{
    importedRecordCount: number;
    skippedRecordCount: number;
    failedRecordCount: number;
    rowResults: ImportRowResult[];
  } | null>(null);

  async function update(payload: { status?: ImportBatchStatusValue; notes?: string }, message: string) {
    setBusy(payload.status ?? "notes");
    setFeedback("");
    const response = await fetch(`/api/import-batches/${batchId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    setBusy("");
    if (!response.ok) {
      const result = await response.json().catch(() => null);
      setFeedbackTone("error");
      setFeedback(result?.error ?? "Update failed. Please try again.");
      return;
    }

    setFeedbackTone("success");
    setFeedback(message);
    router.refresh();
  }

  async function executeImport() {
    setBusy("execute");
    setFeedback("");
    const response = await fetch(`/api/import-batches/${batchId}/execute`, { method: "POST" });
    setBusy("");

    const result = await response.json().catch(() => null);
    if (!response.ok) {
      setFeedbackTone("error");
      setFeedback(result?.error ?? "Import execution failed.");
      return;
    }

    setExecutionResult(result);
    setFeedbackTone("success");
    setFeedback("Import execution completed.");
    router.refresh();
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clinical-700">Actions</p>
      <p className={canExecute ? "mt-4 rounded-lg bg-emerald-50 p-3 text-sm font-semibold leading-6 text-emerald-800 ring-1 ring-emerald-100" : "mt-4 rounded-lg bg-amber-50 p-3 text-sm font-semibold leading-6 text-amber-800 ring-1 ring-amber-100"}>
        {executionMessage}
      </p>
      {canExecute ? (
        <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-700 ring-1 ring-slate-200">
          This will write approved rows into PORTIONS demo records.
        </p>
      ) : null}
      <label className="mt-5 block">
        <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Notes</span>
        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} className="focus-ring mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-navy-950" />
      </label>
      <div className="mt-4 flex flex-wrap gap-2">
        <Action status="NEEDS_CLEANUP" label="Mark Needs Cleanup" busy={busy} onClick={() => update({ status: "NEEDS_CLEANUP" }, "Marked needs cleanup.")} />
        <Action status="READY" label="Mark Ready" busy={busy} onClick={() => update({ status: "READY" }, "Marked ready.")} />
        <Action status="APPROVED" label="Mark Approved" busy={busy} onClick={() => update({ status: "APPROVED" }, "Marked approved.")} />
        <Action status="IMPORTED" label="Mark Imported" busy={busy} onClick={() => update({ status: "IMPORTED" }, "Marked imported.")} />
        <button type="button" disabled={!canExecute || alreadyImported || Boolean(busy)} onClick={executeImport} className="focus-ring inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">
          {busy === "execute" ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />}
          Execute Import
        </button>
        <button type="button" disabled={Boolean(busy)} onClick={() => update({ notes }, "Notes updated.")} className="focus-ring inline-flex items-center gap-2 rounded-lg bg-navy-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-navy-800 disabled:opacity-60">
          {busy === "notes" ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />}
          Update notes
        </button>
        <Link href="/imports/batches" className="focus-ring inline-flex items-center rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50">Back to Import Batches</Link>
        <Link href="/imports/upload" className="focus-ring inline-flex items-center rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50">Back to Upload</Link>
      </div>
      {feedback ? (
        <p className={feedbackTone === "success" ? "mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-100" : "mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 ring-1 ring-rose-100"}>
          {feedback}
        </p>
      ) : null}
      {executionResult ? (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-navy-950">Import result summary</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <ResultMetric label="Imported" value={String(executionResult.importedRecordCount)} />
            <ResultMetric label="Skipped" value={String(executionResult.skippedRecordCount)} />
            <ResultMetric label="Failed" value={String(executionResult.failedRecordCount)} />
          </div>
          <div className="mt-3 max-h-56 overflow-auto rounded-lg bg-white p-3 ring-1 ring-slate-200">
            {executionResult.rowResults.slice(0, 20).map((result) => (
              <ExecutionResultLine key={`${result.rowNumber}-${result.name}-${result.action}`} result={result} />
            ))}
          </div>
          {templateType === "chronic-patients" ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/patients" className="focus-ring rounded-lg bg-navy-950 px-3 py-2 text-xs font-semibold text-white">
                Review Chronic Revenue Engine
              </Link>
              <Link href="/follow-ups" className="focus-ring rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                Review Follow-Up Queue
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function ExecutionResultLine({ result }: { result: ImportRowResult }) {
  const hasWarning = (result.warnings?.length ?? 0) > 0 || result.scheduleNote?.includes("review");
  const status = result.action === "imported" && hasWarning ? "Warning" : result.action === "imported" ? "Imported" : result.action === "skipped" ? "Skipped" : "Failed";

  return (
    <div className="border-b border-slate-100 py-2 last:border-b-0">
      <p className="text-xs font-semibold leading-5 text-navy-950">
        Row {result.rowNumber}: {status} {result.name}
        {result.phone ? ` (${result.phone})` : ""}
      </p>
      <p className="text-xs leading-5 text-slate-700">{result.reason}</p>
      {result.scheduleNote ? <p className="text-xs font-semibold leading-5 text-clinical-800">Schedule: {result.scheduleNote}</p> : null}
      {result.warnings?.length ? <p className="text-xs font-semibold leading-5 text-amber-700">{result.warnings.join(" ")}</p> : null}
    </div>
  );
}

function Action({ status, label, busy, onClick }: { status: ImportBatchStatusValue; label: string; busy: string; onClick: () => void }) {
  return (
    <button type="button" disabled={Boolean(busy)} onClick={onClick} className={`focus-ring inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold ring-1 transition disabled:opacity-60 ${importBatchStatusClasses[status]}`}>
      {busy === status ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
      {label}
      <span className="sr-only">{importBatchStatusLabels[status]}</span>
    </button>
  );
}

function ResultMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white p-3 ring-1 ring-slate-200">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-navy-950">{value}</p>
    </div>
  );
}
