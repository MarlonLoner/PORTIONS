import { FollowUpStatus, FollowUpType, OrderSource, OrderStatus, OrderType, PackageType, PatientStatus, RiskScore, StockStatus } from "@prisma/client";
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
  recordType: "Branch" | "StaffMember" | "Patient" | "StockItem" | "Order" | "FollowUpTask";
  name: string;
  reason: string;
  phone?: string;
  scheduleNote?: string;
  taskType?: string;
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
  const supportedTemplates = ["branches", "staff-members", "chronic-patients", "stock-items", "orders", "follow-up-tasks"];
  return [
    {
      label: "Not already imported",
      passed: !batch.importedAt && batch.status !== "IMPORTED",
      detail: batch.importedAt || batch.status === "IMPORTED" ? "Batch has already been imported." : "Batch has not been imported yet.",
      failMessage: "This batch has already been imported."
    },
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

export function mapOrderRow(row: Record<string, string>) {
  return {
    customerName: row.customer_name?.trim() ?? "",
    phone: row.phone?.trim() || row.phone_number?.trim() || "+263000000000",
    source: row.source?.trim() ?? "",
    branchName: row.branch?.trim() ?? "",
    orderType: row.order_type?.trim() ?? "",
    status: row.status?.trim() ?? "",
    amount: row.amount?.trim() ?? "",
    assignedStaffName: row.assigned_staff?.trim() ?? "",
    paymentStatus: row.payment_status?.trim() || "Pending",
    fulfillmentPreference: row.fulfillment_preference?.trim() || "Collection",
    notes: row.notes?.trim() ?? "",
    items: row.items?.trim() ?? "",
    createdDate: row.created_date?.trim() || row.created_at?.trim() || ""
  };
}

export function mapFollowUpTaskRow(row: Record<string, string>) {
  return {
    customerName: row.customer_name?.trim() ?? "",
    phone: row.phone_number?.trim() || row.phone?.trim() || "",
    taskType: row.task_type?.trim() ?? "",
    branchName: row.branch?.trim() ?? "",
    dueDate: row.due_date?.trim() ?? "",
    status: row.status?.trim() ?? "",
    assignedStaffName: row.assigned_staff?.trim() ?? "",
    suggestedAction: row.suggested_action?.trim() ?? "",
    priority: row.priority?.trim() ?? "",
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

export async function executeOrderImport(tx: PrismaClient | Prisma.TransactionClient, rows: Array<Record<string, string>>): Promise<ImportExecutionResult> {
  const rowResults: ImportRowResult[] = [];

  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 2;
    const mapped = mapOrderRow(row);

    if (!mapped.customerName || !mapped.branchName || !mapped.amount) {
      rowResults.push({ rowNumber, action: "failed", recordType: "Order", name: mapped.customerName || "Unknown customer", reason: "customer_name, branch, and amount are required." });
      continue;
    }

    const amount = Number(mapped.amount);
    if (!Number.isFinite(amount) || amount < 0) {
      rowResults.push({ rowNumber, action: "failed", recordType: "Order", name: mapped.customerName, reason: "amount must be a valid positive number." });
      continue;
    }

    const createdAt = mapped.createdDate ? parseImportDate(mapped.createdDate) : new Date();
    if (mapped.createdDate && !createdAt) {
      rowResults.push({ rowNumber, action: "failed", recordType: "Order", name: mapped.customerName, reason: "created_date must use YYYY-MM-DD when provided." });
      continue;
    }
    const orderCreatedAt = createdAt ?? new Date();

    const branch = await tx.branch.findUnique({ where: { name: mapped.branchName } });
    if (!branch) {
      rowResults.push({ rowNumber, action: "failed", recordType: "Order", name: mapped.customerName, reason: "Branch not found" });
      continue;
    }

    const warnings: string[] = [];
    const source = normalizeOrderSource(mapped.source);
    if (mapped.source && !source.matched) warnings.push(`Source '${mapped.source}' was not recognized; defaulted to ${source.value}.`);

    const orderType = normalizeOrderType(mapped.orderType);
    if (mapped.orderType && !orderType.matched) warnings.push(`Order type '${mapped.orderType}' was not recognized; defaulted to ${orderType.value}.`);

    const status = normalizeOrderStatus(mapped.status);
    if (mapped.status && !status.matched) warnings.push(`Status '${mapped.status}' was not recognized; defaulted to ${status.value}.`);

    const assignedStaff = mapped.assignedStaffName
      ? await tx.staffMember.findFirst({
          where: {
            name: mapped.assignedStaffName,
            OR: [{ branchId: branch.id }, { branchId: null }]
          }
        })
      : null;
    if (mapped.assignedStaffName && !assignedStaff) warnings.push(`Assigned staff '${mapped.assignedStaffName}' was not found; order imported without assigned staff.`);

    const dayStart = new Date(orderCreatedAt);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

    const existing = await tx.order.findFirst({
      where: {
        customerName: mapped.customerName,
        branchId: branch.id,
        amount,
        createdAt: {
          gte: dayStart,
          lt: dayEnd
        }
      }
    });

    if (existing) {
      rowResults.push({ rowNumber, action: "skipped", recordType: "Order", name: mapped.customerName, reason: "Order with same customer, branch, amount, and created date already exists." });
      continue;
    }

    try {
      await tx.order.create({
        data: {
          customerName: mapped.customerName,
          phone: mapped.phone,
          source: source.value,
          branchId: branch.id,
          type: orderType.value,
          status: status.value,
          amount,
          createdAt: orderCreatedAt,
          assignedStaffId: assignedStaff?.id,
          paymentStatus: mapped.paymentStatus,
          fulfillmentPreference: mapped.fulfillmentPreference,
          internalNotes: buildOrderInternalNotes(mapped.notes, mapped.items, warnings),
          items: {
            create: parseOrderItems(mapped.items, amount)
          }
        }
      });
    } catch (error) {
      rowResults.push({
        rowNumber,
        action: "failed",
        recordType: "Order",
        name: mapped.customerName,
        reason: error instanceof Error ? `Order could not be imported: ${error.message}` : "Order could not be imported."
      });
      continue;
    }

    rowResults.push({
      rowNumber,
      action: "imported",
      recordType: "Order",
      name: mapped.customerName,
      warnings,
      reason: `Order imported with ${status.value.replace(/_/g, " ").toLowerCase()} status.`
    });
  }

  return summarizeRowResults(rowResults);
}

export async function executeFollowUpTaskImport(tx: PrismaClient | Prisma.TransactionClient, rows: Array<Record<string, string>>): Promise<ImportExecutionResult> {
  const rowResults: ImportRowResult[] = [];

  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 2;
    const mapped = mapFollowUpTaskRow(row);

    if (!mapped.customerName || !mapped.taskType || !mapped.branchName || !mapped.dueDate) {
      rowResults.push({ rowNumber, action: "failed", recordType: "FollowUpTask", name: mapped.customerName || "Unknown customer", taskType: mapped.taskType, reason: "customer_name, task_type, branch, and due_date are required." });
      continue;
    }

    const dueDate = parseImportDate(mapped.dueDate);
    if (!dueDate) {
      rowResults.push({ rowNumber, action: "failed", recordType: "FollowUpTask", name: mapped.customerName, taskType: mapped.taskType, reason: "due_date must use YYYY-MM-DD." });
      continue;
    }

    const branch = await tx.branch.findUnique({ where: { name: mapped.branchName } });
    if (!branch) {
      rowResults.push({ rowNumber, action: "failed", recordType: "FollowUpTask", name: mapped.customerName, phone: mapped.phone, taskType: mapped.taskType, reason: "Branch not found" });
      continue;
    }

    const warnings: string[] = [];
    const type = normalizeFollowUpType(mapped.taskType);
    if (mapped.taskType && !type.matched) warnings.push(`Task type '${mapped.taskType}' was not recognized; defaulted to ${type.value}.`);

    const status = normalizeFollowUpStatus(mapped.status);
    if (mapped.status && !status.matched) warnings.push(`Status '${mapped.status}' was not recognized; defaulted to ${status.value}.`);

    const patient = await findImportPatient(tx, mapped.customerName, mapped.phone);
    if (!patient) warnings.push("No matching patient found.");

    const assignedStaff = mapped.assignedStaffName
      ? await tx.staffMember.findFirst({
          where: {
            name: mapped.assignedStaffName,
            OR: [{ branchId: branch.id }, { branchId: null }]
          }
        })
      : null;
    if (mapped.assignedStaffName && !assignedStaff) warnings.push(`Assigned staff '${mapped.assignedStaffName}' was not found; task imported without assigned staff.`);

    const existing = await tx.followUpTask.findFirst({
      where: {
        type: type.value,
        branchId: branch.id,
        dueDate,
        OR: patient
          ? [{ patientId: patient.id }, { customerName: mapped.customerName }]
          : [{ customerName: mapped.customerName }]
      }
    });

    if (existing) {
      rowResults.push({ rowNumber, action: "skipped", recordType: "FollowUpTask", name: mapped.customerName, phone: mapped.phone, taskType: type.value, reason: "Follow-up task with same patient/customer, task type, branch, and due date already exists." });
      continue;
    }

    const suggestedAction = mapped.suggestedAction || getDefaultFollowUpAction(type.value, mapped.customerName);
    const suggestedMessage = buildFollowUpSuggestedMessage(mapped.customerName, type.value, mapped.notes, mapped.priority);

    try {
      await tx.followUpTask.create({
        data: {
          patientId: patient?.id,
          customerName: patient?.name ?? mapped.customerName,
          type: type.value,
          status: status.value,
          reason: buildFollowUpReason(type.value, mapped.notes, mapped.priority),
          branchId: branch.id,
          dueDate,
          suggestedAction,
          suggestedMessage,
          assignedStaffId: assignedStaff?.id
        }
      });
    } catch (error) {
      rowResults.push({
        rowNumber,
        action: "failed",
        recordType: "FollowUpTask",
        name: mapped.customerName,
        phone: mapped.phone,
        taskType: type.value,
        reason: error instanceof Error ? `Follow-up task could not be imported: ${error.message}` : "Follow-up task could not be imported."
      });
      continue;
    }

    rowResults.push({
      rowNumber,
      action: "imported",
      recordType: "FollowUpTask",
      name: patient?.name ?? mapped.customerName,
      phone: mapped.phone || patient?.phone,
      taskType: type.value,
      warnings,
      reason: `Follow-up task imported as ${type.value.replace(/_/g, " ").toLowerCase()}.`
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
  if (batch.templateType === "orders") warnings.push("Order rows require matching Branch names and valid amount values. Unknown source, type, status, or staff values will default safely with row warnings.");
  if (batch.templateType === "follow-up-tasks") warnings.push("Follow-up task rows require matching Branch names and valid due_date values. Unknown type, status, patient, or staff values will default or import with row warnings where safe.");
  if (!["branches", "staff-members", "chronic-patients", "stock-items", "orders", "follow-up-tasks"].includes(batch.templateType)) warnings.push("Only Branches, Staff Members, Chronic Patients, Stock Items, Orders, and Follow-Up Tasks can be executed right now.");

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

function normalizeOrderSource(value?: string): { value: OrderSource; matched: boolean } {
  const normalized = value?.trim().toUpperCase().replace(/\s+/g, "_").replace(/-/g, "_");
  if (normalized && Object.values(OrderSource).includes(normalized as OrderSource)) return { value: normalized as OrderSource, matched: true };
  return { value: OrderSource.WEBSITE, matched: !normalized };
}

function normalizeOrderType(value?: string): { value: OrderType; matched: boolean } {
  const normalized = value?.trim().toUpperCase().replace(/\s+/g, "_").replace(/-/g, "_");
  if (normalized && Object.values(OrderType).includes(normalized as OrderType)) return { value: normalized as OrderType, matched: true };
  return { value: OrderType.PRESCRIPTION, matched: !normalized };
}

function normalizeOrderStatus(value?: string): { value: OrderStatus; matched: boolean } {
  const normalized = value?.trim().toUpperCase().replace(/\s+/g, "_").replace(/-/g, "_");
  if (normalized && Object.values(OrderStatus).includes(normalized as OrderStatus)) return { value: normalized as OrderStatus, matched: true };
  return { value: OrderStatus.NEW, matched: !normalized };
}

function parseOrderItems(items: string, amount: number) {
  if (!items.trim()) {
    return [{
      productName: "Imported order item",
      category: "Imported",
      quantity: 1,
      unitPrice: amount
    }];
  }

  return items
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const quantityMatch = /\bx\s*(\d+)\b/i.exec(item) ?? /\bqty\s*:?\s*(\d+)\b/i.exec(item);
      const priceMatch = /@\s*(\d+(?:\.\d{1,2})?)/.exec(item);
      const quantity = quantityMatch ? Math.max(1, Number(quantityMatch[1])) : 1;
      const unitPrice = priceMatch ? Number(priceMatch[1]) : amount;
      const productName = item
        .replace(/\bx\s*\d+\b/gi, "")
        .replace(/\bqty\s*:?\s*\d+\b/gi, "")
        .replace(/@\s*\d+(?:\.\d{1,2})?/g, "")
        .trim() || "Imported order item";

      return {
        productName,
        category: "Imported",
        quantity,
        unitPrice: Number.isFinite(unitPrice) ? unitPrice : amount
      };
    });
}

function buildOrderInternalNotes(notes: string, items: string, warnings: string[]) {
  const parts = [];
  if (notes) parts.push(notes);
  if (items) parts.push(`Imported items: ${items}`);
  if (warnings.length > 0) parts.push(`Import warnings: ${warnings.join(" ")}`);
  return parts.join("\n") || null;
}

function normalizeFollowUpType(value?: string): { value: FollowUpType; matched: boolean } {
  const normalized = value?.trim().toUpperCase().replace(/\s+/g, "_").replace(/-/g, "_");
  if (normalized && Object.values(FollowUpType).includes(normalized as FollowUpType)) return { value: normalized as FollowUpType, matched: true };
  return { value: FollowUpType.DUE_TODAY, matched: !normalized };
}

function normalizeFollowUpStatus(value?: string): { value: FollowUpStatus; matched: boolean } {
  const normalized = value?.trim().toUpperCase().replace(/\s+/g, "_").replace(/-/g, "_");
  if (normalized && Object.values(FollowUpStatus).includes(normalized as FollowUpStatus)) return { value: normalized as FollowUpStatus, matched: true };
  return { value: FollowUpStatus.PENDING, matched: !normalized };
}

async function findImportPatient(tx: PrismaClient | Prisma.TransactionClient, customerName: string, phone: string) {
  if (phone) {
    const patient = await tx.patient.findFirst({ where: { phone } });
    if (patient) return patient;
  }

  const matches = await tx.patient.findMany({
    where: { name: customerName },
    take: 2
  });

  return matches.length === 1 ? matches[0] : null;
}

function getDefaultFollowUpAction(type: FollowUpType, customerName: string) {
  if (type === FollowUpType.OVERDUE) return `Call ${customerName} and recover the overdue refill before marking the patient at risk.`;
  if (type === FollowUpType.PRESCRIPTION_RENEWAL_NEEDED) return `Request updated prescription details from ${customerName} and route to pharmacist review.`;
  if (type === FollowUpType.PAYMENT_PENDING) return `Send a payment reminder to ${customerName} and confirm proof of payment.`;
  if (type === FollowUpType.DELIVERY_CONFIRMATION) return `Confirm delivery or collection completion with ${customerName}.`;
  if (type === FollowUpType.LOST_PATIENT_REVIVAL) return `Contact ${customerName} with a revival message and offer delivery or branch collection.`;
  return `Contact ${customerName} today and confirm the next refill or support action.`;
}

function buildFollowUpReason(type: FollowUpType, notes: string, priority: string) {
  const parts = [type.replace(/_/g, " ").toLowerCase()];
  if (priority) parts.push(`Priority: ${priority}`);
  if (notes) parts.push(notes);
  return parts.join(" | ");
}

function buildFollowUpSuggestedMessage(customerName: string, type: FollowUpType, notes: string, priority: string) {
  const firstName = customerName.split(" ")[0] || customerName;
  const context = [priority ? `Priority: ${priority}.` : "", notes].filter(Boolean).join(" ");

  if (type === FollowUpType.OVERDUE) return `Hi ${firstName}, this is PORTIONS Pharmacy following up on your overdue refill. We can prepare it for branch collection or delivery today. ${context}`.trim();
  if (type === FollowUpType.PRESCRIPTION_RENEWAL_NEEDED) return `Hi ${firstName}, your prescription may need renewal before we prepare your next medicine pack. Please send the latest prescription or let us help you arrange review. ${context}`.trim();
  if (type === FollowUpType.PAYMENT_PENDING) return `Hi ${firstName}, your pharmacy order is ready for payment confirmation. Please send proof of payment so we can continue processing. ${context}`.trim();
  if (type === FollowUpType.DELIVERY_CONFIRMATION) return `Hi ${firstName}, please confirm if your delivery or collection was completed successfully. ${context}`.trim();
  if (type === FollowUpType.LOST_PATIENT_REVIVAL) return `Hi ${firstName}, we have not heard from you in a while and would like to help restart your refill support. We can arrange delivery or branch collection. ${context}`.trim();
  return `Hi ${firstName}, this is PORTIONS Pharmacy reminding you about your refill/support follow-up due today. ${context}`.trim();
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
