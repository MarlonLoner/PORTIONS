import {
  NotificationDeliveryChannel,
  NotificationDeliveryStatus,
  NotificationRecipientType,
  NotificationSeverity,
  NotificationStatus,
  NotificationType,
  FollowUpStatus,
  OrderStatus,
  OperationalActionPriority,
  OperationalActionStatus,
  StockStatus,
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

const paidOrClosedOrderStatuses: OrderStatus[] = [
  OrderStatus.PAID,
  OrderStatus.PACKED,
  OrderStatus.DISPATCHED,
  OrderStatus.DELIVERED,
  OrderStatus.CANCELLED
];

const openFollowUpStatuses: FollowUpStatus[] = [
  FollowUpStatus.PENDING,
  FollowUpStatus.IN_PROGRESS,
  FollowUpStatus.SNOOZED
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

function isActiveNotificationStatus(status: NotificationStatus) {
  return unresolvedNotificationStatuses.includes(status);
}

function normalizeSourceType(sourceType: string | null | undefined) {
  return (sourceType ?? "").trim().toUpperCase().replace(/-/g, "_");
}

type NotificationIdentityInput = {
  type: NotificationType;
  actionId?: string | null;
  sourceType?: string | null;
  sourceId?: string | null;
  branchId?: string | null;
};

type ActiveNotification = Prisma.NotificationGetPayload<{
  include: { branch: true; recipientStaff: true; action: { include: { branch: true; assignedStaff: true } } };
}>;

function deliveryChannelRank(channel: NotificationDeliveryChannel) {
  if (channel === NotificationDeliveryChannel.WHATSAPP_READY) return 4;
  if (channel === NotificationDeliveryChannel.EMAIL_READY) return 3;
  if (channel === NotificationDeliveryChannel.SMS_READY) return 2;
  return 1;
}

function deliveryStatusRank(status: NotificationDeliveryStatus) {
  if (status === NotificationDeliveryStatus.SENT) return 5;
  if (status === NotificationDeliveryStatus.READY) return 4;
  if (status === NotificationDeliveryStatus.PENDING) return 3;
  if (status === NotificationDeliveryStatus.FAILED) return 2;
  return 1;
}

function activeStatusRank(status: NotificationStatus) {
  if (status === NotificationStatus.ACKNOWLEDGED) return 3;
  if (status === NotificationStatus.READ) return 2;
  if (status === NotificationStatus.UNREAD) return 1;
  return 0;
}

function toJsonObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, Prisma.JsonValue | Prisma.InputJsonValue> : {};
}

export function getNotificationDedupeKey(notification: NotificationIdentityInput) {
  if (notification.type === NotificationType.BRANCH_ESCALATION) {
    return `${notification.type}:branch:${notification.branchId ?? notification.sourceId ?? "network"}`;
  }

  if (notification.actionId) {
    return `${notification.type}:action:${notification.actionId}`;
  }

  if (notification.sourceType && notification.sourceId) {
    return `${notification.type}:source:${normalizeSourceType(notification.sourceType)}:${notification.sourceId}`;
  }

  if (notification.type === NotificationType.PILOT_REVIEW) {
    return `${notification.type}:pilot:${notification.sourceType ?? "PILOT_COMMAND"}:${notification.sourceId ?? "pilot-review"}`;
  }

  return `${notification.type}:global`;
}

function activeDedupeWhere(identity: NotificationIdentityInput): Prisma.NotificationWhereInput {
  if (identity.type === NotificationType.BRANCH_ESCALATION) {
    return {
      type: identity.type,
      branchId: identity.branchId ?? identity.sourceId ?? undefined,
      status: { in: unresolvedNotificationStatuses }
    };
  }

  if (identity.actionId) {
    return {
      type: identity.type,
      actionId: identity.actionId,
      status: { in: unresolvedNotificationStatuses }
    };
  }

  if (identity.sourceType && identity.sourceId) {
    return {
      type: identity.type,
      sourceType: identity.sourceType,
      sourceId: identity.sourceId,
      status: { in: unresolvedNotificationStatuses }
    };
  }

  return {
    type: identity.type,
    actionId: null,
    sourceType: null,
    sourceId: null,
    branchId: identity.branchId ?? null,
    status: { in: unresolvedNotificationStatuses }
  };
}

export async function findExistingActiveNotification(identity: NotificationIdentityInput) {
  return prisma.notification.findFirst({
    where: activeDedupeWhere(identity),
    orderBy: [{ status: "desc" }, { createdAt: "asc" }]
  });
}

function chooseCanonicalNotification(notifications: ActiveNotification[]) {
  return [...notifications].sort((a, b) => {
    const statusDelta = activeStatusRank(b.status) - activeStatusRank(a.status);
    if (statusDelta) return statusDelta;
    return a.createdAt.getTime() - b.createdAt.getTime();
  })[0];
}

function strongestDelivery(notifications: ActiveNotification[]) {
  return [...notifications].sort((a, b) => {
    const channelDelta = deliveryChannelRank(b.deliveryChannel) - deliveryChannelRank(a.deliveryChannel);
    if (channelDelta) return channelDelta;
    return deliveryStatusRank(b.deliveryStatus) - deliveryStatusRank(a.deliveryStatus);
  })[0];
}

async function resolveNotificationIds(ids: string[], resolvedAt = new Date()) {
  const uniqueIds = Array.from(new Set(ids));
  if (!uniqueIds.length) return 0;

  const result = await prisma.notification.updateMany({
    where: {
      id: { in: uniqueIds },
      status: { in: unresolvedNotificationStatuses }
    },
    data: {
      status: NotificationStatus.RESOLVED,
      resolvedAt
    }
  });

  return result.count;
}

async function updateExistingNotificationFromCandidate(existing: { id: string; title: string; message: string; severity: NotificationSeverity; metadata: Prisma.JsonValue | null }, candidate: Prisma.NotificationCreateManyInput) {
  const nextMetadata = {
    ...toJsonObject(existing.metadata),
    ...toJsonObject(candidate.metadata),
    dedupeKey: getNotificationDedupeKey(candidate)
  };

  const data: Prisma.NotificationUpdateInput = {};
  if (existing.title !== candidate.title) data.title = String(candidate.title);
  if (existing.message !== candidate.message) data.message = String(candidate.message);
  if (existing.severity !== candidate.severity) data.severity = candidate.severity;
  if (JSON.stringify(toJsonObject(existing.metadata)) !== JSON.stringify(nextMetadata)) data.metadata = nextMetadata;

  const changed = Object.keys(data).length > 0;

  if (!changed) return false;

  await prisma.notification.update({
    where: { id: existing.id },
    data
  });

  return true;
}

export async function resolveNotificationsForSource({
  actionId,
  sourceType,
  sourceId,
  resolvedAt = new Date()
}: {
  actionId?: string | null;
  sourceType?: string | null;
  sourceId?: string | null;
  resolvedAt?: Date;
}) {
  const or: Prisma.NotificationWhereInput[] = [];
  if (actionId) or.push({ actionId });
  if (sourceType && sourceId) or.push({ sourceType, sourceId });

  if (!or.length) return 0;

  const result = await prisma.notification.updateMany({
    where: {
      OR: or,
      status: { in: unresolvedNotificationStatuses }
    },
    data: {
      status: NotificationStatus.RESOLVED,
      resolvedAt
    }
  });

  return result.count;
}

export async function resolveNotificationsForOperationalAction(action: {
  id: string;
  status: OperationalActionStatus;
  sourceType?: string | null;
  sourceId?: string | null;
}) {
  if (action.status !== OperationalActionStatus.COMPLETED && action.status !== OperationalActionStatus.CANCELLED) {
    return 0;
  }

  return resolveNotificationsForSource({
    actionId: action.id,
    sourceType: action.sourceType,
    sourceId: action.sourceId
  });
}

async function sourceIsResolved(notification: Pick<NotificationRecord, "sourceType" | "sourceId" | "actionId" | "action">) {
  if (notification.action && !isActiveAction(notification.action)) return true;
  if (!notification.sourceType || !notification.sourceId) return false;

  const sourceType = normalizeSourceType(notification.sourceType);

  if (sourceType === "BRANCH") {
    const overdueActions = await prisma.operationalAction.count({
      where: {
        branchId: notification.sourceId,
        status: { in: activeActionStatuses },
        dueDate: { lt: startOfToday() }
      }
    });
    return overdueActions === 0;
  }

  if (["FOLLOW_UP_TASK", "FOLLOWUP_TASK", "FOLLOW_UP", "FOLLOWUP"].includes(sourceType)) {
    const task = await prisma.followUpTask.findUnique({ where: { id: notification.sourceId } });
    return Boolean(task && !openFollowUpStatuses.includes(task.status));
  }

  if (sourceType === "ORDER") {
    const order = await prisma.order.findUnique({ where: { id: notification.sourceId } });
    return Boolean(order && paidOrClosedOrderStatuses.includes(order.status));
  }

  if (sourceType === "STOCK" || sourceType === "STOCK_ITEM") {
    const stockItem = await prisma.stockItem.findUnique({ where: { id: notification.sourceId } });
    return Boolean(stockItem && stockItem.status === StockStatus.HEALTHY);
  }

  if (sourceType === "OPERATIONAL_ACTION") {
    const action = await prisma.operationalAction.findUnique({ where: { id: notification.sourceId } });
    return Boolean(action && !activeActionStatuses.includes(action.status));
  }

  return false;
}

export async function reconcileNotifications() {
  const activeNotifications = await prisma.notification.findMany({
    where: { status: { in: unresolvedNotificationStatuses } },
    include: {
      branch: true,
      recipientStaff: true,
      action: { include: { branch: true, assignedStaff: true } }
    }
  });
  const staleIds: string[] = [];

  for (const notification of activeNotifications) {
    if (await sourceIsResolved(notification)) staleIds.push(notification.id);
  }

  return resolveNotificationIds(staleIds);
}

export async function deduplicateActiveNotifications() {
  const activeNotifications = await prisma.notification.findMany({
    where: { status: { in: unresolvedNotificationStatuses } },
    include: {
      branch: true,
      recipientStaff: true,
      action: { include: { branch: true, assignedStaff: true } }
    },
    orderBy: { createdAt: "asc" }
  });
  const groups = new Map<string, ActiveNotification[]>();

  for (const notification of activeNotifications) {
    const key = getNotificationDedupeKey(notification);
    groups.set(key, [...(groups.get(key) ?? []), notification]);
  }

  let duplicatesCleaned = 0;
  const resolvedAt = new Date();

  for (const [dedupeKey, group] of groups) {
    if (group.length <= 1) continue;

    const canonical = chooseCanonicalNotification(group);
    const deliverySource = strongestDelivery(group);
    const duplicateIds = group.filter((notification) => notification.id !== canonical.id).map((notification) => notification.id);
    const mergedMetadata = group.reduce<Record<string, Prisma.JsonValue | Prisma.InputJsonValue>>((result, notification) => ({
      ...result,
      ...toJsonObject(notification.metadata)
    }), {
      dedupeKey,
      duplicateCleanup: true,
      duplicateCount: group.length - 1
    });

    await prisma.notification.update({
      where: { id: canonical.id },
      data: {
        deliveryChannel: deliverySource.deliveryChannel,
        deliveryStatus: deliverySource.deliveryStatus,
        metadata: mergedMetadata
      }
    });

    for (const id of duplicateIds) {
      await prisma.notification.update({
        where: { id },
        data: {
          status: NotificationStatus.RESOLVED,
          resolvedAt,
          metadata: {
            ...mergedMetadata,
            duplicateResolvedBy: canonical.id
          }
        }
      });
      duplicatesCleaned += 1;
    }
  }

  return duplicatesCleaned;
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
  const automaticallyResolved = await reconcileNotifications();
  const duplicatesCleaned = await deduplicateActiveNotifications();
  const candidates = await getEscalationCandidates();
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const candidate of candidates) {
    const existing = await findExistingActiveNotification(candidate);

    if (existing) {
      const changed = await updateExistingNotificationFromCandidate(existing, candidate);
      if (changed) updated += 1;
      else skipped += 1;
      continue;
    }

    await prisma.notification.create({
      data: {
        ...candidate,
        metadata: {
          ...toJsonObject(candidate.metadata),
          dedupeKey: getNotificationDedupeKey(candidate)
        }
      }
    });
    created += 1;
  }

  return { created, updated, skipped, evaluated: candidates.length, automaticallyResolved, duplicatesCleaned };
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
