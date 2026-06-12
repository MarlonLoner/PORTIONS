import { OperationalActionCategory, OperationalActionOutcome, OperationalActionPriority, OperationalActionStatus } from "@prisma/client";
import { enumLabel, formatCurrency } from "@/lib/format";

type Money = number | string | { toString(): string };

export type AccountabilityAction = {
  id: string;
  title: string;
  category: OperationalActionCategory | string;
  priority: OperationalActionPriority | string;
  status: OperationalActionStatus | string;
  branchId: string | null;
  branch?: { id: string; name: string } | null;
  assignedStaffId: string | null;
  assignedStaff?: { id: string; name: string } | null;
  dueDate: Date | null;
  completedAt: Date | null;
  outcomeType: OperationalActionOutcome | string | null;
  valueAmount: Money;
  createdAt: Date;
};

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

function money(value: Money) {
  return Number(value) || 0;
}

function isActive(action: AccountabilityAction) {
  return action.status !== OperationalActionStatus.COMPLETED && action.status !== OperationalActionStatus.CANCELLED;
}

function isDueToday(action: AccountabilityAction) {
  return Boolean(action.dueDate && action.dueDate >= startOfToday() && action.dueDate < endOfToday());
}

function isOverdue(action: AccountabilityAction) {
  return Boolean(isActive(action) && action.dueDate && action.dueDate < startOfToday());
}

function completionRate(completed: number, total: number) {
  return total ? Math.round((completed / total) * 100) : 0;
}

export function getOpenActionCount(actions: AccountabilityAction[]) {
  return actions.filter((action) => action.status === OperationalActionStatus.OPEN).length;
}

export function getOverdueActionCount(actions: AccountabilityAction[]) {
  return actions.filter(isOverdue).length;
}

export function getDueTodayActionCount(actions: AccountabilityAction[]) {
  return actions.filter((action) => isActive(action) && isDueToday(action)).length;
}

export function getCriticalActionCount(actions: AccountabilityAction[]) {
  return actions.filter((action) => isActive(action) && action.priority === OperationalActionPriority.CRITICAL).length;
}

export function getCompletedActionCount(actions: AccountabilityAction[], scope: "all" | "week" = "all") {
  const week = startOfWeek();
  return actions.filter((action) => action.status === OperationalActionStatus.COMPLETED && (scope === "all" || (action.completedAt && action.completedAt >= week))).length;
}

export function getCompletionRate(actions: AccountabilityAction[]) {
  return completionRate(actions.filter((action) => action.status === OperationalActionStatus.COMPLETED).length, actions.filter((action) => action.status !== OperationalActionStatus.CANCELLED).length);
}

export function getBlockedActionCount(actions: AccountabilityAction[]) {
  return actions.filter((action) => action.status === OperationalActionStatus.BLOCKED).length;
}

export function getAverageResolutionTime(actions: AccountabilityAction[]) {
  const resolved = actions.filter((action) => action.completedAt);
  if (!resolved.length) return 0;
  const averageMs = resolved.reduce((sum, action) => sum + ((action.completedAt?.getTime() ?? action.createdAt.getTime()) - action.createdAt.getTime()), 0) / resolved.length;
  return Math.max(0, Math.round(averageMs / 86_400_000));
}

export function getValueRecovered(actions: AccountabilityAction[]) {
  return actions.filter((action) => action.outcomeType === OperationalActionOutcome.REVENUE_RECOVERED).reduce((sum, action) => sum + money(action.valueAmount), 0);
}

export function getValueProtected(actions: AccountabilityAction[]) {
  return actions.filter((action) => action.outcomeType === OperationalActionOutcome.REVENUE_PROTECTED || action.category === OperationalActionCategory.CHRONIC_PATIENT).reduce((sum, action) => sum + money(action.valueAmount), 0);
}

export function getOutcomeBreakdown(actions: AccountabilityAction[]) {
  const counts = new Map<string, number>();
  actions.filter((action) => action.outcomeType).forEach((action) => counts.set(String(action.outcomeType), (counts.get(String(action.outcomeType)) ?? 0) + 1));
  return Array.from(counts.entries()).map(([label, value]) => ({ label: enumLabel(label), value })).sort((a, b) => b.value - a.value);
}

export function getActionCategoryBreakdown(actions: AccountabilityAction[]) {
  const counts = new Map<string, { total: number; completed: number }>();
  actions.forEach((action) => {
    const key = String(action.category);
    const current = counts.get(key) ?? { total: 0, completed: 0 };
    current.total += 1;
    if (action.status === OperationalActionStatus.COMPLETED) current.completed += 1;
    counts.set(key, current);
  });
  return Array.from(counts.entries()).map(([label, item]) => ({
    label: enumLabel(label),
    value: item.completed,
    detail: `${item.completed}/${item.total} completed`
  })).sort((a, b) => b.value - a.value);
}

export function getBranchExecutionRanking(actions: AccountabilityAction[]) {
  const map = new Map<string, { branch: string; total: number; completed: number; open: number; overdue: number; blocked: number; value: number }>();
  actions.forEach((action) => {
    const id = action.branchId ?? "network";
    const current = map.get(id) ?? { branch: action.branch?.name ?? "Network", total: 0, completed: 0, open: 0, overdue: 0, blocked: 0, value: 0 };
    current.total += 1;
    if (action.status === OperationalActionStatus.COMPLETED) current.completed += 1;
    if (isActive(action)) current.open += 1;
    if (isOverdue(action)) current.overdue += 1;
    if (action.status === OperationalActionStatus.BLOCKED) current.blocked += 1;
    current.value += money(action.valueAmount);
    map.set(id, current);
  });

  return Array.from(map.values()).map((item) => ({
    ...item,
    completionRate: completionRate(item.completed, item.total)
  })).sort((a, b) => b.completionRate - a.completionRate || b.completed - a.completed);
}

export function getStaffExecutionRanking(actions: AccountabilityAction[]) {
  const map = new Map<string, { staff: string; total: number; completed: number; assigned: number; overdue: number; value: number }>();
  actions.forEach((action) => {
    const id = action.assignedStaffId ?? "unassigned";
    const current = map.get(id) ?? { staff: action.assignedStaff?.name ?? "Unassigned", total: 0, completed: 0, assigned: 0, overdue: 0, value: 0 };
    current.total += 1;
    if (action.status === OperationalActionStatus.COMPLETED) current.completed += 1;
    if (isActive(action)) current.assigned += 1;
    if (isOverdue(action)) current.overdue += 1;
    current.value += money(action.valueAmount);
    map.set(id, current);
  });

  return Array.from(map.values()).filter((item) => item.total > 0).map((item) => ({
    ...item,
    completionRate: completionRate(item.completed, item.total)
  })).sort((a, b) => b.completed - a.completed || b.completionRate - a.completionRate);
}

export function getRecentExecutionWins(actions: AccountabilityAction[]) {
  return actions
    .filter((action) => action.status === OperationalActionStatus.COMPLETED)
    .sort((a, b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0))
    .slice(0, 5);
}

export function getAccountabilityRisks(actions: AccountabilityAction[]) {
  const highestValue = actions.filter(isActive).sort((a, b) => money(b.valueAmount) - money(a.valueAmount))[0];
  const branchAttention = getBranchExecutionRanking(actions).sort((a, b) => b.overdue + b.blocked - (a.overdue + a.blocked))[0];
  const staffWorkload = getStaffExecutionRanking(actions).sort((a, b) => b.assigned - a.assigned)[0];

  return {
    highestValueUnresolvedAction: highestValue,
    branchWithLargestOpenWorkload: branchAttention,
    staffWithLargestAssignedWorkload: staffWorkload,
    overdueActions: actions.filter(isOverdue),
    blockedActions: actions.filter((action) => action.status === OperationalActionStatus.BLOCKED)
  };
}

export function getAccountabilityMetrics(actions: AccountabilityAction[]) {
  const active = actions.filter(isActive);
  const completed = actions.filter((action) => action.status === OperationalActionStatus.COMPLETED);

  return {
    totalActions: actions.length,
    openActions: getOpenActionCount(actions),
    inProgressActions: actions.filter((action) => action.status === OperationalActionStatus.IN_PROGRESS).length,
    blockedActions: getBlockedActionCount(actions),
    completedActions: completed.length,
    completedThisWeek: getCompletedActionCount(actions, "week"),
    dueToday: getDueTodayActionCount(actions),
    overdue: getOverdueActionCount(actions),
    criticalActions: getCriticalActionCount(actions),
    completionRate: getCompletionRate(actions),
    overdueRate: completionRate(actions.filter(isOverdue).length, active.length),
    averageResolutionDays: getAverageResolutionTime(actions),
    valueRecovered: getValueRecovered(actions),
    valueProtected: getValueProtected(actions)
  };
}

export function getAccountabilityAiSummary(actions: AccountabilityAction[]) {
  const metrics = getAccountabilityMetrics(actions);
  const risks = getAccountabilityRisks(actions);
  if (!actions.length) return "No execution actions have been created yet. Open Action Center to convert insights into assigned work and measurable outcomes.";

  const valuePhrase = risks.highestValueUnresolvedAction
    ? `${risks.highestValueUnresolvedAction.title} carries ${formatCurrency(risks.highestValueUnresolvedAction.valueAmount)} in unresolved value`
    : "no high-value unresolved action is currently visible";

  return `${metrics.dueToday + metrics.overdue} actions need attention today. ${metrics.overdue} are overdue and ${metrics.blockedActions} are blocked. ${risks.branchWithLargestOpenWorkload?.branch ?? "The network"} has the largest unresolved workload, while ${risks.staffWithLargestAssignedWorkload?.staff ?? "unassigned staff"} carries the largest assigned queue. ${valuePhrase}. Value recorded so far is ${formatCurrency(metrics.valueRecovered)} recovered and ${formatCurrency(metrics.valueProtected)} protected.`;
}

export function getOpenVsCompletedChartData(actions: AccountabilityAction[]) {
  const metrics = getAccountabilityMetrics(actions);
  return [
    { label: "Open", value: metrics.openActions },
    { label: "In progress", value: metrics.inProgressActions },
    { label: "Blocked", value: metrics.blockedActions },
    { label: "Completed", value: metrics.completedActions }
  ];
}

export function toBranchChartData(actions: AccountabilityAction[]) {
  return getBranchExecutionRanking(actions).slice(0, 5).map((item) => ({
    label: item.branch,
    value: item.completionRate,
    detail: `${item.completed}/${item.total} completed, ${item.open} open`
  }));
}

export function toStaffChartData(actions: AccountabilityAction[]) {
  return getStaffExecutionRanking(actions).slice(0, 5).map((item) => ({
    label: item.staff,
    value: item.completed,
    detail: `${item.assigned} active, ${item.completionRate}% completion`
  }));
}
