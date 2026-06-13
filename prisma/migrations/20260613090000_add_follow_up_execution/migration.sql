-- CreateEnum
CREATE TYPE "FollowUpOutcomeType" AS ENUM ('PATIENT_CONTACTED', 'REFILL_CONFIRMED', 'DELIVERY_BOOKED', 'COLLECTION_CONFIRMED', 'PAYMENT_PENDING', 'NO_RESPONSE', 'CALLBACK_REQUESTED', 'PATIENT_LOST', 'OTHER');

-- AlterEnum
ALTER TYPE "FollowUpStatus" ADD VALUE IF NOT EXISTS 'IN_PROGRESS';
ALTER TYPE "FollowUpStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

-- AlterTable
ALTER TABLE "FollowUpTask" ADD COLUMN "snoozedUntil" TIMESTAMP(3);
ALTER TABLE "FollowUpTask" ADD COLUMN "startedAt" TIMESTAMP(3);
ALTER TABLE "FollowUpTask" ADD COLUMN "completedAt" TIMESTAMP(3);
ALTER TABLE "FollowUpTask" ADD COLUMN "outcomeType" "FollowUpOutcomeType";
ALTER TABLE "FollowUpTask" ADD COLUMN "outcomeNotes" TEXT;
ALTER TABLE "FollowUpTask" ADD COLUMN "valueAmount" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "FollowUpTask" ADD COLUMN "lastContactedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "FollowUpTaskActivity" (
    "id" TEXT NOT NULL,
    "followUpTaskId" TEXT NOT NULL,
    "activityType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "actorName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FollowUpTaskActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FollowUpTaskActivity_followUpTaskId_createdAt_idx" ON "FollowUpTaskActivity"("followUpTaskId", "createdAt");

-- AddForeignKey
ALTER TABLE "FollowUpTaskActivity" ADD CONSTRAINT "FollowUpTaskActivity_followUpTaskId_fkey" FOREIGN KEY ("followUpTaskId") REFERENCES "FollowUpTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
