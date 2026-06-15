import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { createInitialPlatformOwner, createPlatformSession, hasPlatformOwner, PLATFORM_SESSION_COOKIE } from "@/lib/platform-auth";
import { validatePasswordStrength } from "@/lib/auth";

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  try {
    if (await hasPlatformOwner()) {
      return NextResponse.json({ error: "Platform setup is already complete." }, { status: 409 });
    }
    const body = await request.json().catch(() => null);
    const setupKey = clean(body?.setupKey);
    const configuredKey = process.env.PORTIONS_PLATFORM_SETUP_KEY ?? "";
    const name = clean(body?.name);
    const email = clean(body?.email).toLowerCase();
    const password = typeof body?.password === "string" ? body.password : "";

    if (!configuredKey) return NextResponse.json({ error: "Platform setup key is not configured." }, { status: 500 });
    if (!setupKey || setupKey !== configuredKey) return NextResponse.json({ error: "Platform setup could not be verified." }, { status: 401 });
    if (!name || !validEmail(email)) return NextResponse.json({ error: "Valid name and email are required." }, { status: 400 });
    const passwordError = validatePasswordStrength(password);
    if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 });

    const owner = await createInitialPlatformOwner({ name, email, password });
    const session = await createPlatformSession(owner.id);
    const response = NextResponse.json({ ok: true, redirectTo: "/platform" }, { status: 201 });
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
  } catch (error) {
    if (error instanceof Error && error.message === "PLATFORM_SETUP_COMPLETE") {
      return NextResponse.json({ error: "Platform setup is already complete." }, { status: 409 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "That platform email is already registered." }, { status: 409 });
    }
    return NextResponse.json({ error: "Platform setup could not be completed." }, { status: 500 });
  }
}
