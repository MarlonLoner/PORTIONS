import { Prisma, UserRole, UserStatus, OperatingUnitAccessLevel, OperatingUnitType } from "@prisma/client";
import { NextResponse } from "next/server";
import { AUTH_SESSION_COOKIE, createUserSession, hashPassword, hasActiveAdministrativeUser, validatePasswordStrength } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { timingSafeEqual } from "node:crypto";
import { PRIMARY_TENANT_ID } from "@/lib/tenant";

const attempts = new Map<string, { count: number; resetAt: number }>();
const allowedRoles: UserRole[] = [UserRole.OWNER, UserRole.SYSTEM_ADMIN];

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function safeEquals(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function throttleKey(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "setup";
}

function isThrottled(key: string) {
  const now = Date.now();
  const record = attempts.get(key);
  if (!record || record.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + 15 * 60_000 });
    return false;
  }
  record.count += 1;
  return record.count > 8;
}

async function getPrimarySetupUnit(tx: Prisma.TransactionClient) {
  return await tx.operatingUnit.findFirst({ where: { tenantId: PRIMARY_TENANT_ID, type: OperatingUnitType.HEAD_OFFICE, status: "ACTIVE" }, orderBy: { name: "asc" } }) ??
    await tx.operatingUnit.findFirst({ where: { tenantId: PRIMARY_TENANT_ID, status: "ACTIVE" }, orderBy: { name: "asc" } });
}

async function getAdminUnits(tx: Prisma.TransactionClient, role: UserRole) {
  if (role === UserRole.OWNER) return tx.operatingUnit.findMany({ where: { tenantId: PRIMARY_TENANT_ID, status: "ACTIVE" }, orderBy: { name: "asc" } });
  const units = await tx.operatingUnit.findMany({
    where: { tenantId: PRIMARY_TENANT_ID, status: "ACTIVE", OR: [{ type: OperatingUnitType.HEAD_OFFICE }, { type: OperatingUnitType.ADMINISTRATION }] },
    orderBy: { name: "asc" }
  });
  return units.length ? units : tx.operatingUnit.findMany({ where: { tenantId: PRIMARY_TENANT_ID, status: "ACTIVE" }, orderBy: { name: "asc" } });
}

async function ensurePrimaryTenant(tx: Prisma.TransactionClient) {
  return tx.tenant.upsert({
    where: { slug: "portions-demo-pharmacy" },
    update: {},
    create: {
      id: PRIMARY_TENANT_ID,
      name: "PORTIONS Demonstration Pharmacy",
      slug: "portions-demo-pharmacy",
      legalName: "PORTIONS Demonstration Pharmacy",
      status: "ACTIVE",
      plan: "PILOT",
      subscriptionStatus: "ACTIVE",
      activatedAt: new Date(),
      isDemoTenant: false
    }
  });
}

export async function POST(request: Request) {
  try {
    const key = throttleKey(request);
    if (isThrottled(key)) {
      return NextResponse.json({ error: "Too many setup attempts. Please wait and try again." }, { status: 429 });
    }

    if (await hasActiveAdministrativeUser()) {
      return NextResponse.json({ error: "Setup has already been completed." }, { status: 409 });
    }

    const body = await request.json().catch(() => null);
    const setupKey = cleanString(body?.setupKey);
    const configuredKey = process.env.PORTIONS_SETUP_KEY ?? "";
    const name = cleanString(body?.name);
    const email = cleanString(body?.email).toLowerCase();
    const password = typeof body?.password === "string" ? body.password : "";
    const confirmPassword = typeof body?.confirmPassword === "string" ? body.confirmPassword : "";
    const role = cleanString(body?.role) as UserRole;

    if (!configuredKey) {
      return NextResponse.json({ error: "Setup key is not configured on the server." }, { status: 500 });
    }
    if (!setupKey || !safeEquals(setupKey, configuredKey)) {
      return NextResponse.json({ error: "Setup could not be verified." }, { status: 401 });
    }
    if (!name || !isValidEmail(email)) {
      return NextResponse.json({ error: "Valid name and email are required." }, { status: 400 });
    }
    if (!allowedRoles.includes(role)) {
      return NextResponse.json({ error: "Initial role must be OWNER or SYSTEM_ADMIN." }, { status: 400 });
    }
    if (password !== confirmPassword) {
      return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
    }
    const passwordError = validatePasswordStrength(password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    const created = await prisma.$transaction(async (tx) => {
      if (await hasActiveAdministrativeUser(tx)) {
        throw new Error("SETUP_COMPLETED");
      }
      const tenant = await ensurePrimaryTenant(tx);
      const primaryUnit = await getPrimarySetupUnit(tx);
      const adminUnits = await getAdminUnits(tx, role);
      return tx.appUser.create({
        data: {
          tenantId: tenant.id,
          name,
          email,
          passwordHash: hashPassword(password),
          role,
          status: UserStatus.ACTIVE,
          mustChangePassword: false,
          primaryOperatingUnitId: primaryUnit?.id ?? null,
          unitAccess: adminUnits.length ? {
            create: adminUnits.map((unit) => ({
              operatingUnitId: unit.id,
              accessLevel: OperatingUnitAccessLevel.ADMIN,
              isPrimary: unit.id === primaryUnit?.id
            }))
          } : undefined
        },
        select: { id: true }
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    const session = await createUserSession(created.id);
    const response = NextResponse.json({ ok: true, redirectTo: "/admin/users" }, { status: 201 });
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
  } catch (error) {
    if (error instanceof Error && error.message === "SETUP_COMPLETED") {
      return NextResponse.json({ error: "Setup has already been completed." }, { status: 409 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Setup could not be completed with that email." }, { status: 409 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      return NextResponse.json({ error: "Setup has already been completed." }, { status: 409 });
    }
    return NextResponse.json({ error: "Setup could not be completed." }, { status: 500 });
  }
}
