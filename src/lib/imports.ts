export type ImportDifficulty = "Easy" | "Medium" | "Advanced";
export type ImportImportance = "Required" | "Optional";

export type ImportTemplate = {
  id: string;
  name: string;
  purpose: string;
  requiredFields: string[];
  optionalFields: string[];
  difficulty: ImportDifficulty;
  importance: ImportImportance;
  suggestedSource: string;
  exampleRow: string[];
};

export function getImportTemplates(): ImportTemplate[] {
  return [
    {
      id: "chronic-patients",
      name: "Chronic Patients",
      purpose: "Create the recurring revenue engine and refill follow-up queue.",
      requiredFields: ["patient_name", "phone_number", "branch", "condition_category", "medication_list", "refill_cycle_days", "next_refill_date"],
      optionalFields: ["package_type", "assigned_staff", "last_contacted_date", "risk_score", "notes"],
      difficulty: "Advanced",
      importance: "Required",
      suggestedSource: "ProPharm export, patient register, chronic spreadsheet",
      exampleRow: ["Memory Moyo", "+263771234567", "CBD", "Hypertension", "Amlodipine 5mg; Atenolol 50mg", "30", "2026-06-18", "CHRONIC_PLUS", "Tariro M.", "2026-06-01", "HIGH", "Prefers delivery"]
    },
    {
      id: "stock-items",
      name: "Stock Items",
      purpose: "Enable low-stock, near-expiry, reorder, and branch transfer intelligence.",
      requiredFields: ["product_name", "category", "branch", "stock_level", "reorder_level"],
      optionalFields: ["expiry_date", "unit_cost", "supplier", "status", "notes"],
      difficulty: "Medium",
      importance: "Required",
      suggestedSource: "POS export, stock CSV, dispensary stock count",
      exampleRow: ["Amlodipine 5mg", "Hypertension", "CBD", "18", "25", "2026-09-30", "2.50", "Mainline Pharma", "LOW_STOCK", "Reserve for chronic patients"]
    },
    {
      id: "branches",
      name: "Branches",
      purpose: "Set up the branch network, locations, managers, and services.",
      requiredFields: ["branch_name", "location"],
      optionalFields: ["manager_name", "phone_number", "services_enabled", "active_status"],
      difficulty: "Easy",
      importance: "Required",
      suggestedSource: "Manual spreadsheet, company branch list",
      exampleRow: ["Avondale", "Harare", "Rudo Ncube", "+263772222222", "Chronic;Orders;Stock", "ACTIVE"]
    },
    {
      id: "staff-members",
      name: "Staff Members",
      purpose: "Assign owners for follow-ups, orders, stock control, and branch execution.",
      requiredFields: ["staff_name", "role", "branch"],
      optionalFields: ["phone_number", "access_level", "follow_up_responsibility", "order_responsibility", "stock_responsibility"],
      difficulty: "Easy",
      importance: "Required",
      suggestedSource: "HR list, branch manager spreadsheet",
      exampleRow: ["Tariro Moyo", "Support Agent", "CBD", "+263773333333", "Support", "YES", "YES", "NO"]
    },
    {
      id: "orders",
      name: "Orders",
      purpose: "Populate the online and branch order pipeline for payment and fulfillment tracking.",
      requiredFields: ["customer_name", "source", "branch", "order_type", "status", "amount"],
      optionalFields: ["assigned_staff", "payment_status", "fulfillment_preference", "notes"],
      difficulty: "Medium",
      importance: "Optional",
      suggestedSource: "WhatsApp logs, website orders, app export, POS export",
      exampleRow: ["Farai Dube", "WHATSAPP", "Borrowdale", "REFILL", "AWAITING_PAYMENT", "86", "Nyasha P.", "Pending", "Delivery", "Quoted this morning"]
    },
    {
      id: "follow-up-tasks",
      name: "Follow-Up Tasks",
      purpose: "Seed operational tasks for refill recovery, payment reminders, delivery confirmations, and lost patient revival.",
      requiredFields: ["customer_name", "task_type", "branch", "due_date", "status"],
      optionalFields: ["assigned_staff", "suggested_action", "priority", "notes"],
      difficulty: "Medium",
      importance: "Optional",
      suggestedSource: "Manual follow-up sheets, CRM export, WhatsApp follow-up log",
      exampleRow: ["Memory Moyo", "OVERDUE", "CBD", "2026-06-04", "PENDING", "Tariro M.", "Call and offer delivery", "High", "Hypertension refill overdue"]
    }
  ];
}

export function getTemplateCsvHeader(template: ImportTemplate) {
  return [...template.requiredFields, ...template.optionalFields];
}

export function getTemplateExampleRow(template: ImportTemplate) {
  return template.exampleRow;
}

export function getImportOverview() {
  const templates = getImportTemplates();
  const requiredImports = templates.filter((template) => template.importance === "Required").length;
  const optionalImports = templates.length - requiredImports;
  const dataReadinessScore = Math.round((requiredImports / templates.length) * 100);

  return {
    templatesAvailable: templates.length,
    requiredImports,
    optionalImports,
    estimatedSetupTime: "2-5 business days",
    dataReadinessScore,
    suggestedNextAction: "Start with branches, staff, and chronic patients before importing stock or historical orders."
  };
}

export function getDataQualityRules() {
  return [
    "Use one row per patient/order/stock item",
    "Dates should use YYYY-MM-DD",
    "Phone numbers should include country code where possible",
    "Branch names must match configured branch names",
    "Medication lists can be separated by semicolons",
    "Avoid merged cells",
    "Avoid formulas",
    "Remove duplicate rows before import"
  ];
}

export function getImportFlowSteps() {
  return [
    "Download template",
    "Fill with pharmacy data",
    "Review formatting",
    "Upload/import during pilot setup",
    "Validate inside PORTIONS"
  ];
}

export function getAiImportAdvisor() {
  return "Start with chronic patients and branches first. Stock and orders can be imported after the first pilot review. For ProPharm/POS exports, map branch names and product categories before importing.";
}
