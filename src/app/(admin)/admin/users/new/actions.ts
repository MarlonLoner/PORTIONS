"use server";

import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { hashPassword, requirePermission, validatePasswordStrength } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  isUserCreationAccessLevel,
  isUserCreationRole,
  isUserCreationStatus
} from "@/lib/admin-user-creation";

export type CreateUserState = {
  error: string;
};

function optional(value: string) {
  return value && value !== "none" ? value : null;
}

export async function createUserAction(_state: CreateUserState, formData: FormData): Promise<CreateUserState> {
  const currentUser = await requirePermission("manageUsers");
  if (!currentUser.tenantId || currentUser.isDemo) return { error: "Tenant administration is not available in demo mode." };
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const roleValue = String(formData.get("role") ?? "VIEW_ONLY");
  const statusValue = String(formData.get("status") ?? "ACTIVE");
  const accessLevelValue = String(formData.get("accessLevel") ?? "VIEW");
  const role = isUserCreationRole(roleValue) ? roleValue : "VIEW_ONLY";
  const status = isUserCreationStatus(statusValue) ? statusValue : "ACTIVE";
  const accessLevel = isUserCreationAccessLevel(accessLevelValue) ? accessLevelValue : "VIEW";
  const staffMemberId = optional(String(formData.get("staffMemberId") ?? ""));
  const primaryOperatingUnitId = optional(String(formData.get("primaryOperatingUnitId") ?? ""));
  const operatingUnitIds = Array.from(new Set([
    primaryOperatingUnitId,
    ...formData.getAll("operatingUnitIds").map((value) => optional(String(value ?? "")))
  ].filter((value): value is string => Boolean(value))));

  if (!name || !email) return { error: "Name and email are required." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid email address." };
  const passwordError = validatePasswordStrength(password);
  if (passwordError) return { error: passwordError };

  let redirectTo = "";
  try {
    const user = await prisma.$transaction(async (tx) => {
      const existing = await tx.appUser.findUnique({ where: { email }, select: { id: true } });
      if (existing) return { existingId: existing.id };

      const [validUnits, validStaff] = await Promise.all([
        operatingUnitIds.length ? tx.operatingUnit.findMany({ where: { tenantId: currentUser.tenantId, id: { in: operatingUnitIds } }, select: { id: true } }) : Promise.resolve([]),
        staffMemberId ? tx.staffMember.findFirst({ where: { tenantId: currentUser.tenantId, id: staffMemberId }, select: { id: true } }) : Promise.resolve(null)
      ]);
      const validUnitIds = new Set(validUnits.map((unit) => unit.id));
      const primaryUnitId = primaryOperatingUnitId && validUnitIds.has(primaryOperatingUnitId) ? primaryOperatingUnitId : null;
      const created = await tx.appUser.create({
        data: {
          tenantId: currentUser.tenantId,
          name,
          email,
          passwordHash: hashPassword(password),
          role,
          status,
          mustChangePassword: true,
          staffMemberId: validStaff?.id ?? null,
          primaryOperatingUnitId: primaryUnitId,
          unitAccess: validUnitIds.size ? {
            create: Array.from(validUnitIds).map((operatingUnitId) => ({
              operatingUnitId,
              accessLevel,
              isPrimary: operatingUnitId === primaryUnitId
            }))
          } : undefined
        },
        select: { id: true }
      });
      return { createdId: created.id };
    });

    redirectTo = `/admin/users/${user.existingId ?? user.createdId}`;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") return { error: "A user with this email or staff link already exists." };
      if (error.code === "P2003") return { error: "Selected staff or operating-unit access is no longer available. Refresh and try again." };
      return { error: `User could not be created. Prisma code: ${error.code}.` };
    }
    console.error("[admin-users-new:create-user]", {
      message: error instanceof Error ? error.message : "Unknown error",
      name: error instanceof Error ? error.name : "UnknownError"
    });
    return { error: "User could not be created. Please review the form and try again." };
  }
  redirect(redirectTo);
}
