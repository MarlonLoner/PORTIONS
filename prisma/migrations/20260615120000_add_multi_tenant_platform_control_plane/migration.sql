-- Foundational multi-tenant SaaS pass for PORTIONS.
-- This migration is intentionally additive: tenantId columns are nullable first,
-- then current production records are backfilled into one primary tenant.

CREATE TYPE "TenantStatus" AS ENUM ('SETUP', 'ACTIVE', 'SUSPENDED', 'DISABLED', 'ARCHIVED');
CREATE TYPE "TenantPlan" AS ENUM ('DEMO', 'PILOT', 'STARTER', 'GROWTH', 'ENTERPRISE', 'CUSTOM');
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'PAUSED', 'CANCELLED', 'NOT_REQUIRED');
CREATE TYPE "PlatformRole" AS ENUM ('PLATFORM_OWNER', 'PLATFORM_ADMIN', 'PLATFORM_SUPPORT', 'PLATFORM_FINANCE', 'PLATFORM_VIEW_ONLY');
CREATE TYPE "PlatformUserStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED', 'DISABLED');
CREATE TYPE "TenantSupportAccessStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'EXPIRED', 'REVOKED');
CREATE TYPE "TenantSupportAccessScope" AS ENUM ('CONFIGURATION_ONLY', 'USER_SUPPORT', 'IMPORT_SUPPORT', 'OPERATIONAL_SUPPORT', 'FULL_SUPPORT');
CREATE TYPE "AuditActorType" AS ENUM ('TENANT_USER', 'PLATFORM_USER', 'DEMO_USER', 'SYSTEM');

CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "legalName" TEXT,
    "status" "TenantStatus" NOT NULL DEFAULT 'SETUP',
    "plan" "TenantPlan" NOT NULL DEFAULT 'PILOT',
    "primaryContactName" TEXT,
    "primaryContactEmail" TEXT,
    "primaryContactPhone" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Zimbabwe',
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Harare',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
    "trialEndsAt" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),
    "suspendedAt" TIMESTAMP(3),
    "dataRegion" TEXT,
    "isDemoTenant" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlatformUser" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "PlatformRole" NOT NULL DEFAULT 'PLATFORM_VIEW_ONLY',
    "status" "PlatformUserStatus" NOT NULL DEFAULT 'INVITED',
    "lastLoginAt" TIMESTAMP(3),
    "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PlatformUser_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlatformSession" (
    "id" TEXT NOT NULL,
    "platformUserId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PlatformSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TenantSupportAccessRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "requestedByPlatformUserId" TEXT NOT NULL,
    "approvedByTenantUserId" TEXT,
    "reason" TEXT NOT NULL,
    "status" "TenantSupportAccessStatus" NOT NULL DEFAULT 'REQUESTED',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "scope" "TenantSupportAccessScope" NOT NULL DEFAULT 'CONFIGURATION_ONLY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TenantSupportAccessRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorType" "AuditActorType" NOT NULL DEFAULT 'SYSTEM',
    "actorId" TEXT,
    "actorLabel" TEXT,
    "tenantId" TEXT,
    "action" TEXT NOT NULL,
    "recordType" TEXT,
    "recordId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "supportAccessRequestId" TEXT,
    "outcome" TEXT NOT NULL DEFAULT 'SUCCESS',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Branch" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "StaffMember" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Patient" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "PatientMedication" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "RefillEvent" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "FollowUpTask" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "FollowUpTaskActivity" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Order" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "StockItem" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Report" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "PilotRequest" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "ImportBatch" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "OperationalAction" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "OperationalActionActivity" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Notification" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Communication" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "CommunicationActivity" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Event" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "EventChecklistItem" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "EventExpense" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "EventActivity" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "EventReview" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "OperatingUnit" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "AppUser" ADD COLUMN "tenantId" TEXT;

INSERT INTO "Tenant" (
  "id", "name", "slug", "legalName", "status", "plan", "country", "timezone", "currency",
  "subscriptionStatus", "activatedAt", "isDemoTenant", "updatedAt"
)
SELECT
  'tenant_portions_primary',
  'PORTIONS Demonstration Pharmacy',
  'portions-demo-pharmacy',
  'PORTIONS Demonstration Pharmacy',
  'ACTIVE'::"TenantStatus",
  'PILOT'::"TenantPlan",
  'Zimbabwe',
  'Africa/Harare',
  'USD',
  'ACTIVE'::"SubscriptionStatus",
  CURRENT_TIMESTAMP,
  false,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1
  FROM "Tenant"
  WHERE "id" = 'tenant_portions_primary'
     OR "slug" = 'portions-demo-pharmacy'
);

INSERT INTO "Tenant" (
  "id", "name", "slug", "legalName", "status", "plan", "country", "timezone", "currency",
  "subscriptionStatus", "activatedAt", "isDemoTenant", "updatedAt"
)
SELECT
  'tenant_portions_demo',
  'PORTIONS Demo Tenant',
  'portions-demo',
  'PORTIONS Demo Tenant',
  'ACTIVE'::"TenantStatus",
  'DEMO'::"TenantPlan",
  'Zimbabwe',
  'Africa/Harare',
  'USD',
  'NOT_REQUIRED'::"SubscriptionStatus",
  CURRENT_TIMESTAMP,
  true,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1
  FROM "Tenant"
  WHERE "id" = 'tenant_portions_demo'
     OR "slug" = 'portions-demo'
);

UPDATE "Branch" SET "tenantId" = 'tenant_portions_primary' WHERE "tenantId" IS NULL;
UPDATE "StaffMember" SET "tenantId" = 'tenant_portions_primary' WHERE "tenantId" IS NULL;
UPDATE "Patient" SET "tenantId" = 'tenant_portions_primary' WHERE "tenantId" IS NULL;
UPDATE "PatientMedication" SET "tenantId" = 'tenant_portions_primary' WHERE "tenantId" IS NULL;
UPDATE "RefillEvent" SET "tenantId" = 'tenant_portions_primary' WHERE "tenantId" IS NULL;
UPDATE "FollowUpTask" SET "tenantId" = 'tenant_portions_primary' WHERE "tenantId" IS NULL;
UPDATE "FollowUpTaskActivity" SET "tenantId" = 'tenant_portions_primary' WHERE "tenantId" IS NULL;
UPDATE "Order" SET "tenantId" = 'tenant_portions_primary' WHERE "tenantId" IS NULL;
UPDATE "OrderItem" SET "tenantId" = 'tenant_portions_primary' WHERE "tenantId" IS NULL;
UPDATE "StockItem" SET "tenantId" = 'tenant_portions_primary' WHERE "tenantId" IS NULL;
UPDATE "Report" SET "tenantId" = 'tenant_portions_primary' WHERE "tenantId" IS NULL;
UPDATE "PilotRequest" SET "tenantId" = 'tenant_portions_primary' WHERE "tenantId" IS NULL;
UPDATE "ImportBatch" SET "tenantId" = 'tenant_portions_primary' WHERE "tenantId" IS NULL;
UPDATE "OperationalAction" SET "tenantId" = 'tenant_portions_primary' WHERE "tenantId" IS NULL;
UPDATE "OperationalActionActivity" SET "tenantId" = 'tenant_portions_primary' WHERE "tenantId" IS NULL;
UPDATE "Notification" SET "tenantId" = 'tenant_portions_primary' WHERE "tenantId" IS NULL;
UPDATE "Communication" SET "tenantId" = 'tenant_portions_primary' WHERE "tenantId" IS NULL;
UPDATE "CommunicationActivity" SET "tenantId" = 'tenant_portions_primary' WHERE "tenantId" IS NULL;
UPDATE "Event" SET "tenantId" = 'tenant_portions_primary' WHERE "tenantId" IS NULL;
UPDATE "EventChecklistItem" SET "tenantId" = 'tenant_portions_primary' WHERE "tenantId" IS NULL;
UPDATE "EventExpense" SET "tenantId" = 'tenant_portions_primary' WHERE "tenantId" IS NULL;
UPDATE "EventActivity" SET "tenantId" = 'tenant_portions_primary' WHERE "tenantId" IS NULL;
UPDATE "EventReview" SET "tenantId" = 'tenant_portions_primary' WHERE "tenantId" IS NULL;
UPDATE "OperatingUnit" SET "tenantId" = 'tenant_portions_primary' WHERE "tenantId" IS NULL;
UPDATE "AppUser" SET "tenantId" = 'tenant_portions_primary' WHERE "tenantId" IS NULL;

CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");
CREATE INDEX "Tenant_status_plan_idx" ON "Tenant"("status", "plan");
CREATE INDEX "Tenant_isDemoTenant_idx" ON "Tenant"("isDemoTenant");
CREATE UNIQUE INDEX "PlatformUser_email_key" ON "PlatformUser"("email");
CREATE INDEX "PlatformUser_status_role_idx" ON "PlatformUser"("status", "role");
CREATE UNIQUE INDEX "PlatformSession_tokenHash_key" ON "PlatformSession"("tokenHash");
CREATE INDEX "PlatformSession_platformUserId_idx" ON "PlatformSession"("platformUserId");
CREATE INDEX "PlatformSession_expiresAt_idx" ON "PlatformSession"("expiresAt");
CREATE INDEX "TenantSupportAccessRequest_tenantId_status_idx" ON "TenantSupportAccessRequest"("tenantId", "status");
CREATE INDEX "TenantSupportAccessRequest_requestedByPlatformUserId_idx" ON "TenantSupportAccessRequest"("requestedByPlatformUserId");
CREATE INDEX "TenantSupportAccessRequest_expiresAt_idx" ON "TenantSupportAccessRequest"("expiresAt");
CREATE INDEX "AuditLog_tenantId_createdAt_idx" ON "AuditLog"("tenantId", "createdAt");
CREATE INDEX "AuditLog_actorType_actorId_idx" ON "AuditLog"("actorType", "actorId");
CREATE INDEX "AuditLog_recordType_recordId_idx" ON "AuditLog"("recordType", "recordId");
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

CREATE INDEX "Branch_tenantId_idx" ON "Branch"("tenantId");
CREATE INDEX "StaffMember_tenantId_idx" ON "StaffMember"("tenantId");
CREATE INDEX "Patient_tenantId_idx" ON "Patient"("tenantId");
CREATE INDEX "PatientMedication_tenantId_idx" ON "PatientMedication"("tenantId");
CREATE INDEX "RefillEvent_tenantId_idx" ON "RefillEvent"("tenantId");
CREATE INDEX "FollowUpTask_tenantId_idx" ON "FollowUpTask"("tenantId");
CREATE INDEX "FollowUpTaskActivity_tenantId_idx" ON "FollowUpTaskActivity"("tenantId");
CREATE INDEX "Order_tenantId_idx" ON "Order"("tenantId");
CREATE INDEX "OrderItem_tenantId_idx" ON "OrderItem"("tenantId");
CREATE INDEX "StockItem_tenantId_idx" ON "StockItem"("tenantId");
CREATE INDEX "Report_tenantId_idx" ON "Report"("tenantId");
CREATE INDEX "PilotRequest_tenantId_idx" ON "PilotRequest"("tenantId");
CREATE INDEX "ImportBatch_tenantId_idx" ON "ImportBatch"("tenantId");
CREATE INDEX "OperationalAction_tenantId_idx" ON "OperationalAction"("tenantId");
CREATE INDEX "OperationalActionActivity_tenantId_idx" ON "OperationalActionActivity"("tenantId");
CREATE INDEX "Notification_tenantId_idx" ON "Notification"("tenantId");
CREATE INDEX "Communication_tenantId_idx" ON "Communication"("tenantId");
CREATE INDEX "CommunicationActivity_tenantId_idx" ON "CommunicationActivity"("tenantId");
CREATE INDEX "Event_tenantId_idx" ON "Event"("tenantId");
CREATE INDEX "EventChecklistItem_tenantId_idx" ON "EventChecklistItem"("tenantId");
CREATE INDEX "EventExpense_tenantId_idx" ON "EventExpense"("tenantId");
CREATE INDEX "EventActivity_tenantId_idx" ON "EventActivity"("tenantId");
CREATE INDEX "EventReview_tenantId_idx" ON "EventReview"("tenantId");
CREATE INDEX "OperatingUnit_tenantId_idx" ON "OperatingUnit"("tenantId");
CREATE INDEX "AppUser_tenantId_idx" ON "AppUser"("tenantId");

ALTER TABLE "Branch" ADD CONSTRAINT "Branch_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StaffMember" ADD CONSTRAINT "StaffMember_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PatientMedication" ADD CONSTRAINT "PatientMedication_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RefillEvent" ADD CONSTRAINT "RefillEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FollowUpTask" ADD CONSTRAINT "FollowUpTask_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FollowUpTaskActivity" ADD CONSTRAINT "FollowUpTaskActivity_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StockItem" ADD CONSTRAINT "StockItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PilotRequest" ADD CONSTRAINT "PilotRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OperationalAction" ADD CONSTRAINT "OperationalAction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OperationalActionActivity" ADD CONSTRAINT "OperationalActionActivity_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Communication" ADD CONSTRAINT "Communication_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunicationActivity" ADD CONSTRAINT "CommunicationActivity_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Event" ADD CONSTRAINT "Event_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventChecklistItem" ADD CONSTRAINT "EventChecklistItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventExpense" ADD CONSTRAINT "EventExpense_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventActivity" ADD CONSTRAINT "EventActivity_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventReview" ADD CONSTRAINT "EventReview_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OperatingUnit" ADD CONSTRAINT "OperatingUnit_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AppUser" ADD CONSTRAINT "AppUser_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlatformSession" ADD CONSTRAINT "PlatformSession_platformUserId_fkey" FOREIGN KEY ("platformUserId") REFERENCES "PlatformUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TenantSupportAccessRequest" ADD CONSTRAINT "TenantSupportAccessRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TenantSupportAccessRequest" ADD CONSTRAINT "TenantSupportAccessRequest_requestedByPlatformUserId_fkey" FOREIGN KEY ("requestedByPlatformUserId") REFERENCES "PlatformUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
