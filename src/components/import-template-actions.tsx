"use client";

import { ClipboardCopy, Download, Eye } from "lucide-react";
import { useState } from "react";

function escapeCsv(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

export function ImportTemplateActions({
  templateId,
  templateName,
  headers,
  exampleRow
}: {
  templateId: string;
  templateName: string;
  headers: string[];
  exampleRow: string[];
}) {
  const [showFields, setShowFields] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copyHeader() {
    await navigator.clipboard?.writeText(headers.join(","));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  function downloadCsv() {
    const csv = [headers.map(escapeCsv).join(","), exampleRow.map(escapeCsv).join(",")].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${templateId}-template.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mt-5">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setShowFields((current) => !current)} className="focus-ring inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50">
          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
          View Fields
        </button>
        <button type="button" onClick={copyHeader} className="focus-ring inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50">
          <ClipboardCopy className="h-3.5 w-3.5" aria-hidden="true" />
          {copied ? "Copied" : "Copy CSV Header"}
        </button>
        <button type="button" onClick={downloadCsv} className="focus-ring inline-flex items-center gap-2 rounded-lg bg-navy-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-navy-800">
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          Download CSV Template
        </button>
      </div>

      {showFields ? (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{templateName} CSV header</p>
          <p className="mt-2 break-words font-mono text-xs leading-6 text-slate-700">{headers.join(",")}</p>
        </div>
      ) : null}
    </div>
  );
}
