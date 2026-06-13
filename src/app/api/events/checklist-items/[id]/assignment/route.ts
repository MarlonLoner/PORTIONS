import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { assignEventChecklistItem } from "@/lib/events";

function cleanAssignedStaffId(value: unknown) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return undefined;
  const cleaned = value.trim();
  if (!cleaned || cleaned.toLowerCase() === "none" || cleaned.toLowerCase() === "unassigned") return null;
  return cleaned;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || !("eventId" in body)) {
      return NextResponse.json({ error: "Invalid checklist assignment request." }, { status: 400 });
    }

    const assignedStaffId = cleanAssignedStaffId((body as Record<string, unknown>).assignedStaffId);
    if (assignedStaffId === undefined) {
      return NextResponse.json({ error: "Assigned staff member is not valid." }, { status: 400 });
    }

    const eventId = typeof (body as Record<string, unknown>).eventId === "string" ? String((body as Record<string, unknown>).eventId).trim() : "";
    if (!eventId) return NextResponse.json({ error: "Event was not provided." }, { status: 400 });

    const updated = await assignEventChecklistItem(id, eventId, assignedStaffId);
    if (!updated) return NextResponse.json({ error: "Checklist item was not found." }, { status: 404 });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Checklist item was not found." }, { status: 404 });
    }

    const message = error instanceof Error ? error.message : "Checklist assignment could not be updated.";
    if (
      message === "Checklist item was not found." ||
      message === "Checklist item does not belong to this event." ||
      message === "Selected staff member was not found." ||
      message === "Assigned staff member belongs to another branch."
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ error: "Checklist assignment could not be updated." }, { status: 500 });
  }
}
