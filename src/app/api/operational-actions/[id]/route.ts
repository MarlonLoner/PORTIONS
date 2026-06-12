import {
  OperationalActionOutcome,
  OperationalActionPriority,
  OperationalActionStatus,
  Prisma
} from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanOptionalString(value: unknown) {
  if (value === null || value === undefined) return null;
  const cleaned = cleanString(value);
  if (cleaned.toLowerCase() === "none") return null;
  return cleaned || null;
}

function isStatus(value: unknown): value is OperationalActionStatus {
  return typeof value === "string" && Object.values(OperationalActionStatus).includes(value as OperationalActionStatus);
}

function isPriority(value: unknown): value is OperationalActionPriority {
  return typeof value === "string" && Object.values(OperationalActionPriority).includes(value as OperationalActionPriority);
}

function isOutcome(value: unknown): value is OperationalActionOutcome {
  return typeof value === "string" && Object.values(OperationalActionOutcome).includes(value as OperationalActionOutcome);
}

function parseOptionalDate(value: unknown) {
  const cleaned = cleanString(value);
  if (!cleaned) return null;
  const date = new Date(cleaned);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function parseValueAmount(value: unknown) {
  const cleaned = cleanString(value);
  if (!cleaned) return undefined;
  const numeric = Number(cleaned);
  if (!Number.isFinite(numeric) || numeric < 0) return null;
  return new Prisma.Decimal(numeric);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const existing = await prisma.operationalAction.findUnique({
      where: { id },
      include: { assignedStaff: true }
    });
    if (!existing) return NextResponse.json({ error: "Operational action was not found." }, { status: 404 });

    const body = await request.json();
    const data: Prisma.OperationalActionUpdateInput = {};
    const activities: Prisma.OperationalActionActivityCreateWithoutActionInput[] = [];

    if ("assignedStaffId" in body) {
      const assignedStaffId = cleanOptionalString(body.assignedStaffId);
      if (assignedStaffId === existing.assignedStaffId) {
        // No assignment change; avoid duplicate audit entries.
      } else if (assignedStaffId) {
        const staff = await prisma.staffMember.findUnique({ where: { id: assignedStaffId } });
        if (!staff) return NextResponse.json({ error: "Selected staff member was not found." }, { status: 400 });
        if (existing.branchId && staff.branchId && staff.branchId !== existing.branchId) {
          return NextResponse.json({ error: "Assigned staff member belongs to another branch." }, { status: 400 });
        }
        data.assignedStaff = { connect: { id: assignedStaffId } };
        const description = existing.assignedStaff
          ? `Reassigned from ${existing.assignedStaff.name} to ${staff.name}.`
          : `Assigned to ${staff.name}.`;
        activities.push({ activityType: "ASSIGNMENT_CHANGED", description, actorName: "PORTIONS" });
      } else {
        data.assignedStaff = { disconnect: true };
        if (existing.assignedStaffId) {
          activities.push({ activityType: "ASSIGNMENT_CHANGED", description: "Assignment cleared.", actorName: "PORTIONS" });
        }
      }
    }

    if ("priority" in body) {
      if (!isPriority(body.priority)) return NextResponse.json({ error: "Invalid action priority." }, { status: 400 });
      if (body.priority !== existing.priority) {
        data.priority = body.priority;
        activities.push({ activityType: "PRIORITY_CHANGED", description: `Priority changed to ${body.priority}.`, actorName: "PORTIONS" });
      }
    }

    if ("dueDate" in body) {
      const dueDate = parseOptionalDate(body.dueDate);
      if (dueDate === undefined) return NextResponse.json({ error: "Due date is not valid." }, { status: 400 });
      const existingDate = existing.dueDate?.toISOString().slice(0, 10) ?? "";
      const nextDate = dueDate?.toISOString().slice(0, 10) ?? "";
      if (existingDate !== nextDate) {
        data.dueDate = dueDate;
        activities.push({ activityType: "DUE_DATE_CHANGED", description: dueDate ? `Due date changed to ${dueDate.toISOString().slice(0, 10)}.` : "Due date cleared.", actorName: "PORTIONS" });
      }
    }

    if ("status" in body) {
      if (!isStatus(body.status)) return NextResponse.json({ error: "Invalid action status." }, { status: 400 });
      if (existing.status !== body.status && existing.status === OperationalActionStatus.COMPLETED && body.status === OperationalActionStatus.COMPLETED) {
        return NextResponse.json({ error: "Completed actions cannot be completed twice." }, { status: 400 });
      }

      if (existing.status !== body.status) {
        data.status = body.status;
        activities.push({ activityType: "STATUS_CHANGED", description: `Status changed to ${body.status}.`, actorName: "PORTIONS" });
      }
      if (existing.status !== OperationalActionStatus.COMPLETED && body.status === OperationalActionStatus.COMPLETED) {
        data.completedAt = body.completedAt ? parseOptionalDate(body.completedAt) ?? new Date() : new Date();
        if ("outcomeType" in body) {
          if (!isOutcome(body.outcomeType)) return NextResponse.json({ error: "Invalid outcome type." }, { status: 400 });
          data.outcomeType = body.outcomeType;
        }
        data.outcomeNotes = cleanOptionalString(body.outcomeNotes);
      }
    }

    if ("outcomeType" in body && !("status" in body)) {
      if (body.outcomeType && !isOutcome(body.outcomeType)) return NextResponse.json({ error: "Invalid outcome type." }, { status: 400 });
      const nextOutcome = body.outcomeType || null;
      if (nextOutcome !== existing.outcomeType) {
        data.outcomeType = nextOutcome;
        activities.push({ activityType: "OUTCOME_RECORDED", description: `Outcome recorded as ${body.outcomeType || "none"}.`, actorName: "PORTIONS" });
      }
    }

    if ("outcomeNotes" in body && !("status" in body)) {
      const outcomeNotes = cleanOptionalString(body.outcomeNotes);
      if (outcomeNotes !== existing.outcomeNotes) {
        data.outcomeNotes = outcomeNotes;
        activities.push({ activityType: "OUTCOME_RECORDED", description: "Outcome notes updated.", actorName: "PORTIONS" });
      }
    }

    if ("valueAmount" in body) {
      const valueAmount = parseValueAmount(body.valueAmount);
      if (valueAmount === null) return NextResponse.json({ error: "Value amount must be a non-negative number." }, { status: 400 });
      if (valueAmount !== undefined && !valueAmount.equals(existing.valueAmount)) {
        data.valueAmount = valueAmount;
        activities.push({ activityType: "VALUE_RECORDED", description: `Value recorded as ${valueAmount.toFixed(2)}.`, actorName: "PORTIONS" });
      }
    }

    if (Object.keys(data).length === 0) {
      const current = await prisma.operationalAction.findUnique({
        where: { id },
        include: { branch: true, assignedStaff: true, activities: { orderBy: { createdAt: "desc" } } }
      });
      return NextResponse.json(current);
    }

    const updated = await prisma.operationalAction.update({
      where: { id },
      data: {
        ...data,
        activities: activities.length ? { create: activities } : undefined
      },
      include: { branch: true, assignedStaff: true, activities: { orderBy: { createdAt: "desc" } } }
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Operational action was not found." }, { status: 404 });
    }

    return NextResponse.json({ error: "Operational action could not be updated." }, { status: 500 });
  }
}
