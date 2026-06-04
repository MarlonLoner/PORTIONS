import { PilotRequestStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const pharmacyName = cleanString(body.pharmacyName);
    const contactName = cleanString(body.contactName);
    const whatsappNumber = cleanString(body.whatsappNumber);
    const email = cleanString(body.email);
    const branchCount = Number(body.branchCount);
    const currentSystem = cleanString(body.currentSystem);
    const mainPain = cleanString(body.mainPain);
    const urgency = cleanString(body.urgency);
    const notes = cleanString(body.notes);

    if (!pharmacyName || !contactName || !whatsappNumber || !Number.isFinite(branchCount) || branchCount < 1 || !currentSystem || !mainPain || !urgency) {
      return NextResponse.json({ error: "Please complete all required pilot request fields." }, { status: 400 });
    }

    const pilotRequest = await prisma.pilotRequest.create({
      data: {
        pharmacyName,
        contactName,
        whatsappNumber,
        email: email || null,
        branchCount: Math.round(branchCount),
        currentSystem,
        mainPain,
        urgency,
        notes: notes || null,
        status: PilotRequestStatus.NEW
      }
    });

    return NextResponse.json({ id: pilotRequest.id, status: pilotRequest.status }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Pilot request could not be submitted. Please try again." }, { status: 500 });
  }
}
