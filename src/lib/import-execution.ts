import { PackageType, PatientStatus, RiskScore } from "@prisma/client";
import type { Prisma, PrismaClient } from "@prisma/client";

type ImportBatchForExecution = {
  id: string;
  templateType: string;
  status: string;
  validationStatus: string;
  readinessScore: number;
  importedAt: Date | null;
  rows: Prisma.JsonValue;
  importedRecordCount?: number | null;
  skippedRecordCount?: number | null;
  failedRecordCount?: number | null;
  importResult?: Prisma.JsonValue;
};

export type ImportRowResult = {
  rowNumber: number;
  action: "imported" | "skipped" | "failed";
  recordType: "Branch" | "StaffMember" | "Patient";
  name: string;
  reason: string;
};

export type ImportExecutionResult = {
  importedRecordCount: number;
  skippedRecordCount: number;
  failedRecordCount: number;
  rowResults: ImportRowResult[];
};

export function getStoredRows(batch: ImportBatchForExecution) {
  return Array.isArray(batch.rows) ? (batch.rows as Array<Record<string, string>>) : [];
}

export function canExecuteImportBatch(batch: ImportBatchForExecution) {
  if (batch.importedAt || batch.status === "IMPORTED") {
    return { allowed: false, reason: "This batch has already been imported." };
  }

  if (batch.status !== "APPROVED") {
    return { allowed: false, reason: "Approve this batch before execution." };
  }

  if (!["branches", "staff-members", "chronic-patients"].includes(batch.templateType)) {
    return { allowed: false, reason: "Execution for this template type is coming soon." };
  }

  if (batch.validationStatus === "Invalid" || batch.readinessScore < 70) {
    return { allowed: false, reason: "This batch needs cleanup before execution." };
  }

  return { allowed: true, reason: "This approved batch can be executed into PORTIONS demo records." };
}

export function mapBranchRow(row: Record<string, string>) {
  return {
    name: row.branch_name?.trim() ?? "",
    area: row.location?.trim() ?? "",
    managerName: row.manager_name?.trim() || null
  };
}

export function mapStaffRow(row: Record<string, string>) {
  return {
    name: row.staff_name?.trim() ?? "",
    role: row.role?.trim() ?? "",
    branchName: row.branch?.trim() ?? "",
    phone: row.phone_number?.trim() || "+263000000000"
  };
}

export function mapChronicPatientRow(row: Record<string, string>) {
  return {
    name: row.patient_name?.trim() ?? "",
    phone: row.phone_number?.trim() ?? "",
    branchName: row.branch?.trim() ?? "",
    conditionCategory: row.condition_category?.trim() ?? "Chronic Care",
    medicationCycle: row.refill_cycle_days?.trim() ? `${row.refill_cycle_days.trim()} days` : "30 days",
    nextRefillDate: row.next_refill_date?.trim() ?? "",
    packageType: normalizePackageType(row.package_type),
    assignedStaffName: row.assigned_staff?.trim() ?? "",
    lastContactedAt: row.last_contacted_date?.trim() ?? "",
    riskScore: normalizeRiskScore(row.risk_score),
    medicationList: row.medication_list?.trim() ?? ""
  };
}

export async function executeBranchImport(tx: PrismaClient | Prisma.TransactionClient, rows: Array<Record<string, string>>): Promise<ImportExecutionResult> {
  const rowResults: ImportRowResult[] = [];

  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 2;
    const mapped = mapBranchRow(row);

    if (!mapped.name || !mapped.area) {
      rowResults.push({ rowNumber, action: "failed", recordType: "Branch", name: mapped.name || "Unknown branch", reason: "branch_name and location are required." });
      continue;
    }

    const existing = await tx.branch.findUnique({ where: { name: mapped.name } });
    if (existing) {
      rowResults.push({ rowNumber, action: "skipped", recordType: "Branch", name: mapped.name, reason: "Branch with this name already exists." });
      continue;
    }

    await tx.branch.create({
      data: {
        name: mapped.name,
        area: mapped.area,
        managerName: mapped.managerName
      }
    });
    rowResults.push({ rowNumber, action: "imported", recordType: "Branch", name: mapped.name, reason: "Branch created." });
  }

  return summarizeRowResults(rowResults);
}

export async function executeStaffImport(tx: PrismaClient | Prisma.TransactionClient, rows: Array<Record<string, string>>): Promise<ImportExecutionResult> {
  const rowResults: ImportRowResult[] = [];

  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 2;
    const mapped = mapStaffRow(row);

    if (!mapped.name || !mapped.role || !mapped.branchName) {
      rowResults.push({ rowNumber, action: "failed", recordType: "StaffMember", name: mapped.name || "Unknown staff member", reason: "staff_name, role, and branch are required." });
      continue;
    }

    const branch = await tx.branch.findUnique({ where: { name: mapped.branchName } });
    if (!branch) {
      rowResults.push({ rowNumber, action: "failed", recordType: "StaffMember", name: mapped.name, reason: `Branch '${mapped.branchName}' does not exist.` });
      continue;
    }

    const existing = await tx.staffMember.findFirst({
      where: {
        name: mapped.name,
        branchId: branch.id
      }
    });

    if (existing) {
      rowResults.push({ rowNumber, action: "skipped", recordType: "StaffMember", name: mapped.name, reason: "Staff member already exists in this branch." });
      continue;
    }

    await tx.staffMember.create({
      data: {
        name: mapped.name,
        role: mapped.role,
        phone: mapped.phone,
        branchId: branch.id
      }
    });
    rowResults.push({ rowNumber, action: "imported", recordType: "StaffMember", name: mapped.name, reason: "Staff member created." });
  }

  return summarizeRowResults(rowResults);
}

export async function executeChronicPatientImport(tx: PrismaClient | Prisma.TransactionClient, rows: Array<Record<string, string>>): Promise<ImportExecutionResult> {
  const rowResults: ImportRowResult[] = [];

  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 2;
    const mapped = mapChronicPatientRow(row);

    if (!mapped.name || !mapped.phone || !mapped.branchName || !mapped.nextRefillDate) {
      rowResults.push({ rowNumber, action: "failed", recordType: "Patient", name: mapped.name || "Unknown patient", reason: "patient_name, phone_number, branch, and next_refill_date are required." });
      continue;
    }

    const branch = await tx.branch.findUnique({ where: { name: mapped.branchName } });
    if (!branch) {
      rowResults.push({ rowNumber, action: "failed", recordType: "Patient", name: mapped.name, reason: `Branch '${mapped.branchName}' does not exist.` });
      continue;
    }

    const nextRefillDate = parseImportDate(mapped.nextRefillDate);
    if (!nextRefillDate) {
      rowResults.push({ rowNumber, action: "failed", recordType: "Patient", name: mapped.name, reason: "next_refill_date must use YYYY-MM-DD." });
      continue;
    }

    const lastContactedAt = mapped.lastContactedAt ? parseImportDate(mapped.lastContactedAt) : null;
    if (mapped.lastContactedAt && !lastContactedAt) {
      rowResults.push({ rowNumber, action: "failed", recordType: "Patient", name: mapped.name, reason: "last_contacted_date must use YYYY-MM-DD when provided." });
      continue;
    }

    const existing = await tx.patient.findFirst({ where: { phone: mapped.phone } });
    if (existing) {
      rowResults.push({ rowNumber, action: "skipped", recordType: "Patient", name: mapped.name, reason: "Patient with this phone number already exists." });
      continue;
    }

    const assignedStaff = mapped.assignedStaffName
      ? await tx.staffMember.findFirst({
          where: {
            name: mapped.assignedStaffName,
            OR: [{ branchId: branch.id }, { branchId: null }]
          }
        })
      : null;
    const medicines = mapped.medicationList
      .split(";")
      .map((medicine) => medicine.trim())
      .filter(Boolean);

    await tx.patient.create({
      data: {
        name: mapped.name,
        phone: mapped.phone,
        branchId: branch.id,
        conditionCategory: mapped.conditionCategory,
        packageType: mapped.packageType,
        medicationCycle: mapped.medicationCycle,
        nextRefillDate,
        status: PatientStatus.ACTIVE,
        assignedStaffId: assignedStaff?.id,
        lastContactedAt,
        riskScore: mapped.riskScore,
        medications: {
          create: medicines.length > 0
            ? medicines.map((medicine) => ({
                name: medicine,
                dosage: "As prescribed",
                frequency: "As directed",
                category: mapped.conditionCategory,
                notes: "Imported from chronic patient CSV"
              }))
            : [{
                name: "Medication to confirm",
                dosage: "As prescribed",
                frequency: "As directed",
                category: mapped.conditionCategory,
                notes: "Medication list missing during import"
              }]
        }
      }
    });

    const staffWarning = mapped.assignedStaffName && !assignedStaff ? ` Assigned staff '${mapped.assignedStaffName}' was not found; patient imported without assigned staff.` : "";
    rowResults.push({ rowNumber, action: "imported", recordType: "Patient", name: mapped.name, reason: `Patient and ${medicines.length || 1} medication record${(medicines.length || 1) === 1 ? "" : "s"} created.${staffWarning}` });
  }

  return summarizeRowResults(rowResults);
}

export function getImportExecutionSummary(batch: {
  importedRecordCount?: number | null;
  skippedRecordCount?: number | null;
  failedRecordCount?: number | null;
  importResult?: Prisma.JsonValue;
}) {
  return {
    importedRecordCount: batch.importedRecordCount ?? 0,
    skippedRecordCount: batch.skippedRecordCount ?? 0,
    failedRecordCount: batch.failedRecordCount ?? 0,
    rowResults: Array.isArray(batch.importResult) ? batch.importResult as ImportRowResult[] : []
  };
}

export function getImportExecutionWarnings(batch: ImportBatchForExecution) {
  const warnings = [];
  const eligibility = canExecuteImportBatch(batch);

  if (!eligibility.allowed) warnings.push(eligibility.reason);
  if (batch.templateType === "staff-members") warnings.push("Staff rows require matching Branch names to exist before execution.");
  if (batch.templateType === "chronic-patients") warnings.push("Chronic patient rows require matching Branch names, valid refill dates, and unique phone numbers.");
  if (!["branches", "staff-members", "chronic-patients"].includes(batch.templateType)) warnings.push("Only Branches, Staff Members, and Chronic Patients can be executed right now.");

  return warnings;
}

function normalizePackageType(value?: string) {
  const normalized = value?.trim().toUpperCase().replace(/\s+/g, "_").replace(/-/g, "_");
  if (normalized && Object.values(PackageType).includes(normalized as PackageType)) return normalized as PackageType;
  return PackageType.STANDARD;
}

function normalizeRiskScore(value?: string) {
  const normalized = value?.trim().toUpperCase();
  if (normalized && Object.values(RiskScore).includes(normalized as RiskScore)) return normalized as RiskScore;
  return RiskScore.MEDIUM;
}

function parseImportDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function summarizeRowResults(rowResults: ImportRowResult[]): ImportExecutionResult {
  return {
    importedRecordCount: rowResults.filter((result) => result.action === "imported").length,
    skippedRecordCount: rowResults.filter((result) => result.action === "skipped").length,
    failedRecordCount: rowResults.filter((result) => result.action === "failed").length,
    rowResults
  };
}
