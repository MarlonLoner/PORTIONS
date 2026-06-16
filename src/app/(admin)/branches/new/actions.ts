"use server";

import { OperatingUnitStatus, OperatingUnitType, Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type CreateBranchState = {
  error: string;
};

function clean(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function codeFrom(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40);
}

export async function createBranchAction(formData: FormData) {
  const user = await requirePermission("manageOperatingUnits");
  if (!user.tenantId || user.isDemo) throw new Error("Branch setup is only available inside a live tenant workspace.");

  const name = clean(formData.get("name"));
  const branchCode = codeFrom(clean(formData.get("code")) || name);
  const address = clean(formData.get("address"));
  const phone = clean(formData.get("phone"));
  const email = clean(formData.get("email"));
  const managerName = clean(formData.get("managerName"));
  const whatsappNumber = clean(formData.get("whatsappNumber"));
  const status = clean(formData.get("status")) === "ACTIVE" ? OperatingUnitStatus.ACTIVE : OperatingUnitStatus.SETUP;

  if (!name) throw new Error("Branch name is required.");
  if (!branchCode) throw new Error("Branch code is required.");
  if (!address) throw new Error("Address or location is required.");

  let redirectTo = "";
  try {
    const created = await prisma.$transaction(async (tx) => {
      const duplicateBranch = await tx.branch.findFirst({ where: { tenantId: user.tenantId, name }, select: { id: true } });
      if (duplicateBranch) throw new Error("A branch with this name already exists for this tenant.");

      const branch = await tx.branch.create({
        data: {
          tenantId: user.tenantId,
          name,
          area: address,
          managerName: managerName || null,
          staffResponseScore: 90
        },
        select: { id: true }
      });

      const code = `${user.tenantSlug?.toUpperCase().replace(/[^A-Z0-9]+/g, "_") ?? user.tenantId}_${branchCode}`.slice(0, 100);
      await tx.operatingUnit.create({
        data: {
          tenantId: user.tenantId,
          name,
          code,
          type: OperatingUnitType.PHYSICAL_BRANCH,
          status,
          branchId: branch.id,
          location: address,
          phone: phone || null,
          email: email || null,
          whatsappNumber: whatsappNumber || null,
          contactLabel: `${name} Branch`,
          handlesPatientFollowUps: true,
          handlesStock: true,
          handlesOnlineOrders: true,
          handlesEvents: true,
          handlesCommunications: true
        }
      });

      await tx.auditLog.create({
        data: {
          tenantId: user.tenantId,
          actorType: "TENANT_USER",
          actorId: user.id,
          actorLabel: `${user.name} (${user.role})`,
          action: "branch.created",
          recordType: "Branch",
          recordId: branch.id,
          outcome: "SUCCESS",
          metadata: { branchName: name, branchCode }
        }
      });

      return branch;
    });
    redirectTo = `/branches/${created.id}`;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error("A branch or operating-unit code with these details already exists. Use a different branch code.");
    }
    throw error instanceof Error ? error : new Error("Branch could not be created.");
  }

  redirect(redirectTo);
}
