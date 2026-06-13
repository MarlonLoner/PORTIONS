-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ACTION_DUE', 'ACTION_OVERDUE', 'ACTION_BLOCKED', 'ACTION_UNASSIGNED', 'CRITICAL_ACTION', 'ORDER_PAYMENT_RISK', 'CHRONIC_REFILL_RISK', 'STOCK_RISK', 'BRANCH_ESCALATION', 'PILOT_REVIEW', 'MANAGEMENT_ALERT', 'GENERAL');

-- CreateEnum
CREATE TYPE "NotificationSeverity" AS ENUM ('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('UNREAD', 'READ', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "NotificationRecipientType" AS ENUM ('STAFF', 'BRANCH_MANAGER', 'MANAGEMENT', 'OWNER', 'ROLE', 'GENERAL');

-- CreateEnum
CREATE TYPE "NotificationDeliveryChannel" AS ENUM ('IN_APP', 'EMAIL_READY', 'WHATSAPP_READY', 'SMS_READY');

-- CreateEnum
CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'READY', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "severity" "NotificationSeverity" NOT NULL DEFAULT 'INFO',
    "status" "NotificationStatus" NOT NULL DEFAULT 'UNREAD',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "recipientType" "NotificationRecipientType" NOT NULL DEFAULT 'GENERAL',
    "recipientStaffId" TEXT,
    "recipientRole" TEXT,
    "branchId" TEXT,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "actionId" TEXT,
    "scheduledFor" TIMESTAMP(3),
    "triggeredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "deliveryChannel" "NotificationDeliveryChannel" NOT NULL DEFAULT 'IN_APP',
    "deliveryStatus" "NotificationDeliveryStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_status_severity_idx" ON "Notification"("status", "severity");

-- CreateIndex
CREATE INDEX "Notification_type_actionId_status_idx" ON "Notification"("type", "actionId", "status");

-- CreateIndex
CREATE INDEX "Notification_branchId_idx" ON "Notification"("branchId");

-- CreateIndex
CREATE INDEX "Notification_recipientStaffId_idx" ON "Notification"("recipientStaffId");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientStaffId_fkey" FOREIGN KEY ("recipientStaffId") REFERENCES "StaffMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "OperationalAction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
