import { FollowUpStatus, OrderStatus, PatientStatus, RiskScore, StockStatus } from "@prisma/client";
import { formatCurrency } from "@/lib/format";

type DemoData = {
  dashboard: {
    totalRevenueToday: number;
    onlineSalesRevenue: number;
    chronicDueToday: number;
    pendingPharmacistReviews: number;
    stockAlertCount: number;
    branchNeedingAttention: string;
  };
  branches: Array<{
    name: string;
    health: "Strong" | "Stable" | "Watch" | "Critical";
    awaitingPaymentValue: number;
    overdueFollowUps: number;
    stockAlerts: number;
  }>;
  stock: {
    smartCards: {
      nearExpiryValue: number;
      lowStockRisks: number;
      chronicDemandRisk: number;
    };
  };
  orders: Array<{
    status: OrderStatus | string;
    amount: number | string | { toString(): string };
  }>;
  patients: Array<{
    status: PatientStatus | string;
    riskScore: RiskScore | string;
  }>;
  followUps: Array<{
    status: FollowUpStatus | string;
  }>;
};

export function getDemoHeroMetrics(data: DemoData) {
  const actionStatuses = new Set<OrderStatus>([
    OrderStatus.NEW,
    OrderStatus.PHARMACIST_REVIEW,
    OrderStatus.QUOTED,
    OrderStatus.AWAITING_PAYMENT
  ]);
  const ordersNeedingAction = data.orders.filter((order) =>
    actionStatuses.has(order.status as OrderStatus)
  ).length;
  const branchesNeedingAttention = data.branches.filter((branch) => branch.health === "Watch" || branch.health === "Critical").length;

  return [
    { label: "Network revenue today", value: formatCurrency(data.dashboard.totalRevenueToday) },
    { label: "Online revenue", value: formatCurrency(data.dashboard.onlineSalesRevenue) },
    { label: "Chronic patients due", value: String(data.dashboard.chronicDueToday) },
    { label: "Orders needing action", value: String(ordersNeedingAction) },
    { label: "Branches needing attention", value: String(branchesNeedingAttention) },
    { label: "Stock alerts", value: String(data.dashboard.stockAlertCount) }
  ];
}

export function getDemoLeakageStory(data: DemoData) {
  const awaitingPaymentValue = data.orders
    .filter((order) => order.status === OrderStatus.QUOTED || order.status === OrderStatus.AWAITING_PAYMENT)
    .reduce((sum, order) => sum + Number(order.amount), 0);
  const overdueFollowUps = data.followUps.filter((task) => task.status !== FollowUpStatus.DONE).length;
  const highRiskPatients = data.patients.filter((patient) => patient.riskScore === RiskScore.HIGH || patient.status === PatientStatus.OVERDUE).length;
  const stockRisk = data.stock.smartCards.nearExpiryValue + data.stock.smartCards.lowStockRisks * 35;
  const branchNeedingAttention = data.dashboard.branchNeedingAttention;

  return {
    awaitingPaymentValue,
    overdueFollowUps,
    highRiskPatients,
    stockRisk,
    branchNeedingAttention,
    narrative: `${formatCurrency(awaitingPaymentValue)} is sitting in quoted or awaiting-payment orders, ${overdueFollowUps} follow-up tasks still need action, and ${highRiskPatients} chronic patients carry retention risk. ${branchNeedingAttention} should be reviewed first. PORTIONS does not just show the numbers. It tells the team what to do next.`
  };
}

export function getDemoValuePillars() {
  return [
    {
      title: "Chronic Revenue Protection",
      controls: "Refill dates, overdue patients, VIP packages, and follow-up discipline.",
      why: "Chronic patients are recurring revenue and recurring care responsibility.",
      outcome: "Recover overdue refills before they become lost patients."
    },
    {
      title: "Order Pipeline Cash Capture",
      controls: "Quotes, pharmacist reviews, payments, packing, dispatch, and delivery.",
      why: "Online demand loses value when no one owns the next step.",
      outcome: "Move orders from WhatsApp inquiry to paid fulfillment."
    },
    {
      title: "Branch Command",
      controls: "Revenue, conversion, care load, stock pressure, and staff response by branch.",
      why: "Owners need to see which branch is carrying the network and which branch is leaking.",
      outcome: "Coach weak branches with evidence, not guesswork."
    },
    {
      title: "Stock Intelligence",
      controls: "Low stock, near expiry, transfers, dead stock, and chronic demand pressure.",
      why: "A refill reminder is useless if the medicine is unavailable.",
      outcome: "Move stock where demand exists before revenue fails."
    },
    {
      title: "AI Daily Brief",
      controls: "Daily priorities across revenue, patients, branches, staff, orders, and stock.",
      why: "Executives need a clear morning read before the calls begin.",
      outcome: "Start each day with the three actions that matter most."
    },
    {
      title: "Reports & Accountability",
      controls: "Executive packs, branch reports, retention evidence, stock risk, and staff actions.",
      why: "Manual reports arrive late and rarely assign ownership.",
      outcome: "Turn operations into evidence and evidence into action."
    }
  ];
}

export function getDemoTimeline() {
  return [
    { step: "1", title: "Dashboard shows network health", href: "/dashboard", detail: "Revenue, branch, patient, order, and stock signals appear in one executive view." },
    { step: "2", title: "AI Brief explains what matters", href: "/ai-brief", detail: "The owner sees priorities, risks, and actions before calling anyone." },
    { step: "3", title: "Chronic Engine identifies patients at risk", href: "/patients", detail: "Due, overdue, VIP, high-risk, and lost patients become visible." },
    { step: "4", title: "Follow-Up Queue recovers revenue", href: "/follow-ups", detail: "Staff get reasons, suggested actions, and WhatsApp-ready messages." },
    { step: "5", title: "Order Pipeline captures payments", href: "/orders", detail: "Quoted, awaiting-payment, paid, packed, and dispatched orders keep moving." },
    { step: "6", title: "Branch Command reveals weak points", href: "/branches", detail: "Every branch becomes a mini business unit with a health signal." },
    { step: "7", title: "Stock Intelligence prevents demand failure", href: "/stock", detail: "Stock risk connects to branch pressure and chronic demand." },
    { step: "8", title: "Reports create accountability", href: "/reports", detail: "Owners and managers get decision documents, not stale spreadsheets." },
    { step: "9", title: "Settings prepares rollout", href: "/settings", detail: "Branches, staff, packages, imports, rules, and channels become deployable." }
  ];
}

export function getDemoUseCases() {
  return [
    { title: "Multi-branch owner abroad", detail: "See branch health, daily revenue, patient risk, and manager actions without waiting for WhatsApp updates." },
    { title: "General manager", detail: "Run the morning huddle from one page and assign revenue, care, stock, and branch actions." },
    { title: "Branch manager", detail: "Fix local bottlenecks in orders, follow-ups, staff response, and stock readiness." },
    { title: "Pharmacist", detail: "Prioritize prescription reviews that are blocking quotes, payments, and patient care." },
    { title: "Support team", detail: "Work a clear follow-up queue with suggested messages and patient-specific next actions." },
    { title: "Stock controller", detail: "Prevent stockouts, expiry loss, and missed chronic demand before branches complain." }
  ];
}

export function getPilotRolloutPlan() {
  return [
    { week: "Week 1", title: "Setup and imports", detail: "Confirm pharmacy profile, branches, staff, chronic patients, stock list, and order sources." },
    { week: "Week 2", title: "Chronic patient and order tracking", detail: "Run refill reminders, overdue recovery, online order pipeline, and payment follow-ups." },
    { week: "Week 3", title: "Branch and stock intelligence", detail: "Review branch health, stock pressure, transfers, low stock, and near-expiry exposure." },
    { week: "Week 4", title: "Reports, AI Brief, and executive review", detail: "Use owner packs, branch reports, and AI Brief to prove the operating rhythm." }
  ];
}

export function getInvestmentFraming() {
  return {
    pilotSetup: "Custom",
    enterpriseRollout: "From $20,000",
    monthlySupport: "Optional retainer",
    bestFor: "Multi-branch pharmacies, pharmacy groups, and owners needing remote visibility",
    explanation: "The investment is justified when PORTIONS protects recurring chronic revenue, improves online conversion, reduces branch leakage, and creates executive visibility."
  };
}
