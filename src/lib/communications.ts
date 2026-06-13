import {
  CommunicationChannel,
  CommunicationDirection,
  CommunicationOutcomeType,
  CommunicationRecipientType,
  CommunicationStatus,
  FollowUpStatus,
  NotificationDeliveryStatus,
  OrderStatus,
  Prisma
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { enumLabel, formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const communicationChannels = Object.values(CommunicationChannel);
export const communicationStatuses = Object.values(CommunicationStatus);
export const communicationRecipientTypes = Object.values(CommunicationRecipientType);
export const communicationOutcomeTypes = Object.values(CommunicationOutcomeType);

export type CommunicationSourceType =
  | "FOLLOW_UP_TASK"
  | "ORDER"
  | "OPERATIONAL_ACTION"
  | "NOTIFICATION"
  | "EVENT"
  | "PATIENT"
  | "MANUAL";

export type CommunicationTemplateType =
  | "REFILL_REMINDER"
  | "OVERDUE_REFILL"
  | "ORDER_PAYMENT"
  | "ORDER_UPDATE"
  | "ACTION_REMINDER"
  | "NOTIFICATION_ESCALATION"
  | "EVENT_INVITATION"
  | "EVENT_REMINDER"
  | "EVENT_FOLLOW_UP"
  | "EVENT_PREPARATION"
  | "PAYMENT_REMINDER"
  | "GENERAL";

export type CommunicationWithRelations = Prisma.CommunicationGetPayload<{
  include: typeof communicationInclude;
}>;

const communicationInclude = {
  patient: { include: { assignedStaff: true, branch: true } },
  order: { include: { assignedStaff: true, branch: true, patient: true } },
  followUpTask: { include: { assignedStaff: true, branch: true, patient: { include: { assignedStaff: true } } } },
  operationalAction: { include: { assignedStaff: true, branch: true } },
  notification: { include: { recipientStaff: true, branch: true, action: { include: { assignedStaff: true, branch: true } } } },
  event: { include: { ownerStaff: true, branch: true } },
  assignedStaff: { include: { branch: true } },
  branch: true,
  activities: { orderBy: { createdAt: "desc" } }
} satisfies Prisma.CommunicationInclude;

export function normalizePhoneNumber(value?: string | null) {
  if (!value) return "";
  const cleaned = value.replace(/[\s()\-]/g, "").replace(/^\+/, "");
  if (!cleaned) return "";
  if (cleaned.startsWith("00")) return cleaned.slice(2);
  if (cleaned.startsWith("263")) return cleaned;
  if (cleaned.startsWith("0") && cleaned.length >= 10) return `263${cleaned.slice(1)}`;
  return cleaned;
}

export function getRecipientPhone(value?: string | null) {
  const phone = normalizePhoneNumber(value);
  return /^\d{10,15}$/.test(phone) ? phone : "";
}

export function validateCommunicationRecipient(input: { recipientName?: string | null; recipientPhone?: string | null; channel?: CommunicationChannel }) {
  if (!input.recipientName?.trim()) return "Recipient name is required.";
  if ((input.channel ?? CommunicationChannel.WHATSAPP) === CommunicationChannel.WHATSAPP && !getRecipientPhone(input.recipientPhone)) {
    return "Recipient phone number is required before WhatsApp delivery.";
  }
  return "";
}

export function getCommunicationRecipientLabel(communication: Pick<CommunicationWithRelations, "recipientName" | "recipientType" | "branch">) {
  const branch = communication.branch?.name ? ` - ${communication.branch.name}` : "";
  return `${communication.recipientName} (${enumLabel(communication.recipientType)})${branch}`;
}

export function getWhatsappUrl(communication: Pick<CommunicationWithRelations, "recipientPhone" | "message">) {
  const phone = getRecipientPhone(communication.recipientPhone);
  if (!phone || !communication.message.trim()) return "";
  return `https://wa.me/${phone}?text=${encodeURIComponent(communication.message)}`;
}

export async function getCommunicationCenterData(filters: {
  channel?: string;
  status?: string;
  branchId?: string;
  assignedStaffId?: string;
  recipientType?: string;
  sourceType?: string;
} = {}) {
  const where: Prisma.CommunicationWhereInput = {};
  if (filters.channel && isCommunicationChannel(filters.channel)) where.channel = filters.channel;
  if (filters.status && isCommunicationStatus(filters.status)) where.status = filters.status;
  if (filters.branchId) where.branchId = filters.branchId;
  if (filters.assignedStaffId) where.assignedStaffId = filters.assignedStaffId;
  if (filters.recipientType && isRecipientType(filters.recipientType)) where.recipientType = filters.recipientType;
  if (filters.sourceType) where.sourceType = filters.sourceType;

  const [communications, branches, staff] = await Promise.all([
    prisma.communication.findMany({
      where,
      include: communicationInclude,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }]
    }),
    prisma.branch.findMany({ orderBy: { name: "asc" } }),
    prisma.staffMember.findMany({ include: { branch: true }, orderBy: { name: "asc" } })
  ]);

  return { communications, branches, staff };
}

export async function getCommunicationDetail(id: string) {
  return prisma.communication.findUnique({
    where: { id },
    include: communicationInclude
  });
}

export async function getCommunicationMetrics() {
  const communications = await prisma.communication.findMany({
    include: { branch: true, assignedStaff: true },
    orderBy: { createdAt: "desc" }
  });
  return buildCommunicationMetrics(communications);
}

type CommunicationMetricInput = {
  status: CommunicationStatus;
  channel: CommunicationChannel;
  outcomeType: CommunicationOutcomeType | null;
  followUpRequired: boolean;
  sentAt: Date | null;
  sourceType: string;
  branch?: { name: string } | null;
  assignedStaff?: { name: string } | null;
};

export function buildCommunicationMetrics(communications: CommunicationMetricInput[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const sent = communications.filter((item) => item.status === CommunicationStatus.SENT || item.status === CommunicationStatus.RESPONDED || item.status === CommunicationStatus.COMPLETED);
  const responded = communications.filter((item) => item.status === CommunicationStatus.RESPONDED || item.status === CommunicationStatus.COMPLETED || item.outcomeType === CommunicationOutcomeType.RESPONSE_RECEIVED);
  const sentToday = communications.filter((item) => item.sentAt && item.sentAt >= today && item.sentAt < tomorrow);
  const noResponse = sent.filter((item) => !item.outcomeType || item.outcomeType === CommunicationOutcomeType.NO_RESPONSE);
  const byBranch = countBy(communications, (item) => item.branch?.name ?? "Network");
  const byStaff = countBy(communications, (item) => item.assignedStaff?.name ?? "Unassigned");
  const bySource = countBy(communications, (item) => item.sourceType);
  const outcomes = countBy(communications.filter((item) => item.outcomeType), (item) => enumLabel(item.outcomeType ?? "OTHER"));
  const strongestBranch = [...byBranch].sort((a, b) => b.count - a.count)[0]?.label ?? "No branch activity yet";

  return {
    total: communications.length,
    drafts: communications.filter((item) => item.status === CommunicationStatus.DRAFT).length,
    ready: communications.filter((item) => item.status === CommunicationStatus.READY).length,
    opened: communications.filter((item) => item.status === CommunicationStatus.OPENED).length,
    sentToday: sentToday.length,
    awaitingResponse: communications.filter((item) => item.status === CommunicationStatus.SENT).length,
    responsesReceived: responded.length,
    followUpsRequired: communications.filter((item) => item.followUpRequired).length,
    failed: communications.filter((item) => item.status === CommunicationStatus.FAILED).length,
    responseRate: sent.length ? Math.round((responded.length / sent.length) * 100) : 0,
    noResponseCount: noResponse.length,
    outcomes,
    byBranch,
    byStaff,
    bySource,
    strongestBranch,
    summary: getCommunicationAiSummary({ communications, ready: communications.filter((item) => item.status === CommunicationStatus.READY).length, awaitingResponse: communications.filter((item) => item.status === CommunicationStatus.SENT).length, followUpsRequired: communications.filter((item) => item.followUpRequired).length, responseRate: sent.length ? Math.round((responded.length / sent.length) * 100) : 0 })
  };
}

export function getSentTodayCount(metrics: Awaited<ReturnType<typeof getCommunicationMetrics>>) {
  return metrics.sentToday;
}

export function getAwaitingResponseCount(metrics: Awaited<ReturnType<typeof getCommunicationMetrics>>) {
  return metrics.awaitingResponse;
}

export function getResponseRate(metrics: Awaited<ReturnType<typeof getCommunicationMetrics>>) {
  return metrics.responseRate;
}

export function getOutcomeBreakdown(metrics: Awaited<ReturnType<typeof getCommunicationMetrics>>) {
  return metrics.outcomes;
}

export function getCommunicationsByStaff(metrics: Awaited<ReturnType<typeof getCommunicationMetrics>>) {
  return metrics.byStaff;
}

export function getCommunicationsByBranch(metrics: Awaited<ReturnType<typeof getCommunicationMetrics>>) {
  return metrics.byBranch;
}

export function getCommunicationSourceBreakdown(metrics: Awaited<ReturnType<typeof getCommunicationMetrics>>) {
  return metrics.bySource;
}

export function getCommunicationAiSummary(input: { communications: unknown[]; ready: number; awaitingResponse: number; followUpsRequired: number; responseRate: number }) {
  if (!input.communications.length) {
    return "Communication Delivery is ready for manual WhatsApp handoff. Prepare refill reminders, payment nudges, event messages, and staff execution prompts from the source work queues.";
  }
  const pressure = input.ready + input.awaitingResponse + input.followUpsRequired;
  if (pressure === 0) {
    return `Communication discipline is stable. ${input.responseRate}% response rate is recorded from manually confirmed messages, with no active follow-up pressure.`;
  }
  return `${input.ready} communications are ready to send, ${input.awaitingResponse} are awaiting response, and ${input.followUpsRequired} need follow-up. Prioritize chronic refill and payment messages before routine operational updates.`;
}

export async function createCommunication(input: {
  sourceType: string;
  sourceId?: string | null;
  templateType?: string | null;
  channel?: string | null;
  recipientName?: string | null;
  recipientPhone?: string | null;
  message?: string | null;
  subject?: string | null;
  assignedStaffId?: string | null;
  branchId?: string | null;
  recipientType?: string | null;
}) {
  const sourceType = cleanString(input.sourceType || "MANUAL") as CommunicationSourceType;
  const sourceId = cleanOptionalString(input.sourceId);
  const channel = isCommunicationChannel(input.channel) ? input.channel : CommunicationChannel.WHATSAPP;
  const templateType = (cleanString(input.templateType || "GENERAL") || "GENERAL") as CommunicationTemplateType;
  const existing = sourceId ? await prisma.communication.findFirst({
    where: {
      sourceType,
      sourceId,
      status: { in: [CommunicationStatus.DRAFT, CommunicationStatus.READY, CommunicationStatus.OPENED] }
    },
    include: communicationInclude,
    orderBy: { createdAt: "desc" }
  }) : null;
  if (existing && !input.message && !input.recipientPhone) return existing;

  const resolved = sourceId ? await resolveCommunicationRecipient(sourceType, sourceId) : null;
  const branchId = cleanOptionalString(input.branchId) ?? resolved?.branchId ?? null;
  const assignedStaffId = cleanOptionalString(input.assignedStaffId) ?? resolved?.assignedStaffId ?? null;
  const recipientName = cleanString(input.recipientName) || resolved?.recipientName || "Manual recipient";
  const recipientPhone = normalizePhoneNumber(input.recipientPhone ?? resolved?.recipientPhone ?? "");
  const recipientType = isRecipientType(input.recipientType) ? input.recipientType : (resolved?.recipientType ?? CommunicationRecipientType.OTHER);
  const message = cleanString(input.message) || getCommunicationTemplate(templateType, resolved ?? { recipientName, sourceType });
  const ready = channel !== CommunicationChannel.WHATSAPP || Boolean(getRecipientPhone(recipientPhone));
  const links = buildSourceLinkData(sourceType, sourceId, resolved);

  const communication = await prisma.communication.create({
    data: {
      channel,
      status: ready ? CommunicationStatus.READY : CommunicationStatus.DRAFT,
      direction: CommunicationDirection.OUTBOUND,
      recipientName,
      recipientPhone: recipientPhone || null,
      recipientType,
      message,
      subject: cleanOptionalString(input.subject) ?? getDefaultSubject(sourceType),
      sourceType,
      sourceId,
      branchId,
      assignedStaffId,
      patientId: links.patientId,
      orderId: links.orderId,
      followUpTaskId: links.followUpTaskId,
      operationalActionId: links.operationalActionId,
      notificationId: links.notificationId,
      eventId: links.eventId,
      metadata: { templateType, recipientWarning: ready ? null : "Recipient phone number is required before WhatsApp delivery." },
      activities: {
        create: {
          activityType: "CREATED",
          description: ready ? "Communication prepared and ready for manual delivery." : "Communication drafted; recipient phone is required before WhatsApp delivery.",
          actorName: "PORTIONS"
        }
      }
    },
    include: communicationInclude
  });
  revalidateCommunicationPaths(communication);
  return communication;
}

export async function updateCommunication(id: string, input: Record<string, unknown>) {
  const existing = await prisma.communication.findUnique({ where: { id }, include: communicationInclude });
  if (!existing) throw new Error("Communication was not found.");

  const data: Prisma.CommunicationUpdateInput = {};
  const activities: Prisma.CommunicationActivityCreateWithoutCommunicationInput[] = [];
  const now = new Date();

  if ("message" in input) {
    const message = cleanString(input.message);
    if (!message) throw new Error("Message is required.");
    if (message !== existing.message) {
      data.message = message;
      activities.push({ activityType: "EDITED", description: "Message text updated.", actorName: "PORTIONS" });
    }
  }

  if ("recipientPhone" in input) {
    const phone = normalizePhoneNumber(cleanString(input.recipientPhone));
    if (phone && !getRecipientPhone(phone)) throw new Error("Recipient phone number is not valid.");
    if ((phone || null) !== existing.recipientPhone) {
      data.recipientPhone = phone || null;
      if (existing.status === CommunicationStatus.DRAFT && phone) data.status = CommunicationStatus.READY;
      activities.push({ activityType: "EDITED", description: "Recipient phone updated.", actorName: "PORTIONS" });
    }
  }

  if ("assignedStaffId" in input) {
    const assignedStaffId = cleanOptionalString(input.assignedStaffId);
    if (assignedStaffId !== existing.assignedStaffId) {
      if (assignedStaffId) {
        const staff = await prisma.staffMember.findUnique({ where: { id: assignedStaffId } });
        if (!staff) throw new Error("Selected sender was not found.");
        if (existing.branchId && staff.branchId !== existing.branchId) throw new Error("Assigned sender belongs to another branch.");
        data.assignedStaff = { connect: { id: assignedStaffId } };
        activities.push({ activityType: "ASSIGNED", description: `Assigned sender: ${staff.name}.`, actorName: "PORTIONS" });
      } else {
        data.assignedStaff = { disconnect: true };
        activities.push({ activityType: "ASSIGNED", description: "Sender assignment cleared.", actorName: "PORTIONS" });
      }
    }
  }

  const action = cleanString(input.action);
  if (action === "open_whatsapp") {
    if (!getWhatsappUrl(existing)) throw new Error("Recipient phone number is required before WhatsApp delivery.");
    const terminalOrConfirmedStatuses = new Set<CommunicationStatus>([
      CommunicationStatus.SENT,
      CommunicationStatus.RESPONDED,
      CommunicationStatus.COMPLETED,
      CommunicationStatus.CANCELLED
    ]);
    if (!terminalOrConfirmedStatuses.has(existing.status)) {
      data.status = CommunicationStatus.OPENED;
      data.openedAt = existing.openedAt ?? now;
      if (!existing.openedAt) activities.push({ activityType: "OPENED_IN_WHATSAPP", description: "Opened WhatsApp handoff link. Delivery still requires manual confirmation.", actorName: "PORTIONS" });
    }
  }

  if (action === "mark_sent") {
    if (existing.status === CommunicationStatus.CANCELLED) throw new Error("Cancelled communications cannot be marked sent.");
    if (!getRecipientPhone(existing.recipientPhone)) throw new Error("Recipient phone number is required before marking WhatsApp sent.");
    if (!existing.sentAt) {
      data.status = CommunicationStatus.SENT;
      data.sentAt = now;
      activities.push({ activityType: "MARKED_SENT", description: "Manual delivery confirmed by staff.", actorName: "PORTIONS" });
    }
  }

  if (action === "mark_failed") {
    if (existing.status === CommunicationStatus.CANCELLED) throw new Error("Cancelled communications cannot be failed.");
    data.status = CommunicationStatus.FAILED;
    data.failedAt = existing.failedAt ?? now;
    activities.push({ activityType: "FAILED", description: cleanString(input.outcomeNotes) || "Manual delivery marked failed.", actorName: "PORTIONS" });
  }

  if (action === "record_response" || "responseText" in input || "outcomeType" in input || "followUpRequired" in input) {
    const responseText = cleanOptionalString(input.responseText);
    if (responseText !== existing.responseText) data.responseText = responseText;
    if ("outcomeType" in input) {
      if (input.outcomeType && !isOutcomeType(input.outcomeType)) throw new Error("Invalid communication outcome.");
      data.outcomeType = input.outcomeType ? input.outcomeType as CommunicationOutcomeType : null;
    }
    if ("outcomeNotes" in input) data.outcomeNotes = cleanOptionalString(input.outcomeNotes);
    if ("followUpRequired" in input) data.followUpRequired = Boolean(input.followUpRequired);
    if ("followUpDate" in input) data.followUpDate = parseOptionalDate(input.followUpDate);
    data.status = CommunicationStatus.RESPONDED;
    data.respondedAt = existing.respondedAt ?? now;
    activities.push({ activityType: "RESPONSE_RECORDED", description: "Response or communication outcome recorded.", actorName: "PORTIONS" });
  }

  if (action === "complete") {
    data.status = CommunicationStatus.COMPLETED;
    data.completedAt = existing.completedAt ?? now;
    activities.push({ activityType: "COMPLETED", description: "Communication workflow completed.", actorName: "PORTIONS" });
  }

  if (action === "cancel") {
    data.status = CommunicationStatus.CANCELLED;
    activities.push({ activityType: "CANCELLED", description: "Communication cancelled.", actorName: "PORTIONS" });
  }

  if (action === "complete_follow_up") {
    if (!existing.followUpTaskId) throw new Error("No linked follow-up task is available.");
    await prisma.followUpTask.update({
      where: { id: existing.followUpTaskId },
      data: {
        status: FollowUpStatus.DONE,
        completedAt: now,
        lastContactedAt: now,
        outcomeType: mapCommunicationOutcomeToFollowUp(existing.outcomeType),
        outcomeNotes: existing.outcomeNotes ?? existing.responseText ?? "Completed from Communication Delivery Center.",
        activities: { create: { activityType: "COMPLETED_FROM_COMMUNICATION", description: "Follow-up completed from confirmed communication outcome.", actorName: "PORTIONS" } }
      }
    });
    activities.push({ activityType: "SOURCE_SYNC", description: "Linked follow-up task completed after confirmation.", actorName: "PORTIONS" });
  }

  if (action === "order_payment_received") {
    if (!existing.orderId) throw new Error("No linked order is available.");
    await prisma.order.update({
      where: { id: existing.orderId },
      data: { status: OrderStatus.PAID, paymentStatus: "Paid after communication confirmation" }
    });
    activities.push({ activityType: "SOURCE_SYNC", description: "Linked order marked paid after confirmed payment outcome.", actorName: "PORTIONS" });
  }

  if (Object.keys(data).length === 0 && !activities.length) return existing;

  const updated = await prisma.communication.update({
    where: { id },
    data: {
      ...data,
      activities: activities.length ? { create: activities } : undefined
    },
    include: communicationInclude
  });
  await syncCommunicationSourceActivity(updated, activities);
  revalidateCommunicationPaths(updated);
  return updated;
}

export async function resolveCommunicationRecipient(sourceType: CommunicationSourceType | string, sourceId: string) {
  if (sourceType === "FOLLOW_UP_TASK") {
    const task = await prisma.followUpTask.findUnique({
      where: { id: sourceId },
      include: { patient: { include: { assignedStaff: true } }, branch: true, assignedStaff: true }
    });
    if (!task) return null;
    return {
      recipientName: task.patient?.name ?? task.customerName,
      recipientPhone: task.patient?.phone ?? "",
      recipientType: task.patient ? CommunicationRecipientType.PATIENT : CommunicationRecipientType.CUSTOMER,
      branchId: task.branchId,
      assignedStaffId: task.assignedStaffId ?? task.patient?.assignedStaffId ?? null,
      sourceType,
      patientId: task.patientId,
      followUpTaskId: task.id,
      context: { taskType: task.type, reason: task.reason, suggestedAction: task.suggestedAction }
    };
  }

  if (sourceType === "ORDER") {
    const order = await prisma.order.findUnique({ where: { id: sourceId }, include: { patient: true, branch: true, assignedStaff: true } });
    if (!order) return null;
    return {
      recipientName: order.patient?.name ?? order.customerName,
      recipientPhone: order.phone || order.patient?.phone || "",
      recipientType: order.patient ? CommunicationRecipientType.PATIENT : CommunicationRecipientType.CUSTOMER,
      branchId: order.branchId,
      assignedStaffId: order.assignedStaffId,
      sourceType,
      patientId: order.patientId,
      orderId: order.id,
      context: { orderStatus: order.status, amount: Number(order.amount), paymentStatus: order.paymentStatus }
    };
  }

  if (sourceType === "PATIENT") {
    const patient = await prisma.patient.findUnique({ where: { id: sourceId }, include: { branch: true, assignedStaff: true } });
    if (!patient) return null;
    return {
      recipientName: patient.name,
      recipientPhone: patient.phone,
      recipientType: CommunicationRecipientType.PATIENT,
      branchId: patient.branchId,
      assignedStaffId: patient.assignedStaffId,
      sourceType,
      patientId: patient.id,
      context: { conditionCategory: patient.conditionCategory, nextRefillDate: patient.nextRefillDate }
    };
  }

  if (sourceType === "OPERATIONAL_ACTION") {
    const action = await prisma.operationalAction.findUnique({ where: { id: sourceId }, include: { assignedStaff: true, branch: true } });
    if (!action) return null;
    return {
      recipientName: action.assignedStaff?.name ?? action.branch?.managerName ?? "Action owner",
      recipientPhone: action.assignedStaff?.phone ?? "",
      recipientType: action.assignedStaff ? CommunicationRecipientType.STAFF : CommunicationRecipientType.BRANCH_MANAGER,
      branchId: action.branchId,
      assignedStaffId: action.assignedStaffId,
      sourceType,
      operationalActionId: action.id,
      context: { actionTitle: action.title, dueDate: action.dueDate, category: action.category }
    };
  }

  if (sourceType === "NOTIFICATION") {
    const notification = await prisma.notification.findUnique({
      where: { id: sourceId },
      include: { recipientStaff: true, branch: true, action: { include: { assignedStaff: true, branch: true } } }
    });
    if (!notification) return null;
    const recipientStaff = notification.recipientStaff ?? notification.action?.assignedStaff ?? null;
    return {
      recipientName: recipientStaff?.name ?? notification.recipientRole ?? notification.recipientType,
      recipientPhone: recipientStaff?.phone ?? "",
      recipientType: recipientStaff ? CommunicationRecipientType.STAFF : CommunicationRecipientType.OTHER,
      branchId: notification.branchId ?? notification.action?.branchId ?? null,
      assignedStaffId: recipientStaff?.id ?? null,
      sourceType,
      notificationId: notification.id,
      operationalActionId: notification.actionId,
      context: { notificationTitle: notification.title, message: notification.message }
    };
  }

  if (sourceType === "EVENT") {
    const event = await prisma.event.findUnique({ where: { id: sourceId }, include: { ownerStaff: true, branch: true } });
    if (!event) return null;
    return {
      recipientName: event.ownerStaff?.name ?? event.companyName ?? event.title,
      recipientPhone: event.ownerStaff?.phone ?? "",
      recipientType: event.ownerStaff ? CommunicationRecipientType.STAFF : CommunicationRecipientType.EVENT_PARTNER,
      branchId: event.branchId,
      assignedStaffId: event.ownerStaffId,
      sourceType,
      eventId: event.id,
      context: { eventTitle: event.title, eventDate: event.startDate, venue: event.venueName ?? event.location ?? "venue to be confirmed" }
    };
  }

  return null;
}

export function getCommunicationTemplate(templateType: CommunicationTemplateType | string, resolved: any = {}) {
  const name = resolved.recipientName ?? "there";
  const context = resolved.context ?? {};
  switch (templateType) {
    case "REFILL_REMINDER":
      return getFollowUpMessage(name, "Your refill is due. Would you prefer branch collection or delivery?");
    case "OVERDUE_REFILL":
      return getFollowUpMessage(name, "Your refill is overdue. We can prepare it for collection or arrange delivery today.");
    case "ORDER_PAYMENT":
    case "PAYMENT_REMINDER":
      return getPaymentReminderMessage(name);
    case "ORDER_UPDATE":
      return getOrderRecoveryMessage(name, context.orderStatus);
    case "ACTION_REMINDER":
      return getActionReminderMessage(name, context.actionTitle, context.dueDate);
    case "NOTIFICATION_ESCALATION":
      return getNotificationEscalationMessage(name, context.notificationTitle ?? "PORTIONS notification");
    case "EVENT_INVITATION":
      return getEventInvitationMessage(name, context.eventTitle, context.eventDate, context.venue);
    case "EVENT_REMINDER":
      return getEventReminderMessage(name, context.eventTitle, context.eventDate);
    case "EVENT_FOLLOW_UP":
      return getEventFollowUpMessage(name, context.eventTitle);
    case "EVENT_PREPARATION":
      return `Hi ${name}, the event preparation item is due soon. Please update PORTIONS once completed so the event remains ready for execution.`;
    default:
      return `Hi ${name}, this is PORTIONS Pharmacy Command OS. Please review this message and reply when convenient.`;
  }
}

export function getFollowUpMessage(patientName: string, detail: string) {
  return `Hi ${patientName}, this is PORTIONS Demo Pharmacy. ${detail}`;
}

export function getOrderRecoveryMessage(customerName: string, status?: string) {
  return `Hi ${customerName}, your order is currently ${status ? enumLabel(status).toLowerCase() : "being processed"}. Please confirm the next step so we can keep it moving.`;
}

export function getActionReminderMessage(staffName: string, actionTitle?: string, dueDate?: Date | string | null) {
  const dueText = dueDate ? `due ${formatDate(dueDate)}` : "due soon";
  return `Hi ${staffName}, the action '${actionTitle ?? "PORTIONS action"}' is ${dueText}. Please update PORTIONS when you start or complete it.`;
}

export function getNotificationEscalationMessage(staffName: string, notificationTitle: string) {
  return `Hi ${staffName}, PORTIONS has flagged '${notificationTitle}'. Please review and update the relevant work item before close of business.`;
}

export function getEventInvitationMessage(recipientName: string, eventTitle?: string, eventDate?: Date | string | null, venue?: string) {
  return `Hi ${recipientName}, you are invited to ${eventTitle ?? "our pharmacy event"}${eventDate ? ` on ${formatDate(eventDate)}` : ""} at ${venue ?? "the confirmed venue"}. Reply to confirm attendance.`;
}

export function getEventReminderMessage(recipientName: string, eventTitle?: string, eventDate?: Date | string | null) {
  return `Hi ${recipientName}, reminder: ${eventTitle ?? "the event"} is scheduled${eventDate ? ` for ${formatDate(eventDate)}` : ""}. Please confirm your availability and preparations.`;
}

export function getEventFollowUpMessage(recipientName: string, eventTitle?: string) {
  return `Hi ${recipientName}, thank you for engaging with ${eventTitle ?? "our pharmacy event"}. Please reply if you need follow-up support, product information, or a branch referral.`;
}

export function getPaymentReminderMessage(customerName: string) {
  return `Hi ${customerName}, your order is ready for the next step. Please confirm payment or let us know if you need assistance.`;
}

export function getRecommendedCommunicationSender(communication: CommunicationWithRelations, staff: Array<{ id: string; name: string; role: string; branchId: string | null }>) {
  const compatible = communication.branchId ? staff.filter((member) => member.branchId === communication.branchId) : staff;
  const direct =
    communication.followUpTask?.assignedStaff ??
    communication.order?.assignedStaff ??
    communication.operationalAction?.assignedStaff ??
    communication.event?.ownerStaff ??
    communication.patient?.assignedStaff ??
    null;
  if (direct && compatible.some((member) => member.id === direct.id)) {
    return { staff: direct, reason: `${direct.name} is already assigned to the linked ${enumLabel(communication.sourceType)} work item.` };
  }
  const support = compatible.find((member) => /support|sales|customer|pharmacist/i.test(member.role));
  if (support) return { staff: support, reason: `${support.name} matches the branch and role needed for this communication.` };
  const manager = compatible.find((member) => /manager|owner|general/i.test(member.role));
  if (manager) return { staff: manager, reason: `${manager.name} is the strongest branch or management owner available.` };
  return { staff: compatible[0] ?? null, reason: compatible[0] ? `${compatible[0].name} is the available compatible sender with branch access.` : "No compatible staff are configured for this communication branch." };
}

function buildSourceLinkData(sourceType: string, sourceId: string | null, resolved: any) {
  return {
    patientId: resolved?.patientId ?? null,
    orderId: resolved?.orderId ?? (sourceType === "ORDER" ? sourceId : null),
    followUpTaskId: resolved?.followUpTaskId ?? (sourceType === "FOLLOW_UP_TASK" ? sourceId : null),
    operationalActionId: resolved?.operationalActionId ?? (sourceType === "OPERATIONAL_ACTION" ? sourceId : null),
    notificationId: resolved?.notificationId ?? (sourceType === "NOTIFICATION" ? sourceId : null),
    eventId: resolved?.eventId ?? (sourceType === "EVENT" ? sourceId : null)
  };
}

async function syncCommunicationSourceActivity(communication: CommunicationWithRelations, activities: Prisma.CommunicationActivityCreateWithoutCommunicationInput[]) {
  const sent = activities.some((activity) => activity.activityType === "MARKED_SENT");
  const completed = activities.some((activity) => activity.activityType === "COMPLETED" || activity.activityType === "RESPONSE_RECORDED" || activity.activityType === "SOURCE_SYNC");
  if (communication.operationalActionId && (sent || completed)) {
    await prisma.operationalActionActivity.create({
      data: {
        actionId: communication.operationalActionId,
        activityType: "COMMUNICATION_RECORDED",
        description: sent ? `Communication sent to ${communication.recipientName}.` : `Communication outcome recorded for ${communication.recipientName}.`,
        actorName: "PORTIONS"
      }
    }).catch(() => null);
  }
  if (communication.eventId && (sent || completed)) {
    await prisma.eventActivity.create({
      data: {
        eventId: communication.eventId,
        activityType: "COMMUNICATION_RECORDED",
        description: sent ? `Communication sent to ${communication.recipientName}.` : `Communication outcome recorded for ${communication.recipientName}.`,
        actorName: "PORTIONS"
      }
    }).catch(() => null);
  }
  if (communication.notificationId && sent) {
    await prisma.notification.update({
      where: { id: communication.notificationId },
      data: { deliveryStatus: NotificationDeliveryStatus.SENT }
    }).catch(() => null);
  }
}

function mapCommunicationOutcomeToFollowUp(outcome?: CommunicationOutcomeType | null) {
  if (outcome === CommunicationOutcomeType.REFILL_CONFIRMED) return "REFILL_CONFIRMED";
  if (outcome === CommunicationOutcomeType.DELIVERY_CONFIRMED) return "DELIVERY_BOOKED";
  if (outcome === CommunicationOutcomeType.COLLECTION_CONFIRMED) return "COLLECTION_CONFIRMED";
  if (outcome === CommunicationOutcomeType.NO_RESPONSE) return "NO_RESPONSE";
  return "PATIENT_CONTACTED";
}

function countBy<T>(items: T[], selector: (item: T) => string) {
  const map = new Map<string, number>();
  for (const item of items) {
    const label = selector(item);
    map.set(label, (map.get(label) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
}

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanOptionalString(value: unknown) {
  const valueString = cleanString(value);
  if (!valueString || valueString.toLowerCase() === "none" || valueString.toLowerCase() === "unassigned") return null;
  return valueString;
}

function parseOptionalDate(value: unknown) {
  const valueString = cleanString(value);
  if (!valueString) return null;
  const date = new Date(valueString);
  if (Number.isNaN(date.getTime())) throw new Error("Follow-up date is not valid.");
  return date;
}

function getDefaultSubject(sourceType: string) {
  if (sourceType === "FOLLOW_UP_TASK") return "Follow-up message";
  if (sourceType === "ORDER") return "Order update";
  if (sourceType === "EVENT") return "Event communication";
  if (sourceType === "OPERATIONAL_ACTION") return "Action reminder";
  if (sourceType === "NOTIFICATION") return "Notification escalation";
  return "PORTIONS communication";
}

function isCommunicationChannel(value: unknown): value is CommunicationChannel {
  return typeof value === "string" && Object.values(CommunicationChannel).includes(value as CommunicationChannel);
}

function isCommunicationStatus(value: unknown): value is CommunicationStatus {
  return typeof value === "string" && Object.values(CommunicationStatus).includes(value as CommunicationStatus);
}

function isRecipientType(value: unknown): value is CommunicationRecipientType {
  return typeof value === "string" && Object.values(CommunicationRecipientType).includes(value as CommunicationRecipientType);
}

function isOutcomeType(value: unknown): value is CommunicationOutcomeType {
  return typeof value === "string" && Object.values(CommunicationOutcomeType).includes(value as CommunicationOutcomeType);
}

function revalidateCommunicationPaths(communication: Pick<CommunicationWithRelations, "id" | "sourceType" | "sourceId">) {
  revalidatePath("/communications");
  revalidatePath(`/communications/${communication.id}`);
  if (communication.sourceType === "FOLLOW_UP_TASK") revalidatePath("/follow-ups");
  if (communication.sourceType === "ORDER") revalidatePath("/orders");
  if (communication.sourceType === "OPERATIONAL_ACTION") revalidatePath("/action-center");
  if (communication.sourceType === "NOTIFICATION") revalidatePath("/notifications");
  if (communication.sourceType === "EVENT") revalidatePath("/events");
  if (communication.sourceType === "PATIENT") revalidatePath("/patients");
}
