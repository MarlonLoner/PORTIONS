-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('HEALTH_OUTREACH', 'CORPORATE_ACTIVATION', 'CONFERENCE', 'EXHIBITION', 'BRANCH_PROMOTION', 'SUPPLIER_EVENT', 'COMMUNITY_EVENT', 'PRODUCT_LAUNCH', 'TRAINING', 'WELLNESS_DAY', 'OTHER');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'FUNDING_PENDING', 'FUNDED', 'PREPARATION', 'READY', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EventPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "FundingStatus" AS ENUM ('NOT_REQUESTED', 'REQUESTED', 'PARTIALLY_FUNDED', 'FUNDED', 'OVER_BUDGET', 'CLOSED');

-- CreateEnum
CREATE TYPE "EventChecklistStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'NOT_REQUIRED');

-- CreateEnum
CREATE TYPE "EventExpenseStatus" AS ENUM ('PLANNED', 'REQUESTED', 'APPROVED', 'PAID', 'REJECTED');

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "eventType" "EventType" NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
    "priority" "EventPriority" NOT NULL DEFAULT 'MEDIUM',
    "companyName" TEXT,
    "venueName" TEXT,
    "location" TEXT,
    "branchId" TEXT,
    "ownerStaffId" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "expectedAttendance" INTEGER,
    "actualAttendance" INTEGER,
    "objective" TEXT NOT NULL,
    "expectedOutcome" TEXT,
    "proposedBudget" DECIMAL(12,2),
    "approvedBudget" DECIMAL(12,2),
    "fundsReleased" DECIMAL(12,2),
    "actualSpend" DECIMAL(12,2),
    "revenueGenerated" DECIMAL(12,2),
    "leadsGenerated" INTEGER,
    "patientsRegistered" INTEGER,
    "fundingStatus" "FundingStatus" NOT NULL DEFAULT 'NOT_REQUESTED',
    "approvalNotes" TEXT,
    "rejectionReason" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventChecklistItem" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assignedStaffId" TEXT,
    "dueDate" TIMESTAMP(3),
    "status" "EventChecklistStatus" NOT NULL DEFAULT 'PENDING',
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventExpense" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "supplier" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "EventExpenseStatus" NOT NULL DEFAULT 'PLANNED',
    "paymentReference" TEXT,
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventActivity" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "activityType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "actorName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventReview" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "attendance" INTEGER NOT NULL,
    "leadsGenerated" INTEGER NOT NULL,
    "revenueGenerated" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "patientsRegistered" INTEGER NOT NULL,
    "whatWorked" TEXT NOT NULL,
    "whatFailed" TEXT NOT NULL,
    "lessonsLearned" TEXT NOT NULL,
    "nextTimeRecommendations" TEXT NOT NULL,
    "mediaLinks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Event_status_startDate_idx" ON "Event"("status", "startDate");

-- CreateIndex
CREATE INDEX "Event_eventType_idx" ON "Event"("eventType");

-- CreateIndex
CREATE INDEX "Event_branchId_idx" ON "Event"("branchId");

-- CreateIndex
CREATE INDEX "Event_ownerStaffId_idx" ON "Event"("ownerStaffId");

-- CreateIndex
CREATE INDEX "Event_fundingStatus_idx" ON "Event"("fundingStatus");

-- CreateIndex
CREATE INDEX "EventChecklistItem_eventId_status_idx" ON "EventChecklistItem"("eventId", "status");

-- CreateIndex
CREATE INDEX "EventChecklistItem_assignedStaffId_idx" ON "EventChecklistItem"("assignedStaffId");

-- CreateIndex
CREATE INDEX "EventExpense_eventId_status_idx" ON "EventExpense"("eventId", "status");

-- CreateIndex
CREATE INDEX "EventActivity_eventId_createdAt_idx" ON "EventActivity"("eventId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EventReview_eventId_key" ON "EventReview"("eventId");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_ownerStaffId_fkey" FOREIGN KEY ("ownerStaffId") REFERENCES "StaffMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventChecklistItem" ADD CONSTRAINT "EventChecklistItem_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventChecklistItem" ADD CONSTRAINT "EventChecklistItem_assignedStaffId_fkey" FOREIGN KEY ("assignedStaffId") REFERENCES "StaffMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventExpense" ADD CONSTRAINT "EventExpense_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventActivity" ADD CONSTRAINT "EventActivity_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventReview" ADD CONSTRAINT "EventReview_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
