-- CreateEnum
CREATE TYPE "OperationalActionCategory" AS ENUM ('CHRONIC_PATIENT', 'ORDER_RECOVERY', 'STOCK_INTERVENTION', 'BRANCH_ISSUE', 'PILOT_TASK', 'MANAGEMENT_DECISION', 'GENERAL');

-- CreateEnum
CREATE TYPE "OperationalActionPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "OperationalActionStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OperationalActionOutcome" AS ENUM ('REVENUE_RECOVERED', 'REVENUE_PROTECTED', 'PATIENT_CONTACTED', 'ORDER_RESOLVED', 'STOCK_RESOLVED', 'BRANCH_ESCALATED', 'NO_RESPONSE', 'NO_VALUE', 'OTHER');

-- CreateTable
CREATE TABLE "OperationalAction" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "OperationalActionCategory" NOT NULL,
    "priority" "OperationalActionPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "OperationalActionStatus" NOT NULL DEFAULT 'OPEN',
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT,
    "branchId" TEXT,
    "assignedStaffId" TEXT,
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "outcomeType" "OperationalActionOutcome",
    "outcomeNotes" TEXT,
    "valueAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperationalAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationalActionActivity" (
    "id" TEXT NOT NULL,
    "actionId" TEXT NOT NULL,
    "activityType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "actorName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperationalActionActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OperationalAction_status_dueDate_idx" ON "OperationalAction"("status", "dueDate");

-- CreateIndex
CREATE INDEX "OperationalAction_priority_status_idx" ON "OperationalAction"("priority", "status");

-- CreateIndex
CREATE INDEX "OperationalAction_category_idx" ON "OperationalAction"("category");

-- CreateIndex
CREATE INDEX "OperationalAction_branchId_idx" ON "OperationalAction"("branchId");

-- CreateIndex
CREATE INDEX "OperationalAction_assignedStaffId_idx" ON "OperationalAction"("assignedStaffId");

-- CreateIndex
CREATE INDEX "OperationalActionActivity_actionId_createdAt_idx" ON "OperationalActionActivity"("actionId", "createdAt");

-- AddForeignKey
ALTER TABLE "OperationalAction" ADD CONSTRAINT "OperationalAction_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalAction" ADD CONSTRAINT "OperationalAction_assignedStaffId_fkey" FOREIGN KEY ("assignedStaffId") REFERENCES "StaffMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalActionActivity" ADD CONSTRAINT "OperationalActionActivity_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "OperationalAction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
