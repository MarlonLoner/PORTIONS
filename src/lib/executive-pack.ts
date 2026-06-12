import { FollowUpStatus, ImportBatchStatus, OrderStatus, PatientStatus, RiskScore, StockStatus } from "@prisma/client";
import { getPilotCommandData, getPilotDecisionReadiness, getPilotRisks, getPilotValueCreated } from "@/lib/pilot-command";
import { prisma } from "@/lib/prisma";

type Money = number | string | { toString(): string };

const actionableOrderStatuses: OrderStatus[] = [
  OrderStatus.NEW,
  OrderStatus.PHARMACIST_REVIEW,
  OrderStatus.QUOTED,
  OrderStatus.AWAITING_PAYMENT
];

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

function money(value: Money | null | undefined) {
  return Number(value ?? 0);
}

function isToday(value: Date) {
  return value >= startOfToday() && value < endOfToday();
}

export async function getExecutivePackData() {
  const [branches, staff, patients, orders, followUps, stockItems, reports, importBatches, operationalActions] = await Promise.all([
    prisma.branch.findMany({
      include: {
        patients: true,
        orders: true,
        followUpTasks: true,
        stockItems: true,
        staffMembers: true
      },
      orderBy: { name: "asc" }
    }),
    prisma.staffMember.findMany({ include: { branch: true }, orderBy: { name: "asc" } }),
    prisma.patient.findMany({ include: { branch: true, followUpTasks: true }, orderBy: { nextRefillDate: "asc" } }),
    prisma.order.findMany({ include: { branch: true, assignedStaff: true, items: true }, orderBy: { createdAt: "desc" } }),
    prisma.followUpTask.findMany({ include: { branch: true, patient: true, assignedStaff: true }, orderBy: { dueDate: "asc" } }),
    prisma.stockItem.findMany({ include: { branch: true }, orderBy: [{ status: "asc" }, { productName: "asc" }] }),
    prisma.report.findMany({ orderBy: { lastGeneratedAt: "desc" } }),
    prisma.importBatch.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.operationalAction.findMany({
      include: {
        branch: true,
        assignedStaff: true,
        activities: { orderBy: { createdAt: "desc" } }
      },
      orderBy: [{ status: "asc" }, { priority: "desc" }, { dueDate: "asc" }]
    })
  ]);

  return { branches, staff, patients, orders, followUps, stockItems, reports, importBatches, operationalActions };
}

type ExecutivePackData = Awaited<ReturnType<typeof getExecutivePackData>>;

function importedCount(data: ExecutivePackData, templateType: string, fallback: number) {
  const imported = data.importBatches
    .filter((batch) => batch.templateType === templateType && batch.status === ImportBatchStatus.IMPORTED)
    .reduce((sum, batch) => sum + (batch.importedRecordCount ?? batch.rowCount), 0);

  return imported || fallback;
}

export function getImportedDataSummary(data: ExecutivePackData) {
  const approvedImported = data.importBatches.filter((batch) => batch.status === ImportBatchStatus.APPROVED || batch.status === ImportBatchStatus.IMPORTED).length;

  return {
    branchesImported: importedCount(data, "branches", data.branches.length),
    staffImported: importedCount(data, "staff-members", data.staff.length),
    chronicPatientsImported: importedCount(data, "chronic-patients", data.patients.length),
    stockItemsImported: importedCount(data, "stock-items", data.stockItems.length),
    ordersImported: importedCount(data, "orders", data.orders.length),
    followUpTasksImported: importedCount(data, "follow-up-tasks", data.followUps.length),
    importBatchesReviewed: data.importBatches.length,
    approvedImportedBatches: approvedImported
  };
}

export function getRevenueControlSummary(data: ExecutivePackData) {
  const onlineOrders = data.orders.filter((order) => order.source !== "WALK_IN");
  const awaitingPaymentOrders = data.orders.filter((order) => order.status === OrderStatus.AWAITING_PAYMENT || order.status === OrderStatus.QUOTED);
  const highValueOrders = data.orders.filter((order) => money(order.amount) >= 100);
  const ordersNeedingAction = data.orders.filter((order) => actionableOrderStatuses.includes(order.status));
  const awaitingPaymentValue = awaitingPaymentOrders.reduce((sum, order) => sum + money(order.amount), 0);

  return {
    onlineOrderRevenue: onlineOrders.reduce((sum, order) => sum + money(order.amount), 0),
    awaitingPaymentValue,
    ordersNeedingAction: ordersNeedingAction.length,
    highValueOrders: highValueOrders.length,
    narrative:
      awaitingPaymentValue > 0
        ? `PORTIONS surfaced revenue currently stuck in quoted or awaiting-payment orders. This is recoverable leakage if reminders and branch ownership happen today.`
        : "The order pipeline is visible and ready for routine payment, review, and dispatch discipline.",
    actions: ["Send payment reminders", "Prioritize pharmacist review", "Move paid orders into packing and dispatch", "Escalate high-value order delays"]
  };
}

export function getChronicRetentionSummary(data: ExecutivePackData) {
  const dueToday = data.patients.filter((patient) => isToday(patient.nextRefillDate)).length;
  const overdue = data.patients.filter((patient) => patient.status === PatientStatus.OVERDUE || patient.nextRefillDate < startOfToday()).length;
  const highRisk = data.patients.filter((patient) => patient.riskScore === RiskScore.HIGH).length;
  const vip = data.patients.filter((patient) => patient.status === PatientStatus.VIP || patient.packageType === "CHRONIC_PLUS").length;
  const openFollowUps = data.followUps.filter((task) => task.status !== FollowUpStatus.DONE).length;

  return {
    dueToday,
    overdue,
    highRisk,
    vip,
    followUpWorkload: openFollowUps,
    narrative:
      overdue > 0
        ? `${overdue} chronic patients are overdue or exposed. This is the strongest retention recovery opportunity in the pilot.`
        : "Chronic patients are loaded and ready for disciplined refill reminders and retention reporting.",
    actions: ["Call overdue patients", "Send refill reminders", "Prioritize high-risk and VIP patients", "Confirm delivery or branch collection"]
  };
}

export function getBranchPerformanceSummary(data: ExecutivePackData) {
  const branchScores = data.branches.map((branch) => {
    const revenue = branch.orders.reduce((sum, order) => sum + money(order.amount), 0);
    const overdue = branch.followUpTasks.filter((task) => task.status === FollowUpStatus.PENDING && task.dueDate < startOfToday()).length;
    const stockAlerts = branch.stockItems.filter((item) => item.status !== StockStatus.HEALTHY).length;
    const pendingOrders = branch.orders.filter((order) => actionableOrderStatuses.includes(order.status)).length;
    const attentionScore = overdue * 3 + stockAlerts * 2 + pendingOrders + (branch.staffResponseScore < 82 ? 4 : 0);
    return { branch, revenue, attentionScore, overdue, stockAlerts, pendingOrders };
  });
  const best = [...branchScores].sort((a, b) => b.revenue - a.revenue)[0];
  const attention = [...branchScores].sort((a, b) => b.attentionScore - a.attentionScore)[0];
  const bottlenecks = branchScores.filter((item) => item.attentionScore > 0).length;

  return {
    bestPerformingBranch: best?.branch.name ?? "No branch data",
    branchNeedingAttention: attention?.branch.name ?? "No branch data",
    branchesReviewed: data.branches.length,
    branchBottlenecks: bottlenecks,
    actions: ["Review branch command cards", "Assign owners for overdue queues", "Coach weak response branches", "Compare top and weak branch operating habits"]
  };
}

export function getStockRiskSummary(data: ExecutivePackData) {
  const lowStock = data.stockItems.filter((item) => item.status === StockStatus.LOW_STOCK || item.stockLevel <= item.reorderLevel);
  const nearExpiry = data.stockItems.filter((item) => item.status === StockStatus.NEAR_EXPIRY);
  const overstockDead = data.stockItems.filter((item) => item.status === StockStatus.OVERSTOCK || item.status === StockStatus.DEAD_STOCK);
  const riskValue = data.stockItems.filter((item) => item.status !== StockStatus.HEALTHY).reduce((sum, item) => sum + money(item.valueAtRisk), 0);

  return {
    lowStockAlerts: lowStock.length,
    nearExpiryPressure: nearExpiry.length,
    overstockDeadStock: overstockDead.length,
    stockRiskValue: riskValue,
    actions: ["Reorder low-stock chronic lines", "Move near-expiry products", "Review overstock transfer opportunities", "Assign branch stock owners"]
  };
}

export function getStaffExecutionSummary(data: ExecutivePackData) {
  const due = data.followUps.filter((task) => task.status !== FollowUpStatus.DONE && task.dueDate <= endOfToday()).length;
  const completed = data.followUps.filter((task) => task.status === FollowUpStatus.DONE).length;
  const pending = data.followUps.filter((task) => task.status === FollowUpStatus.PENDING).length;
  const assigned = data.followUps.filter((task) => Boolean(task.assignedStaffId)).length;

  return {
    followUpTasksDue: due,
    completed,
    pending,
    staffWorkload: assigned,
    narrative:
      pending > completed
        ? "Staff execution still needs tighter queue discipline. Follow-up ownership should be reviewed daily until completion improves."
        : "Staff execution is visible and measurable through completed follow-ups and assigned task ownership.",
    actions: ["Assign unowned tasks", "Run daily follow-up huddle", "Track completed calls", "Escalate overdue queues"]
  };
}

export function getValueCreatedSummary(data: ExecutivePackData) {
  return getPilotValueCreated(data);
}

export function getPilotRiskSummary(data: ExecutivePackData) {
  return getPilotRisks(data);
}

export function getRolloutRecommendation(data: ExecutivePackData) {
  const decision = getPilotDecisionReadiness(data);
  return {
    recommendation: decision.recommendation,
    why: decision.summary,
    nextSevenDays: ["Recover overdue chronic patients", "Clear awaiting-payment orders", "Resolve stock pressure", "Coach branches with action queues"],
    nextThirtyDays: ["Expand import coverage", "Lock daily operating rhythm", "Generate weekly executive reviews", "Decide commercial rollout scope"],
    requiredDecisions: ["Pilot owner for each branch", "Data cleanup owner", "Rollout branch order", "Support and optimization cadence"]
  };
}

export function getExecutiveSummary(data: ExecutivePackData) {
  const revenue = getRevenueControlSummary(data);
  const chronic = getChronicRetentionSummary(data);
  const stock = getStockRiskSummary(data);
  const branch = getBranchPerformanceSummary(data);

  return {
    discovered: `PORTIONS connected ${data.branches.length} branches, ${data.patients.length} chronic patients, ${data.orders.length} orders, ${data.stockItems.length} stock items, and ${data.followUps.length} follow-up tasks into one command view.`,
    valueCreated: `The pilot surfaced ${chronic.overdue} overdue chronic patients, ${revenue.ordersNeedingAction} orders needing action, ${stock.lowStockAlerts} low-stock alerts, and ${branch.branchBottlenecks} branch bottlenecks.`,
    risksRemain: "The main risks are data quality cleanup, overdue follow-up discipline, payment recovery ownership, branch response rhythm, and stock pressure.",
    next: "Run a focused 7-day operating review before expanding: recover overdue refills, clear payment backlog, assign stock actions, and present the executive pack to ownership."
  };
}

export function getPrintMetadata(data: ExecutivePackData) {
  const pilot = getPilotCommandData(data);
  const decision = getPilotDecisionReadiness(data);
  const generatedAt = new Intl.DateTimeFormat("en-ZW", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date());

  return {
    packType: pilot.currentDay >= 27 ? "30-Day Pilot Review" : "7-Day Pilot Review",
    pilotStatus: pilot.status,
    reviewPeriod: `Day ${pilot.currentDay} of 30`,
    readinessScore: pilot.readinessScore,
    valueConfidenceScore: pilot.valueConfidenceScore,
    rolloutRecommendation: decision.recommendation,
    generatedAt
  };
}

export function getBranchPerformanceChartData(data: ExecutivePackData) {
  return data.branches.map((branch) => {
    const revenue = branch.orders.reduce((sum, order) => sum + money(order.amount), 0);
    const orders = branch.orders.length;
    const overdue = branch.followUpTasks.filter((task) => task.status === FollowUpStatus.PENDING && task.dueDate < startOfToday()).length;
    const stockAlerts = branch.stockItems.filter((item) => item.status !== StockStatus.HEALTHY).length;
    const attentionScore = overdue * 3 + stockAlerts * 2 + (branch.staffResponseScore < 82 ? 4 : 0);

    return {
      label: branch.name,
      value: Math.round(revenue),
      secondaryValue: orders,
      detail: `${orders} orders | attention ${attentionScore}`
    };
  });
}

export function getOrderPipelineChartData(data: ExecutivePackData) {
  const statuses: Array<{ label: string; status: OrderStatus }> = [
    { label: "New", status: OrderStatus.NEW },
    { label: "Review", status: OrderStatus.PHARMACIST_REVIEW },
    { label: "Quoted", status: OrderStatus.QUOTED },
    { label: "Awaiting Payment", status: OrderStatus.AWAITING_PAYMENT },
    { label: "Paid", status: OrderStatus.PAID },
    { label: "Packed", status: OrderStatus.PACKED },
    { label: "Dispatched", status: OrderStatus.DISPATCHED },
    { label: "Delivered", status: OrderStatus.DELIVERED }
  ];

  return statuses.map((item) => ({
    label: item.label,
    value: data.orders.filter((order) => order.status === item.status).length
  }));
}

export function getStockRiskChartData(data: ExecutivePackData) {
  const statuses: Array<{ label: string; status: StockStatus }> = [
    { label: "Healthy", status: StockStatus.HEALTHY },
    { label: "Low Stock", status: StockStatus.LOW_STOCK },
    { label: "Near Expiry", status: StockStatus.NEAR_EXPIRY },
    { label: "Overstock", status: StockStatus.OVERSTOCK },
    { label: "Dead Stock", status: StockStatus.DEAD_STOCK }
  ];

  return statuses.map((item) => ({
    label: item.label,
    value: data.stockItems.filter((stock) => stock.status === item.status).length
  }));
}

export function getExecutiveValueSnapshotData(data: ExecutivePackData) {
  return getValueCreatedSummary(data).map((item) => ({
    label: item.label,
    value: item.value,
    detail: item.countOnly ? "Count" : "USD estimate"
  }));
}
