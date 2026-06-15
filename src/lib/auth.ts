import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import {
  OperatingUnitAccessLevel,
  OperatingUnitType,
  SubscriptionStatus,
  TenantStatus,
  UserRole,
  UserStatus
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { DEMO_ACCESS_COOKIE, isValidDemoAccessToken } from "@/lib/demo-auth";

export const AUTH_SESSION_COOKIE = "portions_session";
export const SESSION_DAYS = 7;

export type PermissionKey =
  | "viewDashboard"
  | "viewExecutiveMetrics"
  | "managePatients"
  | "manageFollowUps"
  | "manageOrders"
  | "manageStock"
  | "manageCommunications"
  | "sendCommunications"
  | "manageEvents"
  | "approveEvent"
  | "approveEventFunding"
  | "recordFundsReleased"
  | "approveExpense"
  | "completeEventReview"
  | "manageActions"
  | "completeOperationalAction"
  | "assignStaff"
  | "viewReports"
  | "viewExecutivePack"
  | "manageSettings"
  | "importData"
  | "managePilot"
  | "manageUsers"
  | "manageOperatingUnits";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  mustChangePassword: boolean;
  isDemo: boolean;
  tenantId: string | null;
  tenantName: string | null;
  tenantSlug: string | null;
  tenantStatus: TenantStatus | null;
  tenantSubscriptionStatus: SubscriptionStatus | null;
  isDemoTenant: boolean;
  primaryOperatingUnitId: string | null;
  primaryOperatingUnitName: string | null;
  accessibleOperatingUnits: Array<{
    id: string;
    name: string;
    code: string;
    type: OperatingUnitType;
    branchId: string | null;
    accessLevel: OperatingUnitAccessLevel;
    isPrimary: boolean;
  }>;
};

const rolePermissions: Record<UserRole, PermissionKey[]> = {
  OWNER: allPermissions(),
  CEO: allPermissions(),
  GENERAL_MANAGER: [
    "viewDashboard", "viewExecutiveMetrics", "managePatients", "manageFollowUps", "manageOrders", "manageStock",
    "manageCommunications", "sendCommunications", "manageEvents", "approveEvent", "completeEventReview",
    "manageActions", "completeOperationalAction", "assignStaff", "viewReports", "viewExecutivePack", "importData", "managePilot"
  ],
  BRANCH_MANAGER: [
    "viewDashboard", "managePatients", "manageFollowUps", "manageOrders", "manageStock", "manageCommunications",
    "sendCommunications", "manageEvents", "manageActions", "completeOperationalAction", "assignStaff", "viewReports"
  ],
  PHARMACIST: ["viewDashboard", "managePatients", "manageFollowUps", "manageOrders", "manageStock", "sendCommunications", "completeOperationalAction"],
  SUPPORT_AGENT: ["viewDashboard", "manageFollowUps", "sendCommunications", "manageCommunications", "completeOperationalAction"],
  ONLINE_ORDERS_AGENT: ["viewDashboard", "manageOrders", "sendCommunications", "manageCommunications", "manageActions", "completeOperationalAction"],
  STOCK_CONTROLLER: ["viewDashboard", "manageStock", "manageActions", "completeOperationalAction", "viewReports"],
  MARKETING_COORDINATOR: ["viewDashboard", "manageEvents", "sendCommunications", "manageCommunications", "manageActions", "completeOperationalAction", "viewReports"],
  EVENT_COORDINATOR: ["viewDashboard", "manageEvents", "sendCommunications", "manageCommunications", "manageActions", "completeOperationalAction", "viewReports"],
  FINANCE_ADMIN: ["viewDashboard", "viewExecutiveMetrics", "manageEvents", "recordFundsReleased", "approveExpense", "viewReports", "viewExecutivePack"],
  SYSTEM_ADMIN: ["viewDashboard", "manageUsers", "manageOperatingUnits", "manageSettings", "importData", "viewReports"],
  VIEW_ONLY: ["viewDashboard", "viewReports"]
};

const pagePermissions: Array<{ prefix: string; permission: PermissionKey }> = [
  { prefix: "/admin/users", permission: "manageUsers" },
  { prefix: "/admin/operating-units", permission: "manageOperatingUnits" },
  { prefix: "/executive-pack", permission: "viewExecutivePack" },
  { prefix: "/settings", permission: "manageSettings" },
  { prefix: "/imports", permission: "importData" },
  { prefix: "/pilot-command", permission: "managePilot" },
  { prefix: "/pilot-requests", permission: "managePilot" },
  { prefix: "/patients", permission: "managePatients" },
  { prefix: "/follow-ups", permission: "manageFollowUps" },
  { prefix: "/orders", permission: "manageOrders" },
  { prefix: "/stock", permission: "manageStock" },
  { prefix: "/communications", permission: "manageCommunications" },
  { prefix: "/events", permission: "manageEvents" },
  { prefix: "/action-center", permission: "manageActions" },
  { prefix: "/reports", permission: "viewReports" }
];

const loginBlockedTenantStatuses = new Set<TenantStatus>([TenantStatus.SUSPENDED, TenantStatus.DISABLED, TenantStatus.ARCHIVED]);
const loginBlockedSubscriptionStatuses = new Set<SubscriptionStatus>([SubscriptionStatus.CANCELLED, SubscriptionStatus.PAUSED]);

function allPermissions(): PermissionKey[] {
  return [
    "viewDashboard", "viewExecutiveMetrics", "managePatients", "manageFollowUps", "manageOrders", "manageStock",
    "manageCommunications", "sendCommunications", "manageEvents", "approveEvent", "approveEventFunding",
    "recordFundsReleased", "approveExpense", "completeEventReview", "manageActions", "completeOperationalAction",
    "assignStaff", "viewReports", "viewExecutivePack", "manageSettings", "importData", "managePilot",
    "manageUsers", "manageOperatingUnits"
  ];
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [scheme, salt, hash] = storedHash.split(":");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const actual = Buffer.from(scryptSync(password, salt, 64).toString("hex"), "hex");
  const expected = Buffer.from(hash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function validatePasswordStrength(password: string) {
  if (password.length < 12) return "Password must be at least 12 characters.";
  if (!/[A-Z]/.test(password)) return "Password must include an uppercase letter.";
  if (!/[a-z]/.test(password)) return "Password must include a lowercase letter.";
  if (!/[0-9]/.test(password)) return "Password must include a number.";
  if (!/[^A-Za-z0-9]/.test(password)) return "Password must include a special character.";
  return "";
}

export async function hasActiveAdministrativeUser(tx: Pick<typeof prisma, "appUser"> = prisma) {
  const admin = await tx.appUser.findFirst({
    where: {
      status: UserStatus.ACTIVE,
      role: { in: [UserRole.OWNER, UserRole.CEO, UserRole.SYSTEM_ADMIN] }
    },
    select: { id: true }
  });
  return Boolean(admin);
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function getSessionExpiry() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DAYS);
  return expiresAt;
}

export async function createUserSession(userId: string) {
  const token = createSessionToken();
  const expiresAt = getSessionExpiry();
  await prisma.appSession.create({
    data: {
      userId,
      tokenHash: hashSessionToken(token),
      expiresAt
    }
  });
  await prisma.appUser.update({ where: { id: userId }, data: { lastLoginAt: new Date(), failedLoginCount: 0, lockedUntil: null } });
  return { token, expiresAt };
}

export async function destroyCurrentSession() {
  const token = (await cookies()).get(AUTH_SESSION_COOKIE)?.value;
  if (!token) return;
  await prisma.appSession.deleteMany({ where: { tokenHash: hashSessionToken(token) } });
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.appSession.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: {
      user: {
        include: {
          primaryOperatingUnit: true,
          tenant: true,
          unitAccess: { include: { operatingUnit: true }, orderBy: { isPrimary: "desc" } }
        }
      }
    }
  });
  if (!session || session.expiresAt <= new Date()) {
    if (session) await prisma.appSession.delete({ where: { id: session.id } }).catch(() => null);
    return null;
  }
  if (session.user.status !== UserStatus.ACTIVE) return null;
  if (session.user.tenant && !isTenantActiveForLogin(session.user.tenant)) return null;
  return toCurrentUser(session.user);
}

export async function getCurrentAccessUser(): Promise<CurrentUser | null> {
  const realUser = await getCurrentUser();
  if (realUser) return realUser;
  const demoToken = (await cookies()).get(DEMO_ACCESS_COOKIE)?.value;
  if (await isValidDemoAccessToken(demoToken)) return getDemoUser();
  return null;
}

export async function requireAuthenticatedUser() {
  const user = await getCurrentAccessUser();
  if (!user) redirect("/login");
  return user;
}

export async function requirePermission(permission: PermissionKey) {
  const user = await requireAuthenticatedUser();
  if (!hasPermission(user, permission)) redirect("/access-denied");
  return user;
}

export function getDemoUser(): CurrentUser {
  return {
    id: "demo",
    name: "PORTIONS Demo User",
    email: "demo@portions.local",
    role: UserRole.OWNER,
    status: UserStatus.ACTIVE,
    mustChangePassword: false,
    isDemo: true,
    tenantId: "tenant_portions_demo",
    tenantName: "PORTIONS Demo Tenant",
    tenantSlug: "portions-demo",
    tenantStatus: TenantStatus.ACTIVE,
    tenantSubscriptionStatus: SubscriptionStatus.NOT_REQUIRED,
    isDemoTenant: true,
    primaryOperatingUnitId: null,
    primaryOperatingUnitName: "Demo Network",
    accessibleOperatingUnits: []
  };
}

export function getUserPermissions(user: Pick<CurrentUser, "role">) {
  return new Set(rolePermissions[user.role] ?? []);
}

export function hasPermission(user: Pick<CurrentUser, "role">, permission: PermissionKey) {
  return getUserPermissions(user).has(permission);
}

export function canViewPage(user: CurrentUser, pathname: string) {
  if (user.isDemo && isDemoAdminBlockedPage(pathname)) return false;
  const match = pagePermissions.find((item) => pathname === item.prefix || pathname.startsWith(`${item.prefix}/`));
  return !match || hasPermission(user, match.permission);
}

export function canViewOperatingUnit(user: CurrentUser, operatingUnitId?: string | null) {
  if (!operatingUnitId || canViewAllUnits(user)) return true;
  return user.accessibleOperatingUnits.some((unit) => unit.id === operatingUnitId);
}

export function canManageOperatingUnit(user: CurrentUser, operatingUnitId?: string | null) {
  if (canViewAllUnits(user)) return true;
  if (!operatingUnitId) return false;
  return user.accessibleOperatingUnits.some((unit) => unit.id === operatingUnitId && ["MANAGE", "APPROVE", "ADMIN"].includes(unit.accessLevel));
}

export const canApproveEvent = (user: CurrentUser) => hasPermission(user, "approveEvent");
export const canApproveEventFunding = (user: CurrentUser) => hasPermission(user, "approveEventFunding");
export const canSubmitEvent = (user: CurrentUser) => hasPermission(user, "manageEvents");
export const canRecordFundsReleased = (user: CurrentUser) => hasPermission(user, "recordFundsReleased") || hasPermission(user, "approveEventFunding");
export const canApproveExpense = (user: CurrentUser) => hasPermission(user, "approveExpense") || hasPermission(user, "approveEventFunding");
export const canCompleteEventReview = (user: CurrentUser) => hasPermission(user, "completeEventReview") || hasPermission(user, "manageEvents");
export const canManagePatients = (user: CurrentUser) => hasPermission(user, "managePatients");
export const canManageOrders = (user: CurrentUser) => hasPermission(user, "manageOrders");
export const canManageStock = (user: CurrentUser) => hasPermission(user, "manageStock");
export const canSendCommunications = (user: CurrentUser) => hasPermission(user, "sendCommunications");
export const canManageUsers = (user: CurrentUser) => hasPermission(user, "manageUsers");
export const canViewExecutiveMetrics = (user: CurrentUser) => hasPermission(user, "viewExecutiveMetrics");
export const canManageSettings = (user: CurrentUser) => hasPermission(user, "manageSettings");
export const canImportData = (user: CurrentUser) => hasPermission(user, "importData");
export const canManagePilot = (user: CurrentUser) => hasPermission(user, "managePilot");
export const canCompleteOperationalAction = (user: CurrentUser) => hasPermission(user, "completeOperationalAction");
export const canAssignStaff = (user: CurrentUser) => hasPermission(user, "assignStaff");

export function getAccessibleOperatingUnitIds(user: CurrentUser) {
  if (canViewAllUnits(user)) return null;
  return user.accessibleOperatingUnits.map((unit) => unit.id);
}

export function getAccessibleBranchIds(user: CurrentUser) {
  if (canViewAllUnits(user)) return null;
  return user.accessibleOperatingUnits.map((unit) => unit.branchId).filter(Boolean) as string[];
}

export function buildOperatingUnitScope(user: CurrentUser) {
  const unitIds = getAccessibleOperatingUnitIds(user);
  return withTenantWhere(user, unitIds ? { id: { in: unitIds } } : {});
}

export function buildBranchScope(user: CurrentUser) {
  const branchIds = getAccessibleBranchIds(user);
  return withTenantWhere(user, branchIds ? { id: { in: branchIds } } : {});
}

export function buildPatientScope(user: CurrentUser) {
  const branchIds = getAccessibleBranchIds(user);
  return withTenantWhere(user, branchIds ? { branchId: { in: branchIds } } : {});
}

export function buildOrderScope(user: CurrentUser) {
  if (canViewAllUnits(user)) return withTenantWhere(user, {});
  const branchIds = getAccessibleBranchIds(user) ?? [];
  const unitIds = getAccessibleOperatingUnitIds(user) ?? [];
  return withTenantWhere(user, {
    OR: [
      { branchId: { in: branchIds } },
      { fulfillmentBranchId: { in: branchIds } },
      { originatingOperatingUnitId: { in: unitIds } },
      { assignedOperatingUnitId: { in: unitIds } }
    ]
  });
}

export function buildEventScope(user: CurrentUser) {
  if (canViewAllUnits(user) || hasPermission(user, "manageEvents")) return withTenantWhere(user, {});
  const branchIds = getAccessibleBranchIds(user);
  return withTenantWhere(user, branchIds ? { branchId: { in: branchIds } } : {});
}

export function buildCommunicationScope(user: CurrentUser) {
  if (canViewAllUnits(user)) return withTenantWhere(user, {});
  const branchIds = getAccessibleBranchIds(user) ?? [];
  const unitIds = getAccessibleOperatingUnitIds(user) ?? [];
  return withTenantWhere(user, {
    OR: [
      { branchId: { in: branchIds } },
      { sendingOperatingUnitId: { in: unitIds } }
    ]
  });
}

export function buildAuditActor(user: CurrentUser | null) {
  if (!user) return "PORTIONS";
  const unit = user.primaryOperatingUnitName ? ` / ${user.primaryOperatingUnitName}` : "";
  return `${user.name} (${user.role}${unit})`;
}

export function canViewAllUnits(user: CurrentUser) {
  return ["OWNER", "CEO", "GENERAL_MANAGER"].includes(user.role);
}

function toCurrentUser(user: any): CurrentUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    mustChangePassword: Boolean(user.mustChangePassword),
    isDemo: false,
    tenantId: user.tenantId ?? null,
    tenantName: user.tenant?.name ?? null,
    tenantSlug: user.tenant?.slug ?? null,
    tenantStatus: user.tenant?.status ?? null,
    tenantSubscriptionStatus: user.tenant?.subscriptionStatus ?? null,
    isDemoTenant: Boolean(user.tenant?.isDemoTenant),
    primaryOperatingUnitId: user.primaryOperatingUnitId,
    primaryOperatingUnitName: user.primaryOperatingUnit?.name ?? null,
    accessibleOperatingUnits: user.unitAccess.map((access: any) => ({
      id: access.operatingUnit.id,
      name: access.operatingUnit.name,
      code: access.operatingUnit.code,
      type: access.operatingUnit.type,
      branchId: access.operatingUnit.branchId,
      accessLevel: access.accessLevel,
      isPrimary: access.isPrimary
    }))
  };
}

function isTenantActiveForLogin(tenant: { status: TenantStatus; subscriptionStatus: SubscriptionStatus }) {
  if (loginBlockedTenantStatuses.has(tenant.status)) return false;
  if (loginBlockedSubscriptionStatuses.has(tenant.subscriptionStatus)) return false;
  return true;
}

function withTenantWhere(user: CurrentUser, where: Record<string, unknown>) {
  if (!user.tenantId) return where;
  return { ...where, tenantId: user.tenantId };
}

function isDemoAdminBlockedPage(pathname: string) {
  return [
    "/admin/users",
    "/admin/operating-units",
    "/account/change-password",
    "/setup",
    "/platform"
  ].some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
