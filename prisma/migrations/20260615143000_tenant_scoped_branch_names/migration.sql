-- Drop global branch-name uniqueness so different tenants can use normal pharmacy branch names.
DROP INDEX IF EXISTS "Branch_name_key";

-- Enforce branch-name uniqueness inside each tenant boundary.
CREATE UNIQUE INDEX "Branch_tenantId_name_key" ON "Branch"("tenantId", "name");
