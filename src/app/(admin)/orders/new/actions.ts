"use server";

import { OrderSource, OrderStatus, OrderType } from "@prisma/client";
import { redirect } from "next/navigation";
import { getAccessibleBranchIds, getAccessibleOperatingUnitIds, requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type CreateOrderState = { error: string };

function clean(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function money(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function enumValue<T extends Record<string, string>>(object: T, value: string, fallback: T[keyof T]) {
  return Object.values(object).includes(value) ? value as T[keyof T] : fallback;
}

export async function createOrderAction(formData: FormData) {
  const user = await requirePermission("manageOrders");
  if (!user.tenantId || user.isDemo) throw new Error("Order setup is only available inside a live tenant workspace.");

  const customerName = clean(formData.get("customerName"));
  const phone = clean(formData.get("phone"));
  const branchId = clean(formData.get("branchId"));
  const originatingOperatingUnitId = clean(formData.get("originatingOperatingUnitId"));
  const assignedStaffId = clean(formData.get("assignedStaffId"));
  const amount = money(clean(formData.get("amount")));
  const productName = clean(formData.get("productName")) || "Order item";
  const notes = clean(formData.get("notes"));

  if (!customerName || !phone || !branchId) throw new Error("Customer, phone, and fulfilment branch are required.");
  if (amount === null) throw new Error("Amount must be a valid number.");

  const [branch, originUnit, staff] = await Promise.all([
    prisma.branch.findFirst({ where: { id: branchId, tenantId: user.tenantId }, select: { id: true } }),
    originatingOperatingUnitId ? prisma.operatingUnit.findFirst({ where: { id: originatingOperatingUnitId, tenantId: user.tenantId }, select: { id: true } }) : Promise.resolve(null),
    assignedStaffId ? prisma.staffMember.findFirst({ where: { id: assignedStaffId, tenantId: user.tenantId }, select: { id: true } }) : Promise.resolve(null)
  ]);
  if (!branch) throw new Error("Selected fulfilment branch does not belong to this tenant.");
  if (originatingOperatingUnitId && !originUnit) throw new Error("Selected originating unit does not belong to this tenant.");
  if (assignedStaffId && !staff) throw new Error("Selected staff member does not belong to this tenant.");
  const accessibleBranchIds = getAccessibleBranchIds(user);
  if (accessibleBranchIds && !accessibleBranchIds.includes(branch.id)) throw new Error("You do not have access to create orders for this branch.");
  const accessibleUnitIds = getAccessibleOperatingUnitIds(user);
  if (originUnit && accessibleUnitIds && !accessibleUnitIds.includes(originUnit.id)) throw new Error("You do not have access to use this originating unit.");

  const order = await prisma.order.create({
    data: {
      tenantId: user.tenantId,
      customerName,
      phone,
      source: enumValue(OrderSource, clean(formData.get("source")), OrderSource.WHATSAPP),
      branchId: branch.id,
      fulfillmentBranchId: branch.id,
      originatingOperatingUnitId: originUnit?.id ?? null,
      assignedOperatingUnitId: originUnit?.id ?? null,
      type: enumValue(OrderType, clean(formData.get("type")), OrderType.PRESCRIPTION),
      status: enumValue(OrderStatus, clean(formData.get("status")), OrderStatus.NEW),
      amount,
      assignedStaffId: staff?.id ?? null,
      paymentStatus: clean(formData.get("paymentStatus")) || "Pending",
      fulfillmentPreference: clean(formData.get("fulfillmentPreference")) || "Branch collection",
      internalNotes: notes || null,
      items: {
        create: {
          tenantId: user.tenantId,
          productName,
          category: clean(formData.get("category")) || "General",
          quantity: 1,
          unitPrice: amount
        }
      }
    },
    select: { id: true }
  });

  redirect(`/orders/${order.id}`);
}
