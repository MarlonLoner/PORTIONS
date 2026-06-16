"use server";

import { StockStatus } from "@prisma/client";
import { redirect } from "next/navigation";
import { getAccessibleBranchIds, requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type CreateStockState = { error: string };

function clean(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function intValue(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function moneyValue(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseDate(value: string) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function inferStockStatus(stockLevel: number, reorderLevel: number, expiryDate: Date | null, selected: string) {
  if (Object.values(StockStatus).includes(selected as StockStatus)) return selected as StockStatus;
  if (expiryDate && expiryDate.getTime() - Date.now() <= 90 * 86_400_000) return StockStatus.NEAR_EXPIRY;
  if (stockLevel <= reorderLevel) return StockStatus.LOW_STOCK;
  if (reorderLevel > 0 && stockLevel >= reorderLevel * 5) return StockStatus.OVERSTOCK;
  return StockStatus.HEALTHY;
}

export async function createStockItemAction(formData: FormData) {
  const user = await requirePermission("manageStock");
  if (!user.tenantId || user.isDemo) throw new Error("Stock setup is only available inside a live tenant workspace.");
  const productName = clean(formData.get("productName"));
  const category = clean(formData.get("category"));
  const branchId = clean(formData.get("branchId"));
  const stockLevel = intValue(clean(formData.get("stockLevel")));
  const reorderLevel = intValue(clean(formData.get("reorderLevel")));
  const expiryDate = parseDate(clean(formData.get("expiryDate")));
  const unitCost = moneyValue(clean(formData.get("unitCost")));
  const batchNumber = clean(formData.get("batchNumber"));

  if (!productName || !category || !branchId) throw new Error("Product, category, and branch are required.");
  if (stockLevel === null || reorderLevel === null) throw new Error("Quantity and reorder level must be valid numbers.");

  const branch = await prisma.branch.findFirst({ where: { id: branchId, tenantId: user.tenantId }, select: { id: true } });
  if (!branch) throw new Error("Selected branch does not belong to this tenant.");
  const accessibleBranchIds = getAccessibleBranchIds(user);
  if (accessibleBranchIds && !accessibleBranchIds.includes(branch.id)) throw new Error("You do not have access to create stock for this branch.");
  const status = inferStockStatus(stockLevel, reorderLevel, expiryDate, clean(formData.get("status")));
  const valueAtRisk = expiryDate && expiryDate.getTime() - Date.now() <= 90 * 86_400_000 ? unitCost * stockLevel : 0;
  const suggestedAction = status === StockStatus.LOW_STOCK
    ? "Reorder urgently before patient demand is affected."
    : status === StockStatus.NEAR_EXPIRY
      ? "Review expiry pressure and consider promotion or transfer."
      : "Monitor during weekly stock review.";

  await prisma.stockItem.create({
    data: {
      tenantId: user.tenantId,
      productName,
      category,
      branchId: branch.id,
      stockLevel,
      reorderLevel,
      expiryDate,
      status,
      valueAtRisk,
      suggestedAction: batchNumber ? `${suggestedAction} Batch: ${batchNumber}.` : suggestedAction
    }
  });

  redirect("/stock");
}
