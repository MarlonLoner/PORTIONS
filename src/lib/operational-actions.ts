import {
  OperationalActionCategory,
  OperationalActionOutcome,
  OperationalActionPriority,
  OperationalActionStatus,
  Prisma
} from "@prisma/client";
import { enumLabel, formatCurrency } from "@/lib/format";

export const operationalActionCategories = Object.values(OperationalActionCategory);
export const operationalActionPriorities = Object.values(OperationalActionPriority);
export const operationalActionStatuses = Object.values(OperationalActionStatus);
export const operationalActionOutcomes = Object.values(OperationalActionOutcome);

export const actionCategoryClasses: Record<OperationalActionCategory, string> = {
  CHRONIC_PATIENT: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  ORDER_RECOVERY: "bg-clinical-50 text-clinical-800 ring-clinical-200",
  STOCK_INTERVENTION: "bg-amber-50 text-amber-700 ring-amber-200",
  BRANCH_ISSUE: "bg-rose-50 text-rose-700 ring-rose-200",
  PILOT_TASK: "bg-navy-950 text-white ring-navy-900",
  MANAGEMENT_DECISION: "bg-purple-50 text-purple-700 ring-purple-200",
  GENERAL: "bg-slate-100 text-slate-700 ring-slate-200"
};

export const actionPriorityClasses: Record<OperationalActionPriority, string> = {
  LOW: "bg-slate-100 text-slate-700 ring-slate-200",
  MEDIUM: "bg-clinical-50 text-clinical-800 ring-clinical-200",
  HIGH: "bg-amber-50 text-amber-700 ring-amber-200",
  CRITICAL: "bg-rose-50 text-rose-700 ring-rose-200"
};

export const actionStatusClasses: Record<OperationalActionStatus, string> = {
  OPEN: "bg-white text-slate-700 ring-slate-200",
  IN_PROGRESS: "bg-clinical-50 text-clinical-800 ring-clinical-200",
  BLOCKED: "bg-amber-50 text-amber-700 ring-amber-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  CANCELLED: "bg-slate-100 text-slate-500 ring-slate-200"
};

export type OperationalActionRecord = Prisma.OperationalActionGetPayload<{
  include: {
    branch: true;
    assignedStaff: true;
    activities: { orderBy: { createdAt: "desc" } };
  };
}>;

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

function startOfWeek() {
  const date = startOfToday();
  date.setDate(date.getDate() - date.getDay());
  return date;
}

export function getActionUrgency(action: Pick<OperationalActionRecord, "status" | "dueDate" | "priority">) {
  if (action.status === OperationalActionStatus.COMPLETED) return "Completed";
  if (action.status === OperationalActionStatus.CANCELLED) return "Cancelled";
  if (!action.dueDate) return action.priority === OperationalActionPriority.CRITICAL ? "Critical" : "Unscheduled";
  if (action.dueDate < startOfToday()) return "Overdue";
  if (action.dueDate < endOfToday()) return "Due today";
  if (action.priority === OperationalActionPriority.CRITICAL) return "Critical";
  return "Upcoming";
}

export function getActionSuggestedNextStep(action: Pick<OperationalActionRecord, "category" | "status" | "priority" | "dueDate" | "branch" | "assignedStaff">) {
  if (action.status === OperationalActionStatus.COMPLETED) return "Review the recorded outcome and value before the next executive brief.";
  if (action.status === OperationalActionStatus.BLOCKED) return "Escalate the blocker, confirm the owner, and set the next decision time.";
  if (!action.assignedStaff) return "Assign an owner before this action can move reliably.";
  if (getActionUrgency(action) === "Overdue") return "Clear this before midday or escalate to the branch manager.";

  const branchName = action.branch?.name ?? "the relevant branch";
  switch (action.category) {
    case OperationalActionCategory.CHRONIC_PATIENT:
      return `Contact the patient, offer collection or delivery, and record the refill outcome for ${branchName}.`;
    case OperationalActionCategory.ORDER_RECOVERY:
      return "Send the customer update or payment reminder, then move the order to the next pipeline stage.";
    case OperationalActionCategory.STOCK_INTERVENTION:
      return "Confirm stock movement, reorder, or controlled transfer before patient demand reaches the branch.";
    case OperationalActionCategory.BRANCH_ISSUE:
      return `Review the branch queue with the manager and assign owners for unresolved work in ${branchName}.`;
    case OperationalActionCategory.PILOT_TASK:
      return "Complete this pilot task and capture evidence for the Executive Pack.";
    case OperationalActionCategory.MANAGEMENT_DECISION:
      return "Record the decision, owner, and next review point.";
    default:
      return "Move the action forward, update status, and record the operational outcome.";
  }
}

export function getActionCenterMetrics(actions: OperationalActionRecord[]) {
  const active = actions.filter((action) => action.status !== OperationalActionStatus.COMPLETED && action.status !== OperationalActionStatus.CANCELLED);
  const completedThisWeek = actions.filter((action) => action.status === OperationalActionStatus.COMPLETED && action.completedAt && action.completedAt >= startOfWeek());
  const recovered = actions.filter((action) => action.outcomeType === OperationalActionOutcome.REVENUE_RECOVERED);
  const protectedValue = actions.filter((action) => action.outcomeType === OperationalActionOutcome.REVENUE_PROTECTED || action.category === OperationalActionCategory.CHRONIC_PATIENT);

  return {
    openActions: active.filter((action) => action.status === OperationalActionStatus.OPEN).length,
    dueToday: active.filter((action) => action.dueDate && action.dueDate >= startOfToday() && action.dueDate < endOfToday()).length,
    overdue: active.filter((action) => action.dueDate && action.dueDate < startOfToday()).length,
    inProgress: active.filter((action) => action.status === OperationalActionStatus.IN_PROGRESS).length,
    completedThisWeek: completedThisWeek.length,
    valueRecovered: recovered.reduce((sum, action) => sum + Number(action.valueAmount), 0),
    valueProtected: protectedValue.reduce((sum, action) => sum + Number(action.valueAmount), 0),
    criticalActions: active.filter((action) => action.priority === OperationalActionPriority.CRITICAL).length
  };
}

export function groupOperationalActions(actions: OperationalActionRecord[]) {
  const active = actions.filter((action) => action.status !== OperationalActionStatus.CANCELLED);

  return {
    criticalOverdue: active.filter((action) => action.status !== OperationalActionStatus.COMPLETED && (action.priority === OperationalActionPriority.CRITICAL || getActionUrgency(action) === "Overdue")),
    dueToday: active.filter((action) => action.status !== OperationalActionStatus.COMPLETED && getActionUrgency(action) === "Due today"),
    inProgress: active.filter((action) => action.status === OperationalActionStatus.IN_PROGRESS),
    upcoming: active.filter((action) => action.status !== OperationalActionStatus.COMPLETED && getActionUrgency(action) === "Upcoming"),
    recentlyCompleted: actions.filter((action) => action.status === OperationalActionStatus.COMPLETED).slice(0, 8)
  };
}

export function getActionValueSummary(actions: OperationalActionRecord[]) {
  const metrics = getActionCenterMetrics(actions);
  return `${formatCurrency(metrics.valueRecovered)} recovered and ${formatCurrency(metrics.valueProtected)} protected through recorded accountability actions.`;
}

export function getActionsByStaff(actions: OperationalActionRecord[]) {
  const counts = new Map<string, number>();
  actions.forEach((action) => counts.set(action.assignedStaff?.name ?? "Unassigned", (counts.get(action.assignedStaff?.name ?? "Unassigned") ?? 0) + 1));
  return Array.from(counts.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
}

export function getActionsByBranch(actions: OperationalActionRecord[]) {
  const counts = new Map<string, number>();
  actions.forEach((action) => counts.set(action.branch?.name ?? "Network", (counts.get(action.branch?.name ?? "Network") ?? 0) + 1));
  return Array.from(counts.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
}

export function getRecentActionActivity(actions: OperationalActionRecord[]) {
  return actions.flatMap((action) => action.activities.map((activity) => ({ ...activity, actionTitle: action.title }))).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 8);
}

export function getExecutionAiSummary(actions: OperationalActionRecord[]) {
  const metrics = getActionCenterMetrics(actions);
  const branchLoad = getActionsByBranch(actions.filter((action) => action.status !== OperationalActionStatus.COMPLETED && action.status !== OperationalActionStatus.CANCELLED))[0];
  const critical = actions.filter((action) => action.priority === OperationalActionPriority.CRITICAL && action.status !== OperationalActionStatus.COMPLETED);
  const orderRecovery = actions.filter((action) => action.category === OperationalActionCategory.ORDER_RECOVERY && action.status !== OperationalActionStatus.COMPLETED);

  return `${metrics.dueToday + metrics.overdue} actions require attention today. ${critical.length} critical actions and ${orderRecovery.length} order recovery actions represent the highest immediate value. ${branchLoad?.name ?? "The network"} has the largest open workload. Assign unowned actions before noon and clear overdue chronic or payment work before expanding the pilot.`;
}

export function cleanActionLabel(value: string) {
  return enumLabel(value).replace("And", "&");
}
