"use client";

import { CheckCircle2, ClipboardCopy, Download, RotateCcw, UploadCloud } from "lucide-react";
import Link from "next/link";
import { ChangeEvent, useMemo, useState } from "react";
import {
  getAiImportUploadAdvisor,
  getImportReadinessScore,
  getTemplateOptionalHeaders,
  getTemplateRequiredHeaders,
  getUploadValidationStatus,
  parseCsv,
  validateCsvColumns,
  validateCsvRows
} from "@/lib/import-validation";
import { getTemplateCsvHeader, getTemplateExampleRow, type ImportTemplate } from "@/lib/imports";

const statusClasses = {
  Ready: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  "Needs Cleanup": "bg-amber-50 text-amber-700 ring-amber-200",
  Invalid: "bg-rose-50 text-rose-700 ring-rose-200"
};

function escapeCsv(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function ImportUploadPreview({
  templates,
  branchNames
}: {
  templates: ImportTemplate[];
  branchNames: string[];
}) {
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [readyMarked, setReadyMarked] = useState(false);
  const [savingBatch, setSavingBatch] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [savedBatchId, setSavedBatchId] = useState("");

  const selectedTemplate = templates.find((template) => template.id === templateId) ?? templates[0];
  const columnValidation = useMemo(() => validateCsvColumns(headers, selectedTemplate), [headers, selectedTemplate]);
  const rowIssues = useMemo(() => validateCsvRows(rows, selectedTemplate, branchNames), [rows, selectedTemplate, branchNames]);
  const readinessScore = getImportReadinessScore({
    rowCount: rows.length,
    missingRequiredFields: columnValidation.missingRequiredFields,
    issues: rowIssues
  });
  const validationStatus = getUploadValidationStatus(readinessScore, columnValidation.missingRequiredFields, rowIssues);
  const advisor = getAiImportUploadAdvisor({
    hasFile: Boolean(fileName),
    missingRequiredFields: columnValidation.missingRequiredFields,
    issues: rowIssues,
    status: validationStatus,
    templateId: selectedTemplate.id
  });
  const issueSummary = {
    blockingIssues: rowIssues.filter((issue) => issue.type !== "schedule").length,
    rowsWithIssues: new Set(rowIssues.map((issue) => issue.rowNumber)).size,
    dateWarnings: rowIssues.filter((issue) => issue.type === "date").length,
    numericWarnings: rowIssues.filter((issue) => issue.type === "numeric").length,
    duplicateWarnings: rowIssues.filter((issue) => issue.type === "duplicate").length,
    branchWarnings: rowIssues.filter((issue) => issue.type === "branch").length,
    scheduleWarnings: rowIssues.filter((issue) => issue.type === "schedule").length
  };
  const previewRows = rows.slice(0, 10);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setReadyMarked(false);
    if (!file) return;
    const text = await file.text();
    const parsed = parseCsv(text);
    setFileName(file.name);
    setHeaders(parsed.headers);
    setRows(parsed.rows);
    setSavedBatchId("");
    setSaveError("");
  }

  function clearUpload() {
    setFileName("");
    setHeaders([]);
    setRows([]);
    setReadyMarked(false);
    setSavedBatchId("");
    setSaveError("");
  }

  async function saveImportBatch() {
    if (!fileName) {
      setSaveError("Upload a CSV file before saving an import batch.");
      return;
    }

    setSavingBatch(true);
    setSaveError("");

    const response = await fetch("/api/import-batches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        templateType: selectedTemplate.id,
        fileName,
        rowCount: rows.length,
        readinessScore,
        validationStatus,
        missingFields: columnValidation.missingRequiredFields,
        extraFields: columnValidation.extraFields,
        optionalFieldsDetected: columnValidation.optionalFieldsDetected,
        issueCount: issueSummary.blockingIssues,
        dateWarningCount: issueSummary.dateWarnings,
        numericWarningCount: issueSummary.numericWarnings,
        duplicateWarningCount: issueSummary.duplicateWarnings,
        branchWarningCount: issueSummary.branchWarnings,
        rows,
        previewRows,
        rowIssues
      })
    });

    setSavingBatch(false);

    if (!response.ok) {
      const result = await response.json().catch(() => ({ error: "Import batch could not be saved." }));
      setSaveError(result.error ?? "Import batch could not be saved.");
      return;
    }

    const result = await response.json();
    setSavedBatchId(result.id);
  }

  async function copyRequiredHeaders() {
    await navigator.clipboard?.writeText(getTemplateRequiredHeaders(selectedTemplate).join(","));
  }

  function downloadTemplate() {
    const templateHeaders = getTemplateCsvHeader(selectedTemplate);
    const exampleRow = getTemplateExampleRow(selectedTemplate);
    const csv = [templateHeaders.map(escapeCsv).join(","), exampleRow.map(escapeCsv).join(",")].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedTemplate.id}-template.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-lg border border-navy-800 bg-navy-950 p-5 text-white shadow-[0_28px_80px_rgba(6,21,38,0.22)] sm:p-6 xl:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.12),transparent_36%),linear-gradient(180deg,rgba(75,158,201,0.18),transparent_58%)]" />
        <div className="relative grid gap-7 xl:grid-cols-[1.08fr_0.92fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-clinical-100 ring-1 ring-white/15">
              <UploadCloud className="h-3.5 w-3.5" aria-hidden="true" />
              Safe Preview Layer
            </span>
            <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">Import Upload Preview</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-200">
              Upload pharmacy CSV files, validate required fields, preview rows, and identify cleanup issues before pilot import.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <HeroMetric label="Selected import type" value={selectedTemplate.name} />
            <HeroMetric label="File status" value={fileName ? "Uploaded" : "No file"} />
            <HeroMetric label="Row count" value={String(rows.length)} />
            <HeroMetric label="Required fields found" value={`${selectedTemplate.requiredFields.length - columnValidation.missingRequiredFields.length}/${selectedTemplate.requiredFields.length}`} />
            <HeroMetric label="Missing fields" value={String(columnValidation.missingRequiredFields.length)} />
            <HeroMetric label="Validation status" value={validationStatus} tone={validationStatus} />
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clinical-700">Import type selector</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-navy-950">Choose template</h2>
          <select value={templateId} onChange={(event) => setTemplateId(event.target.value)} className="focus-ring mt-5 h-12 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-navy-950">
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
          <p className="mt-4 text-sm leading-6 text-slate-600">{selectedTemplate.purpose}</p>
          {selectedTemplate.id === "chronic-patients" ? (
            <p className="mt-4 rounded-lg bg-clinical-50 p-3 text-sm font-semibold leading-6 text-clinical-900 ring-1 ring-clinical-100">
              If you do not know the exact next refill date, provide refill_cycle_days. PORTIONS can estimate the first schedule during pilot setup.
            </p>
          ) : null}
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clinical-700">CSV upload</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-navy-950">Upload .csv file</h2>
          <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center transition hover:bg-slate-100">
            <UploadCloud className="h-8 w-8 text-clinical-700" aria-hidden="true" />
            <span className="mt-3 text-sm font-semibold text-navy-950">{fileName || "Choose a CSV file"}</span>
            <span className="mt-1 text-xs text-slate-500">No data will be written to the database.</span>
            <input type="file" accept=".csv,text/csv" onChange={handleFileChange} className="sr-only" />
          </label>
        </article>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clinical-700">Required field validation</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-navy-950">Column readiness</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <FieldGroup title="Missing required fields" fields={columnValidation.missingRequiredFields} empty="No missing required fields." tone="risk" />
            <FieldGroup title="Optional fields detected" fields={columnValidation.optionalFieldsDetected} empty="No optional fields detected." tone="success" />
            <FieldGroup title="Extra/unrecognized fields" fields={columnValidation.extraFields} empty="No extra fields." tone="neutral" />
            <FieldGroup title="Required headers" fields={getTemplateRequiredHeaders(selectedTemplate)} tone="required" />
          </div>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clinical-700">Validation summary</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-navy-950">Cleanup signals</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <SummaryMetric label="Total rows" value={String(rows.length)} />
            <SummaryMetric label="Rows with issues" value={String(issueSummary.rowsWithIssues)} />
            <SummaryMetric label="Missing columns" value={String(columnValidation.missingRequiredFields.length)} />
            <SummaryMetric label="Date warnings" value={String(issueSummary.dateWarnings)} />
            <SummaryMetric label="Numeric warnings" value={String(issueSummary.numericWarnings)} />
            <SummaryMetric label="Duplicate warnings" value={String(issueSummary.duplicateWarnings)} />
            <SummaryMetric label="Branch warnings" value={String(issueSummary.branchWarnings)} />
            <SummaryMetric label="Schedule warnings" value={String(issueSummary.scheduleWarnings)} />
            <SummaryMetric label="Readiness score" value={`${readinessScore}%`} />
          </div>
        </article>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clinical-700">Row preview</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-navy-950">First 10 rows</h2>
          </div>
          <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${statusClasses[validationStatus]}`}>{validationStatus}</span>
        </div>

        <div className="mt-5 overflow-x-auto">
          {previewRows.length > 0 ? (
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="whitespace-nowrap px-3 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Row</th>
                  {headers.map((header) => (
                    <th key={header} className="whitespace-nowrap px-3 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, index) => (
                  <tr key={index} className="border-b border-slate-100">
                    <td className="whitespace-nowrap px-3 py-3 font-semibold text-slate-700">{index + 2}</td>
                    {headers.map((header) => {
                      const missingRequired = selectedTemplate.requiredFields.includes(header) && !row[header]?.trim();
                      return (
                        <td key={header} className={missingRequired ? "whitespace-nowrap bg-rose-50 px-3 py-3 text-rose-700" : "whitespace-nowrap px-3 py-3 text-slate-700"}>
                          {row[header] || (missingRequired ? "Missing" : "-")}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="rounded-lg bg-slate-50 p-6 text-center text-sm text-slate-500">Upload a CSV file to preview rows.</p>
          )}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <article className="rounded-lg border border-navy-800 bg-navy-950 p-5 text-white shadow-[0_28px_80px_rgba(6,21,38,0.22)]">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clinical-100">AI Import Advisor</p>
          <p className="mt-3 text-base leading-7 text-slate-100">{advisor}</p>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clinical-700">Actions</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <a href="/imports" className="focus-ring inline-flex items-center rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50">Back to Import Templates</a>
            <button type="button" onClick={downloadTemplate} className="focus-ring inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50">
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Download selected template
            </button>
            <button type="button" onClick={copyRequiredHeaders} className="focus-ring inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50">
              <ClipboardCopy className="h-3.5 w-3.5" aria-hidden="true" />
              Copy required headers
            </button>
            <button type="button" onClick={clearUpload} className="focus-ring inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50">
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Clear upload
            </button>
            <button type="button" onClick={() => setReadyMarked(true)} className="focus-ring inline-flex items-center gap-2 rounded-lg bg-navy-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-navy-800">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              Mark as Ready for Pilot Import
            </button>
            <button type="button" onClick={saveImportBatch} disabled={savingBatch || !fileName} className="focus-ring inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              {savingBatch ? "Saving..." : "Save Import Batch"}
            </button>
          </div>
          {readyMarked ? <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-100">Marked ready for pilot import review. This is UI-only for now.</p> : null}
          {saveError ? <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 ring-1 ring-rose-100">{saveError}</p> : null}
          {savedBatchId ? (
            <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-100">
              Import batch saved. <Link href="/imports/batches" className="underline">Review saved batches</Link>.
            </p>
          ) : null}
        </article>
      </section>
    </div>
  );
}

function HeroMetric({ label, value, tone }: { label: string; value: string; tone?: keyof typeof statusClasses }) {
  return (
    <article className="rounded-lg bg-white p-4 text-navy-950">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</p>
      <p className={tone ? `mt-2 inline-flex rounded-full px-2.5 py-1 text-sm font-semibold ring-1 ${statusClasses[tone]}` : "mt-2 text-xl font-semibold leading-6"}>{value}</p>
    </article>
  );
}

function FieldGroup({ title, fields, empty, tone }: { title: string; fields: string[]; empty?: string; tone: "risk" | "success" | "neutral" | "required" }) {
  const className =
    tone === "risk"
      ? "bg-rose-50 text-rose-700 ring-rose-100"
      : tone === "success" || tone === "required"
        ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
        : "bg-slate-100 text-slate-700 ring-slate-200";

  return (
    <div className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{title}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {fields.length > 0 ? (
          fields.map((field) => (
            <span key={field} className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${className}`}>
              {field}
            </span>
          ))
        ) : (
          <span className="text-sm text-slate-500">{empty ?? "None"}</span>
        )}
      </div>
    </div>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-semibold text-navy-950">{value}</p>
    </div>
  );
}
