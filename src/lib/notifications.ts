import {
  NotificationDeliveryChannel,
  NotificationDeliveryStatus,
  NotificationRecipientType,
  NotificationSeverity,
  NotificationStatus,
  NotificationType,
  OperationalActionPriority,
  OperationalActionStatus,
  Prisma
} from "@prisma/client";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

const unresolvedNotificationStatuses: NotificationStatus[] = [
  NotificationStatus.UNREAD,
  NotificationStatus.READ,
  NotificationStatus.ACKNOWLEDGED
];

const activeActionStatuses: OperationalActionStatus[] = [
  OperationalActionStatus.OPEN,
  OperationalActionStatus.IN_PROGRESS,
  OperationalActionStatus.BLOCKED
];

export const notificationStatuses = Object.values(NotificationStatus);
export const notificationSeverities = Object.values(NotificationSeverity);
export const notificationTypes = Object.values(NotificationType);
export const notificationDeliveryChannels = Object.values(NotificationDeliveryChannel);

export const notificationSeverityClasses: Record<NotificationSeverity, string> = {
  INFO: "bg-slate-100 text-slate-700 ring-slate-200",
  LOW: "bg-clinical-50 text-clinical-800 ring-clinical-200",
  MEDIUM: "bg-amber-50 text-amber-700 ring-amber-200",
  HIGH: "bg-rose-50 text-rose-700 ring-rose-200",
  CRITICAL: "bg-navy-950 text-white ring-navy-900"
};

export const notificationStatusClasses: Record<NotificationStatus, string> = {
  UNREAD: "bg-clinical-50 text-clinical-800 ring-clinical-200",
  READ: "bg-slate-100 text-slate-700 ring-slate-200",
  ACKNOWLEDGED: "bg-amber-50 text-amber-700 ring-amber-200",
  RESOLVED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  DISMISSED: "bg-slate-100 text-slate-500 ring-slate-200"
};

export type NotificationRecord = Prisma.NotificationGetPayload<{
  include: { branch: true; recipientStaff: true; action: { include: { branch: true; assignedStaff: true } } };
}>;

type ActionForNotification = Prisma.OperationalActionGetPayload<{
  include: { branch: true; assignedStaff: true };
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

function hoursOverdue(action: ActionForNotification) {
  if (!action.dueDate) return 0;
  return Math.floor((Date.now() - action.dueDate.getTime()) / 3_600_000);
}

function isActiveAction(action: ActionForNotification) {
  return activeActionStatuses.includes(action.status);
}

function isDueToday(action: ActionForNotification) {
  return Boolean(action.dueDate && action.dueDate >= startOfToday() && action.dueDate < endOfToday());
}

function isOverdue(action: ActionForNotification) {
  return Boolean(action.dueDate && action.dueDate < startOfToday() && isActiveAction(action));
}

export function getNotificationRecipient(action?: ActionForNotification | null, fallback: NotificationRecipientType = NotificationRecipientType.MANAGEMENT) {
  if (action?.assignedStaffId) {
    return {
      recipientType: NotificationRecipientType.STAFF,
      recipientStaffId: action.assignedStaffId,
      recipientRole: null
    };
  }

  if (action?.branchId) {
    return {
      recipientType: NotificationRecipientType.BRANCH_MANAGER,
      recipientStaffId: null,
      recipientRole: "Branch Manager"
    };
  }

  return { recipientType: fallback, recipientStaffId: null, recipientRole: fallback === NotificationRecipientType.OWNER ? "Owner" : null };
}

export function getNotificationMessage(type: NotificationType, action?: ActionForNotification | null, context?: { count?: number; criticalCount?: number; branchName?: string }) {
  const staffName = action?.assignedStaff?.name ?? "team";
  const actionTitle = action?.title ?? "PORTIONS action";
  const branchName = action?.branch?.name ?? context?.branchName ?? "the pharmacy network";
  const dueDate = action?.dueDate ? formatDate(action.dueDate) : "today";

  if (type === NotificationType.ACTION_DUE) return `Hi ${staffName}, the action '${actionTitle}' is due today at ${branchName}. Please update PORTIONS when you start or complete it.`;
  if (type === NotificationType.ACTION_OVERDUE) return `Action overdue: '${actionTitle}' was due on ${dueDate}. Please update its status or record the blocker.`;
  if (type === NotificationType.ACTION_BLOCKED) return `Blocked action: '${actionTitle}' needs escalation at ${branchName}. Confirm the blocker and next decision owner.`;
  if (type === NotificationType.ACTION_UNASSIGNED) return `Unassigned action: '${actionTitle}' needs an owner before execution can move reliably.`;
  if (type === NotificationType.CRITICAL_ACTION) return `Critical action: '${actionTitle}' requires management attention now. Assign, start, or resolve before close.`;
  if (type === NotificationType.BRANCH_ESCALATION) return `Management attention required: ${context?.count ?? 0} overdue actions at ${branchName}, including ${context?.criticalCount ?? 0} critical items.`;
  if (type === NotificationType.PILOT_REVIEW) return "Pilot review reminder: confirm evidence, action completion, and unresolved escalation items before the next owner review.";
  return `PORTIONS alert: ${actionTitle} needs review.`;
}

export function getNotificationSuggestedAction(notification: Pick<NotificationRecord, "type" | "actionId" | "branch" | "action">) {
  if (notification.type === NotificationType.ACTION_DUE) return "Start or complete the linked action today.";
  if (notification.type === NotificationType.ACTION_OVERDUE) return "Update status, record blocker, or escalate to the manager.";
  if (notification.type === NotificationType.ACTION_BLOCKED) return "Escalate the blocker and record the next decision owner.";
  if (notification.type === NotificationType.ACTION_UNASSIGNED) return "Assign a staff owner in Action Center.";
  if (notification.type === NotificationType.CRITICAL_ACTION) return "Prioritize this before routine work.";
  if (notification.type === NotificationType.BRANCH_ESCALATION) return `Ask ${notification.branch?.name ?? "the branch"} manager to acknowledge the backlog.`;
  return notification.actionId ? "Open the linked action and update status." : "Review and acknowledge this alert.";
}

function candidateForAction(type: NotificationType, action: ActionForNotification, severity: NotificationSeverity): Prisma.NotificationCreateManyInput {
  const recipient = getNotificationRecipient(action);
  return {
    type,
    severity,
    status: NotificationStatus.UNREAD,
    title: notificationTitle(type, action),
    message: getNotificationMessage(type, action),
    recipientType: recipient.recipientType,
    recipientStaffId: recipient.recipientStaffId,
    recipientRole: recipient.recipientRole,
    branchId: action.branchId,
    sourceType: "OPERATIONAL_ACTION",
    sourceId: action.id,
    actionId: action.id,
    scheduledFor: action.dueDate,
    triggeredAt: new Date(),
    deliveryChannel: NotificationDeliveryChannel.IN_APP,
    deliveryStatus: NotificationDeliveryStatus.NOT_REQUIRED,
    metadata: { priority: action.priority, status: action.status }
  };
}

function notificationTitle(type: NotificationType, action?: ActionForNotification | null, branchName?: string) {
  if (type === NotificationType.ACTION_DUE) return `Action due today: ${action?.title}`;
  if (type === NotificationType.ACTION_OVERDUE) return `Overdue action: ${action?.title}`;
  if (type === NotificationType.ACTION_BLOCKED) return `Blocked action: ${action?.title}`;
  if (type === NotificationType.ACTION_UNASSIGNED) return `Unassigned high-priority action: ${action?.title}`;
  if (type === NotificationType.CRITICAL_ACTION) return `Critical action requires attention: ${action?.title}`;
  if (type === NotificationType.BRANCH_ESCALATION) return `Branch escalation: ${branchName}`;
  return "PORTIONS notification";
}

export async function getEscalationCandidates() {
  const actions = await prisma.operationalAction.findMany({
    include: { branch: true, assignedStaff: true },
    orderBy: [{ priority: "desc" }, { dueDate: "asc" }]
  });

  const candidates: Prisma.NotificationCreateManyInput[] = [];
  for (const action of actions) {
    if (!isActiveAction(action)) continue;
    if (isDueToday(action)) candidates.push(candidateForAction(NotificationType.ACTION_DUE, action, NotificationSeverity.MEDIUM));
    if (isOverdue(action)) candidates.push(candidateForAction(NotificationType.ACTION_OVERDUE, action, hoursOverdue(action) > 24 ? NotificationSeverity.HIGH : NotificationSeverity.MEDIUM));
    if (action.status === OperationalActionStatus.BLOCKED) candidates.push(candidateForAction(NotificationType.ACTION_BLOCKED, action, NotificationSeverity.HIGH));
    if ((action.priority === OperationalActionPriority.HIGH || action.priority === OperationalActionPriority.CRITICAL) && !action.assignedStaffId) candidates.push(candidateForAction(NotificationType.ACTION_UNASSIGNED, action, action.priority === OperationalActionPriority.CRITICAL ? NotificationSeverity.CRITICAL : NotificationSeverity.HIGH));
    if (action.priority === OperationalActionPriority.CRITICAL) candidates.push(candidateForAction(NotificationType.CRITICAL_ACTION, action, NotificationSeverity.CRITICAL));
  }

  const branchGroups = new Map<string, ActionForNotification[]>();
  actions.filter(isOverdue).forEach((action) => {
    if (!action.branchId) return;
    branchGroups.set(action.branchId, [...(branchGroups.get(action.branchId) ?? []), action]);
  });

  for (const [branchId, branchActions] of branchGroups) {
    if (!branchActions.length) continue;
    const branchName = branchActions[0]?.branch?.name ?? "Branch";
    const criticalCount = branchActions.filter((action) => action.priority === OperationalActionPriority.CRITICAL).length;
    candidates.push({
      type: NotificationType.BRANCH_ESCALATION,
      severity: criticalCount > 0 ? NotificationSeverity.CRITICAL : NotificationSeverity.HIGH,
      status: NotificationStatus.UNREAD,
      title: notificationTitle(NotificationType.BRANCH_ESCALATION, null, branchName),
      message: getNotificationMessage(NotificationType.BRANCH_ESCALATION, null, { count: branchActions.length, criticalCount, branchName }),
      recipientType: NotificationRecipientType.BRANCH_MANAGER,
      recipientRole: "Branch Manager",
      branchId,
      sourceType: "BRANCH",
      sourceId: branchId,
      triggeredAt: new Date(),
      deliveryChannel: NotificationDeliveryChannel.IN_APP,
      deliveryStatus: NotificationDeliveryStatus.NOT_REQUIRED,
      metadata: { overdueCount: branchActions.length, criticalCount }
    });
  }

  return candidates;
}

export async function generateOperationalNotifications() {
  const candidates = await getEscalationCandidates();
  let created = 0;
  let skipped = 0;

  for (const candidate of candidates) {
    const existing = await prisma.notification.findFirst({
      where: {
        type: candidate.type,
        actionId: candidate.actionId ?? undefined,
        sourceType: candidate.actionId ? undefined : candidate.sourceType ?? undefined,
        sourceId: candidate.actionId ? undefined : candidate.sourceId ?? undefined,
        status: { in: unresolvedNotificationStatuses }
      }
    });

    if (existing) {
      skipped += 1;
      continue;
    }

    await prisma.notification.create({ data: candidate });
    created += 1;
  }

  return { created, skipped, evaluated: candidates.length };
}

export async function getNotificationInbox() {
  return prisma.notification.findMany({
    include: {
      branch: true,
      recipientStaff: true,
      action: { include: { branch: true, assignedStaff: true } }
    },
    orderBy: [{ status: "asc" }, { severity: "desc" }, { createdAt: "desc" }]
  });
}

export function getUnreadNotificationCount(notifications: NotificationRecord[]) {
  return notifications.filter((item) => item.status === NotificationStatus.UNREAD).length;
}

export function getCriticalNotifications(notifications: NotificationRecord[]) {
  return notifications.filter((item) => item.severity === NotificationSeverity.CRITICAL && !isClosedNotification(item));
}

export function getDueActionNotifications(notifications: NotificationRecord[]) {
  return notifications.filter((item) => item.type === NotificationType.ACTION_DUE && !isClosedNotification(item));
}

export function getOverdueActionNotifications(notifications: NotificationRecord[]) {
  return notifications.filter((item) => item.type === NotificationType.ACTION_OVERDUE && !isClosedNotification(item));
}

export function getBlockedActionNotifications(notifications: NotificationRecord[]) {
  return notifications.filter((item) => item.type === NotificationType.ACTION_BLOCKED && !isClosedNotification(item));
}

export function getUnassignedActionNotifications(notifications: NotificationRecord[]) {
  return notifications.filter((item) => item.type === NotificationType.ACTION_UNASSIGNED && !isClosedNotification(item));
}

export function isClosedNotification(notification: Pick<NotificationRecord, "status">) {
  return notification.status === NotificationStatus.RESOLVED || notification.status === NotificationStatus.DISMISSED;
}

export function getNotificationSummary(notifications: NotificationRecord[]) {
  const active = notifications.filter((item) => !isClosedNotification(item));
  const week = startOfWeek();
  return {
    total: notifications.length,
    unread: getUnreadNotificationCount(notifications),
    critical: getCriticalNotifications(notifications).length,
    dueToday: getDueActionNotifications(notifications).length,
    overdue: getOverdueActionNotifications(notifications).length,
    blocked: getBlockedActionNotifications(notifications).length,
    unassigned: getUnassignedActionNotifications(notifications).length,
    managementEscalations: active.filter((item) => item.type === NotificationType.BRANCH_ESCALATION || item.type === NotificationType.MANAGEMENT_ALERT).length,
    resolvedThisWeek: notifications.filter((item) => item.status === NotificationStatus.RESOLVED && item.resolvedAt && item.resolvedAt >= week).length,
    acknowledged: notifications.filter((item) => item.status === NotificationStatus.ACKNOWLEDGED).length
  };
}

export function getEscalationAiSummary(notifications: NotificationRecord[]) {
  const summary = getNotificationSummary(notifications);
  const branchCounts = new Map<string, number>();
  notifications.filter((item) => !isClosedNotification(item) && item.branch).forEach((item) => branchCounts.set(item.branch?.name ?? "Network", (branchCounts.get(item.branch?.name ?? "Network") ?? 0) + 1));
  const topBranch = Array.from(branchCounts.entries()).sort((a, b) => b[1] - a[1])[0];
  const firstCritical = getCriticalNotifications(notifications)[0];

  if (!notifications.length) return "No active alerts yet. Refresh notifications to surface due, overdue, blocked, and critical operational actions.";

  return `${summary.unread} unread alerts need review. ${summary.critical} critical alerts remain unresolved, ${summary.overdue} actions are overdue, and ${summary.blocked} blocked actions need escalation. ${topBranch ? `${topBranch[0]} has the highest alert load with ${topBranch[1]} active alerts.` : "No branch has a concentrated escalation load."} ${firstCritical ? `Handle '${firstCritical.title}' first.` : "Review due actions before close."}`;
}

export function getNotificationCopyMessage(notification: NotificationRecord) {
  if (notification.type === NotificationType.BRANCH_ESCALATION) return notification.message;
  if (notification.type === NotificationType.ACTION_OVERDUE) return notification.message;
  if (notification.recipientStaff) return getNotificationMessage(notification.type, notification.action);
  return notification.message;
}
