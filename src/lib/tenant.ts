import "server-only";

import { notFound, redirect } from "next/navigation";
import { SubscriptionStatus, TenantPlan, TenantStatus } from "@prisma/client";
import { getCurrentAccessUser, type CurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const PRIMARY_TENANT_ID = "tenant_portions_primary";
export const DEMO_TENANT_ID = "tenant_portions_demo";
const inactiveTenantStatuses = new Set<TenantStatus>([TenantStatus.SUSPENDED, TenantStatus.DISABLED, TenantStatus.ARCHIVED]);
const inactiveSubscriptionStatuses = new Set<SubscriptionStatus>([SubscriptionStatus.CANCELLED, SubscriptionStatus.PAUSED]);

export type TenantContext = {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  status: TenantStatus;
  plan: TenantPlan;
  subscriptionStatus: SubscriptionStatus;
  isDemoTenant: boolean;
  user: CurrentUser;
};

export async function getCurrentTenant() {
  const user = await getCurrentAccessUser();
  if (!user?.tenantId) return null;
  const tenant = await prisma.tenant.findUnique({
    where: { id: user.tenantId },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      plan: true,
      subscriptionStatus: true,
      isDemoTenant: true
    }
  });
  if (!tenant) return null;
  return { ...tenant, user };
}

export async function requireTenant() {
  const context = await getCurrentTenant();
  if (!context) redirect("/login");
  if (!isTenantActive(context)) redirect("/access-denied");
  return context;
}

export async function getCurrentTenantId() {
  return (await getCurrentTenant())?.id ?? null;
}

export async function requireTenantUser(): Promise<TenantContext> {
  const context = await requireTenant();
  return {
    tenantId: context.id,
    tenantName: context.name,
    tenantSlug: context.slug,
    status: context.status,
    plan: context.plan,
    subscriptionStatus: context.subscriptionStatus,
    isDemoTenant: context.isDemoTenant,
    user: context.user
  };
}

export function isPlatformUser() {
  return false;
}

export async function isDemoTenantSession() {
  const context = await getCurrentTenant();
  return Boolean(context?.isDemoTenant || context?.user.isDemo);
}

export async function getTenantContext() {
  return requireTenantUser();
}

export function tenantWhere(tenantId: string | null | undefined) {
  return tenantId ? { tenantId } : {};
}

export function buildTenantScope(context: Pick<TenantContext, "tenantId">) {
  return tenantWhere(context.tenantId);
}

export function buildTenantBranchScope(context: Pick<TenantContext, "tenantId">, where: Record<string, unknown> = {}) {
  return { ...where, tenantId: context.tenantId };
}

export const buildTenantOperatingUnitScope = buildTenantBranchScope;
export const buildTenantPatientScope = buildTenantBranchScope;
export const buildTenantOrderScope = buildTenantBranchScope;
export const buildTenantEventScope = buildTenantBranchScope;
export const buildTenantCommunicationScope = buildTenantBranchScope;

export function assertTenantRecordAccess<T extends { tenantId?: string | null }>(
  record: T | null | undefined,
  context: Pick<TenantContext, "tenantId">
) {
  if (!record) notFound();
  if (record.tenantId && record.tenantId !== context.tenantId) notFound();
  return record;
}

export function isTenantActive(tenant: Pick<TenantContext, "status" | "subscriptionStatus">) {
  if (inactiveTenantStatuses.has(tenant.status)) return false;
  if (inactiveSubscriptionStatuses.has(tenant.subscriptionStatus)) return false;
  return true;
}

export function requireActiveTenant(context: TenantContext) {
  if (!isTenantActive(context)) redirect("/access-denied");
  return context;
}

export function canTenantUseFeature(context: Pick<TenantContext, "plan" | "subscriptionStatus">, feature: string) {
  if (context.subscriptionStatus === SubscriptionStatus.CANCELLED) return false;
  if (context.plan === TenantPlan.DEMO && ["platform-admin", "security-settings", "destructive-writes"].includes(feature)) return false;
  return true;
}

export function getTenantPlanLimits(plan: TenantPlan) {
  const limits: Record<TenantPlan, { branches: number | null; users: number | null; imports: number | null }> = {
    DEMO: { branches: 5, users: 12, imports: 10 },
    PILOT: { branches: 10, users: 25, imports: 25 },
    STARTER: { branches: 3, users: 12, imports: 10 },
    GROWTH: { branches: 20, users: 75, imports: 100 },
    ENTERPRISE: { branches: null, users: null, imports: null },
    CUSTOM: { branches: null, users: null, imports: null }
  };
  return limits[plan];
}
