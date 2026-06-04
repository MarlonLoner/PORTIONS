CREATE TYPE "ImportBatchStatus" AS ENUM ('DRAFT', 'NEEDS_CLEANUP', 'READY', 'APPROVED', 'IMPORTED');

CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL,
    "templateType" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "rowCount" INTEGER NOT NULL,
    "readinessScore" INTEGER NOT NULL,
    "validationStatus" TEXT NOT NULL,
    "missingFields" TEXT[],
    "extraFields" TEXT[],
    "optionalFieldsDetected" TEXT[],
    "issueCount" INTEGER NOT NULL,
    "dateWarningCount" INTEGER NOT NULL,
    "numericWarningCount" INTEGER NOT NULL,
    "duplicateWarningCount" INTEGER NOT NULL,
    "branchWarningCount" INTEGER NOT NULL,
    "status" "ImportBatchStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ImportBatch_status_createdAt_idx" ON "ImportBatch"("status", "createdAt");
CREATE INDEX "ImportBatch_templateType_idx" ON "ImportBatch"("templateType");
CREATE INDEX "ImportBatch_validationStatus_idx" ON "ImportBatch"("validationStatus");
