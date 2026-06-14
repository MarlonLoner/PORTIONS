import { PilotRequestStatus, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentAccessUser, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function cleanOptionalString(value: unknown) {
  if (typeof value !== "string") return undefined;
  const cleaned = value.trim();
  return cleaned || null;
}

function isPilotRequestStatus(value: unknown): value is PilotRequestStatus {
  return typeof value === "string" && Object.values(PilotRequestStatus).includes(value as PilotRequestStatus);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const user = await getCurrentAccessUser();
    if (!user) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
    if (!hasPermission(user, "managePilot")) return NextResponse.json({ error: "You do not have permission to manage pilot requests." }, { status: 403 });

    const body = await request.json();
    const data: Prisma.PilotRequestUpdateInput = {};

    if ("status" in body) {
      if (!isPilotRequestStatus(body.status)) {
        return NextResponse.json({ error: "Invalid pilot request status." }, { status: 400 });
      }

      const now = new Date();
      data.status = body.status;
      if (body.status === PilotRequestStatus.CONTACTED) data.contactedAt = now;
      if (body.status === PilotRequestStatus.QUALIFIED) data.qualifiedAt = now;
      if (body.status === PilotRequestStatus.CLOSED) data.closedAt = now;
    }

    if ("internalNotes" in body) data.internalNotes = cleanOptionalString(body.internalNotes);
    if ("nextAction" in body) data.nextAction = cleanOptionalString(body.nextAction);

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No updates were provided." }, { status: 400 });
    }

    const updated = await prisma.pilotRequest.update({
      where: { id },
      data
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Pilot request was not found." }, { status: 404 });
    }

    return NextResponse.json({ error: "Pilot request could not be updated." }, { status: 500 });
  }
}
