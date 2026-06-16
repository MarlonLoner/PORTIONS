"use server";

import { PackageType, PatientStatus, RiskScore } from "@prisma/client";
import { redirect } from "next/navigation";
import { getAccessibleBranchIds, requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type CreatePatientState = { error: string };

function clean(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function parseDateOrDefault(value: string) {
  if (value) {
    const date = new Date(`${value}T00:00:00.000Z`);
    if (!Number.isNaN(date.getTime())) return date;
  }
  const fallback = new Date();
  fallback.setDate(fallback.getDate() + 30);
  fallback.setHours(0, 0, 0, 0);
  return fallback;
}

export async function createPatientAction(formData: FormData) {
  const user = await requirePermission("managePatients");
  if (!user.tenantId || user.isDemo) throw new Error("Patient setup is only available inside a live tenant workspace.");

  const name = clean(formData.get("name"));
  const phone = clean(formData.get("phone"));
  const branchId = clean(formData.get("branchId"));
  const conditionCategory = clean(formData.get("conditionCategory")) || "General Care";
  const assignedStaffId = clean(formData.get("assignedStaffId"));
  const notes = clean(formData.get("notes"));

  if (!name || !phone || !branchId) throw new Error("Name, phone, and branch are required.");
  const branch = await prisma.branch.findFirst({ where: { id: branchId, tenantId: user.tenantId }, select: { id: true } });
  if (!branch) throw new Error("Selected branch does not belong to this tenant.");
  const accessibleBranchIds = getAccessibleBranchIds(user);
  if (accessibleBranchIds && !accessibleBranchIds.includes(branch.id)) throw new Error("You do not have access to create patients for this branch.");
  const staff = assignedStaffId ? await prisma.staffMember.findFirst({ where: { id: assignedStaffId, tenantId: user.tenantId }, select: { id: true } }) : null;
  const duplicate = await prisma.patient.findFirst({ where: { tenantId: user.tenantId, phone }, select: { id: true } });
  if (duplicate) throw new Error("A patient with this phone number already exists in this tenant.");

  const patient = await prisma.patient.create({
    data: {
      tenantId: user.tenantId,
      name,
      phone,
      branchId: branch.id,
      conditionCategory,
      packageType: PackageType.STANDARD,
      medicationCycle: "30 days",
      nextRefillDate: parseDateOrDefault(clean(formData.get("nextRefillDate"))),
      status: PatientStatus.ACTIVE,
      assignedStaffId: staff?.id ?? null,
      riskScore: RiskScore.MEDIUM,
      medications: {
        create: {
          tenantId: user.tenantId,
          name: conditionCategory || "Medication review pending",
          dosage: "To confirm",
          frequency: "To confirm",
          category: conditionCategory,
          notes: notes || "Created during first-data setup. Review medication details."
        }
      }
    },
    select: { id: true }
  });

  redirect(`/patients/${patient.id}`);
}
