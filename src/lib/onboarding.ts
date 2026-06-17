import "server-only";

import {
  AuditActorType,
  ImportBatchStatus,
  NotificationDeliveryChannel,
  NotificationDeliveryStatus,
  NotificationRecipientType,
  NotificationSeverity,
  NotificationStatus,
  NotificationType,
  OperatingUnitStatus,
  OperatingUnitType,
  PlatformRole,
  Prisma,
  TenantOnboardingStatus,
  TenantOnboardingStepStatus,
  TenantPlan,
  TenantStatus,
  UserRole,
  UserStatus
} from "@prisma/client";
import { buildAuditActor, getCurrentAccessUser, hasPermission, type CurrentUser } from "@/lib/auth";
import { requirePlatformUser, type CurrentPlatformUser } from "@/lib/platform-auth";
import { prisma } from "@/lib/prisma";
import { requireTenantUser } from "@/lib/tenant";

const unresolvedNotificationStatuses: NotificationStatus[] = [
  NotificationStatus.UNREAD,
  NotificationStatus.READ,
  NotificationStatus.ACKNOWLEDGED
];

const reviewPendingStatuses = new Set<TenantOnboardingStatus>([
  TenantOnboardingStatus.READY_FOR_REVIEW,
  TenantOnboardingStatus.UNDER_REVIEW
]);

const reviewStepStatuses = new Set<TenantOnboardingStatus>([
  TenantOnboardingStatus.READY_FOR_REVIEW,
  TenantOnboardingStatus.UNDER_REVIEW,
  TenantOnboardingStatus.BLOCKED
]);

const outputAuditActions = {
  AI_BRIEF: "tenant.output.generated.ai_brief",
  EXECUTIVE_PACK: "tenant.output.generated.executive_pack",
  REPORTS: "tenant.output.generated.reports"
} as const;

type OperationalOutputKey = keyof typeof outputAuditActions;

type ActionLink = {
  label: string;
  href: string;
};

type OnboardingStepDefinition = {
  key: OnboardingStepKey;
  title: string;
  why: string;
  weight: number;
  required: boolean;
  sortOrder: number;
  actionLinks: ActionLink[];
};

type TenantEvidence = {
  tenant: {
    id: string;
    name: string;
    slug: string;
    plan: TenantPlan;
    status: TenantStatus;
    country: string;
    timezone: string;
    currency: string;
    primaryContactName: string | null;
    primaryContactEmail: string | null;
    primaryContactPhone: string | null;
    isDemoTenant: boolean;
    activatedAt: Date | null;
  };
  activeUsers: Array<{
    id: string;
    name: string;
    role: UserRole;
    lastLoginAt: Date | null;
    primaryOperatingUnitId: string | null;
    primaryOperatingUnit: { id: string; tenantId: string | null; name: string } | null;
    unitAccess: Array<{
      operatingUnitId: string;
      isPrimary: boolean;
      operatingUnit: { id: string; tenantId: string | null; name: string };
    }>;
  }>;
  invitedNonOwnerUsers: number;
  pendingOwnerInvitations: number;
  operatingUnits: Array<{
    id: string;
    name: string;
    type: OperatingUnitType;
    status: OperatingUnitStatus;
    whatsappNumber: string | null;
    handlesOnlineOrders: boolean;
    handlesCommunications: boolean;
    isPrimaryOnlineUnit: boolean;
  }>;
  branchCount: number;
  patientCount: number;
  stockCount: number;
  reportCount: number;
  totalImportBatches: number;
  importedBatches: number;
  importedPatientBatches: number;
  importedStockBatches: number;
  outputAuditCount: number;
  permissionHealth: {
    healthy: boolean;
    usersWithoutPrimaryUnit: number;
    usersWithoutUnitAccess: number;
    primaryUnitTenantMismatches: number;
    unitAccessTenantMismatches: number;
    primaryUnitAccessMissing: number;
  };
};

type StepEvaluation = {
  key: OnboardingStepKey;
  title: string;
  why: string;
  weight: number;
  required: boolean;
  sortOrder: number;
  status: TenantOnboardingStepStatus;
  actionLinks: ActionLink[];
  evidence: string[];
  blockers: string[];
  metadata: Prisma.InputJsonValue;
};

type SubmissionPolicy = {
  mode: "FULL" | "PILOT" | "DEMO";
  label: string;
  explanation: string;
  canSubmit: boolean;
  canApprove: boolean;
  minimumRequirementLabels: string[];
  blockingReasons: string[];
  remainingOptionalTasks: string[];
  missingFullActivationRequirements: string[];
};

export const onboardingStepKeys = [
  "OWNER_ACCOUNT",
  "PHARMACY_PROFILE",
  "OPERATING_UNITS",
  "FIRST_BRANCH",
  "PHARMACY_TEAM",
  "WHATSAPP_CONFIGURATION",
  "PATIENT_DATA",
  "STOCK_DATA",
  "PERMISSIONS_REVIEW",
  "FIRST_OPERATIONAL_OUTPUT",
  "GO_LIVE_REVIEW"
] as const;

export type OnboardingStepKey = (typeof onboardingStepKeys)[number];

const onboardingStepDefinitions: Record<OnboardingStepKey, OnboardingStepDefinition> = {
  OWNER_ACCOUNT: {
    key: "OWNER_ACCOUNT",
    title: "Owner account",
    why: "The pharmacy needs a real owner login with first access confirmed before the rollout can be trusted.",
    weight: 10,
    required: true,
    sortOrder: 1,
    actionLinks: [{ label: "Review owner setup", href: "/account" }]
  },
  PHARMACY_PROFILE: {
    key: "PHARMACY_PROFILE",
    title: "Pharmacy profile",
    why: "Timezone, currency, and primary contact details must be confirmed so reporting and notifications are reliable.",
    weight: 10,
    required: true,
    sortOrder: 2,
    actionLinks: [{ label: "Open settings", href: "/settings" }]
  },
  OPERATING_UNITS: {
    key: "OPERATING_UNITS",
    title: "Operating units",
    why: "Head Office, Online Department, and unit ownership give orders, communications, and management activity a proper operating home.",
    weight: 10,
    required: true,
    sortOrder: 3,
    actionLinks: [{ label: "Review operating units", href: "/admin/operating-units" }]
  },
  FIRST_BRANCH: {
    key: "FIRST_BRANCH",
    title: "First branch",
    why: "A physical branch is the minimum unit of revenue, stock, and patient accountability inside PORTIONS.",
    weight: 15,
    required: true,
    sortOrder: 4,
    actionLinks: [{ label: "Create first branch", href: "/branches/new" }]
  },
  PHARMACY_TEAM: {
    key: "PHARMACY_TEAM",
    title: "Pharmacy team",
    why: "An owner alone is not an operating system. At least one more active user must be able to work the pilot.",
    weight: 10,
    required: true,
    sortOrder: 5,
    actionLinks: [
      { label: "Add staff record", href: "/admin/staff/new" },
      { label: "Create staff login", href: "/admin/users/new" }
    ]
  },
  WHATSAPP_CONFIGURATION: {
    key: "WHATSAPP_CONFIGURATION",
    title: "WhatsApp configuration",
    why: "At least one sending unit needs a configured WhatsApp contact point so patient and order workflows can actually move.",
    weight: 10,
    required: true,
    sortOrder: 6,
    actionLinks: [{ label: "Configure WhatsApp", href: "/admin/operating-units" }]
  },
  PATIENT_DATA: {
    key: "PATIENT_DATA",
    title: "Patient data",
    why: "Chronic retention only becomes operational when patients exist in the system or a valid import has succeeded.",
    weight: 10,
    required: true,
    sortOrder: 7,
    actionLinks: [
      { label: "Add patient", href: "/patients/new" },
      { label: "Import patients", href: "/imports" }
    ]
  },
  STOCK_DATA: {
    key: "STOCK_DATA",
    title: "Stock data",
    why: "Stock intelligence only becomes credible when medicines are loaded manually or through an approved import.",
    weight: 10,
    required: true,
    sortOrder: 8,
    actionLinks: [
      { label: "Add stock item", href: "/stock/new" },
      { label: "Import stock", href: "/imports" }
    ]
  },
  PERMISSIONS_REVIEW: {
    key: "PERMISSIONS_REVIEW",
    title: "Permissions review",
    why: "Every active user needs clean tenant-scoped unit access before the pharmacy can safely operate live.",
    weight: 10,
    required: true,
    sortOrder: 9,
    actionLinks: [{ label: "Review users", href: "/admin/users" }]
  },
  FIRST_OPERATIONAL_OUTPUT: {
    key: "FIRST_OPERATIONAL_OUTPUT",
    title: "First operational output",
    why: "The team should produce at least one real brief, report, or executive pack before go-live approval.",
    weight: 5,
    required: true,
    sortOrder: 10,
    actionLinks: [
      { label: "Open AI Brief", href: "/ai-brief" },
      { label: "Open Executive Pack", href: "/executive-pack" },
      { label: "Open reports", href: "/reports" }
    ]
  },
  GO_LIVE_REVIEW: {
    key: "GO_LIVE_REVIEW",
    title: "Go-live review",
    why: "The tenant owner submits readiness and the platform approves, returns changes, or blocks activation with notes.",
    weight: 0,
    required: false,
    sortOrder: 11,
    actionLinks: [{ label: "Review launch state", href: "/onboarding#go-live-review" }]
  }
};

const pilotMinimumKeys: OnboardingStepKey[] = [
  "OWNER_ACCOUNT",
  "PHARMACY_PROFILE",
  "OPERATING_UNITS",
  "FIRST_BRANCH",
  "PHARMACY_TEAM",
  "PERMISSIONS_REVIEW"
];

type OnboardingSummary = Awaited<ReturnType<typeof evaluateTenantOnboarding>>;
type SubmitTenantForReviewResult = {
  outcome: "submitted" | "already_submitted" | "already_active";
  summary: OnboardingSummary;
};

type ReviewTenantOnboardingResult = {
  outcome:
    | "under_review"
    | "already_under_review"
    | "changes_requested"
    | "already_changes_requested"
    | "blocked"
    | "already_blocked"
    | "already_approved"
    | "activated"
    | "already_active";
  summary: OnboardingSummary;
};

export async function getOrCreateTenantOnboarding(tenantId: string, tx?: Prisma.TransactionClient) {
  const client = tx ?? prisma;
  const existing = await client.tenantOnboarding.findUnique({
    where: { tenantId },
    include: { steps: true }
  });

  if (existing) {
    const stepKeys = new Set(existing.steps.map((step) => step.key));
    const missing = onboardingStepKeys.filter((key) => !stepKeys.has(key));
    if (missing.length > 0) {
      await client.tenantOnboardingStep.createMany({
        data: missing.map((key) => {
          const definition = onboardingStepDefinitions[key];
          return {
            tenantId,
            onboardingId: existing.id,
            key,
            title: definition.title,
            status: TenantOnboardingStepStatus.NOT_STARTED,
            required: definition.required,
            sortOrder: definition.sortOrder
          };
        }),
        skipDuplicates: true
      });
      return client.tenantOnboarding.findUniqueOrThrow({
        where: { tenantId },
        include: { steps: true }
      });
    }

    return existing;
  }

  const created = await client.tenantOnboarding.create({
    data: {
      tenantId,
      status: TenantOnboardingStatus.NOT_STARTED,
      readinessScore: 0,
      currentStepKey: "OWNER_ACCOUNT",
      steps: {
        create: onboardingStepKeys.map((key) => {
          const definition = onboardingStepDefinitions[key];
          return {
            tenantId,
            key,
            title: definition.title,
            status: TenantOnboardingStepStatus.NOT_STARTED,
            required: definition.required,
            sortOrder: definition.sortOrder
          };
        })
      }
    },
    include: { steps: true }
  });

  await client.auditLog.create({
    data: {
      tenantId,
      actorType: AuditActorType.SYSTEM,
      actorLabel: "PORTIONS",
      action: "tenant.onboarding.started",
      recordType: "TenantOnboarding",
      recordId: created.id,
      outcome: "SUCCESS"
    }
  });

  return created;
}

export function getTenantReadinessScore(steps: Array<Pick<StepEvaluation, "key" | "weight" | "status">>) {
  const scoredSteps = steps.filter((step) => step.key !== "GO_LIVE_REVIEW");
  const totalWeight = scoredSteps.reduce((sum, step) => sum + step.weight, 0);
  const completedWeight = scoredSteps
    .filter((step) => step.status === TenantOnboardingStepStatus.COMPLETE)
    .reduce((sum, step) => sum + step.weight, 0);

  return totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;
}

export async function getTenantOnboardingSummary() {
  const context = await requireTenantUser();
  return evaluateTenantOnboarding(context.tenantId);
}

export async function getPlatformTenantOnboardingSummary(tenantId: string) {
  return evaluateTenantOnboarding(tenantId);
}

export async function backfillTenantOnboardingRecords() {
  const tenants = await prisma.tenant.findMany({
    select: { id: true }
  });

  for (const tenant of tenants) {
    await prisma.$transaction(async (tx) => {
      await getOrCreateTenantOnboarding(tenant.id, tx);
    });
  }

  return tenants.length;
}

export async function evaluateTenantOnboarding(tenantId: string) {
  return prisma.$transaction(async (tx) => {
    const onboarding = await getOrCreateTenantOnboarding(tenantId, tx);
    const evidence = await collectTenantEvidence(tx, tenantId);
    const stepRows = new Map(onboarding.steps.map((step) => [step.key as OnboardingStepKey, step]));
    const baseSteps = onboardingStepKeys
      .filter((key) => key !== "GO_LIVE_REVIEW")
      .map((key) => evaluateOnboardingStep(key, evidence, onboarding.status));
    const submissionPolicy = getSubmissionPolicy(evidence, baseSteps);
    const goLiveStep = evaluateGoLiveReviewStep(onboarding, submissionPolicy);
    const steps = [...baseSteps, goLiveStep];
    const readinessScore = getTenantReadinessScore(steps);
    const nextStatus = deriveOnboardingStatus(onboarding.status, steps, submissionPolicy);
    const currentStepKey = deriveCurrentStepKey(nextStatus, steps, submissionPolicy);
    const blockers = steps.flatMap((step) => step.blockers).filter(Boolean);
    const currentStep = steps.find((step) => step.key === currentStepKey) ?? steps[0];
    const nextRecommendedAction = currentStep.actionLinks[0] ?? { label: "Open onboarding", href: "/onboarding" };
    const completedRequiredSteps = steps.filter((step) => step.required && step.status === TenantOnboardingStepStatus.COMPLETE).length;
    const totalRequiredSteps = steps.filter((step) => step.required).length;

    const stepUpdates = steps.filter((step) => {
      const persisted = stepRows.get(step.key);
      if (!persisted) return true;
      const nextMetadata = JSON.stringify(step.metadata ?? null);
      const currentMetadata = JSON.stringify(persisted.metadata ?? null);
      return (
        persisted.status !== step.status ||
        persisted.title !== step.title ||
        persisted.required !== step.required ||
        persisted.sortOrder !== step.sortOrder ||
        currentMetadata !== nextMetadata
      );
    });

    for (const step of stepUpdates) {
      const persisted = stepRows.get(step.key);
      const completedAt =
        step.status === TenantOnboardingStepStatus.COMPLETE
          ? persisted?.completedAt ?? new Date()
          : null;
      const skippedAt =
        step.status === TenantOnboardingStepStatus.SKIPPED
          ? persisted?.skippedAt ?? new Date()
          : null;

      await tx.tenantOnboardingStep.upsert({
        where: {
          onboardingId_key: {
            onboardingId: onboarding.id,
            key: step.key
          }
        },
        create: {
          onboardingId: onboarding.id,
          tenantId,
          key: step.key,
          title: step.title,
          status: step.status,
          required: step.required,
          sortOrder: step.sortOrder,
          completedAt,
          skippedAt,
          metadata: step.metadata
        },
        update: {
          title: step.title,
          status: step.status,
          required: step.required,
          sortOrder: step.sortOrder,
          completedAt,
          skippedAt,
          metadata: step.metadata
        }
      });
    }

    const onboardingNeedsUpdate =
      onboarding.status !== nextStatus ||
      onboarding.readinessScore !== readinessScore ||
      onboarding.currentStepKey !== currentStepKey;

    if (onboardingNeedsUpdate) {
      await tx.tenantOnboarding.update({
        where: { id: onboarding.id },
        data: {
          status: nextStatus,
          readinessScore,
          currentStepKey
        }
      });
    }

    const auditEntries: Prisma.AuditLogCreateManyInput[] = [];

    for (const step of stepUpdates) {
      const persisted = stepRows.get(step.key);
      if (step.status === TenantOnboardingStepStatus.COMPLETE && persisted?.status !== TenantOnboardingStepStatus.COMPLETE) {
        auditEntries.push({
          tenantId,
          actorType: AuditActorType.SYSTEM,
          actorLabel: "PORTIONS",
          action: "tenant.onboarding.step.completed",
          recordType: "TenantOnboardingStep",
          recordId: persisted?.id,
          outcome: "SUCCESS",
          metadata: { key: step.key, title: step.title }
        });
      }
    }

    if (onboarding.readinessScore !== readinessScore || onboarding.currentStepKey !== currentStepKey) {
      auditEntries.push({
        tenantId,
        actorType: AuditActorType.SYSTEM,
        actorLabel: "PORTIONS",
        action: "tenant.onboarding.readiness.recalculated",
        recordType: "TenantOnboarding",
        recordId: onboarding.id,
        outcome: "SUCCESS",
        metadata: {
          readinessScore,
          previousReadinessScore: onboarding.readinessScore,
          currentStepKey,
          previousCurrentStepKey: onboarding.currentStepKey
        }
      });
    }

    if (auditEntries.length) {
      await tx.auditLog.createMany({ data: auditEntries });
    }

    const refreshedOnboarding = await tx.tenantOnboarding.findUniqueOrThrow({
      where: { id: onboarding.id }
    });

    const summary = {
      tenant: evidence.tenant,
      onboarding: refreshedOnboarding,
      readinessScore,
      status: refreshedOnboarding.status,
      currentStepKey,
      currentStep,
      nextRecommendedAction,
      blockers: uniqueStrings(blockers),
      steps,
      completedRequiredSteps,
      totalRequiredSteps,
      submissionPolicy,
      counts: {
        activeUsers: evidence.activeUsers.length,
        invitedNonOwnerUsers: evidence.invitedNonOwnerUsers,
        pendingOwnerInvitations: evidence.pendingOwnerInvitations,
        branches: evidence.branchCount,
        patients: evidence.patientCount,
        stockItems: evidence.stockCount,
        operatingUnits: evidence.operatingUnits.length,
        unitsWithWhatsapp: evidence.operatingUnits.filter((unit) => Boolean(unit.whatsappNumber?.trim())).length,
        reports: evidence.reportCount,
        totalImportBatches: evidence.totalImportBatches,
        importedBatches: evidence.importedBatches,
        importedPatientBatches: evidence.importedPatientBatches,
        importedStockBatches: evidence.importedStockBatches
      },
      permissions: evidence.permissionHealth,
      summaryLines: buildSummaryLines(evidence, submissionPolicy, currentStep, readinessScore)
    };

    await syncOnboardingNotification(tx, summary, evidence.activeUsers.find((user) => user.role === UserRole.OWNER) ?? null);
    return summary;
  });
}

export function evaluateOnboardingStep(
  key: Exclude<OnboardingStepKey, "GO_LIVE_REVIEW">,
  evidence: TenantEvidence,
  onboardingStatus: TenantOnboardingStatus
): StepEvaluation {
  const definition = onboardingStepDefinitions[key];
  const activeOwner = evidence.activeUsers.find((user) => user.role === UserRole.OWNER) ?? null;
  const hasHeadOffice = evidence.operatingUnits.some((unit) => unit.type === OperatingUnitType.HEAD_OFFICE);
  const hasOnlineDepartment = evidence.operatingUnits.some((unit) => unit.type === OperatingUnitType.ONLINE_DEPARTMENT || unit.isPrimaryOnlineUnit);
  const unitsWithWhatsapp = evidence.operatingUnits.filter((unit) => Boolean(unit.whatsappNumber?.trim())).length;
  const patientReady = evidence.patientCount > 0 || evidence.importedPatientBatches > 0;
  const stockReady = evidence.stockCount > 0 || evidence.importedStockBatches > 0;
  const outputReady = evidence.reportCount > 0 || evidence.outputAuditCount > 0;
  const base = {
    key,
    title: definition.title,
    why: definition.why,
    weight: definition.weight,
    required: definition.required,
    sortOrder: definition.sortOrder,
    actionLinks: definition.actionLinks
  };

  if (key === "OWNER_ACCOUNT") {
    if (activeOwner?.lastLoginAt) {
      return {
        ...base,
        status: TenantOnboardingStepStatus.COMPLETE,
        evidence: [
          `${activeOwner.name} is active as tenant owner.`,
          `First login recorded${evidence.tenant.isDemoTenant && !activeOwner ? " through demo access." : "."}`
        ],
        blockers: [],
        metadata: { ownerId: activeOwner.id, ownerName: activeOwner.name, lastLoginAt: activeOwner.lastLoginAt.toISOString() }
      };
    }

    if (evidence.tenant.isDemoTenant && evidence.tenant.status === TenantStatus.ACTIVE) {
      return {
        ...base,
        status: TenantOnboardingStepStatus.COMPLETE,
        evidence: ["Demo tenant access is active and treated as the owner-equivalent entry point for onboarding."],
        blockers: [],
        metadata: { demoPolicy: true }
      };
    }

    if (activeOwner) {
      return {
        ...base,
        status: TenantOnboardingStepStatus.IN_PROGRESS,
        evidence: [`${activeOwner.name} is active as owner.`],
        blockers: ["The owner still needs to complete the first login handoff."],
        metadata: { ownerId: activeOwner.id, ownerName: activeOwner.name }
      };
    }

    return {
      ...base,
      status: evidence.pendingOwnerInvitations > 0 ? TenantOnboardingStepStatus.IN_PROGRESS : TenantOnboardingStepStatus.NOT_STARTED,
      evidence: evidence.pendingOwnerInvitations > 0 ? [`${evidence.pendingOwnerInvitations} owner invitation is still pending.`] : [],
      blockers: ["No active owner account has completed the initial handoff yet."],
      metadata: { pendingOwnerInvitations: evidence.pendingOwnerInvitations }
    };
  }

  if (key === "PHARMACY_PROFILE") {
    const missing = [
      !evidence.tenant.primaryContactName ? "primary contact name" : null,
      !evidence.tenant.primaryContactEmail && !evidence.tenant.primaryContactPhone ? "primary contact email or phone" : null
    ].filter(Boolean) as string[];

    return {
      ...base,
      status: missing.length === 0 ? TenantOnboardingStepStatus.COMPLETE : TenantOnboardingStepStatus.IN_PROGRESS,
      evidence: [
        `${evidence.tenant.country}, ${evidence.tenant.timezone}, and ${evidence.tenant.currency} are configured.`,
        evidence.tenant.primaryContactName ? `Primary contact: ${evidence.tenant.primaryContactName}.` : "Primary contact still needs confirmation."
      ],
      blockers: missing.length ? [`Confirm ${missing.join(" and ")} in Settings.`] : [],
      metadata: { missing, contactConfigured: missing.length === 0 }
    };
  }

  if (key === "OPERATING_UNITS") {
    const unitAccessValid =
      evidence.permissionHealth.primaryUnitTenantMismatches === 0 &&
      evidence.permissionHealth.unitAccessTenantMismatches === 0;
    const blockers = [
      !hasHeadOffice ? "Head Office operating unit is missing." : null,
      !hasOnlineDepartment ? "Review or create the Online Department so digital work has an operating home." : null,
      !unitAccessValid ? "Operating-unit tenant alignment needs review before go-live." : null
    ].filter(Boolean) as string[];

    return {
      ...base,
      status:
        hasHeadOffice && hasOnlineDepartment && unitAccessValid
          ? TenantOnboardingStepStatus.COMPLETE
          : hasHeadOffice || evidence.operatingUnits.length > 0
            ? TenantOnboardingStepStatus.IN_PROGRESS
            : TenantOnboardingStepStatus.NOT_STARTED,
      evidence: [
        `${evidence.operatingUnits.length} active operating units configured.`,
        hasHeadOffice ? "Head Office is available." : "Head Office is still missing.",
        hasOnlineDepartment ? "Online Department has been configured." : "Online Department is still pending."
      ],
      blockers,
      metadata: {
        operatingUnitCount: evidence.operatingUnits.length,
        hasHeadOffice,
        hasOnlineDepartment,
        unitAccessValid
      }
    };
  }

  if (key === "FIRST_BRANCH") {
    return {
      ...base,
      status:
        evidence.branchCount >= 1
          ? TenantOnboardingStepStatus.COMPLETE
          : TenantOnboardingStepStatus.NOT_STARTED,
      evidence: evidence.branchCount > 0 ? [`${evidence.branchCount} branch records are active.`] : [],
      blockers: evidence.branchCount > 0 ? [] : ["Create the first physical branch before the pharmacy can operate live."],
      metadata: { branchCount: evidence.branchCount }
    };
  }

  if (key === "PHARMACY_TEAM") {
    const additionalActiveUsers = evidence.activeUsers.filter((user) => user.role !== UserRole.OWNER).length;
    const blockers = additionalActiveUsers >= 1 ? [] : ["Create at least one additional active staff login for branch, stock, or follow-up execution."];
    if (evidence.invitedNonOwnerUsers > 0 && additionalActiveUsers === 0) {
      blockers.push("A staff login is invited but not active yet.");
    }

    return {
      ...base,
      status:
        additionalActiveUsers >= 1
          ? TenantOnboardingStepStatus.COMPLETE
          : evidence.invitedNonOwnerUsers > 0
            ? TenantOnboardingStepStatus.IN_PROGRESS
            : TenantOnboardingStepStatus.NOT_STARTED,
      evidence: [
        `${evidence.activeUsers.length} active user accounts detected.`,
        additionalActiveUsers > 0 ? `${additionalActiveUsers} active non-owner users can execute daily work.` : "No active non-owner users yet."
      ],
      blockers,
      metadata: {
        activeUsers: evidence.activeUsers.length,
        additionalActiveUsers,
        invitedNonOwnerUsers: evidence.invitedNonOwnerUsers
      }
    };
  }

  if (key === "WHATSAPP_CONFIGURATION") {
    return {
      ...base,
      status:
        unitsWithWhatsapp > 0
          ? TenantOnboardingStepStatus.COMPLETE
          : evidence.operatingUnits.length > 0
            ? TenantOnboardingStepStatus.IN_PROGRESS
            : TenantOnboardingStepStatus.NOT_STARTED,
      evidence: unitsWithWhatsapp > 0 ? [`${unitsWithWhatsapp} operating units have a WhatsApp sender configured.`] : ["No active operating unit has a WhatsApp sender configured yet."],
      blockers: unitsWithWhatsapp > 0 ? [] : ["Configure a sending WhatsApp number on at least one active operating unit."],
      metadata: { unitsWithWhatsapp }
    };
  }

  if (key === "PATIENT_DATA") {
    return {
      ...base,
      status:
        patientReady
          ? TenantOnboardingStepStatus.COMPLETE
          : TenantOnboardingStepStatus.IN_PROGRESS,
      evidence: [
        `${evidence.patientCount} patient records are live.`,
        `${evidence.importedPatientBatches} chronic patient import batches completed successfully.`
      ],
      blockers: patientReady ? [] : ["Add the first patient or complete a chronic-patients import batch."],
      metadata: { patientCount: evidence.patientCount, importedPatientBatches: evidence.importedPatientBatches }
    };
  }

  if (key === "STOCK_DATA") {
    return {
      ...base,
      status:
        stockReady
          ? TenantOnboardingStepStatus.COMPLETE
          : TenantOnboardingStepStatus.IN_PROGRESS,
      evidence: [
        `${evidence.stockCount} stock records are live.`,
        `${evidence.importedStockBatches} stock import batches completed successfully.`
      ],
      blockers: stockReady ? [] : ["Add the first stock item or complete a stock-items import batch."],
      metadata: { stockCount: evidence.stockCount, importedStockBatches: evidence.importedStockBatches }
    };
  }

  if (key === "PERMISSIONS_REVIEW") {
    const blockers = [
      evidence.permissionHealth.usersWithoutPrimaryUnit > 0 ? `${evidence.permissionHealth.usersWithoutPrimaryUnit} active users have no primary operating unit.` : null,
      evidence.permissionHealth.usersWithoutUnitAccess > 0 ? `${evidence.permissionHealth.usersWithoutUnitAccess} active users have no operating-unit access.` : null,
      evidence.permissionHealth.primaryUnitTenantMismatches > 0 ? `${evidence.permissionHealth.primaryUnitTenantMismatches} primary units point across tenant boundaries.` : null,
      evidence.permissionHealth.unitAccessTenantMismatches > 0 ? `${evidence.permissionHealth.unitAccessTenantMismatches} user-access records cross tenant boundaries.` : null,
      evidence.permissionHealth.primaryUnitAccessMissing > 0 ? `${evidence.permissionHealth.primaryUnitAccessMissing} primary units are missing matching access records.` : null
    ].filter(Boolean) as string[];

    return {
      ...base,
      status:
        evidence.permissionHealth.healthy
          ? TenantOnboardingStepStatus.COMPLETE
          : evidence.activeUsers.length > 0
            ? TenantOnboardingStepStatus.IN_PROGRESS
            : TenantOnboardingStepStatus.NOT_STARTED,
      evidence: [
        `${evidence.activeUsers.length} active users reviewed for tenant isolation.`,
        evidence.permissionHealth.healthy ? "No tenant-scoped access mismatches were detected." : "Permission cleanup is still required."
      ],
      blockers,
      metadata: evidence.permissionHealth
    };
  }

  return {
    ...base,
    status: outputReady ? TenantOnboardingStepStatus.COMPLETE : TenantOnboardingStepStatus.IN_PROGRESS,
    evidence: [
      `${evidence.reportCount} persisted reports are available.`,
      evidence.outputAuditCount > 0 ? `${evidence.outputAuditCount} live operational outputs have been opened.` : "No AI Brief, Executive Pack, or report launch has been recorded yet."
    ],
    blockers: outputReady ? [] : ["Open AI Brief, Executive Pack, or Reports once to generate the first operational output trail."],
    metadata: { reportCount: evidence.reportCount, outputAuditCount: evidence.outputAuditCount, onboardingStatus }
  };
}

export async function submitTenantForReview(): Promise<SubmitTenantForReviewResult> {
  const user = await getCurrentAccessUser();
  if (!user?.tenantId || !hasPermission(user, "managePilot")) throw new Error("You do not have permission to submit onboarding for review.");

  const summary = await evaluateTenantOnboarding(user.tenantId);
  if (!summary.submissionPolicy.canSubmit) {
    throw new Error(summary.submissionPolicy.blockingReasons[0] ?? "Complete the remaining onboarding requirements before submitting for review.");
  }
  if (reviewPendingStatuses.has(summary.status)) {
    return { outcome: "already_submitted", summary };
  }
  if (summary.status === TenantOnboardingStatus.APPROVED || summary.status === TenantOnboardingStatus.ACTIVE) {
    return { outcome: "already_active", summary };
  }

  await prisma.$transaction(async (tx) => {
    await tx.tenantOnboarding.update({
      where: { id: summary.onboarding.id },
      data: {
        status: TenantOnboardingStatus.READY_FOR_REVIEW,
        submittedAt: new Date(),
        blockedAt: null,
        currentStepKey: "GO_LIVE_REVIEW"
      }
    });

    await tx.auditLog.create({
      data: {
        tenantId: user.tenantId,
        actorType: user.isDemo ? AuditActorType.DEMO_USER : AuditActorType.TENANT_USER,
        actorId: user.isDemo ? null : user.id,
        actorLabel: buildAuditActor(user),
        action: "tenant.onboarding.review_submitted",
        recordType: "TenantOnboarding",
        recordId: summary.onboarding.id,
        outcome: "SUCCESS",
        metadata: {
          readinessScore: summary.readinessScore,
          policy: summary.submissionPolicy.mode
        }
      }
    });
  });

  return {
    outcome: "submitted",
    summary: await evaluateTenantOnboarding(user.tenantId)
  };
}

export async function reviewTenantOnboarding(input: {
  tenantId: string;
  decision: "UNDER_REVIEW" | "REQUEST_CHANGES" | "APPROVE" | "BLOCK";
  reviewNotes?: string;
}): Promise<ReviewTenantOnboardingResult> {
  const reviewer = await requirePlatformUser([PlatformRole.PLATFORM_OWNER, PlatformRole.PLATFORM_ADMIN]);
  const notes = cleanText(input.reviewNotes);
  const summary = await evaluateTenantOnboarding(input.tenantId);

  if (summary.status === TenantOnboardingStatus.ACTIVE) {
    return { outcome: "already_active", summary };
  }
  if (summary.status === TenantOnboardingStatus.APPROVED) {
    return { outcome: "already_approved", summary };
  }

  if (input.decision === "APPROVE") {
    return activateTenantFromOnboarding(input.tenantId, reviewer, notes);
  }

  if ((input.decision === "REQUEST_CHANGES" || input.decision === "BLOCK") && !notes) {
    throw new Error("Review notes are required for this decision.");
  }
  if (input.decision === "UNDER_REVIEW" && summary.status === TenantOnboardingStatus.UNDER_REVIEW && (notes || "") === (summary.onboarding.reviewNotes || "")) {
    return { outcome: "already_under_review", summary };
  }
  if (input.decision === "REQUEST_CHANGES" && summary.status === TenantOnboardingStatus.CHANGES_REQUESTED && notes === (summary.onboarding.reviewNotes || "")) {
    return { outcome: "already_changes_requested", summary };
  }
  if (input.decision === "BLOCK" && summary.status === TenantOnboardingStatus.BLOCKED && notes === (summary.onboarding.reviewNotes || "")) {
    return { outcome: "already_blocked", summary };
  }

  await prisma.$transaction(async (tx) => {
    if (input.decision === "UNDER_REVIEW") {
      await tx.tenantOnboarding.update({
        where: { id: summary.onboarding.id },
        data: {
          status: TenantOnboardingStatus.UNDER_REVIEW,
          reviewedAt: new Date(),
          reviewedByPlatformUserId: reviewer.id,
          reviewNotes: notes || summary.onboarding.reviewNotes
        }
      });
    } else if (input.decision === "REQUEST_CHANGES") {
      await tx.tenantOnboarding.update({
        where: { id: summary.onboarding.id },
        data: {
          status: TenantOnboardingStatus.CHANGES_REQUESTED,
          reviewedAt: new Date(),
          reviewedByPlatformUserId: reviewer.id,
          reviewNotes: notes,
          blockedAt: null
        }
      });
    } else {
      await tx.tenantOnboarding.update({
        where: { id: summary.onboarding.id },
        data: {
          status: TenantOnboardingStatus.BLOCKED,
          reviewedAt: new Date(),
          reviewedByPlatformUserId: reviewer.id,
          reviewNotes: notes,
          blockedAt: new Date()
        }
      });
      await tx.tenant.update({
        where: { id: input.tenantId },
        data: {
          status: TenantStatus.SUSPENDED,
          suspendedAt: new Date()
        }
      });
    }

    await tx.auditLog.create({
      data: {
        tenantId: input.tenantId,
        actorType: AuditActorType.PLATFORM_USER,
        actorId: reviewer.id,
        actorLabel: `${reviewer.name} (${reviewer.role})`,
        action:
          input.decision === "UNDER_REVIEW"
            ? "tenant.onboarding.review_started"
            : input.decision === "REQUEST_CHANGES"
              ? "tenant.onboarding.changes_requested"
              : "tenant.onboarding.blocked",
        recordType: "TenantOnboarding",
        recordId: summary.onboarding.id,
        outcome: "SUCCESS",
        metadata: { reviewNotes: notes || null }
      }
    });
  });

  return {
    outcome:
      input.decision === "UNDER_REVIEW"
        ? "under_review"
        : input.decision === "REQUEST_CHANGES"
          ? "changes_requested"
          : "blocked",
    summary: await evaluateTenantOnboarding(input.tenantId)
  };
}

export async function activateTenantFromOnboarding(
  tenantId: string,
  reviewer?: CurrentPlatformUser | null,
  reviewNotes = ""
): Promise<ReviewTenantOnboardingResult> {
  const platformReviewer = reviewer ?? await requirePlatformUser([PlatformRole.PLATFORM_OWNER, PlatformRole.PLATFORM_ADMIN]);
  const summary = await evaluateTenantOnboarding(tenantId);

  if (!summary.submissionPolicy.canApprove) {
    throw new Error(summary.submissionPolicy.blockingReasons[0] ?? "This tenant is not ready for activation.");
  }
  if (summary.status === TenantOnboardingStatus.ACTIVE) {
    return { outcome: "already_active", summary };
  }
  if (summary.status === TenantOnboardingStatus.APPROVED) {
    return { outcome: "already_approved", summary };
  }
  if (
    summary.status !== TenantOnboardingStatus.READY_FOR_REVIEW &&
    summary.status !== TenantOnboardingStatus.UNDER_REVIEW &&
    summary.status !== TenantOnboardingStatus.CHANGES_REQUESTED
  ) {
    throw new Error("Submit this tenant for go-live review before activation.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.tenantOnboarding.update({
      where: { id: summary.onboarding.id },
      data: {
        status: TenantOnboardingStatus.APPROVED,
        reviewedAt: new Date(),
        reviewedByPlatformUserId: platformReviewer.id,
        reviewNotes: reviewNotes || summary.onboarding.reviewNotes,
        activatedAt: null,
        blockedAt: null
      }
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        actorType: AuditActorType.PLATFORM_USER,
        actorId: platformReviewer.id,
        actorLabel: `${platformReviewer.name} (${platformReviewer.role})`,
        action: "tenant.onboarding.review_approved",
        recordType: "TenantOnboarding",
        recordId: summary.onboarding.id,
        outcome: "SUCCESS",
        metadata: {
          readinessScore: summary.readinessScore,
          policy: summary.submissionPolicy.mode
        }
      }
    });

    const activatedAt = new Date();
    await tx.tenantOnboarding.update({
      where: { id: summary.onboarding.id },
      data: {
        status: TenantOnboardingStatus.ACTIVE,
        activatedAt,
        currentStepKey: deriveCurrentStepKey(TenantOnboardingStatus.ACTIVE, summary.steps, summary.submissionPolicy)
      }
    });
    await tx.tenant.update({
      where: { id: tenantId },
      data: {
        status: TenantStatus.ACTIVE,
        activatedAt,
        suspendedAt: null
      }
    });
    await tx.auditLog.create({
      data: {
        tenantId,
        actorType: AuditActorType.PLATFORM_USER,
        actorId: platformReviewer.id,
        actorLabel: `${platformReviewer.name} (${platformReviewer.role})`,
        action: "tenant.activated",
        recordType: "Tenant",
        recordId: tenantId,
        outcome: "SUCCESS"
      }
    });
  });

  return {
    outcome: "activated",
    summary: await evaluateTenantOnboarding(tenantId)
  };
}

export async function recordOperationalOutput(output: OperationalOutputKey) {
  const user = await getCurrentAccessUser();
  if (!user?.tenantId) return null;
  const action = outputAuditActions[output];
  const existing = await prisma.auditLog.findFirst({
    where: {
      tenantId: user.tenantId,
      action,
      recordType: "TenantOperationalOutput",
      recordId: output
    },
    select: { id: true }
  });

  if (!existing) {
    await prisma.auditLog.create({
      data: {
        tenantId: user.tenantId,
        actorType: user.isDemo ? AuditActorType.DEMO_USER : AuditActorType.TENANT_USER,
        actorId: user.isDemo ? null : user.id,
        actorLabel: user.isDemo ? "PORTIONS Demo User" : buildAuditActor(user),
        action,
        recordType: "TenantOperationalOutput",
        recordId: output,
        outcome: "SUCCESS"
      }
    });
  }

  return evaluateTenantOnboarding(user.tenantId);
}

function evaluateGoLiveReviewStep(
  onboarding: {
    status: TenantOnboardingStatus;
    submittedAt: Date | null;
    reviewedAt: Date | null;
    activatedAt: Date | null;
    blockedAt: Date | null;
    reviewNotes: string | null;
  },
  policy: SubmissionPolicy
): StepEvaluation {
  const definition = onboardingStepDefinitions.GO_LIVE_REVIEW;
  const base = {
    key: definition.key,
    title: definition.title,
    why: definition.why,
    weight: definition.weight,
    required: definition.required,
    sortOrder: definition.sortOrder,
    actionLinks: definition.actionLinks
  };

  if (onboarding.status === TenantOnboardingStatus.ACTIVE || onboarding.status === TenantOnboardingStatus.APPROVED) {
    return {
      ...base,
      status: TenantOnboardingStepStatus.COMPLETE,
      evidence: [onboarding.activatedAt ? `Activation approved on ${onboarding.activatedAt.toISOString()}.` : "Platform approval has been recorded."],
      blockers: [],
      metadata: {
        status: onboarding.status,
        activatedAt: onboarding.activatedAt?.toISOString() ?? null
      }
    };
  }

  if (onboarding.status === TenantOnboardingStatus.BLOCKED) {
    return {
      ...base,
      status: TenantOnboardingStepStatus.BLOCKED,
      evidence: onboarding.reviewNotes ? [`Platform notes: ${onboarding.reviewNotes}`] : [],
      blockers: [onboarding.reviewNotes || "Platform review has blocked this tenant until the issue is resolved."],
      metadata: { status: onboarding.status, blockedAt: onboarding.blockedAt?.toISOString() ?? null }
    };
  }

  if (onboarding.status === TenantOnboardingStatus.CHANGES_REQUESTED) {
    return {
      ...base,
      status: TenantOnboardingStepStatus.BLOCKED,
      evidence: onboarding.reviewNotes ? [`Review notes: ${onboarding.reviewNotes}`] : [],
      blockers: [onboarding.reviewNotes || "Platform review has requested changes before activation."],
      metadata: { status: onboarding.status, reviewedAt: onboarding.reviewedAt?.toISOString() ?? null }
    };
  }

  if (onboarding.status === TenantOnboardingStatus.READY_FOR_REVIEW || onboarding.status === TenantOnboardingStatus.UNDER_REVIEW) {
    return {
      ...base,
      status: TenantOnboardingStepStatus.IN_PROGRESS,
      evidence: [
        onboarding.submittedAt ? `Submitted on ${onboarding.submittedAt.toISOString()}.` : "Tenant readiness has been submitted.",
        onboarding.reviewedAt ? `Platform review touched on ${onboarding.reviewedAt.toISOString()}.` : "Awaiting platform decision."
      ],
      blockers: [],
      metadata: { status: onboarding.status, submittedAt: onboarding.submittedAt?.toISOString() ?? null }
    };
  }

  return {
    ...base,
    status: policy.canSubmit ? TenantOnboardingStepStatus.IN_PROGRESS : TenantOnboardingStepStatus.NOT_STARTED,
    evidence: policy.canSubmit ? ["Activation requirements are complete enough for submission."] : [],
    blockers: policy.canSubmit ? [] : [policy.blockingReasons[0] ?? "Complete the remaining onboarding requirements before submitting for review."],
    metadata: { status: onboarding.status, policy: policy.mode }
  };
}

function getSubmissionPolicy(evidence: TenantEvidence, steps: StepEvaluation[]): SubmissionPolicy {
  const stepByKey = new Map(steps.map((step) => [step.key, step]));
  const fullMissing = steps.filter((step) => step.required && step.status !== TenantOnboardingStepStatus.COMPLETE);
  const pilotMissing = pilotMinimumKeys
    .map((key) => stepByKey.get(key))
    .filter((step): step is StepEvaluation => Boolean(step))
    .filter((step) => step.status !== TenantOnboardingStepStatus.COMPLETE);
  const patientReady = stepByKey.get("PATIENT_DATA")?.status === TenantOnboardingStepStatus.COMPLETE;
  const stockReady = stepByKey.get("STOCK_DATA")?.status === TenantOnboardingStepStatus.COMPLETE;
  const hasOperationalCategory = Boolean(patientReady || stockReady);
  const missingFullActivationRequirements = fullMissing.map((step) => step.title);
  const remainingOptionalTasks = steps
    .filter((step) => step.key !== "GO_LIVE_REVIEW")
    .filter((step) => step.status !== TenantOnboardingStepStatus.COMPLETE)
    .map((step) => step.title);

  if (evidence.tenant.isDemoTenant || evidence.tenant.plan === TenantPlan.DEMO) {
    const blockingReasons = [
      ...pilotMissing.map((step) => `${step.title} is still incomplete.`),
      !hasOperationalCategory ? "At least one operational data category must be active for a demo-ready tenant." : null
    ].filter(Boolean) as string[];

    return {
      mode: "DEMO",
      label: "Demo readiness policy",
      explanation: "Demo tenants can be activated on a softer minimum so guided walkthroughs can continue, but missing rollout tasks stay visible until they are evidenced.",
      canSubmit: blockingReasons.length === 0,
      canApprove: blockingReasons.length === 0,
      minimumRequirementLabels: [
        ...pilotMinimumKeys.map((key) => onboardingStepDefinitions[key].title),
        "At least one operational data category: patient data or stock data"
      ],
      blockingReasons,
      remainingOptionalTasks: remainingOptionalTasks.filter((title) => !pilotMissing.some((step) => step.title === title) && title !== "Patient data" && title !== "Stock data"),
      missingFullActivationRequirements
    };
  }

  if (evidence.tenant.plan === TenantPlan.PILOT) {
    const blockingReasons = [
      ...pilotMissing.map((step) => `${step.title} is still incomplete.`),
      !hasOperationalCategory ? "At least one operational data category must be live for pilot go-live review." : null
    ].filter(Boolean) as string[];

    return {
      mode: "PILOT",
      label: "Pilot minimum policy",
      explanation: "Pilot tenants may submit before both patient and stock data are live, but owner access, branch setup, team setup, and permissions must be clean first.",
      canSubmit: blockingReasons.length === 0,
      canApprove: blockingReasons.length === 0,
      minimumRequirementLabels: [
        ...pilotMinimumKeys.map((key) => onboardingStepDefinitions[key].title),
        "At least one operational data category: patient data or stock data"
      ],
      blockingReasons,
      remainingOptionalTasks: remainingOptionalTasks.filter((title) => !pilotMissing.some((step) => step.title === title) && title !== "Patient data" && title !== "Stock data"),
      missingFullActivationRequirements
    };
  }

  return {
    mode: "FULL",
    label: "Full activation policy",
    explanation: "Standard tenants must complete every required onboarding step before platform activation.",
    canSubmit: fullMissing.length === 0,
    canApprove: fullMissing.length === 0,
    minimumRequirementLabels: steps.filter((step) => step.required).map((step) => step.title),
    blockingReasons: fullMissing.map((step) => `${step.title} is still incomplete.`),
    remainingOptionalTasks: [],
    missingFullActivationRequirements
  };
}

function deriveOnboardingStatus(
  currentStatus: TenantOnboardingStatus,
  steps: StepEvaluation[],
  policy: SubmissionPolicy
) {
  if (currentStatus === TenantOnboardingStatus.BLOCKED) return TenantOnboardingStatus.BLOCKED;
  if (currentStatus === TenantOnboardingStatus.ACTIVE) return TenantOnboardingStatus.ACTIVE;
  if (currentStatus === TenantOnboardingStatus.APPROVED) return TenantOnboardingStatus.APPROVED;
  if (currentStatus === TenantOnboardingStatus.READY_FOR_REVIEW) return TenantOnboardingStatus.READY_FOR_REVIEW;
  if (currentStatus === TenantOnboardingStatus.UNDER_REVIEW) return TenantOnboardingStatus.UNDER_REVIEW;
  if (currentStatus === TenantOnboardingStatus.CHANGES_REQUESTED) return TenantOnboardingStatus.CHANGES_REQUESTED;

  const scoredSteps = steps.filter((step) => step.key !== "GO_LIVE_REVIEW");
  const completedScoredSteps = scoredSteps.filter((step) => step.status === TenantOnboardingStepStatus.COMPLETE).length;
  if (completedScoredSteps === 0) return TenantOnboardingStatus.NOT_STARTED;
  if (policy.canSubmit) return TenantOnboardingStatus.WAITING_FOR_TENANT;
  return TenantOnboardingStatus.IN_PROGRESS;
}

function deriveCurrentStepKey(
  status: TenantOnboardingStatus,
  steps: StepEvaluation[],
  policy: SubmissionPolicy
): OnboardingStepKey {
  if (reviewStepStatuses.has(status)) {
    return "GO_LIVE_REVIEW";
  }

  if (status === TenantOnboardingStatus.CHANGES_REQUESTED && policy.canSubmit) {
    return "GO_LIVE_REVIEW";
  }

  const missing = steps
    .filter((step) => step.key !== "GO_LIVE_REVIEW")
    .find((step) => step.status !== TenantOnboardingStepStatus.COMPLETE);

  return missing?.key ?? "GO_LIVE_REVIEW";
}

async function collectTenantEvidence(tx: Prisma.TransactionClient, tenantId: string): Promise<TenantEvidence> {
  const now = new Date();
  const [
    tenant,
    activeUsers,
    invitedNonOwnerUsers,
    pendingOwnerInvitations,
    operatingUnits,
    branchCount,
    patientCount,
    stockCount,
    reportCount,
    totalImportBatches,
    importedBatches,
    importedPatientBatches,
    importedStockBatches,
    outputAuditCount
  ] = await Promise.all([
    tx.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        status: true,
        country: true,
        timezone: true,
        currency: true,
        primaryContactName: true,
        primaryContactEmail: true,
        primaryContactPhone: true,
        isDemoTenant: true,
        activatedAt: true
      }
    }),
    tx.appUser.findMany({
      where: { tenantId, status: UserStatus.ACTIVE },
      select: {
        id: true,
        name: true,
        role: true,
        lastLoginAt: true,
        primaryOperatingUnitId: true,
        primaryOperatingUnit: { select: { id: true, tenantId: true, name: true } },
        unitAccess: {
          select: {
            operatingUnitId: true,
            isPrimary: true,
            operatingUnit: { select: { id: true, tenantId: true, name: true } }
          }
        }
      }
    }),
    tx.appUser.count({
      where: {
        tenantId,
        status: UserStatus.INVITED,
        role: { not: UserRole.OWNER }
      }
    }),
    tx.tenantUserInvitation.count({
      where: {
        tenantId,
        role: UserRole.OWNER,
        status: "PENDING",
        expiresAt: { gt: now }
      }
    }),
    tx.operatingUnit.findMany({
      where: { tenantId, status: { not: OperatingUnitStatus.INACTIVE } },
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        whatsappNumber: true,
        handlesOnlineOrders: true,
        handlesCommunications: true,
        isPrimaryOnlineUnit: true
      },
      orderBy: [{ type: "asc" }, { name: "asc" }]
    }),
    tx.branch.count({ where: { tenantId } }),
    tx.patient.count({ where: { tenantId } }),
    tx.stockItem.count({ where: { tenantId } }),
    tx.report.count({ where: { tenantId } }),
    tx.importBatch.count({ where: { tenantId } }),
    tx.importBatch.count({ where: { tenantId, status: ImportBatchStatus.IMPORTED } }),
    tx.importBatch.count({
      where: {
        tenantId,
        status: ImportBatchStatus.IMPORTED,
        templateType: "chronic-patients"
      }
    }),
    tx.importBatch.count({
      where: {
        tenantId,
        status: ImportBatchStatus.IMPORTED,
        templateType: "stock-items"
      }
    }),
    tx.auditLog.count({
      where: {
        tenantId,
        action: { in: Object.values(outputAuditActions) }
      }
    })
  ]);

  if (!tenant) throw new Error("Tenant onboarding context could not be loaded.");

  const usersWithoutPrimaryUnit = activeUsers.filter((user) => !user.primaryOperatingUnitId).length;
  const usersWithoutUnitAccess = activeUsers.filter((user) => user.unitAccess.length === 0).length;
  const primaryUnitTenantMismatches = activeUsers.filter(
    (user) => user.primaryOperatingUnit && user.primaryOperatingUnit.tenantId !== tenantId
  ).length;
  const unitAccessTenantMismatches = activeUsers.reduce((sum, user) => (
    sum + user.unitAccess.filter((access) => access.operatingUnit.tenantId !== tenantId).length
  ), 0);
  const primaryUnitAccessMissing = activeUsers.filter((user) => (
    Boolean(user.primaryOperatingUnitId) &&
    !user.unitAccess.some((access) => access.operatingUnitId === user.primaryOperatingUnitId)
  )).length;

  return {
    tenant,
    activeUsers,
    invitedNonOwnerUsers,
    pendingOwnerInvitations,
    operatingUnits,
    branchCount,
    patientCount,
    stockCount,
    reportCount,
    totalImportBatches,
    importedBatches,
    importedPatientBatches,
    importedStockBatches,
    outputAuditCount,
    permissionHealth: {
      healthy:
        usersWithoutPrimaryUnit === 0 &&
        usersWithoutUnitAccess === 0 &&
        primaryUnitTenantMismatches === 0 &&
        unitAccessTenantMismatches === 0 &&
        primaryUnitAccessMissing === 0 &&
        activeUsers.length > 0,
      usersWithoutPrimaryUnit,
      usersWithoutUnitAccess,
      primaryUnitTenantMismatches,
      unitAccessTenantMismatches,
      primaryUnitAccessMissing
    }
  };
}

async function syncOnboardingNotification(
  tx: Prisma.TransactionClient,
  summary: {
    tenant: TenantEvidence["tenant"];
    onboarding: {
      id: string;
      tenantId: string;
      status: TenantOnboardingStatus;
      readinessScore: number;
      currentStepKey: string;
      reviewNotes: string | null;
    };
    currentStep: StepEvaluation;
    submissionPolicy: SubmissionPolicy;
    blockers: string[];
  },
  owner: TenantEvidence["activeUsers"][number] | null
) {
  const currentNotification = await tx.notification.findFirst({
    where: {
      tenantId: summary.tenant.id,
      sourceType: "TENANT_ONBOARDING",
      sourceId: summary.onboarding.id,
      status: { in: unresolvedNotificationStatuses }
    },
    orderBy: { createdAt: "asc" }
  });

  const candidate = buildOnboardingNotificationCandidate(summary, owner);
  const data = {
    tenantId: summary.tenant.id,
    type: candidate.type,
    severity: candidate.severity,
    status: NotificationStatus.UNREAD,
    title: candidate.title,
    message: candidate.message,
    recipientType: NotificationRecipientType.OWNER,
    recipientStaffId: null,
    recipientRole: "Owner",
    sourceType: "TENANT_ONBOARDING",
    sourceId: summary.onboarding.id,
    triggeredAt: new Date(),
    deliveryChannel: NotificationDeliveryChannel.IN_APP,
    deliveryStatus: NotificationDeliveryStatus.NOT_REQUIRED,
    metadata: candidate.metadata
  };

  if (currentNotification) {
    const changed =
      currentNotification.type !== data.type ||
      currentNotification.severity !== data.severity ||
      currentNotification.title !== data.title ||
      currentNotification.message !== data.message ||
      JSON.stringify(currentNotification.metadata ?? null) !== JSON.stringify(data.metadata ?? null);

    if (!changed) return;

    await tx.notification.update({
      where: { id: currentNotification.id },
      data: {
        ...data,
        status: NotificationStatus.UNREAD,
        readAt: null,
        acknowledgedAt: null,
        resolvedAt: null
      }
    });
    return;
  }

  await tx.notification.create({ data });
}

function buildOnboardingNotificationCandidate(
  summary: {
    tenant: TenantEvidence["tenant"];
    onboarding: {
      id: string;
      status: TenantOnboardingStatus;
      readinessScore: number;
      reviewNotes: string | null;
    };
    currentStep: StepEvaluation;
    submissionPolicy: SubmissionPolicy;
    blockers: string[];
  },
  owner: TenantEvidence["activeUsers"][number] | null
) {
  const ownerName = owner?.name ?? "Owner";
  const actionLink = summary.currentStep.actionLinks[0];

  if (summary.onboarding.status === TenantOnboardingStatus.ACTIVE) {
    return {
      type: NotificationType.PILOT_REVIEW,
      severity: NotificationSeverity.INFO,
      title: "PORTIONS activation approved",
      message: `Hi ${ownerName}, your pharmacy workspace is active in PORTIONS. Readiness is ${summary.onboarding.readinessScore}%. ${summary.blockers.length > 0 ? `Open Onboarding to close the remaining rollout gaps, starting with ${summary.currentStep.title}.` : "The launch review is complete and the command workspace is ready for daily use."}`,
      metadata: {
        readinessScore: summary.onboarding.readinessScore,
        actionHref: actionLink?.href ?? "/onboarding"
      }
    };
  }

  if (summary.onboarding.status === TenantOnboardingStatus.READY_FOR_REVIEW || summary.onboarding.status === TenantOnboardingStatus.UNDER_REVIEW) {
    return {
      type: NotificationType.PILOT_REVIEW,
      severity: NotificationSeverity.MEDIUM,
      title: "Go-live review in progress",
      message: `Hi ${ownerName}, your pharmacy onboarding has been submitted for platform review. Keep the workspace current while the launch decision is pending.`,
      metadata: { readinessScore: summary.onboarding.readinessScore }
    };
  }

  if (summary.onboarding.status === TenantOnboardingStatus.CHANGES_REQUESTED) {
    return {
      type: NotificationType.PILOT_REVIEW,
      severity: NotificationSeverity.HIGH,
      title: "Platform changes requested",
      message: `Hi ${ownerName}, platform review has requested changes before activation. ${summary.onboarding.reviewNotes ?? "Open Onboarding to review the next required action."}`,
      metadata: { readinessScore: summary.onboarding.readinessScore }
    };
  }

  if (summary.onboarding.status === TenantOnboardingStatus.BLOCKED) {
    return {
      type: NotificationType.MANAGEMENT_ALERT,
      severity: NotificationSeverity.CRITICAL,
      title: "Tenant onboarding blocked",
      message: `Hi ${ownerName}, this tenant has been blocked from activation. ${summary.onboarding.reviewNotes ?? "Open Onboarding to review the platform notes and next required fix."}`,
      metadata: { readinessScore: summary.onboarding.readinessScore }
    };
  }

  return {
    type: NotificationType.GENERAL,
    severity: summary.currentStep.required ? NotificationSeverity.MEDIUM : NotificationSeverity.INFO,
    title: `Continue onboarding: ${summary.currentStep.title}`,
    message: `Hi ${ownerName}, onboarding is ${summary.onboarding.readinessScore}% complete. Next step: ${summary.currentStep.title}. ${summary.blockers[0] ?? summary.submissionPolicy.explanation}`,
    metadata: {
      readinessScore: summary.onboarding.readinessScore,
      currentStepKey: summary.currentStep.key,
      actionHref: actionLink?.href ?? "/onboarding"
    }
  };
}

function buildSummaryLines(
  evidence: TenantEvidence,
  policy: SubmissionPolicy,
  currentStep: StepEvaluation,
  readinessScore: number
) {
  return [
    `Readiness is ${readinessScore}%.`,
    `${evidence.branchCount} branches, ${evidence.activeUsers.length} active users, ${evidence.patientCount} patients, and ${evidence.stockCount} stock records are currently live.`,
    `${policy.label}: ${policy.explanation}`,
    `Next step: ${currentStep.title}.`
  ];
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function cleanText(value: string | null | undefined) {
  const next = value?.trim() ?? "";
  return next;
}
