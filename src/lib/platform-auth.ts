import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes } from "crypto";
import { PlatformRole, PlatformUserStatus } from "@prisma/client";
import { hashPassword, hashSessionToken, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const PLATFORM_SESSION_COOKIE = "portions_platform_session";
const PLATFORM_SESSION_DAYS = 7;
const platformManageRoles = new Set<PlatformRole>([PlatformRole.PLATFORM_OWNER, PlatformRole.PLATFORM_ADMIN]);

export type CurrentPlatformUser = {
  id: string;
  name: string;
  email: string;
  role: PlatformRole;
};

export function createPlatformSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function getPlatformSessionExpiry() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + PLATFORM_SESSION_DAYS);
  return expiresAt;
}

export async function hasPlatformOwner() {
  return Boolean(await prisma.platformUser.findFirst({ where: { role: PlatformRole.PLATFORM_OWNER, status: PlatformUserStatus.ACTIVE }, select: { id: true } }));
}

export async function createPlatformSession(platformUserId: string) {
  const token = createPlatformSessionToken();
  const expiresAt = getPlatformSessionExpiry();
  await prisma.platformSession.create({
    data: { platformUserId, tokenHash: hashSessionToken(token), expiresAt }
  });
  await prisma.platformUser.update({ where: { id: platformUserId }, data: { lastLoginAt: new Date(), failedLoginCount: 0, lockedUntil: null } });
  return { token, expiresAt };
}

export async function getCurrentPlatformUser(): Promise<CurrentPlatformUser | null> {
  const token = (await cookies()).get(PLATFORM_SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.platformSession.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: { platformUser: true }
  });
  if (!session || session.expiresAt <= new Date()) {
    if (session) await prisma.platformSession.delete({ where: { id: session.id } }).catch(() => null);
    return null;
  }
  if (session.platformUser.status !== PlatformUserStatus.ACTIVE) return null;
  return {
    id: session.platformUser.id,
    name: session.platformUser.name,
    email: session.platformUser.email,
    role: session.platformUser.role
  };
}

export async function requirePlatformUser(roles?: PlatformRole[]) {
  const user = await getCurrentPlatformUser();
  if (!user) redirect("/platform/setup");
  if (roles?.length && !roles.includes(user.role)) redirect("/access-denied");
  return user;
}

export function canManagePlatform(user: CurrentPlatformUser) {
  return platformManageRoles.has(user.role);
}

export async function createInitialPlatformOwner(input: { name: string; email: string; password: string }) {
  if (await hasPlatformOwner()) throw new Error("PLATFORM_SETUP_COMPLETE");
  return prisma.platformUser.create({
    data: {
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash: hashPassword(input.password),
      role: PlatformRole.PLATFORM_OWNER,
      status: PlatformUserStatus.ACTIVE
    },
    select: { id: true }
  });
}

export async function verifyPlatformCredentials(email: string, password: string) {
  const user = await prisma.platformUser.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || user.status !== PlatformUserStatus.ACTIVE) return null;
  return verifyPassword(password, user.passwordHash) ? user : null;
}
