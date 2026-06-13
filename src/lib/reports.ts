import { EventStatus, FollowUpStatus, OrderStatus, PatientStatus, ReportType, RiskScore, StockStatus } from "@prisma/client";
import { enumLabel, formatCurrency, formatPercent } from "@/lib/format";
import { getEventFundingSummary, getEventReadinessScore } from "@/lib/events";

type Money = number | string | { toString(): string };
type ReportStatus = "Ready" | "Needs Review" | "Action Required";

type ReportData = {
  reports: Array<{
    id: string;
    type: ReportType;
    title: string;
    description: string;
    lastGeneratedAt: Date;
    keyMetric: string;
  }>;
  dashboard: {
    totalRevenueToday: number;
    onlineSalesRevenue: number;
    ordersToday: number;
    conversionRate: number;
    chronicDueToday: number;
    overdueRefillPatients: number;
    pendingPharmacistReviews: number;
    stockAlertCount: number;
  };
  branches: Array<{
    name: string;
    health: "Strong" | "Stable" | "Watch" | "Critical";
    revenueToday: number;
    conversionRate: number;
    overdueFollowUps: number;
    pendingPharmacistReviews: number;
    awaitingPaymentValue: number;
    stockAlerts: number;
    suggestedAction: string;
  }>;
  stock: {
    smartCards: {
      nearExpiryValue: number;
      lowStockRisks: number;
      deadStockItems: number;
      suggestedBranchTransfers: number;
      reorderUrgency: number;
    };
  };
  orders: Array<{
    status: OrderStatus | string;
    amount: Money;
    createdAt: Date;
  }>;
  patients: Array<{
    status: PatientStatus | string;
    riskScore: RiskScore | string;
    refillEvents: Array<{ amount: Money }>;
  }>;
  followUps: Array<{
    status: FollowUpStatus | string;
    dueDate: Date;
  }>;
  events: Array<{
    status: EventStatus | string;
    startDate: Date;
    proposedBudget: Money | null;
    approvedBudget: Money | null;
    actualSpend: Money | null;
    revenueGenerated: Money | null;
    leadsGenerated: number | null;
    patientsRegistered: number | null;
    actualAttendance: number | null;
    eventType: string;
    checklistItems: Array<{ status: string; dueDate: Date | null }>;
    expenses: Array<{ status: string; amount: Money }>;
    review?: { attendance: number; leadsGenerated: number; revenueGenerated: Money; patientsRegistered: number } | null;
  }>;
};

const reportUseCases: Record<ReportType, string> = {
  [ReportType.DAILY_EXECUTIVE]: "Owner morning review, network accountability, and closing huddle.",
  [ReportType.WEEKLY_BRANCH]: "Branch manager coaching, conversion review, and local action planning.",
  [ReportType.CHRONIC_RETENTION]: "Chronic revenue protection, adherence recovery, and VIP care discipline.",
  [ReportType.ONLINE_SALES]: "Online sales pipeline review, payment recovery, and dispatch control.",
  [ReportType.STOCK_RISK]: "Stock controller review, reorder prioritization, and branch transfer planning.",
  [ReportType.STAFF_FOLLOW_UP]: "Follow-up team accountability, completion discipline, and response coaching.",
  [ReportType.EVENT_PERFORMANCE]: "Event calendar, budget discipline, preparation readiness, and post-event evidence."
};

function moneySum<T>(items: T[], selector: (item: T) => Money) {
  return items.reduce((sum, item) => sum + Number(selector(item)), 0);
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function isOverdueFollowUp(task: ReportData["followUps"][number]) {
  return task.status !== FollowUpStatus.DONE && task.dueDate < startOfToday();
}

function getAwaitingPaymentValue(data: ReportData) {
  return moneySum(
    data.orders.filter((order) => order.status === OrderStatus.QUOTED || order.status === OrderStatus.AWAITING_PAYMENT),
    (order) => order.amount
  );
}

function getHighRiskBranches(data: ReportData) {
  return data.branches.filter((branch) => branch.health === "Watch" || branch.health === "Critical");
}

export function getReportStatus(report: ReportData["reports"][number], data: ReportData): ReportStatus {
  const overdueFollowUps = data.followUps.filter(isOverdueFollowUp).length;
  const awaitingPaymentValue = getAwaitingPaymentValue(data);
  const highRiskBranches = getHighRiskBranches(data).length;

  if (report.type === ReportType.DAILY_EXECUTIVE) {
    if (highRiskBranches > 1 || awaitingPaymentValue > 500 || data.dashboard.overdueRefillPatients > 6) return "Action Required";
    if (highRiskBranches > 0 || awaitingPaymentValue > 0 || data.dashboard.stockAlertCount > 0) return "Needs Review";
    return "Ready";
  }

  if (report.type === ReportType.WEEKLY_BRANCH) {
    if (highRiskBranches > 1) return "Action Required";
    if (highRiskBranches > 0) return "Needs Review";
    return "Ready";
  }

  if (report.type === ReportType.CHRONIC_RETENTION) {
    if (data.dashboard.overdueRefillPatients > 6) return "Action Required";
    if (data.dashboard.overdueRefillPatients > 0 || data.dashboard.chronicDueToday > 0) return "Needs Review";
    return "Ready";
  }

  if (report.type === ReportType.ONLINE_SALES) {
    if (awaitingPaymentValue > 500 || data.dashboard.pendingPharmacistReviews > 3) return "Action Required";
    if (awaitingPaymentValue > 0 || data.dashboard.pendingPharmacistReviews > 0) return "Needs Review";
    return "Ready";
  }

  if (report.type === ReportType.STOCK_RISK) {
    if (data.stock.smartCards.lowStockRisks > 8 || data.stock.smartCards.nearExpiryValue > 500) return "Action Required";
    if (data.stock.smartCards.lowStockRisks > 0 || data.stock.smartCards.deadStockItems > 0) return "Needs Review";
    return "Ready";
  }

  if (report.type === ReportType.EVENT_PERFORMANCE) {
    const atRisk = data.events.filter((event) => getEventReadinessScore(event as any) < 70 && event.status !== EventStatus.COMPLETED && event.status !== EventStatus.CANCELLED).length;
    const budgetRisk = data.events.filter((event) => getEventFundingSummary(event as any).risk !== "Low").length;
    if (atRisk > 0 || budgetRisk > 0) return "Action Required";
    if (data.events.some((event) => event.status === EventStatus.SUBMITTED || event.status === EventStatus.FUNDING_PENDING)) return "Needs Review";
    return "Ready";
  }

  if (overdueFollowUps > 8) return "Action Required";
  if (overdueFollowUps > 0) return "Needs Review";
  return "Ready";
}

export function getReportKeyMetric(report: ReportData["reports"][number], data: ReportData) {
  const overdueFollowUps = data.followUps.filter(isOverdueFollowUp).length;
  const highRiskPatients = data.patients.filter((patient) => patient.riskScore === RiskScore.HIGH).length;

  const metrics: Record<ReportType, string> = {
    [ReportType.DAILY_EXECUTIVE]: `${formatCurrency(data.dashboard.totalRevenueToday)} reviewed today`,
    [ReportType.WEEKLY_BRANCH]: `${getHighRiskBranches(data).length} branches need attention`,
    [ReportType.CHRONIC_RETENTION]: `${data.dashboard.overdueRefillPatients + highRiskPatients} retention risks`,
    [ReportType.ONLINE_SALES]: `${formatCurrency(getAwaitingPaymentValue(data))} stuck revenue`,
    [ReportType.STOCK_RISK]: `${formatCurrency(data.stock.smartCards.nearExpiryValue)} expiry exposure`,
    [ReportType.STAFF_FOLLOW_UP]: `${overdueFollowUps} overdue follow-ups`,
    [ReportType.EVENT_PERFORMANCE]: `${data.events.filter((event) => event.status === EventStatus.COMPLETED).length}/${data.events.length} events completed`
  };

  return metrics[report.type] ?? report.keyMetric;
}

export function getReportAiSummary(report: ReportData["reports"][number], data: ReportData) {
  const branch = getHighRiskBranches(data)[0];
  const awaitingPaymentValue = getAwaitingPaymentValue(data);

  const summaries: Record<ReportType, string> = {
    [ReportType.DAILY_EXECUTIVE]: `Today's executive evidence shows ${formatCurrency(data.dashboard.totalRevenueToday)} revenue, ${data.dashboard.ordersToday} orders, and ${data.dashboard.overdueRefillPatients} overdue chronic patients. Review revenue exposure and branch accountability before close.`,
    [ReportType.WEEKLY_BRANCH]: branch
      ? `${branch.name} should be reviewed first. Its branch health is ${branch.health.toLowerCase()}, with ${branch.overdueFollowUps} overdue follow-ups and ${formatCurrency(branch.awaitingPaymentValue)} awaiting payment.`
      : `Branch performance is stable enough for routine manager review. Use the report to reinforce conversion and follow-up discipline.`,
    [ReportType.CHRONIC_RETENTION]: `${data.dashboard.overdueRefillPatients} overdue refill patients and ${data.dashboard.chronicDueToday} patients due today need retention discipline. Staff should confirm collection or delivery before patients drift.`,
    [ReportType.ONLINE_SALES]: `${formatCurrency(awaitingPaymentValue)} is sitting in quote or awaiting-payment stages. Payment reminders and pharmacist review clearance are the fastest sales protection actions.`,
    [ReportType.STOCK_RISK]: `${data.stock.smartCards.lowStockRisks} low-stock risks and ${formatCurrency(data.stock.smartCards.nearExpiryValue)} near-expiry value need stock controller review. Tie reorder decisions to chronic demand first.`,
    [ReportType.STAFF_FOLLOW_UP]: `${data.followUps.filter(isOverdueFollowUp).length} follow-up tasks are overdue. Managers should review staff ownership, completion discipline, and message quality.`,
    [ReportType.EVENT_PERFORMANCE]: `${data.events.length} events are visible in the event accountability layer. ${data.events.filter((event) => event.status === EventStatus.SUBMITTED).length} need approval, ${data.events.filter((event) => event.status === EventStatus.FUNDING_PENDING).length} need funding movement, and ${data.events.filter((event) => event.status === EventStatus.COMPLETED && !event.review).length} are awaiting review.`
  };

  return summaries[report.type];
}

export function getReportRecommendedActions(report: ReportData["reports"][number], data: ReportData) {
  const actions: Record<ReportType, string[]> = {
    [ReportType.DAILY_EXECUTIVE]: [
      "Review revenue, chronic risk, and branch blockers in the morning huddle.",
      "Assign one owner for payment recovery and one owner for overdue refill recovery.",
      "Close the day by checking unresolved branch and stock risks."
    ],
    [ReportType.WEEKLY_BRANCH]: [
      "Rank branches by health status and revenue discipline.",
      "Coach branches with overdue follow-ups or delayed pharmacist reviews.",
      "Use strong branches as operating benchmarks for the network."
    ],
    [ReportType.CHRONIC_RETENTION]: [
      "Call overdue chronic patients before marking them lost.",
      "Prioritize high-risk and VIP packages for personal follow-up.",
      "Confirm refill collection or delivery for patients due today."
    ],
    [ReportType.ONLINE_SALES]: [
      "Send WhatsApp payment reminders for quoted and awaiting-payment orders.",
      "Clear pharmacist review before quote delays increase.",
      "Move paid orders into packing and dispatch before close."
    ],
    [ReportType.STOCK_RISK]: [
      "Reorder low-stock items linked to chronic demand.",
      "Transfer overstock into branches with refill pressure.",
      "Run controlled action on near-expiry stock before value is lost."
    ],
    [ReportType.STAFF_FOLLOW_UP]: [
      "Review overdue tasks by owner and branch.",
      "Check message quality for chronic and payment follow-ups.",
      "Use completion discipline as a branch manager coaching signal."
    ],
    [ReportType.EVENT_PERFORMANCE]: [
      "Review submitted events and decide approval or rejection.",
      "Release funding for approved events with dates approaching.",
      "Clear overdue event checklist items and capture reviews for completed events."
    ]
  };

  return actions[report.type];
}

export function getReportsOverview(data: ReportData) {
  const executive = data.reports.find((report) => report.type === ReportType.DAILY_EXECUTIVE);
  const highRiskPatients = data.patients.filter((patient) => patient.riskScore === RiskScore.HIGH || patient.status === PatientStatus.OVERDUE || patient.status === PatientStatus.LOST).length;
  const pendingActions = data.followUps.filter((task) => task.status !== FollowUpStatus.DONE).length;
  const attentionReports = getReportsNeedingAttention(data);

  return {
    reportsAvailable: data.reports.length,
    lastExecutiveReport: executive?.lastGeneratedAt,
    revenueReviewed: data.dashboard.totalRevenueToday + getAwaitingPaymentValue(data),
    chronicRetentionRisk: highRiskPatients,
    branchesReviewed: data.branches.length,
    stockRiskValue: data.stock.smartCards.nearExpiryValue,
    staffActionsPending: pendingActions,
    reportsNeedingAttention: attentionReports.length
  };
}

export function getReportsNeedingAttention(data: ReportData) {
  return data.reports.filter((report) => getReportStatus(report, data) !== "Ready");
}

export function getOwnerReportPack(data: ReportData) {
  const pack = new Set<ReportType>([ReportType.DAILY_EXECUTIVE, ReportType.WEEKLY_BRANCH, ReportType.ONLINE_SALES]);
  return data.reports.filter((report) => pack.has(report.type));
}

export function getBranchManagerReportPack(data: ReportData) {
  const pack = new Set<ReportType>([ReportType.WEEKLY_BRANCH, ReportType.STAFF_FOLLOW_UP, ReportType.STOCK_RISK]);
  return data.reports.filter((report) => pack.has(report.type));
}

export function getRevenueProtectionPack(data: ReportData) {
  const pack = new Set<ReportType>([ReportType.CHRONIC_RETENTION, ReportType.ONLINE_SALES, ReportType.STAFF_FOLLOW_UP]);
  return data.reports.filter((report) => pack.has(report.type));
}

export function getStockControlPack(data: ReportData) {
  return data.reports.filter((report) => report.type === ReportType.STOCK_RISK);
}

export function buildReportDocuments(data: ReportData) {
  const reports = data.reports.some((report) => report.type === ReportType.EVENT_PERFORMANCE)
    ? data.reports
    : [
        ...data.reports,
        {
          id: "event-performance-report",
          type: ReportType.EVENT_PERFORMANCE,
          title: "Event Performance Report",
          description: "Event planning, approval, funding, readiness, outcomes, and historical promotion intelligence.",
          lastGeneratedAt: new Date(),
          keyMetric: `${data.events.length} events tracked`
        }
      ];

  return reports.map((report) => {
    const status = getReportStatus(report, data);
    const keyMetric = getReportKeyMetric(report, data);
    const riskCount = status === "Action Required" ? 3 : status === "Needs Review" ? 2 : 0;

    return {
      ...report,
      status,
      keyMetric,
      suggestedUseCase: reportUseCases[report.type],
      aiSummary: getReportAiSummary(report, data),
      recommendedActions: getReportRecommendedActions(report, data),
      whatChanged: getReportWhatChanged(report, data),
      risks: getReportRisks(report, data),
      managerNotes: getReportManagerNotes(report, data),
      statusLabel: enumLabel(status),
      riskCount
    };
  });
}

function getReportWhatChanged(report: ReportData["reports"][number], data: ReportData) {
  const onlineShare = data.dashboard.totalRevenueToday > 0 ? (data.dashboard.onlineSalesRevenue / data.dashboard.totalRevenueToday) * 100 : 0;
  const changes: Record<ReportType, string[]> = {
    [ReportType.DAILY_EXECUTIVE]: [
      `${formatCurrency(data.dashboard.totalRevenueToday)} has been reviewed across today's operating signals.`,
      `${formatPercent(data.dashboard.conversionRate)} network conversion is visible for executive review.`,
      `${data.dashboard.stockAlertCount} stock alerts are now part of the accountability pack.`
    ],
    [ReportType.WEEKLY_BRANCH]: [
      `${getHighRiskBranches(data).length} branches are in watch or critical status.`,
      `Best branch signals and attention branches are ready for manager coaching.`,
      `Branch conversion now sits inside the weekly evidence pack.`
    ],
    [ReportType.CHRONIC_RETENTION]: [
      `${data.dashboard.chronicDueToday} chronic patients are due today.`,
      `${data.dashboard.overdueRefillPatients} overdue patients are visible as retention exposure.`,
      `High-risk and lost patients are highlighted for recovery discipline.`
    ],
    [ReportType.ONLINE_SALES]: [
      `${formatPercent(onlineShare)} of reviewed revenue is online sales revenue.`,
      `${formatCurrency(getAwaitingPaymentValue(data))} is visible as payment or quote exposure.`,
      `${data.dashboard.pendingPharmacistReviews} pharmacist reviews can block quote speed.`
    ],
    [ReportType.STOCK_RISK]: [
      `${data.stock.smartCards.lowStockRisks} low-stock risks are available for reorder review.`,
      `${formatCurrency(data.stock.smartCards.nearExpiryValue)} is under near-expiry watch.`,
      `${data.stock.smartCards.suggestedBranchTransfers} transfer suggestions can reduce purchasing pressure.`
    ],
    [ReportType.STAFF_FOLLOW_UP]: [
      `${data.followUps.filter((task) => task.status !== FollowUpStatus.DONE).length} staff actions remain open.`,
      `${data.followUps.filter(isOverdueFollowUp).length} follow-ups are overdue.`,
      `Managers can now use follow-up discipline as evidence, not anecdote.`
    ],
    [ReportType.EVENT_PERFORMANCE]: [
      `${data.events.length} events are now part of the accountability pack.`,
      `${data.events.filter((event) => event.status === EventStatus.SUBMITTED).length} event approval decisions are visible.`,
      `${data.events.filter((event) => event.status === EventStatus.COMPLETED && event.review).length} completed events have review intelligence.`
    ]
  };

  return changes[report.type];
}

function getReportRisks(report: ReportData["reports"][number], data: ReportData) {
  const risks: Record<ReportType, string[]> = {
    [ReportType.DAILY_EXECUTIVE]: [
      "Revenue can leak if payment reminders are delayed.",
      "Overdue chronic patients can become lost recurring value.",
      "Branch pressure can hide inside stock, staff, and order queues."
    ],
    [ReportType.WEEKLY_BRANCH]: [
      "Weak branches can normalize slow response times.",
      "Low conversion may point to quote, payment, or staff discipline gaps.",
      "Stock alerts can reduce branch fulfillment quality."
    ],
    [ReportType.CHRONIC_RETENTION]: [
      "Overdue refills reduce adherence and monthly recurring revenue.",
      "VIP patients need proactive care before they complain or leave.",
      "Lost patients may require different revival messaging."
    ],
    [ReportType.ONLINE_SALES]: [
      "Quoted orders can go cold if payment follow-up is slow.",
      "Prescription review delays can push customers to competitors.",
      "Paid orders still need fast packing and dispatch discipline."
    ],
    [ReportType.STOCK_RISK]: [
      "Low-stock chronic medicines can break refill trust.",
      "Near-expiry value can turn into avoidable write-off.",
      "Overstocked branches can hide transfer opportunities."
    ],
    [ReportType.STAFF_FOLLOW_UP]: [
      "Incomplete follow-ups create invisible revenue leakage.",
      "Unassigned tasks reduce accountability.",
      "Poor message quality can weaken patient trust."
    ],
    [ReportType.EVENT_PERFORMANCE]: [
      "Events can consume budget without generating evidence if reviews are missed.",
      "Late funding or overdue checklists can weaken attendance and lead capture.",
      "Unassigned owners make event execution dependent on informal follow-up."
    ]
  };

  return risks[report.type];
}

function getReportManagerNotes(report: ReportData["reports"][number], data: ReportData) {
  const branch = getHighRiskBranches(data)[0];
  const notes: Record<ReportType, string> = {
    [ReportType.DAILY_EXECUTIVE]: "Use this as the daily owner evidence pack. Confirm what changed, what is exposed, and who owns the next action.",
    [ReportType.WEEKLY_BRANCH]: branch ? `${branch.name} should receive the first coaching note: ${branch.suggestedAction}` : "No branch is critical today. Keep weekly coaching focused on consistency and conversion.",
    [ReportType.CHRONIC_RETENTION]: "Do not treat chronic follow-up as admin. It is recurring revenue protection and patient care discipline.",
    [ReportType.ONLINE_SALES]: "Online orders need hourly movement. Quote, payment, packing, and dispatch should each have a named owner.",
    [ReportType.STOCK_RISK]: "Stock review should connect to patient demand. Reorder and transfer decisions should protect chronic availability first.",
    [ReportType.STAFF_FOLLOW_UP]: "Managers should review overdue tasks by staff member and branch before closing the day.",
    [ReportType.EVENT_PERFORMANCE]: "Use this report before approving new activations. Confirm readiness, funding, owner, and post-event review discipline."
  };

  return notes[report.type];
}
