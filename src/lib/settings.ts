type SettingsData = {
  pharmacyName: string;
  branches: Array<{
    id: string;
    name: string;
    area: string;
    managerName: string | null;
    staffResponseScore: number;
    staffMembers: Array<{ id: string }>;
    patients: Array<{ id: string }>;
    orders: Array<{ id: string }>;
    stockItems: Array<{ id: string }>;
    followUpTasks: Array<{ id: string }>;
  }>;
  staff: Array<{
    id: string;
    name: string;
    role: string;
    branch: { name: string; staffResponseScore: number } | null;
    patients: Array<{ id: string }>;
    followUpTasks: Array<{ id: string }>;
    orders: Array<{ id: string }>;
  }>;
  packageTypes: string[];
  notificationChannels: string[];
  importSettings: string[];
};

export type SetupStatus = "Demo Mode" | "Ready for Pilot" | "Live Configuration";
export type ReadinessStatus = "Ready" | "Manual Import" | "Needs Mapping" | "Future Integration";

export function getSetupStatus(data: SettingsData): SetupStatus {
  const importScore = getImportReadinessScore(data);
  const integrationScore = getIntegrationReadinessScore(data);
  const hasBranches = data.branches.length >= 2;
  const hasStaff = data.staff.length >= 5;
  const hasPatients = data.branches.some((branch) => branch.patients.length > 0);
  const hasStock = data.branches.some((branch) => branch.stockItems.length > 0);

  if (importScore >= 85 && integrationScore >= 75 && hasBranches && hasStaff && hasPatients && hasStock) return "Live Configuration";
  if (importScore >= 55 && hasBranches && hasStaff && hasPatients) return "Ready for Pilot";
  return "Demo Mode";
}

export function getImportReadinessScore(data: SettingsData) {
  const checks = [
    data.branches.length > 0,
    data.staff.length > 0,
    data.branches.some((branch) => branch.patients.length > 0),
    data.branches.some((branch) => branch.stockItems.length > 0),
    data.branches.some((branch) => branch.orders.length > 0),
    data.importSettings.length >= 3
  ];

  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export function getIntegrationReadinessScore(data: SettingsData) {
  const channels = getNotificationChannelStatus(data);
  const integrations = getIntegrationReadinessItems(data);
  const connectedChannels = channels.filter((channel) => channel.status === "Connected" || channel.status === "Manual").length;
  const readyIntegrations = integrations.filter((item) => item.status === "Ready" || item.status === "Manual Import").length;

  return Math.round(((connectedChannels / channels.length) * 0.45 + (readyIntegrations / integrations.length) * 0.55) * 100);
}

export function getSettingsOverview(data: SettingsData) {
  return {
    pharmacyName: data.pharmacyName,
    setupStatus: getSetupStatus(data),
    branchCount: data.branches.length,
    staffCount: data.staff.length,
    activePackageTypes: getPackageConfiguration().filter((item) => item.status === "Active").length,
    notificationChannels: getNotificationChannelStatus(data).length,
    importReadinessScore: getImportReadinessScore(data),
    integrationReadinessScore: getIntegrationReadinessScore(data)
  };
}

export function getBranchConfigurationStatus(data: SettingsData) {
  return data.branches.map((branch) => {
    const revenueTrackingEnabled = branch.orders.length > 0;
    const stockTrackingEnabled = branch.stockItems.length > 0;
    const chronicCareEnabled = branch.patients.length > 0;
    const active = branch.staffMembers.length > 0;
    const suggestedAction = !branch.managerName
      ? "Confirm branch manager and escalation owner before pilot launch."
      : !stockTrackingEnabled
        ? "Import stock list so branch fulfillment risk can be monitored."
        : !chronicCareEnabled
          ? "Import chronic patients and assign refill ownership."
          : "Review branch rules and confirm daily manager reporting rhythm.";

    return {
      id: branch.id,
      name: branch.name,
      location: branch.area,
      manager: branch.managerName ?? "Manager to confirm",
      staffCount: branch.staffMembers.length,
      active,
      revenueTrackingEnabled,
      stockTrackingEnabled,
      chronicCareEnabled,
      suggestedAction
    };
  });
}

export function getStaffConfigurationSummary(data: SettingsData) {
  return data.staff.map((member, index) => {
    const role = member.role.toLowerCase();
    const accessLevel = role.includes("owner")
      ? "Owner"
      : role.includes("manager")
        ? "Manager"
        : role.includes("pharmacist")
          ? "Pharmacist"
          : role.includes("stock")
            ? "Stock Controller"
            : "Support";

    return {
      id: member.id,
      name: member.name,
      role: member.role,
      branch: member.branch?.name ?? "Network",
      followUpResponsibility: member.followUpTasks.length > 0 || accessLevel === "Support",
      orderHandlingResponsibility: member.orders.length > 0 || accessLevel === "Pharmacist" || accessLevel === "Manager",
      stockResponsibility: accessLevel === "Stock Controller" || role.includes("inventory"),
      responseScore: Math.max(72, (member.branch?.staffResponseScore ?? 88) - (index % 4) * 2),
      accessLevel
    };
  });
}

export function getPackageConfiguration() {
  return [
    {
      name: "Basic Refill Care",
      description: "Simple recurring refill reminders for stable chronic patients.",
      monthlyValue: "$35",
      reminderCadence: "7 days and 2 days before refill",
      deliveryOption: "Collection or paid delivery",
      pharmacistCheckIn: "Quarterly",
      status: "Active"
    },
    {
      name: "Plus Chronic Care",
      description: "Higher-touch chronic package with adherence follow-up and refill recovery.",
      monthlyValue: "$65",
      reminderCadence: "10 days, 5 days, and due date",
      deliveryOption: "Priority delivery available",
      pharmacistCheckIn: "Monthly",
      status: "Active"
    },
    {
      name: "Family Care Plan",
      description: "Multi-member refill coordination for households and family packs.",
      monthlyValue: "$120",
      reminderCadence: "Weekly family refill review",
      deliveryOption: "Bundled home delivery",
      pharmacistCheckIn: "Monthly family review",
      status: "Active"
    },
    {
      name: "Corporate Care Plan",
      description: "Employer or organization care coordination with branch reporting.",
      monthlyValue: "$240",
      reminderCadence: "Manager-led monthly schedule",
      deliveryOption: "Bulk delivery or branch collection",
      pharmacistCheckIn: "Monthly account review",
      status: "Draft"
    },
    {
      name: "VIP Health Concierge",
      description: "Premium care path for high-value patients needing proactive service.",
      monthlyValue: "$180",
      reminderCadence: "Personal check-in before every refill",
      deliveryOption: "Priority delivery included",
      pharmacistCheckIn: "Every refill cycle",
      status: "Active"
    }
  ] as const;
}

export function getNotificationChannelStatus(_data: SettingsData) {
  return [
    {
      name: "WhatsApp",
      status: "Manual",
      useCase: "Refill reminders, payment follow-ups, order updates, and branch instructions.",
      nextStep: "Connect WhatsApp Business API when pilot message volume is confirmed."
    },
    {
      name: "SMS",
      status: "Manual",
      useCase: "Fallback refill reminders and low-bandwidth patient communication.",
      nextStep: "Map SMS provider credentials and approved templates."
    },
    {
      name: "Email",
      status: "Connected",
      useCase: "Owner reports, branch summaries, and formal customer updates.",
      nextStep: "Confirm report recipients and daily send time."
    },
    {
      name: "Phone Call",
      status: "Manual",
      useCase: "High-risk chronic recovery, VIP service, and prescription clarification.",
      nextStep: "Assign call owners by branch and patient segment."
    },
    {
      name: "In-app task",
      status: "Connected",
      useCase: "Follow-up queues, manager actions, stock review, and order pipeline ownership.",
      nextStep: "Train staff to update task outcomes daily."
    }
  ] as const;
}

export function getIntegrationReadinessItems(_data: SettingsData) {
  return [
    {
      name: "ProPharm/POS import",
      status: "Needs Mapping" as ReadinessStatus,
      dataNeeded: "Product list, daily sales export, branch codes, and customer reference fields.",
      whyItMatters: "Connects pharmacy counter activity to revenue, stock, and branch performance."
    },
    {
      name: "Online store/app orders",
      status: "Needs Mapping" as ReadinessStatus,
      dataNeeded: "Order source, status, payment flag, fulfillment preference, and branch assignment.",
      whyItMatters: "Lets PORTIONS track online order leakage from quote to delivery."
    },
    {
      name: "WhatsApp orders",
      status: "Manual Import" as ReadinessStatus,
      dataNeeded: "Customer name, phone, order items, source, and assigned staff.",
      whyItMatters: "Keeps informal WhatsApp demand visible inside the revenue pipeline."
    },
    {
      name: "SMS platform",
      status: "Future Integration" as ReadinessStatus,
      dataNeeded: "Provider credentials, templates, consent status, and delivery receipts.",
      whyItMatters: "Creates fallback patient reminders when WhatsApp fails."
    },
    {
      name: "Email platform",
      status: "Ready" as ReadinessStatus,
      dataNeeded: "Owner recipients, report schedule, and sender identity.",
      whyItMatters: "Supports executive reporting and branch accountability packs."
    },
    {
      name: "Stock CSV import",
      status: "Ready" as ReadinessStatus,
      dataNeeded: "SKU, product name, category, branch, stock level, reorder level, expiry, and value.",
      whyItMatters: "Enables low-stock, near-expiry, and transfer intelligence before POS integration."
    },
    {
      name: "Patient list import",
      status: "Ready" as ReadinessStatus,
      dataNeeded: "Name, phone, branch, condition, package, medication cycle, refill date, and staff owner.",
      whyItMatters: "Turns chronic care into a recurring revenue engine from the first pilot week."
    },
    {
      name: "Payment gateway",
      status: "Future Integration" as ReadinessStatus,
      dataNeeded: "Payment status, reference, settlement date, customer phone, and order mapping.",
      whyItMatters: "Closes the loop between quoted orders, paid orders, and dispatch."
    }
  ];
}

export function getOperatingRules() {
  return [
    { name: "Refill reminder days before due date", value: "7 days", reason: "Gives patients time to confirm stock, payment, and delivery." },
    { name: "Overdue risk threshold", value: "2 days after due date", reason: "Escalates refill patients before adherence and revenue decay." },
    { name: "Lost patient threshold", value: "21 days overdue", reason: "Moves patients into revival workflow instead of normal reminder flow." },
    { name: "High-value order threshold", value: "$100", reason: "Highlights orders that need manager protection." },
    { name: "Low stock alert threshold", value: "At or below reorder level", reason: "Protects chronic availability and branch fulfillment." },
    { name: "Near-expiry warning window", value: "60 days", reason: "Gives stock controllers time to transfer or promote stock." },
    { name: "Daily CEO brief time", value: "08:00", reason: "Starts the day with revenue, branch, care, and stock evidence." },
    { name: "Branch manager report frequency", value: "Weekly", reason: "Creates a predictable coaching rhythm for each branch." }
  ];
}

export function getDeploymentChecklist(data: SettingsData) {
  const branchesConfirmed = data.branches.length >= 5;
  const staffImported = data.staff.length >= 8;
  const chronicImported = data.branches.some((branch) => branch.patients.length >= 10);
  const stockImported = data.branches.some((branch) => branch.stockItems.length >= 20);
  const orderSources = data.branches.some((branch) => branch.orders.length > 0);

  return [
    { item: "Add pharmacy profile", done: Boolean(data.pharmacyName) },
    { item: "Confirm branches", done: branchesConfirmed },
    { item: "Import staff", done: staffImported },
    { item: "Import chronic patients", done: chronicImported },
    { item: "Import stock list", done: stockImported },
    { item: "Connect order sources", done: orderSources },
    { item: "Configure packages", done: getPackageConfiguration().filter((pkg) => pkg.status === "Active").length >= 4 },
    { item: "Train staff", done: false },
    { item: "Start pilot", done: getSetupStatus(data) !== "Demo Mode" },
    { item: "Review first 7 days", done: false }
  ];
}

export function getAiSetupAdvisor(data: SettingsData) {
  const status = getSetupStatus(data);
  const checklist = getDeploymentChecklist(data);
  const remaining = checklist.filter((item) => !item.done).slice(0, 4).map((item) => item.item.toLowerCase());

  if (status === "Live Configuration") {
    return "PORTIONS is configured for live rollout. Keep integration mapping current, review staff training outcomes, and use the first 7 days to tune branch rules.";
  }

  if (status === "Ready for Pilot") {
    return `PORTIONS is ready for pilot mode. Before live rollout, complete ${remaining.join(", ")}. Stock tracking can begin with CSV import before deep POS integration.`;
  }

  return `PORTIONS is ready for demo mode. To move into pilot mode, import chronic patients, confirm branch managers, and map order sources. The fastest path is staff import, patient list import, and stock CSV readiness.`;
}
