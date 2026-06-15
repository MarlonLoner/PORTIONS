import { NextResponse } from "next/server";
import { SubscriptionStatus, TenantStatus, UserStatus } from "@prisma/client";
import { AUTH_SESSION_COOKIE, createUserSession, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const lockoutFailures = 5;
const lockoutMinutes = 15;
const blockedTenantStatuses = new Set<TenantStatus>([TenantStatus.SUSPENDED, TenantStatus.DISABLED, TenantStatus.ARCHIVED]);
const blockedSubscriptionStatuses = new Set<SubscriptionStatus>([SubscriptionStatus.CANCELLED, SubscriptionStatus.PAUSED]);

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const email = cleanString(body?.email).toLowerCase();
    const password = typeof body?.password === "string" ? body.password : "";
    if (!email || !password) {
      return NextResponse.json({ error: "Email or password is not correct." }, { status: 401 });
    }

    const user = await prisma.appUser.findUnique({ where: { email }, include: { tenant: true } });
    if (!user) {
      return NextResponse.json({ error: "Email or password is not correct." }, { status: 401 });
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return NextResponse.json({ error: "This account is temporarily locked. Try again later." }, { status: 423 });
    }

    if (user.status !== UserStatus.ACTIVE) {
      return NextResponse.json({ error: "This account is not active." }, { status: 403 });
    }
    if (user.tenant && (blockedTenantStatuses.has(user.tenant.status) || blockedSubscriptionStatuses.has(user.tenant.subscriptionStatus))) {
      return NextResponse.json({ error: "This pharmacy tenant is not active." }, { status: 403 });
    }

    if (!verifyPassword(password, user.passwordHash)) {
      const failedLoginCount = user.failedLoginCount + 1;
      const lockedUntil = failedLoginCount >= lockoutFailures ? new Date(Date.now() + lockoutMinutes * 60_000) : null;
      await prisma.appUser.update({ where: { id: user.id }, data: { failedLoginCount, lockedUntil } });
      return NextResponse.json({ error: "Email or password is not correct." }, { status: 401 });
    }

    await prisma.appSession.deleteMany({ where: { userId: user.id, expiresAt: { lt: new Date() } } });
    const session = await createUserSession(user.id);
    const response = NextResponse.json({ ok: true });
    response.cookies.set({
      name: AUTH_SESSION_COOKIE,
      value: session.token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: session.expiresAt
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Login could not be completed. Please try again." }, { status: 500 });
  }
}
