export const pilotRequestStatuses = ["NEW", "REVIEWED", "CONTACTED", "QUALIFIED", "CLOSED"] as const;

export type PilotRequestStatusValue = (typeof pilotRequestStatuses)[number];
export type PilotRequestPriority = "High" | "Medium" | "Standard";

export type PilotRequestLike = {
  status: PilotRequestStatusValue | string;
  branchCount: number;
  urgency: string;
  mainPain: string;
  currentSystem: string;
  contactName: string;
  pharmacyName: string;
};

export const pilotRequestStatusLabels: Record<PilotRequestStatusValue, string> = {
  NEW: "New",
  REVIEWED: "Reviewed",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  CLOSED: "Closed"
};

export const pilotRequestStatusClasses: Record<PilotRequestStatusValue, string> = {
  NEW: "bg-clinical-50 text-clinical-800 ring-clinical-200",
  REVIEWED: "bg-slate-100 text-slate-700 ring-slate-200",
  CONTACTED: "bg-amber-50 text-amber-700 ring-amber-200",
  QUALIFIED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  CLOSED: "bg-rose-50 text-rose-700 ring-rose-200"
};

export const pilotRequestPriorityClasses: Record<PilotRequestPriority, string> = {
  High: "bg-rose-50 text-rose-700 ring-rose-200",
  Medium: "bg-amber-50 text-amber-700 ring-amber-200",
  Standard: "bg-clinical-50 text-clinical-800 ring-clinical-200"
};

export function isPilotRequestStatus(value: string): value is PilotRequestStatusValue {
  return pilotRequestStatuses.includes(value as PilotRequestStatusValue);
}

export function getPilotRequestPriority(request: PilotRequestLike): PilotRequestPriority {
  const urgency = request.urgency.toLowerCase();
  const pain = request.mainPain.toLowerCase();
  const system = request.currentSystem.toLowerCase();
  let score = 0;

  if (request.branchCount >= 5) score += 4;
  else if (request.branchCount >= 2) score += 2;
  if (urgency.includes("immediate") || urgency.includes("urgent")) score += 4;
  else if (urgency.includes("30") || urgency.includes("month")) score += 2;
  if (pain.includes("chronic") || pain.includes("order") || pain.includes("stock") || pain.includes("multiple")) score += 3;
  if (system.includes("whatsapp") || system.includes("spreadsheet") || system.includes("manual")) score += 2;
  if (request.status === "QUALIFIED") score += 2;
  if (request.status === "CLOSED") score -= 6;

  if (score >= 8) return "High";
  if (score >= 4) return "Medium";
  return "Standard";
}

export function getPilotRequestNextAction(request: PilotRequestLike) {
  if (request.status === "NEW") return "Review the lead, confirm branch count, and prepare the first WhatsApp response.";
  if (request.status === "REVIEWED") return "Contact the decision-maker and book a short pilot discovery call.";
  if (request.status === "CONTACTED") return "Summarize pain points and qualify pilot fit around chronic, orders, branches, and stock.";
  if (request.status === "QUALIFIED") return "Confirm data sources, pilot success metrics, and rollout owner.";
  if (request.status === "CLOSED") return "Keep the lead on file and revisit if timing or branch priorities change.";
  return "Review the request and assign the next CRM action.";
}

export function getPilotRequestFollowUpMessage(request: PilotRequestLike) {
  const firstName = request.contactName.split(" ")[0] || request.contactName;

  if (request.status === "CONTACTED") {
    return `Hi ${firstName}, following up on our PORTIONS pilot discussion. Based on what you shared, the first pilot focus would be chronic patient follow-up, order tracking, and branch visibility.`;
  }

  if (request.status === "QUALIFIED") {
    return `Hi ${firstName}, your pharmacy looks like a strong fit for a PORTIONS pilot. The next step is to confirm branch count, data sources, and pilot success metrics.`;
  }

  if (request.status === "CLOSED") {
    return `Hi ${firstName}, thank you for reviewing PORTIONS. I'll keep your details on file in case you want to revisit a pharmacy command pilot later.`;
  }

  return `Hi ${firstName}, thanks for requesting a PORTIONS pilot for ${request.pharmacyName}. I'd like to understand your branches, current system, and biggest operational bottleneck so we can map the right 30-day pilot.`;
}

export function getPilotRequestStatusSummary(request: PilotRequestLike) {
  const priority = getPilotRequestPriority(request);
  const status = isPilotRequestStatus(String(request.status)) ? pilotRequestStatusLabels[request.status as PilotRequestStatusValue] : String(request.status);

  return `${status} lead, ${priority.toLowerCase()} priority, ${request.branchCount} branch${request.branchCount === 1 ? "" : "es"}.`;
}

export function getPilotRequestPipelineMetrics(requests: PilotRequestLike[]) {
  const highPriority = requests.filter((request) => getPilotRequestPriority(request) === "High").length;
  const urgentRequests = requests.filter((request) => {
    const urgency = request.urgency.toLowerCase();
    return urgency.includes("immediate") || urgency.includes("urgent") || urgency.includes("30");
  }).length;
  const averageBranchCount = requests.length
    ? Math.round(requests.reduce((sum, request) => sum + request.branchCount, 0) / requests.length)
    : 0;

  return {
    totalRequests: requests.length,
    newRequests: requests.filter((request) => request.status === "NEW").length,
    highPriority,
    contacted: requests.filter((request) => request.status === "CONTACTED").length,
    qualified: requests.filter((request) => request.status === "QUALIFIED").length,
    closed: requests.filter((request) => request.status === "CLOSED").length,
    averageBranchCount,
    urgentRequests
  };
}

export function getPilotRequestUrgencyTone(urgency: string) {
  const normalized = urgency.toLowerCase();

  if (normalized.includes("urgent") || normalized.includes("immediate")) return "bg-rose-50 text-rose-700 ring-rose-200";
  if (normalized.includes("30") || normalized.includes("month")) return "bg-amber-50 text-amber-700 ring-amber-200";
  return "bg-clinical-50 text-clinical-800 ring-clinical-200";
}
