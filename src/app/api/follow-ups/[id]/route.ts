import { FollowUpOutcomeType, FollowUpStatus, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { resolveNotificationsForSource } from "@/lib/notifications";
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

function isStatus(value: unknown): value is FollowUpStatus {
  return typeof value === "string" && Object.values(FollowUpStatus).includes(value as FollowUpStatus);
}

function isOutcome(value: unknown): value is FollowUpOutcomeType {
  return typeof value === "string" && Object.values(FollowUpOutcomeType).includes(value as FollowUpOutcomeType);
}

function parseOptionalDate(value: unknown) {
  const cleaned = cleanString(value);
  if (!cleaned) return null;
  const date = new Date(cleaned);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function parseOptionalMoney(value: unknown) {
  const cleaned = cleanString(value);
  if (!cleaned) return undefined;
  const numeric = Number(cleaned);
  if (!Number.isFinite(numeric) || numeric < 0) return null;
  return new Prisma.Decimal(numeric);
}

function sameDate(a?: Date | null, b?: Date | null) {
  return (a?.toISOString() ?? "") === (b?.toISOString() ?? "");
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const existing = await prisma.followUpTask.findUnique({
      where: { id },
      include: { assignedStaff: true, patient: true, branch: true }
    });
    if (!existing) return NextResponse.json({ error: "Follow-up task was not found." }, { status: 404 });

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid follow-up update request." }, { status: 400 });
    }
    const data: Prisma.FollowUpTaskUpdateInput = {};
    const activities: Prisma.FollowUpTaskActivityCreateWithoutFollowUpTaskInput[] = [];
    const now = new Date();

    if ("assignedStaffId" in body) {
      const assignedStaffId = cleanOptionalString(body.assignedStaffId);
      if (assignedStaffId !== existing.assignedStaffId) {
        if (assignedStaffId) {
          const staff = await prisma.staffMember.findUnique({ where: { id: assignedStaffId } });
          if (!staff) return NextResponse.json({ error: "Recommended staff member is no longer available for this branch." }, { status: 400 });
          if (staff.branchId !== existing.branchId) {
            return NextResponse.json({ error: "Recommended staff member is no longer available for this branch." }, { status: 400 });
          }
          data.assignedStaff = { connect: { id: assignedStaffId } };
          activities.push({
            activityType: existing.assignedStaffId ? "REASSIGNED" : "ASSIGNED",
            description: existing.assignedStaff ? `Reassigned from ${existing.assignedStaff.name} to ${staff.name}.` : `Assigned to ${staff.name}.`,
            actorName: "PORTIONS"
          });
        } else {
          data.assignedStaff = { disconnect: true };
          if (existing.assignedStaffId) activities.push({ activityType: "ASSIGNMENT_CLEARED", description: "Assignment cleared.", actorName: "PORTIONS" });
        }
      }
    }

    if ("dueDate" in body) {
      const dueDate = parseOptionalDate(body.dueDate);
      if (dueDate === undefined || !dueDate) return NextResponse.json({ error: "Due date is not valid." }, { status: 400 });
      if (!sameDate(existing.dueDate, dueDate)) {
        data.dueDate = dueDate;
        activities.push({ activityType: "DUE_DATE_CHANGED", description: `Due date changed to ${dueDate.toISOString().slice(0, 10)}.`, actorName: "PORTIONS" });
      }
    }

    if ("snoozedUntil" in body) {
      const snoozedUntil = parseOptionalDate(body.snoozedUntil);
      if (snoozedUntil === undefined) return NextResponse.json({ error: "Snooze date is not valid." }, { status: 400 });
      if (!sameDate(existing.snoozedUntil, snoozedUntil)) {
        data.snoozedUntil = snoozedUntil;
        if (snoozedUntil) activities.push({ activityType: "SNOOZED", description: `Snoozed until ${snoozedUntil.toISOString().slice(0, 10)}.`, actorName: "PORTIONS" });
      }
    }

    if ("outcomeType" in body) {
      if (body.outcomeType && !isOutcome(body.outcomeType)) return NextResponse.json({ error: "Invalid follow-up outcome." }, { status: 400 });
      const outcomeType = body.outcomeType || null;
      if (outcomeType !== existing.outcomeType) {
        data.outcomeType = outcomeType;
        activities.push({ activityType: "OUTCOME_RECORDED", description: `Outcome recorded as ${outcomeType ?? "none"}.`, actorName: "PORTIONS" });
      }
    }

    if ("outcomeNotes" in body) {
      const outcomeNotes = cleanOptionalString(body.outcomeNotes);
      if (outcomeNotes !== existing.outcomeNotes) {
        data.outcomeNotes = outcomeNotes;
        activities.push({ activityType: "NOTES_UPDATED", description: "Outcome notes updated.", actorName: "PORTIONS" });
      }
    }

    if ("valueAmount" in body) {
      const valueAmount = parseOptionalMoney(body.valueAmount);
      if (valueAmount === null) return NextResponse.json({ error: "Value amount must be a non-negative number." }, { status: 400 });
      if (valueAmount !== undefined && !valueAmount.equals(existing.valueAmount)) {
        data.valueAmount = valueAmount;
        activities.push({ activityType: "VALUE_RECORDED", description: `Value recorded as ${valueAmount.toFixed(2)}.`, actorName: "PORTIONS" });
      }
    }

    if ("status" in body) {
      if (!isStatus(body.status)) return NextResponse.json({ error: "Invalid follow-up status." }, { status: 400 });
      if (existing.status === FollowUpStatus.DONE && body.status === FollowUpStatus.DONE) {
        return NextResponse.json({ error: "Completed follow-ups cannot be completed twice." }, { status: 400 });
      }
      if (body.status === FollowUpStatus.DONE && !body.outcomeType && !existing.outcomeType) {
        return NextResponse.json({ error: "Select an outcome before completing this follow-up." }, { status: 400 });
      }

      if (existing.status !== body.status) {
        data.status = body.status;
        activities.push({ activityType: "STATUS_CHANGED", description: `Status changed to ${body.status}.`, actorName: "PORTIONS" });
      }
      if (existing.status !== FollowUpStatus.IN_PROGRESS && body.status === FollowUpStatus.IN_PROGRESS) data.startedAt = existing.startedAt ?? now;
      if (body.status === FollowUpStatus.SNOOZED) {
        const snoozedUntil = parseOptionalDate(body.snoozedUntil);
        data.snoozedUntil = snoozedUntil === undefined ? existing.snoozedUntil : snoozedUntil;
      }
      if (body.status === FollowUpStatus.DONE) {
        data.completedAt = existing.completedAt ?? now;
        data.lastContactedAt = now;
        data.snoozedUntil = null;
      }
      if (body.status === FollowUpStatus.PENDING && existing.status === FollowUpStatus.DONE) {
        data.completedAt = null;
        activities.push({ activityType: "REOPENED", description: "Follow-up reopened for more work.", actorName: "PORTIONS" });
      }
    }

    if (Object.keys(data).length === 0) {
      const current = await prisma.followUpTask.findUnique({
        where: { id },
        include: {
          patient: { include: { assignedStaff: true, refillEvents: true } },
          branch: true,
          assignedStaff: true,
          activities: { orderBy: { createdAt: "desc" } }
        }
      });
      return NextResponse.json(current);
    }

    const updated = await prisma.$transaction(async (tx) => tx.followUpTask.update({
      where: { id },
      data: {
        ...data,
        activities: activities.length ? { create: activities } : undefined
      },
      include: {
        patient: { include: { assignedStaff: true, refillEvents: true } },
        branch: true,
        assignedStaff: true,
        activities: { orderBy: { createdAt: "desc" } }
      }
    }));

    if (updated.status === FollowUpStatus.DONE || updated.status === FollowUpStatus.CANCELLED || updated.status === FollowUpStatus.SNOOZED) {
      await resolveNotificationsForSource({ sourceType: "FOLLOW_UP_TASK", sourceId: updated.id }).catch(() => 0);
    }

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Follow-up task was not found." }, { status: 404 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2021" || error.code === "P2022" || error.code === "P2010")) {
      return NextResponse.json({
        error: "Follow-up execution persistence is not available in this database yet. Run npx prisma migrate deploy for migration 20260613090000_add_follow_up_execution."
      }, { status: 500 });
    }

    return NextResponse.json({ error: "Follow-up task could not be updated." }, { status: 500 });
  }
}
