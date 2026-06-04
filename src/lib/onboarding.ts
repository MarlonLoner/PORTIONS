type OnboardingData = {
  pharmacyName: string;
  branches: Array<{
    id: string;
    name: string;
    area: string;
    managerName: string | null;
    staffMembers: Array<{ id: string }>;
    patients: Array<{ id: string }>;
    orders: Array<{ id: string }>;
    stockItems: Array<{ id: string }>;
  }>;
  staff: Array<{
    id: string;
    role: string;
  }>;
};

export type OnboardingStepStatus = "Not Started" | "In Progress" | "Ready";

export function getOnboardingReadinessScore(data: OnboardingData) {
  const checks = [
    Boolean(data.pharmacyName),
    data.branches.length > 0,
    data.branches.every((branch) => branch.managerName || branch.staffMembers.length > 0),
    data.staff.length > 0,
    data.branches.some((branch) => branch.patients.length > 0),
    data.branches.some((branch) => branch.stockItems.length > 0),
    data.branches.some((branch) => branch.orders.length > 0)
  ];

  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export function getOnboardingOverview(data: OnboardingData) {
  const readinessScore = getOnboardingReadinessScore(data);
  const importsNeeded = [
    data.branches.some((branch) => branch.patients.length > 0) ? null : "Chronic patient import",
    data.branches.some((branch) => branch.stockItems.length > 0) ? null : "Stock import",
    data.branches.some((branch) => branch.orders.length > 0) ? null : "Order source mapping"
  ].filter(Boolean) as string[];

  return {
    pharmacyName: data.pharmacyName,
    pilotStatus: "Preparing Pilot",
    branchesToConfigure: data.branches.length,
    staffToAssign: data.staff.length,
    importsNeeded: importsNeeded.length ? importsNeeded.join(", ") : "Core demo imports available",
    readinessScore,
    suggestedNextAction:
      readinessScore >= 80
        ? "Confirm pilot success metrics and start the 7-day monitoring rhythm."
        : "Confirm branch managers, import chronic patients, and map order sources before launch."
  };
}

export function getOnboardingSteps(data: OnboardingData) {
  const hasBranches = data.branches.length > 0;
  const hasStaff = data.staff.length > 0;
  const hasPatients = data.branches.some((branch) => branch.patients.length > 0);
  const hasStock = data.branches.some((branch) => branch.stockItems.length > 0);
  const hasOrders = data.branches.some((branch) => branch.orders.length > 0);

  return [
    {
      title: "Pharmacy Profile",
      why: "Defines the pilot owner, operating model, and business objective for the 30-day rollout.",
      required: ["Pharmacy name", "Country", "Currency", "Owner/CEO contact", "Operating model", "Main pilot objective"],
      example: "PORTIONS Demo Pharmacy Group, Zimbabwe, USD, Multi-branch, improve chronic retention.",
      status: data.pharmacyName ? "Ready" : "In Progress",
      action: "Confirm the owner contact and the primary pilot objective."
    },
    {
      title: "Branch Setup",
      why: "Turns every branch into a visible business unit with manager accountability.",
      required: ["Branch name", "Location", "Manager", "Services enabled", "Data readiness"],
      example: "Avondale, Borrowdale, CBD, Eastlea, Chitungwiza with managers and service flags.",
      status: hasBranches ? "Ready" : "Not Started",
      action: "Confirm branch managers and enable chronic, stock, and revenue tracking."
    },
    {
      title: "Staff Roles",
      why: "Assigns who handles patients, orders, stock, reports, and branch execution.",
      required: ["Staff names", "Roles", "Branch assignment", "Daily responsibility"],
      example: "Owner, general manager, pharmacist, support agent, stock controller, branch manager.",
      status: hasStaff ? "Ready" : "Not Started",
      action: "Assign staff owners for follow-up queue, order pipeline, and stock intelligence."
    },
    {
      title: "Chronic Patient Import",
      why: "Creates the recurring revenue engine and identifies refill risk before patients are lost.",
      required: ["Patient name", "Phone", "Branch", "Condition", "Medication list", "Refill cycle", "Next refill date", "Package type"],
      example: "Hypertension patient, 30-day cycle, next refill date, Chronic Plus package.",
      status: hasPatients ? "Ready" : "In Progress",
      action: "Import chronic patients and assign follow-up ownership by branch."
    },
    {
      title: "Stock Import",
      why: "Connects medicine availability to chronic demand, branch pressure, and revenue protection.",
      required: ["Product name", "Category", "Branch", "Stock level", "Reorder level", "Expiry date", "Unit cost"],
      example: "Amlodipine, Hypertension, CBD, 18 units, reorder at 25, expiry date, unit cost.",
      status: hasStock ? "Ready" : "In Progress",
      action: "Import stock list and review low-stock chronic medicines first."
    },
    {
      title: "Order Sources",
      why: "Ensures WhatsApp, website, app, walk-in, diaspora, and phone orders are visible in one pipeline.",
      required: ["Source name", "Branch assignment", "Status mapping", "Payment signal", "Fulfillment preference"],
      example: "WhatsApp order, CBD branch, awaiting payment, delivery preference.",
      status: hasOrders ? "Ready" : "In Progress",
      action: "Map order sources and define status ownership from quote to delivery."
    },
    {
      title: "Notification Channels",
      why: "Defines how patients, managers, and staff receive reminders, tasks, and reports.",
      required: ["WhatsApp", "SMS", "Email", "Phone call", "In-app tasks"],
      example: "Manual WhatsApp during pilot, email reports, in-app task queue.",
      status: "In Progress",
      action: "Use manual WhatsApp first, then map integrations after pilot volume is clear."
    },
    {
      title: "Success Metrics",
      why: "Makes the pilot measurable and boardroom-ready after 30 days.",
      required: ["Retention target", "Conversion target", "Follow-up completion", "Branch response", "Stockout reduction"],
      example: "Recover overdue refills, improve online conversion, reduce awaiting-payment value.",
      status: "In Progress",
      action: "Agree on pilot success metrics before launch."
    }
  ] satisfies Array<{
    title: string;
    why: string;
    required: string[];
    example: string;
    status: OnboardingStepStatus;
    action: string;
  }>;
}

export function getPilotLaunchChecklist(data: OnboardingData) {
  return [
    { item: "Confirm branches", done: data.branches.length > 0 },
    { item: "Import chronic patients", done: data.branches.some((branch) => branch.patients.length > 0) },
    { item: "Import stock", done: data.branches.some((branch) => branch.stockItems.length > 0) },
    { item: "Assign staff", done: data.staff.length > 0 },
    { item: "Test pilot request flow", done: true },
    { item: "Test follow-up queue", done: true },
    { item: "Test order pipeline", done: data.branches.some((branch) => branch.orders.length > 0) },
    { item: "Review AI Brief", done: true },
    { item: "Start 7-day monitoring", done: false },
    { item: "Present first executive report", done: false }
  ];
}

export function getSuccessMetrics() {
  return [
    "Chronic refill recovery rate",
    "Online order conversion rate",
    "Awaiting payment reduction",
    "Follow-up completion rate",
    "Branch response improvement",
    "Stockout reduction",
    "Daily executive brief adoption"
  ];
}

export function getAiOnboardingAdvisor(data: OnboardingData) {
  const score = getOnboardingReadinessScore(data);

  if (score >= 80) {
    return "PORTIONS is close to pilot-ready. Confirm success metrics, appoint branch managers, and start the first 7-day operating review.";
  }

  return "PORTIONS is ready for demo access. To begin a real pilot, confirm branch managers, import chronic patients, map order sources, and agree on success metrics for the first 30 days.";
}
