export const importBatchStatuses = ["DRAFT", "NEEDS_CLEANUP", "READY", "APPROVED", "IMPORTED"] as const;
export type ImportBatchStatusValue = (typeof importBatchStatuses)[number];
export type ImportBatchPriority = "High" | "Medium" | "Standard";

export type ImportBatchLike = {
  templateType: string;
  fileName: string;
  rowCount: number;
  readinessScore: number;
  validationStatus: string;
  missingFields: string[];
  issueCount: number;
  dateWarningCount: number;
  numericWarningCount: number;
  duplicateWarningCount: number;
  branchWarningCount: number;
  status: ImportBatchStatusValue | string;
};

export const importBatchStatusLabels: Record<ImportBatchStatusValue, string> = {
  DRAFT: "Draft",
  NEEDS_CLEANUP: "Needs Cleanup",
  READY: "Ready",
  APPROVED: "Approved",
  IMPORTED: "Imported"
};

export const importBatchStatusClasses: Record<ImportBatchStatusValue, string> = {
  DRAFT: "bg-slate-100 text-slate-700 ring-slate-200",
  NEEDS_CLEANUP: "bg-amber-50 text-amber-700 ring-amber-200",
  READY: "bg-clinical-50 text-clinical-800 ring-clinical-200",
  APPROVED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  IMPORTED: "bg-navy-950 text-white ring-navy-900"
};

export const importBatchPriorityClasses: Record<ImportBatchPriority, string> = {
  High: "bg-rose-50 text-rose-700 ring-rose-200",
  Medium: "bg-amber-50 text-amber-700 ring-amber-200",
  Standard: "bg-clinical-50 text-clinical-800 ring-clinical-200"
};

export function getImportBatchStatus(batch: ImportBatchLike): ImportBatchStatusValue {
  if (batch.status === "IMPORTED" || batch.status === "APPROVED") return batch.status;
  if (batch.validationStatus === "Ready" && batch.readinessScore >= 85) return "READY";
  if (batch.validationStatus === "Invalid" || batch.issueCount > 0 || batch.missingFields.length > 0) return "NEEDS_CLEANUP";
  return "DRAFT";
}

export function getImportBatchPriority(batch: ImportBatchLike): ImportBatchPriority {
  if (batch.missingFields.length > 0 || batch.validationStatus === "Invalid") return "High";
  if (batch.issueCount >= 10 || batch.readinessScore < 70) return "High";
  if (batch.issueCount > 0 || batch.readinessScore < 90) return "Medium";
  return "Standard";
}

export function getImportBatchAiSummary(batch: ImportBatchLike) {
  const template = batch.templateType.replace(/-/g, " ");
  if (batch.missingFields.length > 0) {
    return `This ${template} import cannot be approved yet. ${batch.missingFields.length} required column${batch.missingFields.length === 1 ? " is" : "s are"} missing, so the source file needs structural cleanup first.`;
  }
  if (batch.issueCount > 0) {
    return `This ${template} import is almost ready. Required columns are present, but ${batch.issueCount} row issue${batch.issueCount === 1 ? "" : "s"} need cleanup before approving pilot import.`;
  }
  if (batch.status === "APPROVED") return `This ${template} import is approved for pilot import staging. Keep it ready until the implementation team schedules the real import.`;
  if (batch.status === "IMPORTED") return `This ${template} batch has been marked imported. Use it as an audit reference for the pilot data setup.`;
  return `This ${template} import is ready for pilot import review. Required columns are present and validation signals look clean.`;
}

export function getImportBatchNextAction(batch: ImportBatchLike) {
  if (batch.missingFields.length > 0) return "Send the template back for missing required columns before reviewing rows.";
  if (batch.branchWarningCount > 0) return "Resolve branch name mismatches against configured PORTIONS branches.";
  if (batch.dateWarningCount > 0 || batch.numericWarningCount > 0) return "Clean date and numeric formatting, then re-upload for validation.";
  if (batch.duplicateWarningCount > 0) return "Review duplicate phone numbers before approving import.";
  if (batch.status === "READY") return "Approve the batch when the pilot owner confirms the data source.";
  if (batch.status === "APPROVED") return "Hold for real import execution during pilot setup.";
  return "Review the batch summary and decide whether it needs cleanup or approval.";
}

export function getImportBatchMetrics(batches: ImportBatchLike[]) {
  const averageReadinessScore = batches.length ? Math.round(batches.reduce((sum, batch) => sum + batch.readinessScore, 0) / batches.length) : 0;
  return {
    totalBatches: batches.length,
    readyBatches: batches.filter((batch) => batch.status === "READY").length,
    needsCleanup: batches.filter((batch) => batch.status === "NEEDS_CLEANUP").length,
    approved: batches.filter((batch) => batch.status === "APPROVED").length,
    averageReadinessScore,
    totalRowsReviewed: batches.reduce((sum, batch) => sum + batch.rowCount, 0)
  };
}
