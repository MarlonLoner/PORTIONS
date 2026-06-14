-- CreateEnum
CREATE TYPE "OperatingUnitType" AS ENUM ('PHYSICAL_BRANCH', 'ONLINE_DEPARTMENT', 'CALL_CENTRE', 'HEAD_OFFICE', 'CENTRAL_WAREHOUSE', 'MARKETING', 'FINANCE', 'ADMINISTRATION', 'OTHER');

-- CreateEnum
CREATE TYPE "OperatingUnitStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SETUP');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED', 'DISABLED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'CEO', 'GENERAL_MANAGER', 'BRANCH_MANAGER', 'PHARMACIST', 'SUPPORT_AGENT', 'ONLINE_ORDERS_AGENT', 'STOCK_CONTROLLER', 'MARKETING_COORDINATOR', 'EVENT_COORDINATOR', 'FINANCE_ADMIN', 'SYSTEM_ADMIN', 'VIEW_ONLY');

-- CreateEnum
CREATE TYPE "OperatingUnitAccessLevel" AS ENUM ('VIEW', 'OPERATE', 'MANAGE', 'APPROVE', 'ADMIN');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "fulfillmentBranchId" TEXT;
ALTER TABLE "Order" ADD COLUMN "originatingOperatingUnitId" TEXT;
ALTER TABLE "Order" ADD COLUMN "assignedOperatingUnitId" TEXT;

-- AlterTable
ALTER TABLE "Event" ADD COLUMN "communicationOperatingUnitId" TEXT;

-- AlterTable
ALTER TABLE "Communication" ADD COLUMN "sendingOperatingUnitId" TEXT;
ALTER TABLE "Communication" ADD COLUMN "sendingWhatsappNumber" TEXT;
ALTER TABLE "Communication" ADD COLUMN "sendingContactLabel" TEXT;

-- CreateTable
CREATE TABLE "OperatingUnit" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "OperatingUnitType" NOT NULL,
    "status" "OperatingUnitStatus" NOT NULL DEFAULT 'ACTIVE',
    "branchId" TEXT,
    "parentUnitId" TEXT,
    "location" TEXT,
    "phone" TEXT,
    "whatsappNumber" TEXT,
    "email" TEXT,
    "contactLabel" TEXT,
    "managerStaffId" TEXT,
    "handlesOnlineOrders" BOOLEAN NOT NULL DEFAULT false,
    "handlesPatientFollowUps" BOOLEAN NOT NULL DEFAULT false,
    "handlesStock" BOOLEAN NOT NULL DEFAULT false,
    "handlesEvents" BOOLEAN NOT NULL DEFAULT false,
    "handlesCommunications" BOOLEAN NOT NULL DEFAULT false,
    "isPrimaryOnlineUnit" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperatingUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppUser" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'INVITED',
    "role" "UserRole" NOT NULL,
    "staffMemberId" TEXT,
    "primaryOperatingUnitId" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserOperatingUnitAccess" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "operatingUnitId" TEXT NOT NULL,
    "accessLevel" "OperatingUnitAccessLevel" NOT NULL DEFAULT 'VIEW',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserOperatingUnitAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OperatingUnit_code_key" ON "OperatingUnit"("code");
CREATE INDEX "OperatingUnit_type_status_idx" ON "OperatingUnit"("type", "status");
CREATE INDEX "OperatingUnit_branchId_idx" ON "OperatingUnit"("branchId");
CREATE INDEX "OperatingUnit_managerStaffId_idx" ON "OperatingUnit"("managerStaffId");
CREATE UNIQUE INDEX "AppUser_email_key" ON "AppUser"("email");
CREATE UNIQUE INDEX "AppUser_staffMemberId_key" ON "AppUser"("staffMemberId");
CREATE INDEX "AppUser_status_role_idx" ON "AppUser"("status", "role");
CREATE UNIQUE INDEX "UserOperatingUnitAccess_userId_operatingUnitId_key" ON "UserOperatingUnitAccess"("userId", "operatingUnitId");
CREATE INDEX "UserOperatingUnitAccess_operatingUnitId_idx" ON "UserOperatingUnitAccess"("operatingUnitId");
CREATE UNIQUE INDEX "AppSession_tokenHash_key" ON "AppSession"("tokenHash");
CREATE INDEX "AppSession_userId_idx" ON "AppSession"("userId");
CREATE INDEX "AppSession_expiresAt_idx" ON "AppSession"("expiresAt");
CREATE INDEX "Communication_sendingOperatingUnitId_idx" ON "Communication"("sendingOperatingUnitId");

-- AddForeignKey
ALTER TABLE "OperatingUnit" ADD CONSTRAINT "OperatingUnit_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OperatingUnit" ADD CONSTRAINT "OperatingUnit_parentUnitId_fkey" FOREIGN KEY ("parentUnitId") REFERENCES "OperatingUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OperatingUnit" ADD CONSTRAINT "OperatingUnit_managerStaffId_fkey" FOREIGN KEY ("managerStaffId") REFERENCES "StaffMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AppUser" ADD CONSTRAINT "AppUser_staffMemberId_fkey" FOREIGN KEY ("staffMemberId") REFERENCES "StaffMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AppUser" ADD CONSTRAINT "AppUser_primaryOperatingUnitId_fkey" FOREIGN KEY ("primaryOperatingUnitId") REFERENCES "OperatingUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UserOperatingUnitAccess" ADD CONSTRAINT "UserOperatingUnitAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserOperatingUnitAccess" ADD CONSTRAINT "UserOperatingUnitAccess_operatingUnitId_fkey" FOREIGN KEY ("operatingUnitId") REFERENCES "OperatingUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AppSession" ADD CONSTRAINT "AppSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_fulfillmentBranchId_fkey" FOREIGN KEY ("fulfillmentBranchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_originatingOperatingUnitId_fkey" FOREIGN KEY ("originatingOperatingUnitId") REFERENCES "OperatingUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_assignedOperatingUnitId_fkey" FOREIGN KEY ("assignedOperatingUnitId") REFERENCES "OperatingUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Event" ADD CONSTRAINT "Event_communicationOperatingUnitId_fkey" FOREIGN KEY ("communicationOperatingUnitId") REFERENCES "OperatingUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Communication" ADD CONSTRAINT "Communication_sendingOperatingUnitId_fkey" FOREIGN KEY ("sendingOperatingUnitId") REFERENCES "OperatingUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill one operating unit per existing physical branch.
INSERT INTO "OperatingUnit" (
    "id",
    "name",
    "code",
    "type",
    "status",
    "branchId",
    "location",
    "phone",
    "whatsappNumber",
    "email",
    "contactLabel",
    "managerStaffId",
    "handlesOnlineOrders",
    "handlesPatientFollowUps",
    "handlesStock",
    "handlesEvents",
    "handlesCommunications",
    "createdAt",
    "updatedAt"
)
SELECT
    'ou_' || b."id",
    b."name" || ' Branch',
    upper(regexp_replace(b."name", '[^a-zA-Z0-9]+', '_', 'g')) || '_BRANCH',
    'PHYSICAL_BRANCH',
    'ACTIVE',
    b."id",
    b."area",
    NULL,
    NULL,
    NULL,
    b."name" || ' Branch WhatsApp',
    (
      SELECT s."id"
      FROM "StaffMember" s
      WHERE s."branchId" = b."id"
      ORDER BY
        CASE WHEN lower(s."role") LIKE '%manager%' THEN 0 ELSE 1 END,
        s."name" ASC
      LIMIT 1
    ),
    false,
    true,
    true,
    true,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Branch" b
ON CONFLICT ("code") DO NOTHING;

-- Seed the primary Online Department as a branch-like non-physical operating unit.
INSERT INTO "OperatingUnit" (
    "id",
    "name",
    "code",
    "type",
    "status",
    "location",
    "phone",
    "whatsappNumber",
    "email",
    "contactLabel",
    "handlesOnlineOrders",
    "handlesPatientFollowUps",
    "handlesStock",
    "handlesEvents",
    "handlesCommunications",
    "isPrimaryOnlineUnit",
    "createdAt",
    "updatedAt"
) VALUES (
    'ou_online_department',
    'Online Department',
    'ONLINE_DEPARTMENT',
    'ONLINE_DEPARTMENT',
    'ACTIVE',
    'Network Online Desk',
    NULL,
    NULL,
    'online@portions.co.zw',
    'Online Orders WhatsApp',
    true,
    true,
    false,
    false,
    true,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT ("code") DO NOTHING;

-- Attach existing orders to branch units and online orders to the Online Department.
UPDATE "Order" o
SET
  "fulfillmentBranchId" = o."branchId",
  "originatingOperatingUnitId" = CASE
    WHEN o."source" IN ('WHATSAPP', 'WEBSITE', 'APP', 'DIASPORA') THEN 'ou_online_department'
    ELSE ou."id"
  END,
  "assignedOperatingUnitId" = CASE
    WHEN o."source" IN ('WHATSAPP', 'WEBSITE', 'APP', 'DIASPORA') THEN 'ou_online_department'
    ELSE ou."id"
  END
FROM "OperatingUnit" ou
WHERE ou."branchId" = o."branchId";

-- Attach existing communications to the safest sending unit context.
UPDATE "Communication" c
SET
  "sendingOperatingUnitId" = COALESCE(
    CASE WHEN c."sourceType" = 'ORDER' AND o."originatingOperatingUnitId" IS NOT NULL THEN o."originatingOperatingUnitId" END,
    ou."id"
  ),
  "sendingWhatsappNumber" = COALESCE(
    CASE WHEN c."sourceType" = 'ORDER' AND online."id" IS NOT NULL THEN online."whatsappNumber" END,
    ou."whatsappNumber"
  ),
  "sendingContactLabel" = COALESCE(
    CASE WHEN c."sourceType" = 'ORDER' AND online."id" IS NOT NULL THEN online."contactLabel" END,
    ou."contactLabel"
  )
FROM "OperatingUnit" ou
LEFT JOIN "Order" o ON o."id" = c."orderId"
LEFT JOIN "OperatingUnit" online ON online."id" = 'ou_online_department'
WHERE ou."branchId" = c."branchId";
