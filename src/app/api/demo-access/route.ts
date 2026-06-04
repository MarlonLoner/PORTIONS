import { NextResponse } from "next/server";
import { DEMO_ACCESS_COOKIE, getDemoAccessCode, getDemoAccessToken } from "@/lib/demo-auth";

const sevenDays = 60 * 60 * 24 * 7;

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const code = cleanString(body.code);

    if (code !== getDemoAccessCode()) {
      return NextResponse.json({ error: "That demo access code is not valid. Please check the code from your guided walkthrough." }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set({
      name: DEMO_ACCESS_COOKIE,
      value: await getDemoAccessToken(),
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: sevenDays
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Demo access could not be verified. Please try again." }, { status: 500 });
  }
}
