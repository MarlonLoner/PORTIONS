import "server-only";

import { OperatingUnitAccessLevel, OperatingUnitType, UserRole, UserStatus } from "@prisma/client";
import { getCurrentAccessUser, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const userCreationRoles = [
  UserRole.OWNER,
  UserRole.CEO,
  UserRole.GENERAL_MANAGER,
  UserRole.BRANCH_MANAGER,
  UserRole.PHARMACIST,
  UserRole.SUPPORT_AGENT,
  UserRole.ONLINE_ORDERS_AGENT,
  UserRole.STOCK_CONTROLLER,
  UserRole.MARKETING_COORDINATOR,
  UserRole.EVENT_COORDINATOR,
  UserRole.FINANCE_ADMIN,
  UserRole.SYSTEM_ADMIN,
  UserRole.VIEW_ONLY
] as const;

export const userCreationAccessLevels = [
  OperatingUnitAccessLevel.VIEW,
  OperatingUnitAccessLevel.OPERATE,
  OperatingUnitAccessLevel.MANAGE,
  OperatingUnitAccessLevel.APPROVE,
  OperatingUnitAccessLevel.ADMIN
] as const;

export const userCreationStatuses = [
  UserStatus.INVITED,
  UserStatus.ACTIVE,
  UserStatus.SUSPENDED,
  UserStatus.DISABLED
] as const;

export type OperatingUnitOptionDto = {
  id: string;
  name: string;
  code: string;
  type: string;
  status: string;
  branchName: string | null;
};

export type StaffOptionDto = {
  id: string;
  name: string;
  role: string;
  branchId: string | null;
  branchName: string | null;
};

export async function getCurrentAdminUser() {
  try {
    const user = await getCurrentAccessUser();
    if (!user || !hasPermission(user, "manageUsers")) return null;
    return {
      id: user.id,
      name: user.name,
      role: user.role,
      primaryOperatingUnitName: user.primaryOperatingUnitName
    };
  } catch (error) {
    logUserCreationError("getCurrentAdminUser", error);
    return null;
  }
}

export async function getUserCreationOperatingUnits(): Promise<OperatingUnitOptionDto[]> {
  try {
    const units = await prisma.operatingUnit.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        type: true,
        status: true,
        branch: { select: { name: true } }
      },
      orderBy: [{ status: "asc" }, { type: "asc" }, { name: "asc" }]
    });
    return units.map((unit) => ({
      id: unit.id,
      name: unit.name,
      code: unit.code,
      type: unit.type,
      status: unit.status,
      branchName: unit.branch?.name ?? null
    }));
  } catch (error) {
    logUserCreationError("getUserCreationOperatingUnits", error);
    return [];
  }
}

export async function getUserCreationStaffOptions(): Promise<StaffOptionDto[]> {
  try {
    const staff = await prisma.staffMember.findMany({
      select: {
        id: true,
        name: true,
        role: true,
        branchId: true,
        branch: { select: { name: true } }
      },
      orderBy: [{ branch: { name: "asc" } }, { name: "asc" }]
    });
    return staff.map((member) => ({
      id: member.id,
      name: member.name,
      role: member.role,
      branchId: member.branchId,
      branchName: member.branch?.name ?? null
    }));
  } catch (error) {
    logUserCreationError("getUserCreationStaffOptions", error);
    return [];
  }
}

export function getUserCreationRoleOptions() {
  return [...userCreationRoles];
}

export function getUserCreationAccessLevels() {
  return [...userCreationAccessLevels];
}

export function getUserCreationStatusOptions() {
  return [...userCreationStatuses];
}

export function isUserCreationRole(value: unknown): value is UserRole {
  return typeof value === "string" && userCreationRoles.includes(value as UserRole);
}

export function isUserCreationAccessLevel(value: unknown): value is OperatingUnitAccessLevel {
  return typeof value === "string" && userCreationAccessLevels.includes(value as OperatingUnitAccessLevel);
}

export function isUserCreationStatus(value: unknown): value is UserStatus {
  return typeof value === "string" && userCreationStatuses.includes(value as UserStatus);
}

export async function getAdminControlCenterMetrics() {
  try {
    const [users, units] = await Promise.all([
      prisma.appUser.findMany({
        select: {
          id: true,
          status: true,
          mustChangePassword: true,
          primaryOperatingUnitId: true
        }
      }),
      prisma.operatingUnit.findMany({
        select: {
          id: true,
          type: true,
          whatsappNumber: true,
          isPrimaryOnlineUnit: true
        }
      })
    ]);
    return {
      activeUsers: users.filter((user) => user.status === UserStatus.ACTIVE).length,
      invitedUsers: users.filter((user) => user.status === UserStatus.INVITED).length,
      suspendedUsers: users.filter((user) => user.status === UserStatus.SUSPENDED || user.status === UserStatus.DISABLED).length,
      usersWithoutPrimaryUnit: users.filter((user) => !user.primaryOperatingUnitId).length,
      usersWithTemporaryPasswords: users.filter((user) => user.mustChangePassword).length,
      physicalBranches: units.filter((unit) => unit.type === OperatingUnitType.PHYSICAL_BRANCH).length,
      onlineDepartments: units.filter((unit) => unit.type === OperatingUnitType.ONLINE_DEPARTMENT || unit.isPrimaryOnlineUnit).length,
      headOfficeUnits: units.filter((unit) => unit.type === OperatingUnitType.HEAD_OFFICE).length,
      financeUnits: units.filter((unit) => unit.type === OperatingUnitType.FINANCE).length,
      unitsMissingWhatsapp: units.filter((unit) => !unit.whatsappNumber).length
    };
  } catch (error) {
    logUserCreationError("getAdminControlCenterMetrics", error);
    return {
      activeUsers: 0,
      invitedUsers: 0,
      suspendedUsers: 0,
      usersWithoutPrimaryUnit: 0,
      usersWithTemporaryPasswords: 0,
      physicalBranches: 0,
      onlineDepartments: 0,
      headOfficeUnits: 0,
      financeUnits: 0,
      unitsMissingWhatsapp: 0
    };
  }
}

function logUserCreationError(scope: string, error: unknown) {
  const reference = `admin-users-new-${Date.now().toString(36)}`;
  console.error("[PORTIONS admin user creation]", {
    reference,
    scope,
    message: error instanceof Error ? error.message : "Unknown error",
    name: error instanceof Error ? error.name : "UnknownError"
  });
}
