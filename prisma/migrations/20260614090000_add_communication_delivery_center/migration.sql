-- CreateEnum
CREATE TYPE "CommunicationChannel" AS ENUM ('WHATSAPP', 'PHONE_CALL', 'SMS_READY', 'EMAIL_READY', 'IN_APP', 'OTHER');

-- CreateEnum
CREATE TYPE "CommunicationStatus" AS ENUM ('DRAFT', 'READY', 'OPENED', 'SENT', 'FAILED', 'RESPONDED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CommunicationDirection" AS ENUM ('OUTBOUND', 'INBOUND');

-- CreateEnum
CREATE TYPE "CommunicationRecipientType" AS ENUM ('PATIENT', 'CUSTOMER', 'STAFF', 'BRANCH_MANAGER', 'SUPPLIER', 'COMPANY', 'EVENT_PARTNER', 'OTHER');

-- CreateEnum
CREATE TYPE "CommunicationOutcomeType" AS ENUM ('NO_RESPONSE', 'RESPONSE_RECEIVED', 'REFILL_CONFIRMED', 'DELIVERY_CONFIRMED', 'COLLECTION_CONFIRMED', 'PAYMENT_PROMISED', 'PAYMENT_RECEIVED', 'EVENT_ATTENDANCE_CONFIRMED', 'LEAD_CAPTURED', 'ISSUE_RESOLVED', 'CALLBACK_REQUIRED', 'OTHER');

-- CreateTable
CREATE TABLE "Communication" (
    "id" TEXT NOT NULL,
    "channel" "CommunicationChannel" NOT NULL DEFAULT 'WHATSAPP',
    "status" "CommunicationStatus" NOT NULL DEFAULT 'DRAFT',
    "direction" "CommunicationDirection" NOT NULL DEFAULT 'OUTBOUND',
    "recipientName" TEXT NOT NULL,
    "recipientPhone" TEXT,
    "recipientType" "CommunicationRecipientType" NOT NULL DEFAULT 'OTHER',
    "message" TEXT NOT NULL,
    "subject" TEXT,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT,
    "patientId" TEXT,
    "orderId" TEXT,
    "followUpTaskId" TEXT,
    "operationalActionId" TEXT,
    "notificationId" TEXT,
    "eventId" TEXT,
    "assignedStaffId" TEXT,
    "branchId" TEXT,
    "scheduledFor" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "responseText" TEXT,
    "outcomeType" "CommunicationOutcomeType",
    "outcomeNotes" TEXT,
    "followUpRequired" BOOLEAN NOT NULL DEFAULT false,
    "followUpDate" TIMESTAMP(3),
    "externalReference" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Communication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunicationActivity" (
    "id" TEXT NOT NULL,
    "communicationId" TEXT NOT NULL,
    "activityType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "actorName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunicationActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Communication_status_createdAt_idx" ON "Communication"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Communication_channel_status_idx" ON "Communication"("channel", "status");

-- CreateIndex
CREATE INDEX "Communication_sourceType_sourceId_idx" ON "Communication"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "Communication_patientId_idx" ON "Communication"("patientId");

-- CreateIndex
CREATE INDEX "Communication_orderId_idx" ON "Communication"("orderId");

-- CreateIndex
CREATE INDEX "Communication_followUpTaskId_idx" ON "Communication"("followUpTaskId");

-- CreateIndex
CREATE INDEX "Communication_operationalActionId_idx" ON "Communication"("operationalActionId");

-- CreateIndex
CREATE INDEX "Communication_notificationId_idx" ON "Communication"("notificationId");

-- CreateIndex
CREATE INDEX "Communication_eventId_idx" ON "Communication"("eventId");

-- CreateIndex
CREATE INDEX "Communication_assignedStaffId_idx" ON "Communication"("assignedStaffId");

-- CreateIndex
CREATE INDEX "Communication_branchId_idx" ON "Communication"("branchId");

-- CreateIndex
CREATE INDEX "CommunicationActivity_communicationId_createdAt_idx" ON "CommunicationActivity"("communicationId", "createdAt");

-- AddForeignKey
ALTER TABLE "Communication" ADD CONSTRAINT "Communication_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Communication" ADD CONSTRAINT "Communication_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Communication" ADD CONSTRAINT "Communication_followUpTaskId_fkey" FOREIGN KEY ("followUpTaskId") REFERENCES "FollowUpTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Communication" ADD CONSTRAINT "Communication_operationalActionId_fkey" FOREIGN KEY ("operationalActionId") REFERENCES "OperationalAction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Communication" ADD CONSTRAINT "Communication_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Communication" ADD CONSTRAINT "Communication_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Communication" ADD CONSTRAINT "Communication_assignedStaffId_fkey" FOREIGN KEY ("assignedStaffId") REFERENCES "StaffMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Communication" ADD CONSTRAINT "Communication_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationActivity" ADD CONSTRAINT "CommunicationActivity_communicationId_fkey" FOREIGN KEY ("communicationId") REFERENCES "Communication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
