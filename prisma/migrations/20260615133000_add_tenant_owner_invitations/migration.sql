-- CreateEnum
CREATE TYPE "TenantUserInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED', 'CANCELLED');

-- CreateTable
CREATE TABLE "TenantUserInvitation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'OWNER',
    "tokenHash" TEXT NOT NULL,
    "status" "TenantUserInvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "invitedByPlatformUserId" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantUserInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TenantUserInvitation_tokenHash_key" ON "TenantUserInvitation"("tokenHash");

-- CreateIndex
CREATE INDEX "TenantUserInvitation_tenantId_status_idx" ON "TenantUserInvitation"("tenantId", "status");

-- CreateIndex
CREATE INDEX "TenantUserInvitation_email_idx" ON "TenantUserInvitation"("email");

-- CreateIndex
CREATE INDEX "TenantUserInvitation_expiresAt_idx" ON "TenantUserInvitation"("expiresAt");

-- CreateIndex
CREATE INDEX "TenantUserInvitation_invitedByPlatformUserId_idx" ON "TenantUserInvitation"("invitedByPlatformUserId");

-- AddForeignKey
ALTER TABLE "TenantUserInvitation" ADD CONSTRAINT "TenantUserInvitation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantUserInvitation" ADD CONSTRAINT "TenantUserInvitation_invitedByPlatformUserId_fkey" FOREIGN KEY ("invitedByPlatformUserId") REFERENCES "PlatformUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
