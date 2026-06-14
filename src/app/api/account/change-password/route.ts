import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_SESSION_COOKIE, getCurrentUser, hashPassword, hashSessionToken, validatePasswordStrength, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function cleanString(value: unknown) {
  return typeof value === "string" ? value : "";
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });

    const body = await request.json().catch(() => null);
    const currentPassword = cleanString(body?.currentPassword);
    const password = cleanString(body?.password);
    const confirmPassword = cleanString(body?.confirmPassword);
    if (password !== confirmPassword) return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
    const passwordError = validatePasswordStrength(password);
    if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 });

    const user = await prisma.appUser.findUnique({ where: { id: currentUser.id } });
    if (!user || !verifyPassword(currentPassword, user.passwordHash)) {
      return NextResponse.json({ error: "Current password is not correct." }, { status: 401 });
    }

    await prisma.appUser.update({
      where: { id: user.id },
      data: {
        passwordHash: hashPassword(password),
        mustChangePassword: false,
        failedLoginCount: 0,
        lockedUntil: null
      }
    });

    const token = (await cookies()).get(AUTH_SESSION_COOKIE)?.value;
    if (token) {
      await prisma.appSession.deleteMany({
        where: {
          userId: user.id,
          tokenHash: { not: hashSessionToken(token) }
        }
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Password could not be changed." }, { status: 500 });
  }
}
