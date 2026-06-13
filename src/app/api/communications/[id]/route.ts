import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCommunicationDetail, getWhatsappUrl, updateCommunication } from "@/lib/communications";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const communication = await getCommunicationDetail(id);
    if (!communication) return NextResponse.json({ error: "Communication was not found." }, { status: 404 });
    return NextResponse.json({ ...communication, whatsappUrl: getWhatsappUrl(communication) });
  } catch {
    return NextResponse.json({ error: "Communication could not be loaded." }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid communication update request." }, { status: 400 });
    }
    const communication = await updateCommunication(id, body as Record<string, unknown>);
    return NextResponse.json({ ...communication, whatsappUrl: getWhatsappUrl(communication) });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Communication was not found." }, { status: 404 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Communication could not be updated." }, { status: 400 });
  }
}
