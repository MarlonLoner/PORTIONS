import { NextResponse } from "next/server";
import { createPlatformSession, PLATFORM_SESSION_COOKIE, verifyPlatformCredentials } from "@/lib/platform-auth";

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const email = clean(body?.email).toLowerCase();
    const password = typeof body?.password === "string" ? body.password : "";
    if (!email || !password) return NextResponse.json({ error: "Email or password is not correct." }, { status: 401 });

    const user = await verifyPlatformCredentials(email, password);
    if (!user) return NextResponse.json({ error: "Email or password is not correct." }, { status: 401 });

    const session = await createPlatformSession(user.id);
    const response = NextResponse.json({ ok: true, redirectTo: "/platform" });
    response.cookies.set({
      name: PLATFORM_SESSION_COOKIE,
      value: session.token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: session.expiresAt
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Platform login could not be completed." }, { status: 500 });
  }
}
