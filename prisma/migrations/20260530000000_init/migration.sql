CREATE TYPE "PatientStatus" AS ENUM ('ACTIVE', 'DUE_SOON', 'OVERDUE', 'LOST', 'VIP');
CREATE TYPE "RiskScore" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
CREATE TYPE "PackageType" AS ENUM ('STANDARD', 'PREMIUM', 'FAMILY_PACK', 'CORPORATE', 'CHRONIC_PLUS');
CREATE TYPE "FollowUpType" AS ENUM ('DUE_TODAY', 'OVERDUE', 'PRESCRIPTION_RENEWAL_NEEDED', 'PAYMENT_PENDING', 'DELIVERY_CONFIRMATION', 'LOST_PATIENT_REVIVAL');
CREATE TYPE "FollowUpStatus" AS ENUM ('PENDING', 'DONE', 'SNOOZED');
CREATE TYPE "OrderSource" AS ENUM ('WHATSAPP', 'WEBSITE', 'APP', 'WALK_IN', 'DIASPORA');
CREATE TYPE "OrderStatus" AS ENUM ('NEW', 'PHARMACIST_REVIEW', 'QUOTED', 'AWAITING_PAYMENT', 'PAID', 'PACKED', 'DISPATCHED', 'DELIVERED', 'CANCELLED');
CREATE TYPE "OrderType" AS ENUM ('PRESCRIPTION', 'REFILL', 'OTC', 'FAMILY_PACK');
CREATE TYPE "StockStatus" AS ENUM ('HEALTHY', 'LOW_STOCK', 'OVERSTOCK', 'NEAR_EXPIRY', 'DEAD_STOCK');
CREATE TYPE "ReportType" AS ENUM ('DAILY_EXECUTIVE', 'WEEKLY_BRANCH', 'CHRONIC_RETENTION', 'ONLINE_SALES', 'STOCK_RISK', 'STAFF_FOLLOW_UP');

CREATE TABLE "Branch" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "managerName" TEXT,
    "revenueTarget" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "staffResponseScore" INTEGER NOT NULL DEFAULT 90,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StaffMember" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "branchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StaffMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Patient" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "conditionCategory" TEXT NOT NULL,
    "packageType" "PackageType" NOT NULL,
    "medicationCycle" TEXT NOT NULL,
    "nextRefillDate" TIMESTAMP(3) NOT NULL,
    "status" "PatientStatus" NOT NULL,
    "assignedStaffId" TEXT,
    "lastContactedAt" TIMESTAMP(3),
    "riskScore" "RiskScore" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PatientMedication" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dosage" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PatientMedication_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RefillEvent" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "handledById" TEXT,
    "refillDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RefillEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FollowUpTask" (
    "id" TEXT NOT NULL,
    "patientId" TEXT,
    "customerName" TEXT NOT NULL,
    "type" "FollowUpType" NOT NULL,
    "status" "FollowUpStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "suggestedAction" TEXT NOT NULL,
    "suggestedMessage" TEXT NOT NULL,
    "assignedStaffId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FollowUpTask_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "source" "OrderSource" NOT NULL,
    "branchId" TEXT NOT NULL,
    "type" "OrderType" NOT NULL,
    "status" "OrderStatus" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "assignedStaffId" TEXT,
    "patientId" TEXT,
    "paymentStatus" TEXT NOT NULL,
    "fulfillmentPreference" TEXT NOT NULL,
    "internalNotes" TEXT,
    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StockItem" (
    "id" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "stockLevel" INTEGER NOT NULL,
    "reorderLevel" INTEGER NOT NULL,
    "status" "StockStatus" NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "suggestedAction" TEXT NOT NULL,
    "valueAtRisk" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StockItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "type" "ReportType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "lastGeneratedAt" TIMESTAMP(3) NOT NULL,
    "keyMetric" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Branch_name_key" ON "Branch"("name");
CREATE INDEX "Patient_branchId_status_idx" ON "Patient"("branchId", "status");
CREATE INDEX "Patient_nextRefillDate_idx" ON "Patient"("nextRefillDate");
CREATE INDEX "FollowUpTask_type_status_idx" ON "FollowUpTask"("type", "status");
CREATE INDEX "Order_branchId_status_idx" ON "Order"("branchId", "status");
CREATE INDEX "StockItem_branchId_status_idx" ON "StockItem"("branchId", "status");

ALTER TABLE "StaffMember" ADD CONSTRAINT "StaffMember_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_assignedStaffId_fkey" FOREIGN KEY ("assignedStaffId") REFERENCES "StaffMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PatientMedication" ADD CONSTRAINT "PatientMedication_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RefillEvent" ADD CONSTRAINT "RefillEvent_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RefillEvent" ADD CONSTRAINT "RefillEvent_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RefillEvent" ADD CONSTRAINT "RefillEvent_handledById_fkey" FOREIGN KEY ("handledById") REFERENCES "StaffMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FollowUpTask" ADD CONSTRAINT "FollowUpTask_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FollowUpTask" ADD CONSTRAINT "FollowUpTask_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FollowUpTask" ADD CONSTRAINT "FollowUpTask_assignedStaffId_fkey" FOREIGN KEY ("assignedStaffId") REFERENCES "StaffMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_assignedStaffId_fkey" FOREIGN KEY ("assignedStaffId") REFERENCES "StaffMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StockItem" ADD CONSTRAINT "StockItem_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
