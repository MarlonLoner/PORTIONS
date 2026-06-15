import { ImportBatchStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentAccessUser, hasPermission } from "@/lib/auth";
import {
  canExecuteImportBatch,
  executeBranchImport,
  executeChronicPatientImport,
  executeFollowUpTaskImport,
  executeOrderImport,
  executeStockImport,
  executeStaffImport,
  getStoredRows
} from "@/lib/import-execution";
import { prisma } from "@/lib/prisma";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const user = await getCurrentAccessUser();
    if (!user) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
    if (!hasPermission(user, "importData")) return NextResponse.json({ error: "You do not have permission to execute import batches." }, { status: 403 });
    if (!user.tenantId || user.isDemo) return NextResponse.json({ error: "Import execution is not available for this session." }, { status: 403 });

    const batch = await prisma.importBatch.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!batch) {
      return NextResponse.json({ error: "Import batch was not found." }, { status: 404 });
    }

    const eligibility = canExecuteImportBatch(batch);
    if (!eligibility.allowed) {
      return NextResponse.json({ error: eligibility.reason }, { status: 400 });
    }

    const rows = getStoredRows(batch);
    if (rows.length === 0) {
      return NextResponse.json({ error: "This batch has no stored rows to execute." }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      if (batch.templateType === "branches") {
        return executeBranchImport(tx, rows, user.tenantId!);
      }

      if (batch.templateType === "chronic-patients") {
        return executeChronicPatientImport(tx, rows, user.tenantId!);
      }

      if (batch.templateType === "stock-items") {
        return executeStockImport(tx, rows, user.tenantId!);
      }

      if (batch.templateType === "orders") {
        return executeOrderImport(tx, rows, user.tenantId!);
      }

      if (batch.templateType === "follow-up-tasks") {
        return executeFollowUpTaskImport(tx, rows, user.tenantId!);
      }

      return executeStaffImport(tx, rows, user.tenantId!);
    });

    const updated = await prisma.importBatch.update({
      where: { id },
      data: {
        status: ImportBatchStatus.IMPORTED,
        importedAt: new Date(),
        importedRecordCount: result.importedRecordCount,
        skippedRecordCount: result.skippedRecordCount,
        failedRecordCount: result.failedRecordCount,
        importResult: result.rowResults,
        executionNotes: `Executed ${batch.templateType} import with ${result.importedRecordCount} imported, ${result.skippedRecordCount} skipped, and ${result.failedRecordCount} failed rows.`
      }
    });

    return NextResponse.json({
      importedRecordCount: result.importedRecordCount,
      skippedRecordCount: result.skippedRecordCount,
      failedRecordCount: result.failedRecordCount,
      rowResults: result.rowResults,
      batch: updated
    });
  } catch (error) {
    console.error("Import batch execution failed", { batchId: id, message: error instanceof Error ? error.message : "Unknown error" });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Import execution failed." }, { status: 500 });
  }
}
