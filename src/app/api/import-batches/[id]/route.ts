import { ImportBatchStatus, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentAccessUser, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function isImportBatchStatus(value: unknown): value is ImportBatchStatus {
  return typeof value === "string" && Object.values(ImportBatchStatus).includes(value as ImportBatchStatus);
}

function cleanOptionalString(value: unknown) {
  if (typeof value !== "string") return undefined;
  const cleaned = value.trim();
  return cleaned || null;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const user = await getCurrentAccessUser();
    if (!user) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
    if (!hasPermission(user, "importData")) return NextResponse.json({ error: "You do not have permission to update import batches." }, { status: 403 });
    if (!user.tenantId || user.isDemo) return NextResponse.json({ error: "Import batch updates are not available for this session." }, { status: 403 });

    const body = await request.json();
    const data: Prisma.ImportBatchUpdateInput = {};

    if ("status" in body) {
      if (!isImportBatchStatus(body.status)) {
        return NextResponse.json({ error: "Invalid import batch status." }, { status: 400 });
      }
      data.status = body.status;
      if (body.status === ImportBatchStatus.APPROVED) data.approvedAt = new Date();
      if (body.status === ImportBatchStatus.IMPORTED) data.importedAt = new Date();
    }

    if ("notes" in body) data.notes = cleanOptionalString(body.notes);

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No updates were provided." }, { status: 400 });
    }

    const existing = await prisma.importBatch.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: "Import batch was not found." }, { status: 404 });

    const batch = await prisma.importBatch.update({ where: { id: existing.id }, data });

    return NextResponse.json(batch);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Import batch was not found." }, { status: 404 });
    }

    return NextResponse.json({ error: "Import batch could not be updated." }, { status: 500 });
  }
}
