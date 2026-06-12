import {
  OperationalActionCategory,
  OperationalActionPriority,
  Prisma
} from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanOptionalString(value: unknown) {
  const cleaned = cleanString(value);
  return cleaned || null;
}

function isCategory(value: unknown): value is OperationalActionCategory {
  return typeof value === "string" && Object.values(OperationalActionCategory).includes(value as OperationalActionCategory);
}

function isPriority(value: unknown): value is OperationalActionPriority {
  return typeof value === "string" && Object.values(OperationalActionPriority).includes(value as OperationalActionPriority);
}

function parseOptionalDate(value: unknown) {
  const cleaned = cleanString(value);
  if (!cleaned) return null;
  const date = new Date(cleaned);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function parseValueAmount(value: unknown) {
  const cleaned = cleanString(value);
  if (!cleaned) return new Prisma.Decimal(0);
  const numeric = Number(cleaned);
  if (!Number.isFinite(numeric) || numeric < 0) return null;
  return new Prisma.Decimal(numeric);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const title = cleanString(body.title);
    const description = cleanString(body.description);
    const sourceType = cleanString(body.sourceType) || "MANUAL";
    const dueDate = parseOptionalDate(body.dueDate);
    const valueAmount = parseValueAmount(body.valueAmount);

    if (!title || !description) {
      return NextResponse.json({ error: "Title and description are required." }, { status: 400 });
    }

    if (!isCategory(body.category)) {
      return NextResponse.json({ error: "Invalid action category." }, { status: 400 });
    }

    if (!isPriority(body.priority)) {
      return NextResponse.json({ error: "Invalid action priority." }, { status: 400 });
    }

    if (dueDate === undefined) {
      return NextResponse.json({ error: "Due date is not valid." }, { status: 400 });
    }

    if (!valueAmount) {
      return NextResponse.json({ error: "Estimated value must be a non-negative number." }, { status: 400 });
    }

    const branchId = cleanOptionalString(body.branchId);
    const assignedStaffId = cleanOptionalString(body.assignedStaffId);

    if (branchId) {
      const branch = await prisma.branch.findUnique({ where: { id: branchId } });
      if (!branch) return NextResponse.json({ error: "Selected branch was not found." }, { status: 400 });
    }

    if (assignedStaffId) {
      const staff = await prisma.staffMember.findUnique({ where: { id: assignedStaffId } });
      if (!staff) return NextResponse.json({ error: "Selected staff member was not found." }, { status: 400 });
      if (branchId && staff.branchId && staff.branchId !== branchId) {
        return NextResponse.json({ error: "Assigned staff member belongs to another branch." }, { status: 400 });
      }
    }

    const action = await prisma.operationalAction.create({
      data: {
        title,
        description,
        category: body.category,
        priority: body.priority,
        sourceType,
        sourceId: cleanOptionalString(body.sourceId),
        branchId,
        assignedStaffId,
        dueDate,
        valueAmount,
        activities: {
          create: {
            activityType: "CREATED",
            description: "Action created in Execution & Accountability Center.",
            actorName: "PORTIONS"
          }
        }
      },
      include: { branch: true, assignedStaff: true, activities: { orderBy: { createdAt: "desc" } } }
    });

    return NextResponse.json(action, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Operational action could not be created." }, { status: 500 });
  }
}
