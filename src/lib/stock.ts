import { PatientStatus, StockStatus } from "@prisma/client";

type Money = number | string | { toString(): string };

export type StockItemInput = {
  id: string;
  productName: string;
  category: string;
  stockLevel: number;
  reorderLevel: number;
  status: StockStatus | string;
  expiryDate: Date | null;
  suggestedAction: string;
  valueAtRisk: Money;
  branch: {
    id: string;
    name: string;
  };
};

export type StockPatientInput = {
  id: string;
  conditionCategory: string;
  nextRefillDate: Date;
  status: PatientStatus | string;
  branchId: string;
  branch?: {
    id: string;
    name: string;
  };
};

function unitValue(item: StockItemInput) {
  if (Number(item.valueAtRisk) > 0 && item.stockLevel > 0) {
    return Number(item.valueAtRisk) / item.stockLevel;
  }

  const categoryValue: Record<string, number> = {
    Hypertension: 6.5,
    Diabetes: 7.4,
    Asthma: 12.5,
    "HIV Care": 8.8,
    Antibiotics: 5.2,
    Supplements: 4.1,
    Skincare: 9.6,
    "Baby Care": 14.8,
    "Pain Management": 3.6
  };

  return categoryValue[item.category] ?? 5;
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function daysUntil(date: Date | null) {
  if (!date) return Number.POSITIVE_INFINITY;
  const start = startOfToday();
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - start.getTime()) / 86_400_000);
}

export function calculateEstimatedStockValue(item: StockItemInput) {
  return Math.round(item.stockLevel * unitValue(item));
}

export function calculateTotalStockValue(items: StockItemInput[]) {
  return items.reduce((sum, item) => sum + calculateEstimatedStockValue(item), 0);
}

export function getLowStockItems(items: StockItemInput[]) {
  return items.filter((item) => item.status === StockStatus.LOW_STOCK || item.stockLevel <= item.reorderLevel);
}

export function getNearExpiryItems(items: StockItemInput[]) {
  return items.filter((item) => item.status === StockStatus.NEAR_EXPIRY || daysUntil(item.expiryDate) <= 60);
}

export function getOverstockItems(items: StockItemInput[]) {
  return items.filter((item) => item.status === StockStatus.OVERSTOCK || item.stockLevel >= item.reorderLevel * 3);
}

export function getDeadStockItems(items: StockItemInput[]) {
  return items.filter((item) => item.status === StockStatus.DEAD_STOCK);
}

export function getReorderUrgency(items: StockItemInput[]) {
  return getLowStockItems(items).filter((item) => item.stockLevel < item.reorderLevel).length;
}

export function getStockRiskLevel(item: StockItemInput) {
  if (item.status === StockStatus.LOW_STOCK || item.stockLevel < item.reorderLevel) return "Critical";
  if (item.status === StockStatus.NEAR_EXPIRY || daysUntil(item.expiryDate) <= 60) return "Watch";
  if (item.status === StockStatus.DEAD_STOCK) return "Dead stock";
  if (item.status === StockStatus.OVERSTOCK) return "Transfer";
  return "Healthy";
}

export function getStockSuggestedAction(item: StockItemInput) {
  const risk = getStockRiskLevel(item);

  if (risk === "Critical") {
    return `${item.productName} is below reorder level at ${item.branch.name}. Reorder urgently and reserve remaining stock for chronic/refill demand.`;
  }

  if (risk === "Watch") {
    return `${item.productName} has expiry pressure at ${item.branch.name}. Run controlled sell-through or transfer before value is lost.`;
  }

  if (risk === "Dead stock") {
    return `${item.productName} appears slow-moving at ${item.branch.name}. Review purchasing and consider transfer or promotion.`;
  }

  if (risk === "Transfer") {
    return `${item.productName} is overstocked at ${item.branch.name}. Move surplus to a branch with pressure before reordering.`;
  }

  return item.suggestedAction;
}

export function getChronicDemandRisk(items: StockItemInput[], patients: StockPatientInput[]) {
  const weekEnd = startOfToday();
  weekEnd.setDate(weekEnd.getDate() + 7);
  const duePatients = patients.filter((patient) => patient.nextRefillDate >= startOfToday() && patient.nextRefillDate < weekEnd && patient.status !== PatientStatus.LOST);
  const lowStockItems = getLowStockItems(items);

  return lowStockItems
    .map((item) => {
      const matchingPatients = duePatients.filter((patient) => patient.branchId === item.branch.id && patient.conditionCategory === item.category);

      return {
        item,
        duePatients: matchingPatients.length,
        message:
          matchingPatients.length > 0
            ? `${matchingPatients.length} ${item.category.toLowerCase()} patients are due this week. ${item.productName} stock is below reorder level at ${item.branch.name}.`
            : `${item.productName} is below reorder level at ${item.branch.name}. Monitor upcoming ${item.category.toLowerCase()} demand.`
      };
    })
    .filter((risk) => risk.duePatients > 0)
    .sort((a, b) => b.duePatients - a.duePatients);
}

export function getSuggestedTransfers(items: StockItemInput[]) {
  const lowStockItems = getLowStockItems(items);
  const overstockItems = getOverstockItems(items);

  return lowStockItems
    .map((lowItem) => {
      const source = overstockItems.find((item) => item.category === lowItem.category && item.branch.id !== lowItem.branch.id);

      if (!source) return null;

      return {
        from: source.branch.name,
        to: lowItem.branch.name,
        productName: source.productName,
        category: source.category,
        quantity: Math.max(5, Math.min(source.stockLevel - source.reorderLevel * 2, lowItem.reorderLevel - lowItem.stockLevel)),
        message: `${lowItem.branch.name} has ${lowItem.category.toLowerCase()} pressure. Transfer ${source.productName} from ${source.branch.name} before placing a new order.`
      };
    })
    .filter((transfer): transfer is NonNullable<typeof transfer> => Boolean(transfer))
    .slice(0, 8);
}

export function getStockAiSummary(items: StockItemInput[], patients: StockPatientInput[]) {
  const lowStock = getLowStockItems(items);
  const nearExpiry = getNearExpiryItems(items);
  const chronicRisks = getChronicDemandRisk(items, patients);
  const transfers = getSuggestedTransfers(items);

  const firstChronicRisk = chronicRisks[0];
  const firstExpiry = nearExpiry.sort((a, b) => Number(b.valueAtRisk) - Number(a.valueAtRisk))[0];
  const firstTransfer = transfers[0];

  return [
    firstChronicRisk
      ? `This branch has low stock on medication linked to upcoming chronic refills: ${firstChronicRisk.message}`
      : `${lowStock.length} low-stock items need review before they affect refill availability.`,
    firstExpiry
      ? `Near-expiry value is concentrated in ${firstExpiry.category.toLowerCase()} at ${firstExpiry.branch.name}. Run a promotion or transfer stock.`
      : "Near-expiry exposure is controlled, but expiry review should remain part of the daily stock huddle.",
    firstTransfer
      ? `${firstTransfer.to} has refill pressure and should receive ${firstTransfer.category.toLowerCase()} stock from ${firstTransfer.from}.`
      : "No obvious transfer pairing is available. Use reorder commands for unresolved branch pressure."
  ];
}
