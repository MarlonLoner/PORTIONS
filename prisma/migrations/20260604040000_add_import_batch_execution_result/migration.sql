ALTER TABLE "ImportBatch"
ADD COLUMN "importResult" JSONB,
ADD COLUMN "importedRecordCount" INTEGER,
ADD COLUMN "skippedRecordCount" INTEGER,
ADD COLUMN "failedRecordCount" INTEGER,
ADD COLUMN "executionNotes" TEXT;
