-- CreateEnum
CREATE TYPE "TenantOnboardingStatus" AS ENUM (
    'NOT_STARTED',
    'IN_PROGRESS',
    'WAITING_FOR_TENANT',
    'READY_FOR_REVIEW',
    'UNDER_REVIEW',
    'CHANGES_REQUESTED',
    'APPROVED',
    'ACTIVE',
    'BLOCKED'
);

-- CreateEnum
CREATE TYPE "TenantOnboardingStepStatus" AS ENUM (
    'NOT_STARTED',
    'IN_PROGRESS',
    'COMPLETE',
    'BLOCKED',
    'SKIPPED'
);

-- CreateTable
CREATE TABLE "TenantOnboarding" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "status" "TenantOnboardingStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "readinessScore" INTEGER NOT NULL DEFAULT 0,
    "currentStepKey" TEXT NOT NULL DEFAULT 'OWNER_ACCOUNT',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),
    "blockedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "reviewedByPlatformUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantOnboarding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantOnboardingStep" (
    "id" TEXT NOT NULL,
    "onboardingId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "TenantOnboardingStepStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "required" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3),
    "completedByUserId" TEXT,
    "skippedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantOnboardingStep_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TenantOnboarding_tenantId_key" ON "TenantOnboarding"("tenantId");

-- CreateIndex
CREATE INDEX "TenantOnboarding_status_readinessScore_idx" ON "TenantOnboarding"("status", "readinessScore");

-- CreateIndex
CREATE INDEX "TenantOnboarding_reviewedByPlatformUserId_idx" ON "TenantOnboarding"("reviewedByPlatformUserId");

-- CreateIndex
CREATE UNIQUE INDEX "TenantOnboardingStep_onboardingId_key_key" ON "TenantOnboardingStep"("onboardingId", "key");

-- CreateIndex
CREATE INDEX "TenantOnboardingStep_tenantId_key_idx" ON "TenantOnboardingStep"("tenantId", "key");

-- CreateIndex
CREATE INDEX "TenantOnboardingStep_status_sortOrder_idx" ON "TenantOnboardingStep"("status", "sortOrder");

-- CreateIndex
CREATE INDEX "TenantOnboardingStep_completedByUserId_idx" ON "TenantOnboardingStep"("completedByUserId");

-- AddForeignKey
ALTER TABLE "TenantOnboarding" ADD CONSTRAINT "TenantOnboarding_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantOnboarding" ADD CONSTRAINT "TenantOnboarding_reviewedByPlatformUserId_fkey" FOREIGN KEY ("reviewedByPlatformUserId") REFERENCES "PlatformUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantOnboardingStep" ADD CONSTRAINT "TenantOnboardingStep_onboardingId_fkey" FOREIGN KEY ("onboardingId") REFERENCES "TenantOnboarding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantOnboardingStep" ADD CONSTRAINT "TenantOnboardingStep_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantOnboardingStep" ADD CONSTRAINT "TenantOnboardingStep_completedByUserId_fkey" FOREIGN KEY ("completedByUserId") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
