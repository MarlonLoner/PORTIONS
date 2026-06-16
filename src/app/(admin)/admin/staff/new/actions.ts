"use server";

import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type CreateStaffState = { error: string };

function clean(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export async function createStaffAction(formData: FormData) {
  const user = await requirePermission("manageUsers");
  if (!user.tenantId || user.isDemo) throw new Error("Staff setup is only available inside a live tenant workspace.");
  const name = clean(formData.get("name"));
  const role = clean(formData.get("role"));
  const phone = clean(formData.get("phone"));
  const email = clean(formData.get("email"));
  const branchId = clean(formData.get("branchId"));

  if (!name || !role || !phone) throw new Error("Name, role, and phone are required.");
  const branch = branchId ? await prisma.branch.findFirst({ where: { id: branchId, tenantId: user.tenantId }, select: { id: true } }) : null;
  if (branchId && !branch) throw new Error("Selected branch does not belong to this tenant.");

  const staff = await prisma.staffMember.create({
    data: {
      tenantId: user.tenantId,
      name,
      role,
      phone,
      email: email || null,
      branchId: branch?.id ?? null
    },
    select: { id: true }
  });

  redirect(`/admin/users/new?staffId=${staff.id}`);
}
