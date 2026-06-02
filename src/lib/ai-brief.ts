import { FollowUpType, OrderStatus, PatientStatus, RiskScore } from "@prisma/client";
import { buildBranchCommand } from "@/lib/branches";
import { estimateMonthlyPatientValue, isHighRisk, isPatientDueToday, isPatientOverdue } from "@/lib/chronic";
import { enumLabel, formatCurrency, formatPercent } from "@/lib/format";
import { isDelayedOrder, isOnlineOrder } from "@/lib/orders";
import {
  getChronicDemandRisk,
  getLowStockItems,
  getNearExpiryItems,
  getSuggestedTransfers
} from "@/lib/stock";

type BriefData = {
  orders: Array<{
    id: string;
    customerName: string;
    status: OrderStatus | string;
    source: string;
    amount: number | string | { toString(): string };
    createdAt: Date;
    branch: { id: string; name: string };
    fulfillmentPreference: string;
  }>;
  patients: Array<{
    id: string;
    name: string;
    status: PatientStatus | string;
    riskScore: RiskScore | string;
    packageType: string;
    conditionCategory: string;
    nextRefillDate: Date;
    branchId: string;
    branch: { id: string; name: string };
    refillEvents: Array<{ amount: number | string | { toString(): string } }>;
  }>;
  followUps: Array<{
    id: string;
    type: FollowUpType | string;
    status: string;
    dueDate: Date;
    branch: { id: string; name: string };
    assignedStaff?: { name: string } | null;
  }>;
  branches: Array<Parameters<typeof buildBranchCommand>[0]>;
  stockItems: Array<{
    id: string;
    productName: string;
    category: string;
    stockLevel: number;
    reorderLevel: number;
    status: string;
    expiryDate: Date | null;
    suggestedAction: string;
    valueAtRisk: number | string | { toString(): string };
    branch: { id: string; name: string };
  }>;
};

export type NetworkHealthStatus = "Strong" | "Stable" | "Watch" | "Critical";

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfToday() {
  const date = startOfToday();
  date.setDate(date.getDate() + 1);
  return date;
}

function isDueToday(date: Date) {
  return date >= startOfToday() && date < endOfToday();
}

function moneySum<T>(items: T[], selector: (item: T) => number | string | { toString(): string }) {
  return items.reduce((sum, item) => sum + Number(selector(item)), 0);
}

export function getNetworkHealthStatus(data: BriefData): NetworkHealthStatus {
  const branchCommands = data.branches.map(buildBranchCommand);
  const criticalCount = branchCommands.filter((branch) => branch.health === "Critical").length;
  const watchCount = branchCommands.filter((branch) => branch.health === "Watch").length;
  const overduePatients = data.patients.filter(isPatientOverdue).length;
  const paymentValue = moneySum(data.orders.filter((order) => order.status === OrderStatus.AWAITING_PAYMENT || order.status === OrderStatus.QUOTED), (order) => order.amount);
  const lowStock = getLowStockItems(data.stockItems).length;

  if (criticalCount > 0 || paymentValue > 450 || overduePatients > 8 || lowStock > 12) return "Critical";
  if (watchCount > 1 || paymentValue > 180 || overduePatients > 3 || lowStock > 5) return "Watch";
  if (watchCount > 0 || paymentValue > 0 || overduePatients > 0 || lowStock > 0) return "Stable";
  return "Strong";
}

export function getRevenueDiagnosis(data: BriefData) {
  const onlineOrders = data.orders.filter(isOnlineOrder);
  const onlineRevenue = moneySum(onlineOrders, (order) => order.amount);
  const awaitingPayment = data.orders.filter((order) => order.status === OrderStatus.AWAITING_PAYMENT || order.status === OrderStatus.QUOTED);
  const awaitingPaymentValue = moneySum(awaitingPayment, (order) => order.amount);
  const delayedOrders = data.orders.filter(isDelayedOrder);
  const highValueOrders = data.orders.filter((order) => Number(order.amount) >= 100 && order.status !== OrderStatus.DELIVERED && order.status !== OrderStatus.CANCELLED);
  const explanation =
    awaitingPayment.length > 0
      ? `${formatCurrency(awaitingPaymentValue)} is stuck in quote or awaiting-payment stages. Payment reminders are the fastest revenue unlock today.`
      : delayedOrders.length > 0
        ? `${delayedOrders.length} orders are delayed in early pipeline stages. Assign owners before they become abandoned sales.`
        : `Online revenue is ${formatCurrency(onlineRevenue)} and there is no major payment queue pressure. Keep fulfillment moving.`;

  return {
    onlineRevenue,
    awaitingPaymentValue,
    delayedOrders,
    highValueOrders,
    explanation
  };
}

export function getChronicRiskSummary(data: BriefData) {
  const dueToday = data.patients.filter(isPatientDueToday);
  const overdue = data.patients.filter(isPatientOverdue);
  const highRisk = data.patients.filter(isHighRisk);
  const vipPatients = data.patients.filter((patient) => patient.status === PatientStatus.VIP);
  const valueAtRisk = overdue.reduce((sum, patient) => sum + estimateMonthlyPatientValue(patient), 0);
  const explanation =
    overdue.length > 0
      ? `${overdue.length} chronic patients are overdue, representing about ${formatCurrency(valueAtRisk)} in recurring monthly value. Recover these before refill behavior decays.`
      : `${dueToday.length} patients are due today. Convert refill reminders into confirmed collection or delivery.`;

  return {
    dueToday,
    overdue,
    highRisk,
    vipPatients,
    valueAtRisk,
    explanation
  };
}

export function getBranchCoachNotes(data: BriefData) {
  const branches = data.branches.map(buildBranchCommand);
  const bestBranch = [...branches].sort((a, b) => b.revenueToday - a.revenueToday)[0];
  const attentionBranch = [...branches].sort((a, b) => branchPressureScore(b) - branchPressureScore(a))[0];

  return {
    bestBranch,
    attentionBranch,
    notes: branches.map((branch) => ({
      id: branch.id,
      name: branch.name,
      health: branch.health,
      note: branch.aiCoachSummary,
      action: branch.suggestedAction
    }))
  };
}

export function getStockIntelligenceSummary(data: BriefData) {
  const lowStock = getLowStockItems(data.stockItems);
  const nearExpiry = getNearExpiryItems(data.stockItems);
  const nearExpiryValue = moneySum(nearExpiry, (item) => item.valueAtRisk);
  const chronicDemandRisk = getChronicDemandRisk(data.stockItems, data.patients);
  const suggestedTransfers = getSuggestedTransfers(data.stockItems);
  const explanation =
    chronicDemandRisk.length > 0
      ? `${chronicDemandRisk.length} stock risks are tied to upcoming chronic demand. Resolve these before refill queues hit the branch.`
      : nearExpiry.length > 0
        ? `${formatCurrency(nearExpiryValue)} is under near-expiry pressure. Use controlled sell-through or transfers.`
        : "Stock pressure is controlled. Keep reorder cadence and transfer review in the branch huddle.";

  return {
    lowStock,
    nearExpiry,
    nearExpiryValue,
    chronicDemandRisk,
    suggestedTransfers,
    explanation
  };
}

export function getTopPriorities(data: BriefData) {
  const revenue = getRevenueDiagnosis(data);
  const chronic = getChronicRiskSummary(data);
  const branch = getBranchCoachNotes(data);
  const stock = getStockIntelligenceSummary(data);
  const priorities = [];

  if (revenue.awaitingPaymentValue > 0) {
    priorities.push({
      title: "Recover payment queue",
      detail: `Send payment reminders for ${formatCurrency(revenue.awaitingPaymentValue)} stuck in quote or awaiting-payment status.`
    });
  }

  if (chronic.overdue.length > 0) {
    priorities.push({
      title: "Call overdue chronic patients",
      detail: `${chronic.overdue.length} overdue refill patients need WhatsApp or phone recovery before close.`
    });
  }

  if (branch.attentionBranch) {
    priorities.push({
      title: `Coach ${branch.attentionBranch.name}`,
      detail: branch.attentionBranch.suggestedAction
    });
  }

  if (stock.lowStock.length > 0) {
    priorities.push({
      title: "Resolve stock blockers",
      detail: `${stock.lowStock.length} low-stock items could affect patient care or revenue capture.`
    });
  }

  return priorities.slice(0, 3);
}

export function getCeoMorningBrief(data: BriefData) {
  const health = getNetworkHealthStatus(data);
  const revenue = getRevenueDiagnosis(data);
  const chronic = getChronicRiskSummary(data);
  const branch = getBranchCoachNotes(data);
  const stock = getStockIntelligenceSummary(data);
  const best = branch.bestBranch?.name ?? "the leading branch";
  const attention = branch.attentionBranch?.name ?? "the watch branch";

  return {
    health,
    summary: `The network is ${health.toLowerCase()} today, with ${formatCurrency(revenue.onlineRevenue)} in online revenue and ${formatCurrency(revenue.awaitingPaymentValue)} exposed in quoted or awaiting-payment orders. ${best} is leading revenue, while ${attention} needs attention due to branch pressure. Chronic risk includes ${chronic.overdue.length} overdue refill patients, and stock pressure includes ${stock.lowStock.length} low-stock items.`,
    priorities: getTopPriorities(data)
  };
}

export function getStaffActionPlan(data: BriefData) {
  const revenue = getRevenueDiagnosis(data);
  const chronic = getChronicRiskSummary(data);
  const stock = getStockIntelligenceSummary(data);
  const reviewOrders = data.orders.filter((order) => order.status === OrderStatus.PHARMACIST_REVIEW);
  const dispatchOrders = data.orders.filter((order) => order.status === OrderStatus.PAID || order.status === OrderStatus.PACKED || order.status === OrderStatus.DISPATCHED);

  return [
    {
      title: "Call overdue chronic patients",
      owner: "Follow-up team",
      detail: `${chronic.overdue.length} overdue patients need refill recovery and delivery/collection options.`
    },
    {
      title: "Send payment reminders",
      owner: "Online orders",
      detail: `${formatCurrency(revenue.awaitingPaymentValue)} is stuck in quote or awaiting-payment stages.`
    },
    {
      title: "Prioritize pharmacist reviews",
      owner: "Pharmacist",
      detail: `${reviewOrders.length} orders need clinical review before quote or payment can move.`
    },
    {
      title: "Prepare dispatch orders",
      owner: "Branch dispensary",
      detail: `${dispatchOrders.length} paid, packed, or dispatched orders need fulfillment discipline.`
    },
    {
      title: "Reorder low stock",
      owner: "Stock controller",
      detail: `${stock.lowStock.length} low-stock items should be reviewed before close.`
    },
    {
      title: "Transfer stock",
      owner: "Branch managers",
      detail: `${stock.suggestedTransfers.length} branch transfer opportunities can reduce unnecessary purchasing.`
    }
  ];
}

export function generateBriefMessage(type: string) {
  const templates: Record<string, string> = {
    refill: "Hi Memory, this is PORTIONS. Your chronic refill is due soon. Would you like us to prepare your medicines for collection or delivery today?",
    overdue: "Hi Memory, we noticed your refill is overdue. Your treatment routine matters, so we can reserve your medicines and arrange collection or delivery today.",
    payment: "Hi Memory, your PORTIONS order has been quoted and payment is still pending. Please confirm once paid so our pharmacy team can pack and dispatch.",
    delivery: "Hi Memory, your PORTIONS order is ready for delivery. Please confirm your address and preferred delivery time window for today.",
    prescription: "Hi Memory, your prescription renewal is due. Please send your updated script so our pharmacist can review before your next refill.",
    revival: "Hi Memory, we have not seen your refill for a while. Are you still taking the same medication, or can PORTIONS help restart your care plan?",
    branch: "Hi team, please clear pharmacist reviews, payment reminders, and overdue refill follow-ups before midday. Send manager feedback once blockers are resolved.",
    transfer: "Hi team, please transfer overstock from the source branch to the branch under stock pressure today. Confirm quantity moved and update stock records after handover."
  };

  return templates[type] ?? templates.refill;
}

export function getDailyCommandChecklist(data: BriefData) {
  const revenue = getRevenueDiagnosis(data);
  const chronic = getChronicRiskSummary(data);
  const stock = getStockIntelligenceSummary(data);

  return {
    morning: [
      `Review network health and confirm top 3 priorities.`,
      `Assign owners for ${chronic.overdue.length} overdue chronic patients.`,
      `Clear pharmacist review orders before quote delays build.`
    ],
    midday: [
      `Send payment reminders for ${formatCurrency(revenue.awaitingPaymentValue)} stuck revenue.`,
      `Check dispatch queue and move paid orders into packing or delivery.`,
      `Confirm low-stock chronic medicines are reserved or reordered.`
    ],
    closing: [
      `Verify overdue refill contacts are logged.`,
      `Confirm stock transfers or reorder commands for ${stock.lowStock.length} low-stock items.`,
      `Send branch manager update on unresolved revenue, care, and stock blockers.`
    ]
  };
}

function branchPressureScore(branch: ReturnType<typeof buildBranchCommand>) {
  return branch.overdueFollowUps * 3 + branch.pendingPharmacistReviews * 3 + branch.overduePatients * 2 + branch.stockAlerts * 1.5 + branch.awaitingPaymentValue / 20 + (branch.conversionRate < 35 ? 4 : 0);
}
