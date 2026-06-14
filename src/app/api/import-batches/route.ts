import { ImportBatchStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentAccessUser, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean) : [];
}

function numberValue(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : 0;
}

function initialStatus(validationStatus: string, readinessScore: number, missingFields: string[], issueCount: number) {
  if (validationStatus === "Ready" && readinessScore >= 85 && missingFields.length === 0 && issueCount === 0) return ImportBatchStatus.READY;
  if (validationStatus === "Invalid" || missingFields.length > 0 || issueCount > 0) return ImportBatchStatus.NEEDS_CLEANUP;
  return ImportBatchStatus.DRAFT;
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentAccessUser();
    if (!user) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
    if (!hasPermission(user, "importData")) return NextResponse.json({ error: "You do not have permission to save import batches." }, { status: 403 });

    const body = await request.json();
    const templateType = cleanString(body.templateType);
    const fileName = cleanString(body.fileName);
    const validationStatus = cleanString(body.validationStatus);
    const missingFields = cleanStringArray(body.missingFields);
    const issueCount = numberValue(body.issueCount);
    const readinessScore = numberValue(body.readinessScore);

    if (!templateType || !fileName || !validationStatus) {
      return NextResponse.json({ error: "Template type, file name, and validation status are required." }, { status: 400 });
    }

    const batch = await prisma.importBatch.create({
      data: {
        templateType,
        fileName,
        rowCount: numberValue(body.rowCount),
        readinessScore,
        validationStatus,
        missingFields,
        extraFields: cleanStringArray(body.extraFields),
        optionalFieldsDetected: cleanStringArray(body.optionalFieldsDetected),
        issueCount,
        dateWarningCount: numberValue(body.dateWarningCount),
        numericWarningCount: numberValue(body.numericWarningCount),
        duplicateWarningCount: numberValue(body.duplicateWarningCount),
        branchWarningCount: numberValue(body.branchWarningCount),
        rows: Array.isArray(body.rows) ? body.rows : undefined,
        previewRows: Array.isArray(body.previewRows) ? body.previewRows : undefined,
        rowIssues: Array.isArray(body.rowIssues) ? body.rowIssues : undefined,
        status: initialStatus(validationStatus, readinessScore, missingFields, issueCount),
        notes: cleanString(body.notes) || null
      }
    });

    return NextResponse.json(batch, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Import batch could not be saved." }, { status: 500 });
  }
}
