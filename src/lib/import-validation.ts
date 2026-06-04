import type { ImportTemplate } from "@/lib/imports";

export type ParsedCsv = {
  headers: string[];
  rows: Record<string, string>[];
};

export type CsvRowIssue = {
  rowNumber: number;
  field: string;
  message: string;
  type: "empty" | "date" | "numeric" | "duplicate" | "branch";
};

const numericFields = new Set(["branch_count", "stock_level", "reorder_level", "amount", "refill_cycle_days", "unit_cost"]);

function normalizeHeader(value: string) {
  return value.trim().replace(/^\uFEFF/, "");
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && insideQuotes && next === '"') {
      current += '"';
      index++;
    } else if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === "," && !insideQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

export function parseCsv(input: string): ParsedCsv {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = parseCsvLine(lines[0]).map(normalizeHeader);
  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return headers.reduce<Record<string, string>>((row, header, index) => {
      row[header] = values[index]?.trim() ?? "";
      return row;
    }, {});
  });

  return { headers, rows };
}

export function getTemplateRequiredHeaders(template: ImportTemplate) {
  return template.requiredFields;
}

export function getTemplateOptionalHeaders(template: ImportTemplate) {
  return template.optionalFields;
}

export function validateCsvColumns(headers: string[], template: ImportTemplate) {
  const headerSet = new Set(headers);
  const expectedHeaders = new Set([...template.requiredFields, ...template.optionalFields]);

  return {
    missingRequiredFields: template.requiredFields.filter((field) => !headerSet.has(field)),
    optionalFieldsDetected: template.optionalFields.filter((field) => headerSet.has(field)),
    extraFields: headers.filter((field) => !expectedHeaders.has(field))
  };
}

function isValidDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00`).getTime());
}

function isNumeric(value: string) {
  return value.trim() !== "" && Number.isFinite(Number(value));
}

export function validateCsvRows(rows: Record<string, string>[], template: ImportTemplate, branchNames: string[]) {
  const issues: CsvRowIssue[] = [];
  const phoneCounts = new Map<string, number>();
  const branchSet = new Set(branchNames);

  rows.forEach((row) => {
    const phone = row.phone_number?.trim();
    if (phone) phoneCounts.set(phone, (phoneCounts.get(phone) ?? 0) + 1);
  });

  rows.forEach((row, index) => {
    const rowNumber = index + 2;

    template.requiredFields.forEach((field) => {
      if (!row[field]?.trim()) {
        issues.push({ rowNumber, field, message: "Required value is empty.", type: "empty" });
      }
    });

    Object.entries(row).forEach(([field, value]) => {
      if (!value.trim()) return;

      if (field.includes("date") && !isValidDate(value)) {
        issues.push({ rowNumber, field, message: "Date should use YYYY-MM-DD.", type: "date" });
      }

      if (numericFields.has(field) && !isNumeric(value)) {
        issues.push({ rowNumber, field, message: "Value should be numeric.", type: "numeric" });
      }
    });

    if (row.phone_number && phoneCounts.get(row.phone_number) && phoneCounts.get(row.phone_number)! > 1) {
      issues.push({ rowNumber, field: "phone_number", message: "Duplicate phone number detected.", type: "duplicate" });
    }

    if (row.branch?.trim() && branchSet.size > 0 && !branchSet.has(row.branch.trim())) {
      issues.push({ rowNumber, field: "branch", message: "Branch does not match configured branch names.", type: "branch" });
    }
  });

  return issues;
}

export function getImportReadinessScore({
  rowCount,
  missingRequiredFields,
  issues
}: {
  rowCount: number;
  missingRequiredFields: string[];
  issues: CsvRowIssue[];
}) {
  if (rowCount === 0) return 0;
  const columnPenalty = missingRequiredFields.length * 18;
  const issuePenalty = Math.min(issues.length * 3, 45);
  return Math.max(0, Math.min(100, 100 - columnPenalty - issuePenalty));
}

export function getUploadValidationStatus(score: number, missingRequiredFields: string[], issues: CsvRowIssue[]) {
  if (missingRequiredFields.length > 0 || score < 45) return "Invalid";
  if (issues.length > 0 || score < 85) return "Needs Cleanup";
  return "Ready";
}

export function getAiImportUploadAdvisor({
  hasFile,
  missingRequiredFields,
  issues,
  status
}: {
  hasFile: boolean;
  missingRequiredFields: string[];
  issues: CsvRowIssue[];
  status: string;
}) {
  if (!hasFile) {
    return "Start by downloading a template, filling it with pharmacy data, then uploading it here.";
  }

  if (missingRequiredFields.length > 0) {
    return "Add the missing required columns before importing. PORTIONS needs the core fields to map pharmacy data safely.";
  }

  if (issues.length > 8) {
    return "Clean phone numbers, dates, and branch names before pilot setup. The file is close, but too many row issues can slow onboarding.";
  }

  if (status === "Ready") {
    return "This file is ready for pilot import review.";
  }

  return "Review the highlighted rows, fix required values, and confirm branch names match the configured PORTIONS branches.";
}
