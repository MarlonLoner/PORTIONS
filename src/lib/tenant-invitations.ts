import "server-only";

import { createHash, randomBytes } from "crypto";
import {
  AuditActorType,
  OperatingUnitAccessLevel,
  OperatingUnitStatus,
  OperatingUnitType,
  TenantUserInvitationStatus,
  UserRole,
  UserStatus
} from "@prisma/client";
import type { CurrentPlatformUser } from "@/lib/platform-auth";
import { createUserSession, hashPassword, validatePasswordStrength } from "@/lib/auth";
import { createManualInvitationDelivery } from "@/lib/invitation-delivery";
import { prisma } from "@/lib/prisma";

const INVITATION_DAYS = 7;

export type TenantOwnerInvitationInput = {
  name: string;
  email: string;
};

export function createInvitationToken() {
  return randomBytes(32).toString("base64url");
}

export function hashInvitationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function getInvitationExpiry() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITATION_DAYS);
  return expiresAt;
}

export function normalizeInvitationEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function createTenantOwnerInvitation(tenantId: string, input: TenantOwnerInvitationInput, actor: CurrentPlatformUser) {
  const name = input.name.trim();
  const email = normalizeInvitationEmail(input.email);
  if (!name || !email || !email.includes("@")) throw new Error("Enter a valid owner name and email.");

  const token = createInvitationToken();
  const tokenHash = hashInvitationToken(token);
  const now = new Date();
  const delivery = createManualInvitationDelivery();

  const invitation = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true }
    });
    if (!tenant) throw new Error("Tenant was not found.");

    const activeOwner = await tx.appUser.findFirst({
      where: { tenantId, role: UserRole.OWNER, status: UserStatus.ACTIVE },
      select: { id: true }
    });
    if (activeOwner) throw new Error("This tenant already has an active owner.");

    await tx.tenantUserInvitation.updateMany({
      where: {
        tenantId,
        role: UserRole.OWNER,
        status: TenantUserInvitationStatus.PENDING,
        expiresAt: { lte: now }
      },
      data: { status: TenantUserInvitationStatus.EXPIRED }
    });

    const pendingOwnerInvite = await tx.tenantUserInvitation.findFirst({
      where: {
        tenantId,
        role: UserRole.OWNER,
        status: TenantUserInvitationStatus.PENDING,
        expiresAt: { gt: now }
      },
      select: { id: true }
    });
    if (pendingOwnerInvite) throw new Error("This tenant already has a pending owner invitation.");

    const created = await tx.tenantUserInvitation.create({
      data: {
        tenantId,
        name,
        email,
        role: UserRole.OWNER,
        tokenHash,
        expiresAt: getInvitationExpiry(),
        invitedByPlatformUserId: actor.id
      },
      select: { id: true, name: true, email: true, status: true, expiresAt: true }
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        actorType: AuditActorType.PLATFORM_USER,
        actorId: actor.id,
        actorLabel: `${actor.name} (${actor.role})`,
        action: "tenant.owner_invitation.created",
        recordType: "TenantUserInvitation",
        recordId: created.id,
        outcome: "SUCCESS",
        metadata: { email, role: UserRole.OWNER, deliveryMode: delivery.mode, deliveryStatus: delivery.status }
      }
    });

    return { created, tenant };
  });

  return { invitation: invitation.created, tenant: invitation.tenant, token };
}

export async function revokeTenantOwnerInvitation(tenantId: string, invitationId: string, actor: CurrentPlatformUser) {
  await prisma.$transaction(async (tx) => {
    const invitation = await tx.tenantUserInvitation.findFirst({
      where: { id: invitationId, tenantId },
      select: { id: true, status: true, email: true }
    });
    if (!invitation) throw new Error("Invitation was not found.");
    if (invitation.status !== TenantUserInvitationStatus.PENDING) throw new Error("Only pending invitations can be revoked.");

    await tx.tenantUserInvitation.update({
      where: { id: invitation.id },
      data: { status: TenantUserInvitationStatus.REVOKED, revokedAt: new Date() }
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        actorType: AuditActorType.PLATFORM_USER,
        actorId: actor.id,
        actorLabel: `${actor.name} (${actor.role})`,
        action: "tenant.owner_invitation.revoked",
        recordType: "TenantUserInvitation",
        recordId: invitation.id,
        outcome: "SUCCESS",
        metadata: { email: invitation.email }
      }
    });
  });
}

export async function getTenantInvitationPreview(token: string) {
  if (!token) return { status: "INVALID" as const };
  const invitation = await prisma.tenantUserInvitation.findUnique({
    where: { tokenHash: hashInvitationToken(token) },
    include: { tenant: { select: { name: true, status: true, subscriptionStatus: true } } }
  });
  if (!invitation) return { status: "INVALID" as const };
  if (invitation.status === TenantUserInvitationStatus.ACCEPTED) return { status: "ACCEPTED" as const, invitation };
  if (invitation.status === TenantUserInvitationStatus.REVOKED || invitation.status === TenantUserInvitationStatus.CANCELLED) {
    return { status: "REVOKED" as const, invitation };
  }
  if (invitation.expiresAt <= new Date()) return { status: "EXPIRED" as const, invitation };
  return { status: "VALID" as const, invitation };
}

export async function acceptTenantOwnerInvitation(token: string, input: { password: string; confirmPassword: string }) {
  const password = input.password;
  if (password !== input.confirmPassword) throw new Error("Passwords do not match.");
  const strengthError = validatePasswordStrength(password);
  if (strengthError) throw new Error(strengthError);

  const tokenHash = hashInvitationToken(token);
  const now = new Date();

  const userId = await prisma.$transaction(async (tx) => {
    const invitation = await tx.tenantUserInvitation.findUnique({
      where: { tokenHash },
      include: { tenant: true }
    });
    if (!invitation) throw new Error("This invitation is invalid.");
    if (invitation.status !== TenantUserInvitationStatus.PENDING) throw new Error("This invitation can no longer be used.");
    if (invitation.expiresAt <= now) {
      await tx.tenantUserInvitation.update({
        where: { id: invitation.id },
        data: { status: TenantUserInvitationStatus.EXPIRED }
      });
      throw new Error("This invitation has expired.");
    }
    if (invitation.role !== UserRole.OWNER) throw new Error("This invitation is not configured for owner setup.");

    const activeOwner = await tx.appUser.findFirst({
      where: { tenantId: invitation.tenantId, role: UserRole.OWNER, status: UserStatus.ACTIVE },
      select: { id: true }
    });
    if (activeOwner) throw new Error("This tenant already has an active owner.");

    const existingUser = await tx.appUser.findUnique({ where: { email: invitation.email } });
    if (existingUser && existingUser.tenantId !== invitation.tenantId) {
      throw new Error("This email address cannot be used for this tenant invitation.");
    }

    const units = await tx.operatingUnit.findMany({
      where: { tenantId: invitation.tenantId, status: { not: OperatingUnitStatus.INACTIVE } },
      orderBy: [{ type: "asc" }, { name: "asc" }],
      select: { id: true, type: true }
    });
    if (!units.length) throw new Error("This tenant has no operating units configured.");

    const primaryUnit =
      units.find((unit) => unit.type === OperatingUnitType.HEAD_OFFICE) ??
      units.find((unit) => unit.type === OperatingUnitType.ONLINE_DEPARTMENT) ??
      units[0];

    const passwordHash = hashPassword(password);
    const user = existingUser
      ? await tx.appUser.update({
          where: { id: existingUser.id },
          data: {
            name: invitation.name,
            passwordHash,
            role: UserRole.OWNER,
            status: UserStatus.ACTIVE,
            mustChangePassword: false,
            primaryOperatingUnitId: primaryUnit.id,
            failedLoginCount: 0,
            lockedUntil: null
          },
          select: { id: true }
        })
      : await tx.appUser.create({
          data: {
            tenantId: invitation.tenantId,
            name: invitation.name,
            email: invitation.email,
            passwordHash,
            role: UserRole.OWNER,
            status: UserStatus.ACTIVE,
            mustChangePassword: false,
            primaryOperatingUnitId: primaryUnit.id
          },
          select: { id: true }
        });

    await tx.userOperatingUnitAccess.createMany({
      data: units.map((unit) => ({
        userId: user.id,
        operatingUnitId: unit.id,
        accessLevel: OperatingUnitAccessLevel.ADMIN,
        isPrimary: unit.id === primaryUnit.id
      })),
      skipDuplicates: true
    });

    await tx.tenantUserInvitation.update({
      where: { id: invitation.id },
      data: { status: TenantUserInvitationStatus.ACCEPTED, acceptedAt: now }
    });

    await tx.auditLog.createMany({
      data: [
        {
          tenantId: invitation.tenantId,
          actorType: AuditActorType.TENANT_USER,
          actorId: user.id,
          actorLabel: `${invitation.name} (${UserRole.OWNER})`,
          action: "tenant.owner_invitation.accepted",
          recordType: "TenantUserInvitation",
          recordId: invitation.id,
          outcome: "SUCCESS",
          metadata: { email: invitation.email }
        },
        {
          tenantId: invitation.tenantId,
          actorType: AuditActorType.TENANT_USER,
          actorId: user.id,
          actorLabel: `${invitation.name} (${UserRole.OWNER})`,
          action: "tenant.owner.activated",
          recordType: "AppUser",
          recordId: user.id,
          outcome: "SUCCESS",
          metadata: { email: invitation.email, accessLevel: OperatingUnitAccessLevel.ADMIN, operatingUnitCount: units.length }
        },
        {
          tenantId: invitation.tenantId,
          actorType: AuditActorType.TENANT_USER,
          actorId: user.id,
          actorLabel: `${invitation.name} (${UserRole.OWNER})`,
          action: "tenant.owner.first_login",
          recordType: "AppUser",
          recordId: user.id,
          outcome: "SUCCESS"
        }
      ]
    });

    return user.id;
  });

  return createUserSession(userId);
}
