import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { createCommunication, getCommunicationCenterData } from "@/lib/communications";

export async function GET() {
  try {
    const data = await getCommunicationCenterData();
    return NextResponse.json(data.communications);
  } catch {
    return NextResponse.json({ error: "Communications could not be loaded." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid communication request." }, { status: 400 });
    }

    const communication = await createCommunication(body);
    return NextResponse.json(communication);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json({ error: "Communication could not be prepared from this source." }, { status: 400 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Communication could not be prepared." }, { status: 500 });
  }
}
