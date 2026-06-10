import { FollowUpStatus, ImportBatchStatus, OrderStatus, PatientStatus, RiskScore, StockStatus } from "@prisma/client";

type PilotCommandData = {
  branches: Array<{
    id: string;
    name: string;
    staffResponseScore: number;
    patients: unknown[];
    orders: unknown[];
    followUpTasks: Array<{ status: FollowUpStatus; dueDate: Date }>;
    stockItems: Array<{ status: StockStatus; valueAtRisk: unknown }>;
    staffMembers: unknown[];
  }>;
  staff: unknown[];
  patients: Array<{ status: PatientStatus; riskScore: RiskScore; nextRefillDate: Date }>;
  orders: Array<{ status: OrderStatus; amount: unknown; source?: unknown }>;
  followUps: Array<{ status: FollowUpStatus; dueDate: Date; type: string }>;
  stockItems: Array<{ status: StockStatus; valueAtRisk: unknown }>;
  reports: unknown[];
  importBatches: Array<{
    templateType: string;
    status: ImportBatchStatus | string;
    rowCount: number;
    importedRecordCount: number | null;
    failedRecordCount: number | null;
    issueCount: number;
    readinessScore: number;
    createdAt: Date;
  }>;
};

export type PilotPhaseStatus = "Not Started" | "In Progress" | "Complete" | "Needs Attention";
export type PilotRiskSeverity = "Low" | "Medium" | "High";
export type PilotStatus = "Setup" | "Active" | "Review" | "Completed";

function today() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function daysBetween(start: Date, end: Date) {
  const a = new Date(start);
  const b = new Date(end);
  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((b.getTime() - a.getTime()) / 86_400_000));
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

const actionableOrderStatuses: OrderStatus[] = [
  OrderStatus.NEW,
  OrderStatus.PHARMACIST_REVIEW,
  OrderStatus.QUOTED,
  OrderStatus.AWAITING_PAYMENT
];

function money(value: unknown) {
  return Number(value ?? 0);
}

function importedCount(data: PilotCommandData, templateType: string, fallback: number) {
  const imported = data.importBatches
    .filter((batch) => batch.templateType === templateType && batch.status === ImportBatchStatus.IMPORTED)
    .reduce((sum, batch) => sum + (batch.importedRecordCount ?? batch.rowCount), 0);
  return imported || fallback;
}

function importTypesCompleted(data: PilotCommandData) {
  const requiredTypes = ["branches", "staff-members", "chronic-patients", "stock-items", "orders", "follow-up-tasks"];
  return requiredTypes.filter((type) => {
    const fallback =
      type === "branches" ? data.branches.length :
      type === "staff-members" ? data.staff.length :
      type === "chronic-patients" ? data.patients.length :
      type === "stock-items" ? data.stockItems.length :
      type === "orders" ? data.orders.length :
      data.followUps.length;
    return importedCount(data, type, fallback) > 0;
  }).length;
}

export function getDataImportCompletion(data: PilotCommandData) {
  return clamp((importTypesCompleted(data) / 6) * 100);
}

export function getOperationalActivationScore(data: PilotCommandData) {
  const followUpActivation = data.followUps.length ? 30 : 0;
  const orderActivation = data.orders.length ? 20 : 0;
  const stockActivation = data.stockItems.length ? 20 : 0;
  const branchActivation = data.branches.filter((branch) => branch.staffMembers.length > 0).length / Math.max(data.branches.length, 1) * 20;
  const reportActivation = data.reports.length ? 10 : 0;
  return clamp(followUpActivation + orderActivation + stockActivation + branchActivation + reportActivation);
}

export function getPilotReadinessScore(data: PilotCommandData) {
  return clamp((getDataImportCompletion(data) * 0.5) + (getOperationalActivationScore(data) * 0.35) + (getValueConfidenceScore(data) * 0.15));
}

export function getValueConfidenceScore(data: PilotCommandData) {
  const signals = [
    data.patients.length >= 10,
    data.followUps.length >= 10,
    data.orders.length >= 5,
    data.stockItems.length >= 10,
    data.branches.length >= 2,
    data.reports.length >= 1
  ].filter(Boolean).length;
  return clamp((signals / 6) * 100);
}

export function getPilotStatus(data: PilotCommandData): PilotStatus {
  const day = getCurrentPilotDay(data);
  const readiness = getPilotReadinessScore(data);
  if (day >= 27 && readiness >= 75) return "Review";
  if (day >= 30 && readiness >= 85) return "Completed";
  if (getDataImportCompletion(data) >= 55 && getOperationalActivationScore(data) >= 45) return "Active";
  return "Setup";
}

export function getCurrentPilotDay(data: PilotCommandData) {
  const firstBatch = [...data.importBatches].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];
  if (!firstBatch) return 7;
  return Math.min(30, Math.max(1, daysBetween(firstBatch.createdAt, today()) + 1));
}

export function getPilotCommandData(data: PilotCommandData) {
  const dueToday = data.followUps.filter((task) => task.status !== FollowUpStatus.DONE && daysBetween(today(), task.dueDate) === 0).length;
  const ordersNeedingAction = data.orders.filter((order) => actionableOrderStatuses.includes(order.status)).length;
  const stockRisks = data.stockItems.filter((item) => item.status !== StockStatus.HEALTHY).length;
  const branchesNeedingAttention = data.branches.filter((branch) =>
    branch.staffResponseScore < 82 ||
    branch.followUpTasks.some((task) => task.status === FollowUpStatus.PENDING && task.dueDate < today()) ||
    branch.stockItems.some((item) => item.status !== StockStatus.HEALTHY)
  ).length;

  return {
    status: getPilotStatus(data),
    currentDay: getCurrentPilotDay(data),
    readinessScore: getPilotReadinessScore(data),
    dataImportCompletion: getDataImportCompletion(data),
    operationalActivationScore: getOperationalActivationScore(data),
    valueConfidenceScore: getValueConfidenceScore(data),
    suggestedNextAction: getPilotCommandAiSummary(data),
    kpis: {
      branchesImported: importedCount(data, "branches", data.branches.length),
      staffImported: importedCount(data, "staff-members", data.staff.length),
      chronicPatientsImported: importedCount(data, "chronic-patients", data.patients.length),
      stockItemsImported: importedCount(data, "stock-items", data.stockItems.length),
      ordersImported: importedCount(data, "orders", data.orders.length),
      followUpTasksImported: importedCount(data, "follow-up-tasks", data.followUps.length),
      followUpsDueToday: dueToday,
      ordersNeedingAction,
      stockRisks,
      branchesNeedingAttention
    }
  };
}

export function getPilotTimeline(data: PilotCommandData) {
  const day = getCurrentPilotDay(data);
  const importCompletion = getDataImportCompletion(data);
  const overdueFollowUps = data.followUps.filter((task) => task.status === FollowUpStatus.PENDING && task.dueDate < today()).length;
  const paymentBacklog = data.orders.filter((order) => order.status === OrderStatus.AWAITING_PAYMENT).length;
  const stockRisks = data.stockItems.filter((item) => item.status !== StockStatus.HEALTHY).length;

  return [
    {
      days: "Days 1-3",
      title: "Setup and data import",
      goal: "Load branches, staff, chronic patients, stock, orders, and follow-up tasks.",
      status: importCompletion >= 80 ? "Complete" : day <= 3 ? "In Progress" : "Needs Attention",
      tasks: ["Confirm branches", "Import staff", "Import chronic patients", "Validate stock and order files"],
      successSignal: "Core pilot data is imported and reviewable."
    },
    {
      days: "Days 4-7",
      title: "Staff training and workflow activation",
      goal: "Get teams using follow-up, order, stock, and branch views daily.",
      status: day < 4 ? "Not Started" : getOperationalActivationScore(data) >= 60 ? "Complete" : "In Progress",
      tasks: ["Train support team", "Assign branch owners", "Review AI Brief", "Run daily queue huddle"],
      successSignal: "Staff can explain their daily PORTIONS actions."
    },
    {
      days: "Days 8-14",
      title: "Chronic follow-up sprint",
      goal: "Recover overdue refills and prove chronic retention value.",
      status: day < 8 ? "Not Started" : overdueFollowUps > 10 ? "Needs Attention" : "In Progress",
      tasks: ["Call overdue patients", "Send refill reminders", "Confirm delivery or collection", "Review high-risk patients"],
      successSignal: "Overdue refill queue is actively reducing."
    },
    {
      days: "Days 15-21",
      title: "Order pipeline and payment recovery",
      goal: "Reduce stuck online orders and recover awaiting payment value.",
      status: day < 15 ? "Not Started" : paymentBacklog > 6 ? "Needs Attention" : "In Progress",
      tasks: ["Prioritize pharmacist review", "Send payment reminders", "Prepare paid dispatch orders", "Track high-value orders"],
      successSignal: "Awaiting payment and delayed review orders are visible and assigned."
    },
    {
      days: "Days 22-26",
      title: "Stock and branch performance review",
      goal: "Expose branch bottlenecks and stock pressure before revenue is lost.",
      status: day < 22 ? "Not Started" : stockRisks > 8 ? "Needs Attention" : "In Progress",
      tasks: ["Review low stock", "Flag near-expiry value", "Coach weak branches", "Plan branch transfers"],
      successSignal: "Branch and stock issues have named owners."
    },
    {
      days: "Days 27-30",
      title: "Executive report and rollout decision",
      goal: "Present pilot evidence and decide whether to expand.",
      status: day < 27 ? "Not Started" : data.reports.length > 0 ? "Complete" : "In Progress",
      tasks: ["Generate report pack", "Summarize value", "Agree cleanup plan", "Decide rollout path"],
      successSignal: "Owner has evidence for the next commercial decision."
    }
  ] as Array<{
    days: string;
    title: string;
    goal: string;
    status: PilotPhaseStatus;
    tasks: string[];
    successSignal: string;
  }>;
}

export function getPilotValueCreated(data: PilotCommandData) {
  const overduePatients = data.patients.filter((patient) => patient.status === PatientStatus.OVERDUE || patient.nextRefillDate < today()).length;
  const awaitingPayment = data.orders.filter((order) => order.status === OrderStatus.AWAITING_PAYMENT).reduce((sum, order) => sum + money(order.amount), 0);
  const stockRiskValue = data.stockItems.filter((item) => item.status !== StockStatus.HEALTHY).reduce((sum, item) => sum + money(item.valueAtRisk), 0);
  const branchBottlenecks = data.branches.filter((branch) => branch.staffResponseScore < 82 || branch.stockItems.some((item) => item.status !== StockStatus.HEALTHY)).length;

  return [
    { label: "Chronic revenue protected", value: overduePatients * 45, detail: `${overduePatients} overdue or exposed chronic patients surfaced.` },
    { label: "Awaiting payment value identified", value: awaitingPayment, detail: "Revenue currently visible in payment recovery workflow." },
    { label: "Stock risk value flagged", value: stockRiskValue, detail: "Low stock, near-expiry, overstock, and dead stock exposure." },
    { label: "Follow-up workload activated", value: data.followUps.length, detail: "Tasks available for support and pharmacist action.", countOnly: true },
    { label: "Branch bottlenecks identified", value: branchBottlenecks, detail: "Branches with response, stock, or workload pressure.", countOnly: true },
    { label: "Reports generated", value: data.reports.length, detail: "Executive evidence available for review.", countOnly: true }
  ];
}

export function getPilotRisks(data: PilotCommandData) {
  const scheduleRisk = data.patients.filter((patient) => patient.nextRefillDate < today()).length;
  const dirtyBatches = data.importBatches.filter((batch) => batch.issueCount > 0 || (batch.failedRecordCount ?? 0) > 0).length;
  const overdueFollowUps = data.followUps.filter((task) => task.status === FollowUpStatus.PENDING && task.dueDate < today()).length;
  const paymentBacklog = data.orders.filter((order) => order.status === OrderStatus.AWAITING_PAYMENT).length;
  const weakBranches = data.branches.filter((branch) => branch.staffResponseScore < 82).length;
  const stockPressure = data.stockItems.filter((item) => item.status === StockStatus.LOW_STOCK || item.status === StockStatus.NEAR_EXPIRY).length;
  const adoptionRisk = data.followUps.length && data.followUps.filter((task) => task.status === FollowUpStatus.DONE).length === 0;

  return [
    risk("Missing refill schedules", scheduleRisk > 10 ? "High" : scheduleRisk > 0 ? "Medium" : "Low", "Patients without timely schedule review become silent revenue leakage.", "Review overdue refill dates and assign staff follow-up."),
    risk("Dirty import data", dirtyBatches > 3 ? "High" : dirtyBatches > 0 ? "Medium" : "Low", "Data cleanup delays pilot confidence and executive reporting.", "Review failed rows and re-upload corrected batches."),
    risk("High overdue follow-ups", overdueFollowUps > 10 ? "High" : overdueFollowUps > 0 ? "Medium" : "Low", "Overdue tasks indicate revenue recovery is not yet disciplined.", "Run a daily recovery sprint from Follow-Up Queue."),
    risk("Payment backlog", paymentBacklog > 6 ? "High" : paymentBacklog > 0 ? "Medium" : "Low", "Awaiting-payment orders are captured revenue that can still leak.", "Send payment reminders and escalate high-value orders."),
    risk("Branches with weak response score", weakBranches > 1 ? "High" : weakBranches > 0 ? "Medium" : "Low", "Weak response scores reduce trust in branch execution.", "Coach managers and review branch action cards daily."),
    risk("Stock pressure", stockPressure > 8 ? "High" : stockPressure > 0 ? "Medium" : "Low", "Stockouts and expiry pressure directly affect patient care and sales.", "Review reorder and transfer recommendations."),
    risk("Low staff adoption", adoptionRisk ? "Medium" : "Low", "The pilot only proves value when staff work the queues.", "Assign daily owners for follow-up, order, and stock workflows.")
  ];
}

function risk(title: string, severity: PilotRiskSeverity, why: string, action: string) {
  return { title, severity, why, action };
}

export function getRoleBasedActionPlan() {
  return [
    { role: "Owner/CEO", actions: ["Review AI Brief", "Confirm value signals", "Decide next rollout gate"], pages: ["/ai-brief", "/reports", "/pilot-command"], successMeasure: "Owner can see leakage, recovery, and branch pressure without manual reports." },
    { role: "General Manager", actions: ["Run daily command huddle", "Assign stuck orders", "Clear overdue follow-ups"], pages: ["/dashboard", "/follow-ups", "/orders"], successMeasure: "Every urgent queue has an owner before midday." },
    { role: "Branch Manager", actions: ["Review branch command", "Coach delayed staff", "Resolve local stock issues"], pages: ["/branches", "/stock"], successMeasure: "Branch risks are acknowledged and actioned daily." },
    { role: "Pharmacist", actions: ["Prioritize prescription reviews", "Support renewal tasks", "Clear clinical blockers"], pages: ["/orders", "/follow-ups"], successMeasure: "Pharmacist review queue does not stall revenue." },
    { role: "Support Team", actions: ["Call overdue patients", "Send WhatsApp reminders", "Log follow-up outcomes"], pages: ["/follow-ups", "/patients"], successMeasure: "Follow-up completion improves and lost patients are revived." },
    { role: "Stock Controller", actions: ["Review low stock", "Flag near-expiry value", "Recommend transfers"], pages: ["/stock", "/branches"], successMeasure: "Stock pressure is visible before patient demand fails." }
  ];
}

export function getSevenDayReviewPack(data: PilotCommandData) {
  const failedRows = data.importBatches.reduce((sum, batch) => sum + (batch.failedRecordCount ?? 0), 0);
  const importedRows = data.importBatches.reduce((sum, batch) => sum + (batch.importedRecordCount ?? 0), 0);
  const highRiskPatients = data.patients.filter((patient) => patient.riskScore === RiskScore.HIGH).length;
  const ordersNeedingAction = data.orders.filter((order) => actionableOrderStatuses.includes(order.status)).length;

  return {
    importedDataSummary: `${importedRows || data.branches.length + data.staff.length + data.patients.length + data.orders.length + data.stockItems.length + data.followUps.length} records are available across branches, staff, patients, stock, orders, and follow-up tasks.`,
    discoveredIssues: `${failedRows} failed import rows, ${highRiskPatients} high-risk patients, and ${ordersNeedingAction} orders needing action are visible.`,
    actionsTaken: "Pilot data has been routed into command views for follow-up, order, branch, stock, and executive review.",
    revenuePatientRisks: `${data.followUps.filter((task) => task.status === FollowUpStatus.PENDING).length} open follow-ups and ${data.stockItems.filter((item) => item.status !== StockStatus.HEALTHY).length} stock risks require ownership.`,
    nextPriorities: ["Clear overdue follow-ups", "Recover awaiting-payment orders", "Resolve low-stock and near-expiry pressure", "Coach branches with weak response signals"],
    summary: getPilotCommandAiSummary(data)
  };
}

export function getPilotDecisionReadiness(data: PilotCommandData) {
  const readiness = getPilotReadinessScore(data);
  const activation = getOperationalActivationScore(data);
  const importCompletion = getDataImportCompletion(data);
  const recommendation =
    readiness >= 85 ? "Prepare full rollout" :
    readiness >= 70 ? "Continue pilot" :
    importCompletion < 60 ? "Needs data cleanup first" :
    activation < 60 ? "Needs staff training first" :
    "Expand to more branches";

  return {
    options: [
      { label: "Continue pilot", active: recommendation === "Continue pilot" },
      { label: "Expand to more branches", active: recommendation === "Expand to more branches" },
      { label: "Prepare full rollout", active: recommendation === "Prepare full rollout" },
      { label: "Needs data cleanup first", active: recommendation === "Needs data cleanup first" },
      { label: "Needs staff training first", active: recommendation === "Needs staff training first" }
    ],
    recommendation,
    summary: "PORTIONS is ready for a focused 7-day operational review. Chronic patient follow-up and order payment recovery should be prioritized before expanding the pilot."
  };
}

export function getPilotCommandAiSummary(data: PilotCommandData) {
  const paymentValue = data.orders.filter((order) => order.status === OrderStatus.AWAITING_PAYMENT).reduce((sum, order) => sum + money(order.amount), 0);
  const overdueFollowUps = data.followUps.filter((task) => task.status === FollowUpStatus.PENDING && task.dueDate < today()).length;
  const stockRisks = data.stockItems.filter((item) => item.status !== StockStatus.HEALTHY).length;

  if (paymentValue > 0 || overdueFollowUps > 0) {
    return `Prioritize payment recovery and overdue follow-ups today. ${overdueFollowUps} follow-ups are overdue and awaiting-payment value is visible in the order pipeline.`;
  }

  if (stockRisks > 0) {
    return `Stock pressure is the main pilot risk today. Review Stock Intelligence before branch demand creates avoidable sales or patient-care failures.`;
  }

  return "Pilot setup is stable. Use the next review cycle to prove repeatable branch discipline, chronic retention, and executive reporting value.";
}

export function getPilotProgressChartData(data: PilotCommandData) {
  const day = getCurrentPilotDay(data);
  const phases = [
    { label: "Setup and Import", start: 1, end: 3 },
    { label: "Staff Training", start: 4, end: 7 },
    { label: "Chronic Follow-Up Sprint", start: 8, end: 14 },
    { label: "Order Recovery Sprint", start: 15, end: 21 },
    { label: "Stock and Branch Review", start: 22, end: 26 },
    { label: "Executive Review", start: 27, end: 30 }
  ];

  return phases.map((phase) => {
    const total = phase.end - phase.start + 1;
    const completeDays = Math.max(0, Math.min(day, phase.end) - phase.start + 1);
    return {
      label: phase.label,
      value: clamp((completeDays / total) * 100),
      detail: `Days ${phase.start}-${phase.end}`
    };
  });
}

export function getImportCompletionChartData(data: PilotCommandData) {
  return [
    { label: "Branches", value: importedCount(data, "branches", data.branches.length) },
    { label: "Staff", value: importedCount(data, "staff-members", data.staff.length) },
    { label: "Chronic Patients", value: importedCount(data, "chronic-patients", data.patients.length) },
    { label: "Stock", value: importedCount(data, "stock-items", data.stockItems.length) },
    { label: "Orders", value: importedCount(data, "orders", data.orders.length) },
    { label: "Follow-Up Tasks", value: importedCount(data, "follow-up-tasks", data.followUps.length) },
    { label: "Import Batches", value: data.importBatches.length }
  ];
}

export function getValueCreatedChartData(data: PilotCommandData) {
  const values = getPilotValueCreated(data);
  return [
    { label: "Chronic revenue protected", value: values[0]?.value ?? 0, detail: "USD estimate" },
    { label: "Awaiting payment value", value: values[1]?.value ?? 0, detail: "USD identified" },
    { label: "Stock risk value", value: values[2]?.value ?? 0, detail: "USD exposure" },
    { label: "Follow-up workload activated", value: values[3]?.value ?? 0, detail: "Tasks" },
    { label: "Branch bottlenecks identified", value: values[4]?.value ?? 0, detail: "Branches" }
  ];
}

export function getRiskBreakdownChartData(data: PilotCommandData) {
  return [
    { label: "Overdue follow-ups", value: data.followUps.filter((task) => task.status === FollowUpStatus.PENDING && task.dueDate < today()).length },
    { label: "Awaiting payment", value: data.orders.filter((order) => order.status === OrderStatus.AWAITING_PAYMENT).length },
    { label: "Stock alerts", value: data.stockItems.filter((item) => item.status !== StockStatus.HEALTHY).length },
    { label: "Dirty import data", value: data.importBatches.filter((batch) => batch.issueCount > 0 || (batch.failedRecordCount ?? 0) > 0).length },
    { label: "Branches needing attention", value: data.branches.filter((branch) => branch.staffResponseScore < 82 || branch.stockItems.some((item) => item.status !== StockStatus.HEALTHY)).length }
  ];
}
