import "server-only";

import { ImportBatchStatus, PilotRequestStatus, TenantPlan, TenantStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function getPlatformDashboardData() {
  const [
    totalTenants,
    activePilots,
    activeSubscriptions,
    suspendedTenants,
    demoTenants,
    pendingPilotRequests,
    failedImportBatches,
    recentTenants,
    recentSupportRequests
  ] = await Promise.all([
    prisma.tenant.count(),
    prisma.tenant.count({ where: { plan: TenantPlan.PILOT, status: TenantStatus.ACTIVE } }),
    prisma.tenant.count({ where: { status: TenantStatus.ACTIVE, subscriptionStatus: "ACTIVE" } }),
    prisma.tenant.count({ where: { status: TenantStatus.SUSPENDED } }),
    prisma.tenant.count({ where: { isDemoTenant: true } }),
    prisma.pilotRequest.count({ where: { status: { in: [PilotRequestStatus.NEW, PilotRequestStatus.REVIEWED] } } }),
    prisma.importBatch.count({ where: { status: { in: [ImportBatchStatus.NEEDS_CLEANUP, ImportBatchStatus.DRAFT] }, readinessScore: { lt: 70 } } }),
    prisma.tenant.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        plan: true,
        subscriptionStatus: true,
        isDemoTenant: true,
        createdAt: true
      }
    }),
    prisma.tenantSupportAccessRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { tenant: { select: { name: true } }, requestedByPlatformUser: { select: { name: true } } }
    })
  ]);

  return {
    metrics: {
      totalTenants,
      activePilots,
      activeSubscriptions,
      suspendedTenants,
      demoTenants,
      pendingPilotRequests,
      failedImportBatches,
      systemHealth: suspendedTenants || failedImportBatches ? "Watch" : "Stable"
    },
    recentTenants,
    recentSupportRequests
  };
}

export async function getTenantDirectory() {
  return prisma.tenant.findMany({
    orderBy: [{ status: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      plan: true,
      subscriptionStatus: true,
      country: true,
      currency: true,
      isDemoTenant: true,
      _count: {
        select: {
          appUsers: true,
          operatingUnits: true,
          branches: true,
          importBatches: true,
          supportRequests: true
        }
      }
    }
  });
}

export async function getTenantControlPlaneDetail(id: string) {
  return prisma.tenant.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slug: true,
      legalName: true,
      status: true,
      plan: true,
      subscriptionStatus: true,
      country: true,
      timezone: true,
      currency: true,
      primaryContactName: true,
      primaryContactEmail: true,
      primaryContactPhone: true,
      isDemoTenant: true,
      createdAt: true,
      activatedAt: true,
      suspendedAt: true,
      appUsers: {
        where: { role: { in: ["OWNER", "CEO", "GENERAL_MANAGER", "SYSTEM_ADMIN"] } },
        select: { id: true, name: true, email: true, role: true, status: true, lastLoginAt: true, mustChangePassword: true },
        orderBy: { name: "asc" }
      },
      userInvitations: {
        where: { role: "OWNER" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          expiresAt: true,
          acceptedAt: true,
          revokedAt: true,
          createdAt: true,
          invitedByPlatformUser: { select: { name: true, role: true } }
        },
        orderBy: { createdAt: "desc" },
        take: 8
      },
      operatingUnits: {
        select: { id: true, name: true, type: true, status: true, isPrimaryOnlineUnit: true },
        orderBy: [{ type: "asc" }, { name: "asc" }]
      },
      branches: {
        select: { id: true, name: true },
        orderBy: { name: "asc" }
      },
      supportRequests: {
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { requestedByPlatformUser: { select: { name: true, role: true } } }
      },
      auditLogs: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, actorType: true, actorLabel: true, action: true, recordType: true, outcome: true, createdAt: true }
      },
      _count: {
        select: {
          appUsers: true,
          operatingUnits: true,
          branches: true,
          staffMembers: true,
          patients: true,
          followUpTasks: true,
          orders: true,
          stockItems: true,
          importBatches: true,
          auditLogs: true
        }
      }
    }
  });
}

export async function getPlatformAuditData() {
  return prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { tenant: { select: { name: true, slug: true } } }
  });
}

export async function getPlatformSystemHealth() {
  const [tenants, imports, sessions, support] = await Promise.all([
    prisma.tenant.groupBy({ by: ["status"], _count: true }),
    prisma.importBatch.groupBy({ by: ["status"], _count: true }),
    prisma.platformSession.count({ where: { expiresAt: { gt: new Date() } } }),
    prisma.tenantSupportAccessRequest.count({ where: { status: "APPROVED", expiresAt: { gt: new Date() } } })
  ]);
  return { tenants, imports, activePlatformSessions: sessions, activeSupportAccess: support };
}
