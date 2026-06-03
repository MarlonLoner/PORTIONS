"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { importBatchStatusClasses, importBatchStatusLabels, type ImportBatchStatusValue } from "@/lib/import-batches";

export function ImportBatchDetailActions({
  batchId,
  initialNotes
}: {
  batchId: string;
  initialNotes: string;
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [busy, setBusy] = useState("");
  const [feedback, setFeedback] = useState("");

  async function update(payload: { status?: ImportBatchStatusValue; notes?: string }, message: string) {
    setBusy(payload.status ?? "notes");
    setFeedback("");
    const response = await fetch(`/api/import-batches/${batchId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    setBusy("");
    setFeedback(response.ok ? message : "Update failed. Please try again.");
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clinical-700">Actions</p>
      <label className="mt-5 block">
        <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Notes</span>
        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} className="focus-ring mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-navy-950" />
      </label>
      <div className="mt-4 flex flex-wrap gap-2">
        <Action status="NEEDS_CLEANUP" label="Mark Needs Cleanup" busy={busy} onClick={() => update({ status: "NEEDS_CLEANUP" }, "Marked needs cleanup.")} />
        <Action status="READY" label="Mark Ready" busy={busy} onClick={() => update({ status: "READY" }, "Marked ready.")} />
        <Action status="APPROVED" label="Mark Approved" busy={busy} onClick={() => update({ status: "APPROVED" }, "Marked approved.")} />
        <Action status="IMPORTED" label="Mark Imported" busy={busy} onClick={() => update({ status: "IMPORTED" }, "Marked imported.")} />
        <button type="button" disabled={Boolean(busy)} onClick={() => update({ notes }, "Notes updated.")} className="focus-ring inline-flex items-center gap-2 rounded-lg bg-navy-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-navy-800 disabled:opacity-60">
          {busy === "notes" ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />}
          Update notes
        </button>
        <Link href="/imports/batches" className="focus-ring inline-flex items-center rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50">Back to Import Batches</Link>
        <Link href="/imports/upload" className="focus-ring inline-flex items-center rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50">Back to Upload</Link>
      </div>
      {feedback ? <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-100">{feedback}</p> : null}
    </section>
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
