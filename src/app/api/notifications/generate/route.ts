import { NextResponse } from "next/server";
import { generateOperationalNotifications } from "@/lib/notifications";

export async function POST() {
  try {
    const result = await generateOperationalNotifications();
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Notifications could not be generated." }, { status: 500 });
  }
}
