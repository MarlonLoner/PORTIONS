CREATE TYPE "PilotRequestStatus" AS ENUM ('NEW', 'REVIEWED', 'CONTACTED', 'QUALIFIED', 'CLOSED');

CREATE TABLE "PilotRequest" (
    "id" TEXT NOT NULL,
    "pharmacyName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "whatsappNumber" TEXT NOT NULL,
    "email" TEXT,
    "branchCount" INTEGER NOT NULL,
    "currentSystem" TEXT NOT NULL,
    "mainPain" TEXT NOT NULL,
    "urgency" TEXT NOT NULL,
    "notes" TEXT,
    "status" "PilotRequestStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PilotRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PilotRequest_status_createdAt_idx" ON "PilotRequest"("status", "createdAt");
CREATE INDEX "PilotRequest_createdAt_idx" ON "PilotRequest"("createdAt");
