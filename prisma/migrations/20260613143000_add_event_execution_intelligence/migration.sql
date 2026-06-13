-- AlterEnum
ALTER TYPE "ReportType" ADD VALUE 'EVENT_PERFORMANCE';

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'EVENT_APPROVAL_REQUIRED';
ALTER TYPE "NotificationType" ADD VALUE 'EVENT_FUNDING_REQUIRED';
ALTER TYPE "NotificationType" ADD VALUE 'EVENT_CHECKLIST_DUE';
ALTER TYPE "NotificationType" ADD VALUE 'EVENT_CHECKLIST_OVERDUE';
ALTER TYPE "NotificationType" ADD VALUE 'EVENT_CHECKLIST_BLOCKED';
ALTER TYPE "NotificationType" ADD VALUE 'EVENT_READINESS_RISK';
ALTER TYPE "NotificationType" ADD VALUE 'EVENT_STARTING_SOON';
ALTER TYPE "NotificationType" ADD VALUE 'EVENT_REVIEW_DUE';
ALTER TYPE "NotificationType" ADD VALUE 'EVENT_BUDGET_RISK';
ALTER TYPE "NotificationType" ADD VALUE 'EVENT_OWNER_UNASSIGNED';

-- AlterTable
ALTER TABLE "EventChecklistItem" ADD COLUMN "operationalActionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "EventChecklistItem_operationalActionId_key" ON "EventChecklistItem"("operationalActionId");

-- CreateIndex
CREATE INDEX "EventChecklistItem_operationalActionId_idx" ON "EventChecklistItem"("operationalActionId");

-- AddForeignKey
ALTER TABLE "EventChecklistItem" ADD CONSTRAINT "EventChecklistItem_operationalActionId_fkey" FOREIGN KEY ("operationalActionId") REFERENCES "OperationalAction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
