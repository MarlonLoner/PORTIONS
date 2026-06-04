import { PilotRequestStatus } from "@prisma/client";

export const pilotRequestStatusLabels: Record<PilotRequestStatus, string> = {
  [PilotRequestStatus.NEW]: "New",
  [PilotRequestStatus.REVIEWED]: "Reviewed",
  [PilotRequestStatus.CONTACTED]: "Contacted",
  [PilotRequestStatus.QUALIFIED]: "Qualified",
  [PilotRequestStatus.CLOSED]: "Closed"
};

export const pilotRequestStatusClasses: Record<PilotRequestStatus, string> = {
  [PilotRequestStatus.NEW]: "bg-clinical-50 text-clinical-800 ring-clinical-200",
  [PilotRequestStatus.REVIEWED]: "bg-slate-100 text-slate-700 ring-slate-200",
  [PilotRequestStatus.CONTACTED]: "bg-amber-50 text-amber-700 ring-amber-200",
  [PilotRequestStatus.QUALIFIED]: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  [PilotRequestStatus.CLOSED]: "bg-rose-50 text-rose-700 ring-rose-200"
};

export function getPilotRequestOverview(
  requests: Array<{
    status: PilotRequestStatus;
    branchCount: number;
  }>
) {
  const newRequests = requests.filter((request) => request.status === PilotRequestStatus.NEW).length;
  const contacted = requests.filter((request) => request.status === PilotRequestStatus.CONTACTED).length;
  const qualified = requests.filter((request) => request.status === PilotRequestStatus.QUALIFIED).length;
  const averageBranchCount = requests.length
    ? Math.round(requests.reduce((sum, request) => sum + request.branchCount, 0) / requests.length)
    : 0;

  return {
    newRequests,
    contacted,
    qualified,
    averageBranchCount
  };
}

export function getPilotRequestUrgencyTone(urgency: string) {
  const normalized = urgency.toLowerCase();

  if (normalized.includes("urgent") || normalized.includes("immediate")) return "bg-rose-50 text-rose-700 ring-rose-200";
  if (normalized.includes("30") || normalized.includes("month")) return "bg-amber-50 text-amber-700 ring-amber-200";
  return "bg-clinical-50 text-clinical-800 ring-clinical-200";
}
