import { FollowUpStatus, OrderSource, OrderStatus, PatientStatus, StockStatus } from "@prisma/client";
import { isDelayedOrder, isOnlineOrder } from "@/lib/orders";

type Money = number | string | { toString(): string };

export type BranchCommandInput = {
  id: string;
  name: string;
  area: string;
  revenueTarget: Money;
  staffResponseScore: number;
  orders: Array<{
    status: OrderStatus | string;
    source: OrderSource | string;
    amount: Money;
    createdAt: Date;
  }>;
  patients: Array<{
    status: PatientStatus | string;
    nextRefillDate: Date;
    riskScore?: string;
  }>;
  followUpTasks: Array<{
    status: FollowUpStatus | string;
    dueDate: Date;
    assignedStaffId?: string | null;
  }>;
  stockItems: Array<{
    status: StockStatus | string;
    valueAtRisk?: Money;
  }>;
};

export type BranchHealth = "Strong" | "Stable" | "Watch" | "Critical";

const paidStatuses = new Set<string>([
  OrderStatus.PAID,
  OrderStatus.PACKED,
  OrderStatus.DISPATCHED,
  OrderStatus.DELIVERED
]);

const pendingOrderStatuses = new Set<string>([
  OrderStatus.NEW,
  OrderStatus.PHARMACIST_REVIEW,
  OrderStatus.QUOTED,
  OrderStatus.AWAITING_PAYMENT
]);

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

function isToday(date: Date) {
  return date >= startOfToday() && date < endOfToday();
}

function sumMoney<T>(items: T[], selector: (item: T) => Money) {
  return items.reduce((sum, item) => sum + Number(selector(item)), 0);
}

export function calculateBranchRevenue(branch: BranchCommandInput) {
  const todaysOrders = branch.orders.filter((order) => isToday(order.createdAt));
  const onlineOrders = todaysOrders.filter(isOnlineOrder);
  const awaitingPaymentOrders = branch.orders.filter((order) => order.status === OrderStatus.AWAITING_PAYMENT || order.status === OrderStatus.QUOTED);

  return {
    revenueToday: sumMoney(todaysOrders, (order) => order.amount),
    onlineRevenueToday: sumMoney(onlineOrders, (order) => order.amount),
    awaitingPaymentValue: sumMoney(awaitingPaymentOrders, (order) => order.amount),
    delayedOrderValue: sumMoney(branch.orders.filter(isDelayedOrder), (order) => order.amount),
    highValueOrders: branch.orders.filter((order) => Number(order.amount) >= 100)
  };
}

export function calculateBranchOrders(branch: BranchCommandInput) {
  const todaysOrders = branch.orders.filter((order) => isToday(order.createdAt));

  return {
    ordersToday: todaysOrders.length,
    pendingOrders: branch.orders.filter((order) => pendingOrderStatuses.has(String(order.status))).length,
    pendingPharmacistReviews: branch.orders.filter((order) => order.status === OrderStatus.PHARMACIST_REVIEW).length,
    awaitingPaymentOrders: branch.orders.filter((order) => order.status === OrderStatus.AWAITING_PAYMENT || order.status === OrderStatus.QUOTED),
    dispatchQueue: branch.orders.filter((order) => order.status === OrderStatus.PAID || order.status === OrderStatus.PACKED || order.status === OrderStatus.DISPATCHED),
    ordersByStatus: Object.values(OrderStatus).map((status) => ({
      status,
      count: branch.orders.filter((order) => order.status === status).length,
      value: sumMoney(branch.orders.filter((order) => order.status === status), (order) => order.amount)
    }))
  };
}

export function calculateBranchConversionRate(branch: BranchCommandInput) {
  const onlineOrders = branch.orders.filter(isOnlineOrder);
  const paidOnlineOrders = onlineOrders.filter((order) => paidStatuses.has(String(order.status)));

  return onlineOrders.length ? (paidOnlineOrders.length / onlineOrders.length) * 100 : 0;
}

export function getBranchPatientLoad(branch: BranchCommandInput) {
  return {
    chronicDue: branch.patients.filter((patient) => isToday(patient.nextRefillDate)).length,
    overduePatients: branch.patients.filter((patient) => patient.status === PatientStatus.OVERDUE || patient.nextRefillDate < startOfToday()).length,
    highRiskPatients: branch.patients.filter((patient) => patient.riskScore === "HIGH").length
  };
}

export function getBranchRevenueLeakage(branch: BranchCommandInput) {
  const revenue = calculateBranchRevenue(branch);
  const orders = calculateBranchOrders(branch);

  return {
    awaitingPaymentValue: revenue.awaitingPaymentValue,
    delayedOrderValue: revenue.delayedOrderValue,
    stuckOrderCount: orders.awaitingPaymentOrders.length + branch.orders.filter(isDelayedOrder).length
  };
}

export function getBranchStockPressure(branch: BranchCommandInput) {
  const lowStockItems = branch.stockItems.filter((item) => item.status === StockStatus.LOW_STOCK);
  const nearExpiryItems = branch.stockItems.filter((item) => item.status === StockStatus.NEAR_EXPIRY);
  const stockAlerts = branch.stockItems.filter((item) => item.status !== StockStatus.HEALTHY);

  return {
    stockAlerts: stockAlerts.length,
    lowStockItems,
    nearExpiryItems,
    nearExpiryValue: sumMoney(nearExpiryItems, (item) => item.valueAtRisk ?? 0),
    suggestedAction:
      lowStockItems.length > 0
        ? "Reserve chronic-critical medicines and reorder low-stock lines before close."
        : nearExpiryItems.length > 0
          ? "Move near-expiry lines through controlled sell-through or branch transfer."
          : "Keep stock review cadence stable and watch chronic demand."
  };
}

export function calculateBranchHealth(branch: BranchCommandInput): BranchHealth {
  const conversionRate = calculateBranchConversionRate(branch);
  const patientLoad = getBranchPatientLoad(branch);
  const leakage = getBranchRevenueLeakage(branch);
  const stock = getBranchStockPressure(branch);
  const orders = calculateBranchOrders(branch);
  const overdueFollowUps = branch.followUpTasks.filter((task) => task.status === FollowUpStatus.PENDING && task.dueDate < startOfToday()).length;
  const score =
    overdueFollowUps * 3 +
    patientLoad.overduePatients * 2 +
    orders.pendingPharmacistReviews * 3 +
    stock.stockAlerts * 1.5 +
    leakage.stuckOrderCount * 2 +
    (conversionRate < 35 ? 4 : 0) +
    (branch.staffResponseScore < 82 ? 4 : 0);

  if (score >= 24) return "Critical";
  if (score >= 14) return "Watch";
  if (score >= 6) return "Stable";
  return "Strong";
}

export function getBranchSuggestedAction(branch: BranchCommandInput) {
  const health = calculateBranchHealth(branch);
  const orders = calculateBranchOrders(branch);
  const patientLoad = getBranchPatientLoad(branch);
  const leakage = getBranchRevenueLeakage(branch);
  const stock = getBranchStockPressure(branch);

  if (orders.pendingPharmacistReviews > 0) {
    return "Clear pharmacist review first so quotes, payments, and dispatch can move.";
  }

  if (leakage.awaitingPaymentValue > 0) {
    return "Send payment reminders for quoted orders before close of business.";
  }

  if (patientLoad.overduePatients > 0) {
    return "Recover overdue chronic refills with WhatsApp outreach and delivery options.";
  }

  if (stock.stockAlerts > 0) {
    return stock.suggestedAction;
  }

  return health === "Strong" ? "Protect momentum and use this branch as a network benchmark." : "Tighten staff response rhythm and keep order queues moving hourly.";
}

export function getBranchAiCoachSummary(branch: BranchCommandInput) {
  const revenue = calculateBranchRevenue(branch);
  const orders = calculateBranchOrders(branch);
  const patientLoad = getBranchPatientLoad(branch);
  const stock = getBranchStockPressure(branch);
  const conversionRate = calculateBranchConversionRate(branch);

  if (orders.awaitingPaymentOrders.length > 0) {
    return `${branch.name} is carrying revenue today, but ${orders.awaitingPaymentOrders.length} orders are stuck in awaiting payment or quote delay. Prioritize payment reminders before close of business.`;
  }

  if (orders.pendingPharmacistReviews > 0) {
    return `${branch.name} has ${orders.pendingPharmacistReviews} orders waiting for pharmacist review. Clear clinical review before customers switch to another pharmacy.`;
  }

  if (patientLoad.overduePatients > 0) {
    return `${branch.name} has ${patientLoad.overduePatients} overdue chronic patients. Recover refill adherence before the patients become lost revenue.`;
  }

  if (stock.stockAlerts > 0) {
    return `${branch.name} has ${stock.stockAlerts} stock alerts. Protect chronic availability and resolve low-stock or expiry pressure.`;
  }

  return `${branch.name} is running at ${Math.round(conversionRate)}% conversion with ${Math.round(revenue.revenueToday)} revenue today. Keep the branch rhythm steady and use staff to protect recurring refills.`;
}

export function buildBranchCommand(branch: BranchCommandInput) {
  const revenue = calculateBranchRevenue(branch);
  const orders = calculateBranchOrders(branch);
  const patientLoad = getBranchPatientLoad(branch);
  const stock = getBranchStockPressure(branch);
  const conversionRate = calculateBranchConversionRate(branch);
  const overdueFollowUps = branch.followUpTasks.filter((task) => task.status === FollowUpStatus.PENDING && task.dueDate < startOfToday()).length;

  return {
    id: branch.id,
    name: branch.name,
    area: branch.area,
    revenueToday: revenue.revenueToday,
    onlineRevenueToday: revenue.onlineRevenueToday,
    ordersToday: orders.ordersToday,
    conversionRate,
    chronicDue: patientLoad.chronicDue,
    overduePatients: patientLoad.overduePatients,
    highRiskPatients: patientLoad.highRiskPatients,
    overdueFollowUps,
    pendingOrders: orders.pendingOrders,
    pendingPharmacistReviews: orders.pendingPharmacistReviews,
    awaitingPaymentValue: revenue.awaitingPaymentValue,
    delayedOrderValue: revenue.delayedOrderValue,
    stockAlerts: stock.stockAlerts,
    lowStockCount: stock.lowStockItems.length,
    nearExpiryCount: stock.nearExpiryItems.length,
    staffResponseScore: branch.staffResponseScore,
    health: calculateBranchHealth(branch),
    suggestedAction: getBranchSuggestedAction(branch),
    aiCoachSummary: getBranchAiCoachSummary(branch)
  };
}
