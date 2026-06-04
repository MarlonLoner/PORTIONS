ALTER TABLE "PilotRequest"
ADD COLUMN "internalNotes" TEXT,
ADD COLUMN "nextAction" TEXT,
ADD COLUMN "contactedAt" TIMESTAMP(3),
ADD COLUMN "qualifiedAt" TIMESTAMP(3),
ADD COLUMN "closedAt" TIMESTAMP(3);
