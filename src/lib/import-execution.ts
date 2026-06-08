import { PackageType, PatientStatus, RiskScore, StockStatus } from "@prisma/client";
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
  recordType: "Branch" | "StaffMember" | "Patient" | "StockItem";
  name: string;
  reason: string;
  phone?: string;
  scheduleNote?: string;
  warnings?: string[];
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
  const checks = getImportExecutionEligibilityChecks(batch);
  const failed = checks.find((check) => !check.passed);
  if (failed) return { allowed: false, reason: failed.failMessage };
  return { allowed: true, reason: "This batch is approved and ready for execution." };
}

export function getImportExecutionEligibilityChecks(batch: ImportBatchForExecution) {
  const supportedTemplates = ["branches", "staff-members", "chronic-patients", "stock-items"];
  return [
    {
      label: "Approved status required",
      passed: batch.status === "APPROVED",
      detail: batch.status === "APPROVED" ? "Batch status is APPROVED." : `Current status is ${batch.status}.`,
      failMessage: "Approve this batch before execution."
    },
    {
      label: "Supported template type",
      passed: supportedTemplates.includes(batch.templateType),
      detail: supportedTemplates.includes(batch.templateType) ? `${batch.templateType} imports can be executed.` : `${batch.templateType} execution is coming soon.`,
      failMessage: "Execution for this template type is coming soon."
    },
    {
      label: "Readiness score at least 70",
      passed: batch.readinessScore >= 70,
      detail: `Readiness score is ${batch.readinessScore}%.`,
      failMessage: "This batch needs cleanup before execution."
    },
    {
      label: "Validation status not Invalid",
      passed: batch.validationStatus !== "Invalid",
      detail: `Validation status is ${batch.validationStatus}.`,
      failMessage: "This batch needs cleanup before execution."
    },
    {
      label: "Not already imported",
      passed: !batch.importedAt && batch.status !== "IMPORTED",
      detail: batch.importedAt || batch.status === "IMPORTED" ? "Batch has already been imported." : "Batch has not been imported yet.",
      failMessage: "This batch has already been imported."
    }
  ];
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
    medicationList: row.medication_list?.trim() ?? "",
    lastRefillDate: row.last_refill_date?.trim() ?? "",
    refillCycleDays: row.refill_cycle_days?.trim() ?? ""
  };
}

export function mapStockRow(row: Record<string, string>) {
  return {
    productName: row.product_name?.trim() ?? "",
    category: row.category?.trim() ?? "",
    branchName: row.branch?.trim() ?? "",
    stockLevel: row.stock_level?.trim() ?? "",
    reorderLevel: row.reorder_level?.trim() ?? "",
    expiryDate: row.expiry_date?.trim() ?? "",
    unitCost: row.unit_cost?.trim() ?? "",
    status: row.status?.trim() ?? "",
    notes: row.notes?.trim() ?? ""
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

export async function executeStockImport(tx: PrismaClient | Prisma.TransactionClient, rows: Array<Record<string, string>>): Promise<ImportExecutionResult> {
  const rowResults: ImportRowResult[] = [];

  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 2;
    const mapped = mapStockRow(row);

    if (!mapped.productName || !mapped.category || !mapped.branchName || !mapped.stockLevel || !mapped.reorderLevel) {
      rowResults.push({ rowNumber, action: "failed", recordType: "StockItem", name: mapped.productName || "Unknown stock item", reason: "product_name, category, branch, stock_level, and reorder_level are required." });
      continue;
    }

    const stockLevel = Number(mapped.stockLevel);
    const reorderLevel = Number(mapped.reorderLevel);
    if (!Number.isFinite(stockLevel) || !Number.isInteger(stockLevel) || stockLevel < 0) {
      rowResults.push({ rowNumber, action: "failed", recordType: "StockItem", name: mapped.productName, reason: "stock_level must be a valid whole number." });
      continue;
    }

    if (!Number.isFinite(reorderLevel) || !Number.isInteger(reorderLevel) || reorderLevel < 0) {
      rowResults.push({ rowNumber, action: "failed", recordType: "StockItem", name: mapped.productName, reason: "reorder_level must be a valid whole number." });
      continue;
    }

    const unitCost = mapped.unitCost ? Number(mapped.unitCost) : 0;
    if (mapped.unitCost && (!Number.isFinite(unitCost) || unitCost < 0)) {
      rowResults.push({ rowNumber, action: "failed", recordType: "StockItem", name: mapped.productName, reason: "unit_cost must be a valid positive number when provided." });
      continue;
    }

    const expiryDate = mapped.expiryDate ? parseImportDate(mapped.expiryDate) : null;
    if (mapped.expiryDate && !expiryDate) {
      rowResults.push({ rowNumber, action: "failed", recordType: "StockItem", name: mapped.productName, reason: "expiry_date must use YYYY-MM-DD when provided." });
      continue;
    }

    const branch = await tx.branch.findUnique({ where: { name: mapped.branchName } });
    if (!branch) {
      rowResults.push({ rowNumber, action: "failed", recordType: "StockItem", name: mapped.productName, reason: "Branch not found" });
      continue;
    }

    const existing = await tx.stockItem.findFirst({
      where: {
        productName: mapped.productName,
        branchId: branch.id
      }
    });

    if (existing) {
      rowResults.push({ rowNumber, action: "skipped", recordType: "StockItem", name: mapped.productName, reason: "Stock item already exists in this branch." });
      continue;
    }

    const status = normalizeStockStatus(mapped.status) ?? inferStockStatus(stockLevel, reorderLevel, expiryDate);
    const valueAtRisk = Number((stockLevel * unitCost).toFixed(2));

    try {
      await tx.stockItem.create({
        data: {
          productName: mapped.productName,
          category: mapped.category,
          branchId: branch.id,
          stockLevel,
          reorderLevel,
          status,
          expiryDate,
          suggestedAction: getStockImportSuggestedAction(status, mapped.productName, mapped.branchName),
          valueAtRisk
        }
      });
    } catch (error) {
      rowResults.push({
        rowNumber,
        action: "failed",
        recordType: "StockItem",
        name: mapped.productName,
        reason: error instanceof Error ? `Stock item could not be imported: ${error.message}` : "Stock item could not be imported."
      });
      continue;
    }

    rowResults.push({
      rowNumber,
      action: "imported",
      recordType: "StockItem",
      name: mapped.productName,
      reason: `Stock item created with ${status.replace(/_/g, " ").toLowerCase()} status.`
    });
  }

  return summarizeRowResults(rowResults);
}

export async function executeChronicPatientImport(tx: PrismaClient | Prisma.TransactionClient, rows: Array<Record<string, string>>): Promise<ImportExecutionResult> {
  const rowResults: ImportRowResult[] = [];

  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 2;
    const mapped = mapChronicPatientRow(row);

    if (!mapped.name || !mapped.phone || !mapped.branchName || !mapped.conditionCategory || !mapped.medicationList || !mapped.refillCycleDays) {
      rowResults.push({ rowNumber, action: "failed", recordType: "Patient", name: mapped.name || "Unknown patient", reason: "patient_name, phone_number, branch, condition_category, medication_list, and refill_cycle_days are required." });
      continue;
    }

    const cycleDays = Number(mapped.refillCycleDays);
    if (!Number.isFinite(cycleDays) || cycleDays <= 0) {
      rowResults.push({ rowNumber, action: "failed", recordType: "Patient", name: mapped.name, reason: "refill_cycle_days must be a valid positive number." });
      continue;
    }

    const branch = await tx.branch.findUnique({ where: { name: mapped.branchName } });
    if (!branch) {
      rowResults.push({ rowNumber, action: "failed", recordType: "Patient", name: mapped.name, phone: mapped.phone, reason: "Branch not found" });
      continue;
    }

    const schedule = deriveNextRefillDate(mapped.nextRefillDate, mapped.lastRefillDate, cycleDays);
    if (!schedule.date) {
      rowResults.push({ rowNumber, action: "failed", recordType: "Patient", name: mapped.name, reason: schedule.note });
      continue;
    }

    const lastContactedAt = mapped.lastContactedAt ? parseImportDate(mapped.lastContactedAt) : null;
    if (mapped.lastContactedAt && !lastContactedAt) {
      rowResults.push({ rowNumber, action: "failed", recordType: "Patient", name: mapped.name, reason: "last_contacted_date must use YYYY-MM-DD when provided." });
      continue;
    }

    const existing = await tx.patient.findFirst({ where: { phone: mapped.phone } });
    if (existing) {
      rowResults.push({ rowNumber, action: "skipped", recordType: "Patient", name: mapped.name, phone: mapped.phone, reason: "Patient with this phone number already exists" });
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

    try {
      await tx.patient.create({
        data: {
          name: mapped.name,
          phone: mapped.phone,
          branchId: branch.id,
          conditionCategory: mapped.conditionCategory,
          packageType: mapped.packageType,
          medicationCycle: mapped.medicationCycle,
          nextRefillDate: schedule.date,
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
    } catch (error) {
      rowResults.push({
        rowNumber,
        action: "failed",
        recordType: "Patient",
        name: mapped.name,
        phone: mapped.phone,
        scheduleNote: schedule.note,
        reason: error instanceof Error ? `Patient could not be imported: ${error.message}` : "Patient could not be imported."
      }
      );
      continue;
    }

    const warnings = mapped.assignedStaffName && !assignedStaff ? [`Assigned staff '${mapped.assignedStaffName}' was not found; patient imported without assigned staff.`] : [];
    rowResults.push({
      rowNumber,
      action: "imported",
      recordType: "Patient",
      name: mapped.name,
      phone: mapped.phone,
      scheduleNote: schedule.note,
      warnings,
      reason: `Patient and ${medicines.length || 1} medication record${(medicines.length || 1) === 1 ? "" : "s"} created.`
    });
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
  if (batch.templateType === "chronic-patients") warnings.push("Chronic patient rows require matching Branch names, numeric refill cycle days, and unique phone numbers. Missing next refill dates can be estimated during execution.");
  if (batch.templateType === "stock-items") warnings.push("Stock rows require matching Branch names plus valid stock_level, reorder_level, unit_cost, and expiry_date values when provided.");
  if (!["branches", "staff-members", "chronic-patients", "stock-items"].includes(batch.templateType)) warnings.push("Only Branches, Staff Members, Chronic Patients, and Stock Items can be executed right now.");

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

function normalizeStockStatus(value?: string) {
  const normalized = value?.trim().toUpperCase().replace(/\s+/g, "_").replace(/-/g, "_");
  if (normalized && Object.values(StockStatus).includes(normalized as StockStatus)) return normalized as StockStatus;
  return null;
}

function inferStockStatus(stockLevel: number, reorderLevel: number, expiryDate: Date | null) {
  if (stockLevel <= reorderLevel) return StockStatus.LOW_STOCK;

  if (expiryDate) {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const daysToExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / 86_400_000);
    if (daysToExpiry >= 0 && daysToExpiry <= 90) return StockStatus.NEAR_EXPIRY;
  }

  if (reorderLevel > 0 && stockLevel >= reorderLevel * 4) return StockStatus.OVERSTOCK;
  return StockStatus.HEALTHY;
}

function getStockImportSuggestedAction(status: StockStatus, productName: string, branchName: string) {
  if (status === StockStatus.LOW_STOCK) return `Reorder ${productName} for ${branchName} before patient demand is affected.`;
  if (status === StockStatus.NEAR_EXPIRY) return `Review ${productName} expiry exposure at ${branchName} and move or promote stock.`;
  if (status === StockStatus.OVERSTOCK) return `Check transfer opportunities for ${productName} from ${branchName}.`;
  if (status === StockStatus.DEAD_STOCK) return `Review slow movement and decide whether to discount, transfer, or discontinue ${productName}.`;
  return `Monitor ${productName} stock level at ${branchName}.`;
}

function parseImportDate(value: string) {
  const cleaned = cleanImportValue(value);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(cleaned);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

function cleanImportValue(value: string) {
  return value
    .replace(/^\uFEFF/, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .trim();
}

function deriveNextRefillDate(nextRefillDate: string, lastRefillDate: string, cycleDays: number) {
  if (nextRefillDate) {
    const date = parseImportDate(nextRefillDate);
    return date ? { date, note: "Used provided next refill date" } : { date: null, note: "next_refill_date must use YYYY-MM-DD." };
  }

  if (lastRefillDate) {
    const date = parseImportDate(lastRefillDate);
    if (!date) return { date: null, note: "last_refill_date must use YYYY-MM-DD." };
    date.setUTCDate(date.getUTCDate() + cycleDays);
    return { date, note: "Calculated from last refill date and cycle" };
  }

  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + cycleDays);
  return { date, note: "Estimated from today and cycle. Imported but schedule needs review" };
}

function summarizeRowResults(rowResults: ImportRowResult[]): ImportExecutionResult {
  return {
    importedRecordCount: rowResults.filter((result) => result.action === "imported").length,
    skippedRecordCount: rowResults.filter((result) => result.action === "skipped").length,
    failedRecordCount: rowResults.filter((result) => result.action === "failed").length,
    rowResults
  };
}
