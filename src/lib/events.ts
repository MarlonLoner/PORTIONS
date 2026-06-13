import {
  EventChecklistStatus,
  EventExpenseStatus,
  EventPriority,
  EventStatus,
  EventType,
  FundingStatus,
  OperationalActionCategory,
  OperationalActionOutcome,
  OperationalActionPriority,
  OperationalActionStatus,
  Prisma
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const eventTypes = Object.values(EventType);
export const eventStatuses = Object.values(EventStatus);
export const eventPriorities = Object.values(EventPriority);
export const fundingStatuses = Object.values(FundingStatus);

const decisionStatuses = new Set<EventStatus>([EventStatus.DRAFT, EventStatus.SUBMITTED, EventStatus.REJECTED]);
const atRiskStatuses = new Set<EventStatus>([EventStatus.FUNDING_PENDING, EventStatus.PREPARATION]);
const activeStatuses = new Set<EventStatus>([EventStatus.APPROVED, EventStatus.FUNDING_PENDING, EventStatus.FUNDED, EventStatus.PREPARATION, EventStatus.READY, EventStatus.IN_PROGRESS]);

export type EventWithRelations = Prisma.EventGetPayload<{
  include: {
    branch: true;
    ownerStaff: true;
    checklistItems: { include: { assignedStaff: true; operationalAction: { include: { assignedStaff: true; branch: true } } } };
    expenses: true;
    activities: true;
    review: true;
  };
}>;

export async function getEventCommandData(filters: {
  year?: string;
  month?: string;
  status?: string;
  type?: string;
  branchId?: string;
  ownerStaffId?: string;
  fundingStatus?: string;
} = {}) {
  const where: Prisma.EventWhereInput = {};
  const year = Number(filters.year);
  const month = Number(filters.month);

  if (filters.status) where.status = filters.status as EventStatus;
  if (filters.type) where.eventType = filters.type as EventType;
  if (filters.branchId) where.branchId = filters.branchId;
  if (filters.ownerStaffId) where.ownerStaffId = filters.ownerStaffId;
  if (filters.fundingStatus) where.fundingStatus = filters.fundingStatus as FundingStatus;
  if (Number.isInteger(year) && year > 2000) {
    const start = new Date(year, Number.isInteger(month) && month >= 1 && month <= 12 ? month - 1 : 0, 1);
    const end = Number.isInteger(month) && month >= 1 && month <= 12 ? new Date(year, month, 1) : new Date(year + 1, 0, 1);
    where.startDate = { gte: start, lt: end };
  }

  const [events, allEvents, branches, staff] = await Promise.all([
    prisma.event.findMany({
      where,
      include: eventInclude(),
      orderBy: [{ startDate: "asc" }, { priority: "desc" }]
    }),
    prisma.event.findMany({ include: eventInclude(), orderBy: [{ startDate: "asc" }, { priority: "desc" }] }),
    prisma.branch.findMany({ orderBy: { name: "asc" } }),
    prisma.staffMember.findMany({ include: { branch: true }, orderBy: { name: "asc" } })
  ]);

  return {
    events,
    allEvents,
    branches,
    staff,
    metrics: getEventMetrics(allEvents),
    groups: getEventGroups(events),
    intelligence: getPastEventIntelligence(allEvents)
  };
}

export async function getEventById(id: string) {
  return prisma.event.findUnique({
    where: { id },
    include: eventInclude()
  });
}

export async function getEventFormOptions() {
  const [branches, staff] = await Promise.all([
    prisma.branch.findMany({ orderBy: { name: "asc" } }),
    prisma.staffMember.findMany({ include: { branch: true }, orderBy: { name: "asc" } })
  ]);

  return { branches, staff };
}

export async function createEventFromForm(formData: FormData) {
  const title = clean(formData.get("title"));
  const eventType = enumOrDefault(formData.get("eventType"), EventType, EventType.HEALTH_OUTREACH);
  const startDate = parseDate(formData.get("startDate"));
  const endDate = parseDate(formData.get("endDate"));
  const objective = clean(formData.get("objective"));

  if (!title || !objective || !startDate || !endDate) {
    throw new Error("Title, objective, start date, and end date are required.");
  }

  const event = await prisma.event.create({
    data: {
      title,
      description: clean(formData.get("description")) || objective,
      eventType,
      status: EventStatus.DRAFT,
      priority: enumOrDefault(formData.get("priority"), EventPriority, EventPriority.MEDIUM),
      companyName: optional(formData.get("companyName")),
      venueName: optional(formData.get("venueName")),
      location: optional(formData.get("location")),
      branchId: optional(formData.get("branchId")),
      ownerStaffId: optional(formData.get("ownerStaffId")),
      startDate,
      endDate,
      expectedAttendance: parseOptionalInt(formData.get("expectedAttendance")),
      objective,
      expectedOutcome: optional(formData.get("expectedOutcome")),
      proposedBudget: parseOptionalDecimal(formData.get("proposedBudget")),
      fundingStatus: FundingStatus.NOT_REQUESTED,
      activities: {
        create: {
          activityType: "CREATED",
          description: "Event draft created with suggested preparation checklist.",
          actorName: "PORTIONS"
        }
      },
      checklistItems: {
        create: getSuggestedChecklistItems(eventType, startDate).map((item) => ({
          category: item.category,
          title: item.title,
          description: item.description,
          dueDate: item.dueDate
        }))
      }
    }
  });

  revalidatePath("/events");
  redirect(`/events/${event.id}`);
}

export async function updateEventStatus(eventId: string, status: EventStatus, note?: string) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new Error("Event was not found.");

  const data: Prisma.EventUpdateInput = { status };
  if (status === EventStatus.APPROVED) {
    data.approvedAt = new Date();
    data.approvedBy = "PORTIONS Leadership";
    data.approvedBudget = event.approvedBudget ?? event.proposedBudget ?? new Prisma.Decimal(0);
    data.approvalNotes = note ?? "Approved for preparation and funding coordination.";
    data.fundingStatus = event.proposedBudget && Number(event.proposedBudget) > 0 ? FundingStatus.REQUESTED : FundingStatus.NOT_REQUESTED;
  }
  if (status === EventStatus.REJECTED) data.rejectionReason = note ?? "Returned for revision before approval.";
  if (status === EventStatus.FUNDING_PENDING) data.fundingStatus = FundingStatus.REQUESTED;
  if (status === EventStatus.FUNDED) {
    data.fundingStatus = FundingStatus.FUNDED;
    data.fundsReleased = event.approvedBudget ?? event.proposedBudget ?? new Prisma.Decimal(0);
  }
  if (status === EventStatus.COMPLETED) data.completedAt = new Date();

  await prisma.event.update({
    where: { id: eventId },
    data: {
      ...data,
      activities: {
        create: {
          activityType: status,
          description: note ?? getStatusActionLabel(status),
          actorName: "PORTIONS"
        }
      }
    }
  });

  revalidatePath("/events");
  revalidatePath(`/events/${eventId}`);
}

export async function updateChecklistItem(itemId: string, eventId: string, status: EventChecklistStatus) {
  const item = await prisma.eventChecklistItem.update({
    where: { id: itemId },
    include: { operationalAction: true },
    data: {
      status,
      completedAt: status === EventChecklistStatus.COMPLETED ? new Date() : null
    }
  });
  if (item.operationalActionId && (status === EventChecklistStatus.COMPLETED || status === EventChecklistStatus.NOT_REQUIRED)) {
    await prisma.operationalAction.update({
      where: { id: item.operationalActionId },
      data: {
        status: status === EventChecklistStatus.COMPLETED ? OperationalActionStatus.COMPLETED : OperationalActionStatus.CANCELLED,
        completedAt: status === EventChecklistStatus.COMPLETED ? new Date() : null,
        outcomeType: status === EventChecklistStatus.COMPLETED ? OperationalActionOutcome.OTHER : null,
        outcomeNotes: status === EventChecklistStatus.COMPLETED ? "Completed from Event Command checklist." : "Marked not required from Event Command checklist.",
        activities: {
          create: {
            activityType: "EVENT_CHECKLIST_SYNC",
            description: `Linked event checklist item marked ${status.toLowerCase().replace(/_/g, " ")}.`,
            actorName: "PORTIONS"
          }
        }
      }
    });
  }
  await prisma.eventActivity.create({
    data: {
      eventId,
      activityType: "CHECKLIST_UPDATED",
      description: `Checklist item marked ${status.toLowerCase().replace(/_/g, " ")}.`,
      actorName: "PORTIONS"
    }
  });
  await resolveEventNotifications(eventId, itemId).catch(() => 0);
  revalidatePath(`/events/${eventId}`);
}

export async function assignEventChecklistItem(itemId: string, eventId: string, assignedStaffId: string | null) {
  const item = await prisma.eventChecklistItem.findUnique({ where: { id: itemId }, include: { event: true } });
  if (!item) throw new Error("Checklist item was not found.");
  if (assignedStaffId) {
    const staff = await prisma.staffMember.findUnique({ where: { id: assignedStaffId } });
    if (!staff) throw new Error("Selected staff member was not found.");
    if (item.event.branchId && staff.branchId && staff.branchId !== item.event.branchId) throw new Error("Assigned staff member belongs to another branch.");
  }

  await prisma.eventChecklistItem.update({
    where: { id: itemId },
    data: { assignedStaffId }
  });
  if (item.operationalActionId) {
    await prisma.operationalAction.update({
      where: { id: item.operationalActionId },
      data: {
        assignedStaffId,
        activities: { create: { activityType: "ASSIGNMENT_CHANGED", description: assignedStaffId ? "Event checklist assignment synchronized." : "Event checklist assignment cleared.", actorName: "PORTIONS" } }
      }
    });
  }
  await prisma.eventActivity.create({
    data: { eventId, activityType: "CHECKLIST_ASSIGNED", description: assignedStaffId ? "Checklist owner assigned." : "Checklist owner cleared.", actorName: "PORTIONS" }
  });
  revalidatePath(`/events/${eventId}`);
}

export async function createLinkedChecklistAction(itemId: string, eventId: string) {
  const item = await prisma.eventChecklistItem.findUnique({
    where: { id: itemId },
    include: { event: { include: { branch: true, ownerStaff: true } }, operationalAction: true, assignedStaff: true }
  });
  if (!item) throw new Error("Checklist item was not found.");
  if (item.operationalActionId) {
    revalidatePath(`/events/${eventId}`);
    return item.operationalActionId;
  }

  const action = await prisma.$transaction(async (tx) => {
    const created = await tx.operationalAction.create({
      data: {
        title: `Event prep: ${item.title}`,
        description: `${item.event.title}: ${item.description ?? item.title}`,
        category: OperationalActionCategory.PILOT_TASK,
        priority: item.event.priority === EventPriority.CRITICAL ? OperationalActionPriority.CRITICAL : item.event.priority === EventPriority.HIGH ? OperationalActionPriority.HIGH : OperationalActionPriority.MEDIUM,
        status: item.status === EventChecklistStatus.BLOCKED ? OperationalActionStatus.BLOCKED : OperationalActionStatus.OPEN,
        sourceType: "EVENT_CHECKLIST_ITEM",
        sourceId: item.id,
        branchId: item.event.branchId,
        assignedStaffId: item.assignedStaffId,
        dueDate: item.dueDate,
        valueAmount: item.event.proposedBudget ?? new Prisma.Decimal(0),
        activities: {
          create: {
            activityType: "CREATED_FROM_EVENT",
            description: `Created from event checklist for ${item.event.title}.`,
            actorName: "PORTIONS"
          }
        }
      }
    });
    await tx.eventChecklistItem.update({ where: { id: item.id }, data: { operationalActionId: created.id } });
    await tx.eventActivity.create({ data: { eventId, activityType: "ACTION_LINKED", description: `Linked checklist item to Action Center: ${created.title}.`, actorName: "PORTIONS" } });
    return created;
  });

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/action-center");
  return action.id;
}

export async function createEventExpense(eventId: string, formData: FormData) {
  const description = clean(formData.get("description"));
  const amount = parseOptionalDecimal(formData.get("amount"));
  if (!description || !amount) throw new Error("Expense description and amount are required.");

  await prisma.event.update({
    where: { id: eventId },
    data: {
      expenses: {
        create: {
          category: clean(formData.get("category")) || "General",
          description,
          supplier: optional(formData.get("supplier")),
          amount,
          status: EventExpenseStatus.PLANNED,
          notes: optional(formData.get("notes"))
        }
      },
      activities: {
        create: {
          activityType: "EXPENSE_PLANNED",
          description: `Expense planned: ${description}.`,
          actorName: "PORTIONS"
        }
      }
    }
  });

  revalidatePath(`/events/${eventId}`);
}

export async function createEventReview(eventId: string, formData: FormData) {
  const attendance = parseRequiredInt(formData.get("attendance"));
  const leadsGenerated = parseRequiredInt(formData.get("leadsGenerated"));
  const patientsRegistered = parseRequiredInt(formData.get("patientsRegistered"));
  const revenueGenerated = parseOptionalDecimal(formData.get("revenueGenerated")) ?? new Prisma.Decimal(0);

  await prisma.event.update({
    where: { id: eventId },
    data: {
      status: EventStatus.COMPLETED,
      completedAt: new Date(),
      actualAttendance: attendance,
      leadsGenerated,
      patientsRegistered,
      revenueGenerated,
      actualSpend: parseOptionalDecimal(formData.get("actualSpend")),
      review: {
        upsert: {
          create: {
            attendance,
            leadsGenerated,
            patientsRegistered,
            revenueGenerated,
            whatWorked: clean(formData.get("whatWorked")),
            whatFailed: clean(formData.get("whatFailed")),
            lessonsLearned: clean(formData.get("lessonsLearned")),
            nextTimeRecommendations: clean(formData.get("nextTimeRecommendations")),
            mediaLinks: optional(formData.get("mediaLinks"))
          },
          update: {
            attendance,
            leadsGenerated,
            patientsRegistered,
            revenueGenerated,
            whatWorked: clean(formData.get("whatWorked")),
            whatFailed: clean(formData.get("whatFailed")),
            lessonsLearned: clean(formData.get("lessonsLearned")),
            nextTimeRecommendations: clean(formData.get("nextTimeRecommendations")),
            mediaLinks: optional(formData.get("mediaLinks"))
          }
        }
      },
      activities: {
        create: {
          activityType: "REVIEW_RECORDED",
          description: "Post-event review captured for future event intelligence.",
          actorName: "PORTIONS"
        }
      }
    }
  });

  await resolveEventNotifications(eventId).catch(() => 0);
  revalidatePath("/events");
  revalidatePath(`/events/${eventId}`);
  redirect(`/events/${eventId}`);
}

export function getEventMetrics(events: EventWithRelations[]) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  return {
    upcomingEvents: events.filter((event) => event.startDate >= now && activeStatuses.has(event.status)).length,
    awaitingApproval: events.filter((event) => event.status === EventStatus.SUBMITTED).length,
    awaitingFunding: events.filter((event) => event.fundingStatus === FundingStatus.REQUESTED || event.status === EventStatus.FUNDING_PENDING).length,
    atRiskEvents: events.filter(isEventAtRisk).length,
    eventsThisMonth: events.filter((event) => event.startDate >= monthStart && event.startDate < monthEnd).length,
    completedThisYear: events.filter((event) => event.status === EventStatus.COMPLETED && (event.completedAt ?? event.endDate) >= yearStart).length,
    totalApprovedBudget: sumMoney(events, (event) => event.approvedBudget),
    actualEventSpend: sumMoney(events, (event) => event.actualSpend)
  };
}

export function getEventGroups(events: EventWithRelations[]) {
  return [
    { title: "Awaiting decision", helper: "Drafts and submitted events that need leadership approval.", events: events.filter((event) => decisionStatuses.has(event.status)) },
    { title: "Upcoming", helper: "Approved or funded events approaching execution.", events: events.filter((event) => event.startDate >= new Date() && activeStatuses.has(event.status)) },
    { title: "At risk", helper: "Funding, readiness, or timing issues that need action.", events: events.filter(isEventAtRisk) },
    { title: "In progress", helper: "Events currently being executed by branch or leadership teams.", events: events.filter((event) => event.status === EventStatus.IN_PROGRESS) },
    { title: "Recently completed", helper: "Completed events feeding the next planning cycle.", events: events.filter((event) => event.status === EventStatus.COMPLETED).slice(0, 8) }
  ];
}

export function getEventReadinessScore(event: EventWithRelations) {
  const weights: Record<string, number> = {
    Approval: 10,
    Funding: 15,
    "Venue & Infrastructure": 15,
    Branding: 10,
    "Technology & Connectivity": 10,
    "Staff & Operations": 10,
    Promotion: 10,
    "Customer Experience": 10,
    "Compliance & Safety": 10
  };
  let score = event.status === EventStatus.APPROVED || event.status === EventStatus.FUNDING_PENDING || event.status === EventStatus.FUNDED || event.status === EventStatus.PREPARATION || event.status === EventStatus.READY || event.status === EventStatus.IN_PROGRESS || event.status === EventStatus.COMPLETED ? weights.Approval : 0;
  score += event.fundingStatus === FundingStatus.FUNDED || !event.proposedBudget ? weights.Funding : event.fundingStatus === FundingStatus.PARTIALLY_FUNDED ? weights.Funding / 2 : 0;

  for (const [category, weight] of Object.entries(weights).filter(([category]) => category !== "Approval" && category !== "Funding")) {
    const items = event.checklistItems.filter((item) => item.category === category && item.status !== EventChecklistStatus.NOT_REQUIRED);
    if (!items.length) {
      score += weight;
      continue;
    }
    const completed = items.filter((item) => item.status === EventChecklistStatus.COMPLETED).length;
    score += (completed / items.length) * weight;
  }

  const blockers = getEventBlockingCategories(event);
  const hasCriticalBlocker = blockers.some((item) => item.category === "Venue & Infrastructure" || item.category === "Technology & Connectivity" || item.category === "Compliance & Safety");
  if (hasCriticalBlocker && score > 74) score = 74;
  if (event.status === EventStatus.REJECTED || event.status === EventStatus.CANCELLED) score = Math.min(score, 30);
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function getReadinessScore(event: EventWithRelations) {
  return getEventReadinessScore(event);
}

export function getEventReadinessLabel(event: EventWithRelations) {
  const score = getEventReadinessScore(event);
  if (score >= 85) return "Execution Ready";
  if (score >= 70) return "Mostly Ready";
  if (score >= 50) return "Needs Preparation";
  return "At Risk";
}

export function getEventChecklistCompletion(event: EventWithRelations) {
  const required = event.checklistItems.filter((item) => item.status !== EventChecklistStatus.NOT_REQUIRED);
  const completed = required.filter((item) => item.status === EventChecklistStatus.COMPLETED);
  return {
    total: required.length,
    completed: completed.length,
    percentage: required.length ? Math.round((completed.length / required.length) * 100) : 100
  };
}

export function getEventBlockingCategories(event: EventWithRelations) {
  return event.checklistItems
    .filter((item) => item.status !== EventChecklistStatus.COMPLETED && item.status !== EventChecklistStatus.NOT_REQUIRED)
    .filter((item) => item.status === EventChecklistStatus.BLOCKED || (item.dueDate ? item.dueDate < startOfToday() : false))
    .map((item) => ({ category: item.category, title: item.title, status: item.status }));
}

export function getEventDaysUntilStart(event: Pick<EventWithRelations, "startDate">) {
  const today = startOfToday();
  const start = new Date(event.startDate);
  start.setHours(0, 0, 0, 0);
  return Math.ceil((start.getTime() - today.getTime()) / 86_400_000);
}

export function getEventRiskLevel(event: EventWithRelations): "Low" | "Medium" | "High" | "Critical" {
  const readiness = getEventReadinessScore(event);
  const days = getEventDaysUntilStart(event);
  if (event.status === EventStatus.CANCELLED || event.status === EventStatus.COMPLETED) return "Low";
  if (days <= 3 && readiness < 85) return "Critical";
  if ((days <= 7 && readiness < 70) || (days <= 14 && readiness < 50) || getEventBlockingCategories(event).length > 0) return "High";
  if (readiness < 75 || getEventFundingRisk(event) !== "Low") return "Medium";
  return "Low";
}

export function getEventNextBestAction(event: EventWithRelations) {
  return getEventNextAction(event);
}

export function getEventReadinessSummary(event: EventWithRelations) {
  return {
    score: getEventReadinessScore(event),
    label: getEventReadinessLabel(event),
    blockingCategories: getEventBlockingCategories(event),
    nextBestAction: getEventNextBestAction(event),
    daysUntilStart: getEventDaysUntilStart(event),
    riskLevel: getEventRiskLevel(event),
    checklist: getEventChecklistCompletion(event)
  };
}

export function getEventNextAction(event: EventWithRelations) {
  if (event.status === EventStatus.DRAFT) return "Submit for leadership approval with budget and outcome case.";
  if (event.status === EventStatus.SUBMITTED) return "Approve, reject, or request funding decision.";
  if (event.status === EventStatus.REJECTED) return "Revise objective, budget, or venue before resubmission.";
  if (event.fundingStatus === FundingStatus.REQUESTED || event.status === EventStatus.FUNDING_PENDING) return "Release funds or adjust budget before preparation stalls.";
  if (getReadinessScore(event) < 70 && event.status !== EventStatus.COMPLETED) return "Clear checklist blockers before marking the event ready.";
  if (event.status === EventStatus.READY) return "Brief staff, confirm materials, and start execution on event day.";
  if (event.status === EventStatus.IN_PROGRESS) return "Track attendance, leads, patient registrations, spend, and operational issues.";
  if (event.status === EventStatus.COMPLETED && !event.review) return "Record the event review so future promotions improve.";
  if (event.review) return "Use lessons learned to improve the next promotion calendar.";
  return "Confirm owner, budget, and preparation checklist.";
}

export function getEventAiSummary(event: EventWithRelations) {
  const readiness = getReadinessScore(event);
  const budget = Number(event.approvedBudget ?? event.proposedBudget ?? 0);
  if (event.status === EventStatus.COMPLETED) {
    return `${event.title} is complete. It generated ${event.leadsGenerated ?? event.review?.leadsGenerated ?? 0} leads and ${event.patientsRegistered ?? event.review?.patientsRegistered ?? 0} patient registrations. Use the review notes to improve the next ${event.eventType.toLowerCase().replace(/_/g, " ")}.`;
  }
  if (event.status === EventStatus.SUBMITTED) {
    return `${event.title} is awaiting leadership decision. The proposed budget is ${budget ? `$${budget.toLocaleString("en-US")}` : "not yet funded"}, and the expected outcome should be weighed against patient registration and revenue potential.`;
  }
  if (readiness < 70) {
    return `${event.title} is not execution-ready yet. Funding, owner assignment, venue confirmation, or checklist completion should be resolved before staff are deployed.`;
  }
  return `${event.title} is positioned for execution. Keep funding, materials, promotion, and post-event follow-up visible so the event creates measurable pharmacy value.`;
}

export function getPromotionSuggestions(events: EventWithRelations[]) {
  const completed = events.filter((event) => event.status === EventStatus.COMPLETED);
  const strongTypes = [...completed].sort((a, b) => (b.leadsGenerated ?? b.review?.leadsGenerated ?? 0) - (a.leadsGenerated ?? a.review?.leadsGenerated ?? 0)).slice(0, 3);
  return [
    strongTypes[0]
      ? `Repeat ${strongTypes[0].eventType.toLowerCase().replace(/_/g, " ")} formats where leads and patient registrations were strongest.`
      : "Start with branch promotions and wellness days because they are easier to prepare and measure.",
    "Use WhatsApp and in-branch posters at least seven days before each event.",
    "Assign post-event follow-up owners before the event starts so leads do not cool off."
  ];
}

export function getPastEventIntelligence(events: EventWithRelations[]) {
  const completed = events.filter((event) => event.status === EventStatus.COMPLETED);
  return {
    completedCount: completed.length,
    revenueGenerated: sumMoney(completed, (event) => event.revenueGenerated),
    leadsGenerated: completed.reduce((sum, event) => sum + (event.leadsGenerated ?? event.review?.leadsGenerated ?? 0), 0),
    patientsRegistered: completed.reduce((sum, event) => sum + (event.patientsRegistered ?? event.review?.patientsRegistered ?? 0), 0),
    promotionSuggestions: getPromotionSuggestions(events)
  };
}

export function getEventCommittedSpend(event: EventWithRelations) {
  return sumMoney(event.expenses, (expense) => expense.amount);
}

export function getEventApprovedExpenseTotal(event: EventWithRelations) {
  return sumMoney(event.expenses.filter((expense) => expense.status === EventExpenseStatus.APPROVED || expense.status === EventExpenseStatus.PAID), (expense) => expense.amount);
}

export function getEventPaidExpenseTotal(event: EventWithRelations) {
  return sumMoney(event.expenses.filter((expense) => expense.status === EventExpenseStatus.PAID), (expense) => expense.amount);
}

export function getEventOutstandingExpenseTotal(event: EventWithRelations) {
  return sumMoney(event.expenses.filter((expense) => expense.status === EventExpenseStatus.APPROVED || expense.status === EventExpenseStatus.REQUESTED), (expense) => expense.amount);
}

export function getEventFundingGap(event: EventWithRelations) {
  return Math.max(0, Number(event.approvedBudget ?? event.proposedBudget ?? 0) - Number(event.fundsReleased ?? 0));
}

export function getEventBudgetVariance(event: EventWithRelations) {
  const finalSpend = event.actualSpend !== null && event.actualSpend !== undefined ? Number(event.actualSpend) : getEventCommittedSpend(event);
  return finalSpend - Number(event.approvedBudget ?? event.proposedBudget ?? 0);
}

export function getEventRemainingBalance(event: EventWithRelations) {
  const spendSource = event.actualSpend !== null && event.actualSpend !== undefined ? Number(event.actualSpend) : getEventPaidExpenseTotal(event);
  return Number(event.fundsReleased ?? 0) - spendSource;
}

export function getEventFundingRisk(event: EventWithRelations): "Low" | "Medium" | "High" | "Critical" {
  const days = getEventDaysUntilStart(event);
  const variance = getEventBudgetVariance(event);
  const gap = getEventFundingGap(event);
  const outstanding = getEventOutstandingExpenseTotal(event);
  if (variance > 0 || event.fundingStatus === FundingStatus.OVER_BUDGET) return "Critical";
  if (days <= 7 && gap > 0) return "High";
  if (outstanding > 0 || event.fundingStatus === FundingStatus.PARTIALLY_FUNDED) return "Medium";
  return "Low";
}

export function getEventFundingNextAction(event: EventWithRelations) {
  const variance = getEventBudgetVariance(event);
  if (variance > 0) return "Review budget overrun and decide whether to approve additional spend or reduce event scope.";
  if (getEventFundingGap(event) > 0) return "Release approved funds or revise budget before preparation stalls.";
  if (getEventOutstandingExpenseTotal(event) > 0) return "Approve or reject requested expenses so suppliers and materials are not delayed.";
  if (getEventRemainingBalance(event) > 0 && event.status === EventStatus.COMPLETED) return "Close unused released funds after final event review.";
  return "Funding is controlled. Keep expense decisions visible until the event review is complete.";
}

export function getEventFundingSummary(event: EventWithRelations) {
  return {
    proposedBudget: Number(event.proposedBudget ?? 0),
    approvedBudget: Number(event.approvedBudget ?? 0),
    fundsReleased: Number(event.fundsReleased ?? 0),
    plannedExpenses: getEventCommittedSpend(event),
    approvedExpenses: getEventApprovedExpenseTotal(event),
    paidExpenses: getEventPaidExpenseTotal(event),
    actualSpend: Number(event.actualSpend ?? 0),
    outstandingExpenses: getEventOutstandingExpenseTotal(event),
    remainingBalance: getEventRemainingBalance(event),
    fundingGap: getEventFundingGap(event),
    budgetVariance: getEventBudgetVariance(event),
    risk: getEventFundingRisk(event),
    nextAction: getEventFundingNextAction(event)
  };
}

type StaffForRecommendation = Prisma.StaffMemberGetPayload<{ include: { branch: true } }>;

export function getEventChecklistCompatibleStaff(event: EventWithRelations, staff: StaffForRecommendation[]) {
  if (!event.branchId) return staff;
  return staff.filter((member) => !member.branchId || member.branchId === event.branchId);
}

export function getEventChecklistRecommendedAssignee(event: EventWithRelations, item: EventWithRelations["checklistItems"][number], staff: StaffForRecommendation[], openActions: Array<{ assignedStaffId: string | null; status: OperationalActionStatus; dueDate: Date | null }>) {
  const compatible = getEventChecklistCompatibleStaff(event, staff);
  const category = item.category.toLowerCase();
  const rolePrefs =
    category.includes("venue") ? ["manager", "operations", "owner"] :
    category.includes("branding") ? ["marketing", "brand", "digital", "content"] :
    category.includes("technology") ? ["it", "digital", "operations"] :
    category.includes("staff") ? ["manager", "owner", "senior"] :
    category.includes("promotion") ? ["marketing", "content", "support"] :
    category.includes("customer") ? ["support", "pharmacist"] :
    category.includes("compliance") ? ["pharmacist", "manager", "operations"] :
    category.includes("funding") ? ["finance", "admin", "general manager"] :
    ["manager", "support", "pharmacist"];
  const eventOwner = event.ownerStaffId ? compatible.find((member) => member.id === event.ownerStaffId) : null;
  const scored = compatible.map((member) => ({
    member,
    score: roleMatchScore(member.role, rolePrefs) + (eventOwner?.id === member.id ? 6 : 0) - activeWorkload(member.id, openActions) * 2 - overdueWorkload(member.id, openActions) * 3
  }));
  return scored.sort((a, b) => b.score - a.score || a.member.name.localeCompare(b.member.name))[0]?.member ?? null;
}

export function getEventAssignmentReason(event: EventWithRelations, item: EventWithRelations["checklistItems"][number], staffMember: StaffForRecommendation | null, openActions: Array<{ assignedStaffId: string | null; status: OperationalActionStatus; dueDate: Date | null }>) {
  if (!staffMember) return event.branchId ? "No compatible staff members are configured for this event branch." : "No staff members are configured for recommendation.";
  const branch = event.branch?.name ?? "Network";
  const workload = activeWorkload(staffMember.id, openActions);
  const overdue = overdueWorkload(staffMember.id, openActions);
  return `${branch} ${staffMember.role || "staff member"} matched to ${item.category.toLowerCase()} with ${workload} active actions and ${overdue} overdue.`;
}

export function getEventOwnerRecommendation(event: EventWithRelations, staff: StaffForRecommendation[], openActions: Array<{ assignedStaffId: string | null; status: OperationalActionStatus; dueDate: Date | null }>) {
  const compatible = getEventChecklistCompatibleStaff(event, staff);
  return [...compatible].sort((a, b) => roleMatchScore(b.role, ["manager", "general manager", "operations", "owner"]) - roleMatchScore(a.role, ["manager", "general manager", "operations", "owner"]) || activeWorkload(a.id, openActions) - activeWorkload(b.id, openActions))[0] ?? null;
}

export function getRelevantPastEvents(event: EventWithRelations, allEvents: EventWithRelations[]) {
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 1);
  return allEvents
    .filter((candidate) => candidate.id !== event.id && candidate.status === EventStatus.COMPLETED && candidate.startDate >= cutoff)
    .map((candidate) => ({ candidate, score: pastEventScore(event, candidate) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || b.candidate.startDate.getTime() - a.candidate.startDate.getTime())
    .slice(0, 5)
    .map((item) => item.candidate);
}

export function getPastEventPerformanceSummary(events: EventWithRelations[]) {
  const count = events.length;
  const avgAttendance = count ? Math.round(events.reduce((sum, event) => sum + (event.actualAttendance ?? event.review?.attendance ?? 0), 0) / count) : 0;
  const avgSpend = count ? Math.round(events.reduce((sum, event) => sum + Number(event.actualSpend ?? 0), 0) / count) : 0;
  const leads = events.reduce((sum, event) => sum + (event.leadsGenerated ?? event.review?.leadsGenerated ?? 0), 0);
  return { count, avgAttendance, avgSpend, leads };
}

export function getHistoricalEventLessons(events: EventWithRelations[]) {
  return events.flatMap((event) => [
    event.review?.whatWorked ? `Worked: ${event.review.whatWorked}` : "",
    event.review?.whatFailed ? `Failed: ${event.review.whatFailed}` : "",
    event.review?.nextTimeRecommendations ? `Next time: ${event.review.nextTimeRecommendations}` : ""
  ]).filter(Boolean).slice(0, 6);
}

export function getPastEventBenchmarks(events: EventWithRelations[]) {
  const summary = getPastEventPerformanceSummary(events);
  return {
    attendanceBenchmark: summary.count ? summary.avgAttendance : null,
    spendBenchmark: summary.count ? summary.avgSpend : null,
    leadBenchmark: summary.count ? Math.round(summary.leads / summary.count) : null
  };
}

export function getHistoricalPromotionInsights(event: EventWithRelations, events: EventWithRelations[]) {
  const summary = getPastEventPerformanceSummary(events);
  if (!events.length) return "No comparable past events were found. Treat this as a baseline event and capture the review carefully.";
  return `${summary.count} relevant past events averaged ${summary.avgAttendance} attendees and US$${summary.avgSpend} spend. Review repeated blockers before approving final materials and promotion deadlines.`;
}

export function getEventPromotionPhase(event: EventWithRelations) {
  const days = getEventDaysUntilStart(event);
  if (days > 14) return "21-30 days before";
  if (days > 3) return "7-14 days before";
  if (days >= 1) return "1-3 days before";
  if (days === 0) return "Event day";
  return "After event";
}

export function getEventPromotionSuggestions(event: EventWithRelations, staff: StaffForRecommendation[] = []) {
  const phase = getEventPromotionPhase(event);
  const owner = event.ownerStaff?.name ?? getEventOwnerRecommendation(event, staff, [])?.name ?? "Event owner";
  const deadline = event.startDate;
  const base =
    phase === "21-30 days before" ? ["Publish save-the-date", "Confirm partner announcement", "Prepare registration form", "Lock visual identity"] :
    phase === "7-14 days before" ? ["Send WhatsApp invitations", "Launch countdown content", "Brief staff invitation scripts", "Confirm supplier cross-promotion"] :
    phase === "1-3 days before" ? ["Send final reminder", "Share venue map", "Confirm weather and connectivity contingency", "Run staff briefing"] :
    phase === "Event day" ? ["Run registration desk", "Capture QR leads", "Collect testimonials", "Post live updates"] :
    ["Send thank-you message", "Follow up leads", "Share partner report", "Capture lessons for next event"];
  return base.map((action, index) => ({
    action,
    owner,
    deadline: new Date(deadline.getTime() - Math.max(0, 3 - index) * 86_400_000),
    reason: `${phase} promotion discipline keeps attendance, leads, and patient follow-up visible.`,
    copy: getEventPromotionCopy(event, action)
  }));
}

export function getEventPromotionPlaybook(event: EventWithRelations, staff: StaffForRecommendation[] = []) {
  return {
    phase: getEventPromotionPhase(event),
    suggestions: getEventPromotionSuggestions(event, staff),
    risks: getEventPromotionRisks(event)
  };
}

export function getEventPromotionCopy(event: EventWithRelations, action: string) {
  return `Hi, ${event.title} is coming up at ${event.venueName ?? event.location ?? event.branch?.name ?? "our pharmacy network"}. ${action}. Reply if you would like details or want us to reserve a place for you.`;
}

export function getEventPromotionRisks(event: EventWithRelations) {
  const risks = [];
  if (!event.expectedAttendance) risks.push("Expected attendance is not set, so promotion success will be harder to judge.");
  if (!event.ownerStaffId) risks.push("No event owner is assigned for promotion coordination.");
  if (getEventDaysUntilStart(event) <= 7 && getEventReadinessScore(event) < 70) risks.push("Preparation risk may weaken promotional confidence.");
  return risks.length ? risks : ["Promotion risk is controlled if owner, content, and lead follow-up remain visible."];
}

export function getCalendarMonths(year: number, events: EventWithRelations[]) {
  return Array.from({ length: 12 }, (_, index) => {
    const monthEvents = events.filter((event) => event.startDate.getFullYear() === year && event.startDate.getMonth() === index);
    return {
      month: index,
      label: new Date(year, index, 1).toLocaleString("en-US", { month: "long" }),
      events: monthEvents
    };
  });
}

export function getSuggestedChecklistItems(eventType: EventType, startDate: Date) {
  const due = (daysBefore: number) => {
    const date = new Date(startDate);
    date.setDate(date.getDate() - daysBefore);
    return date;
  };
  const base = [
    item("Venue & Infrastructure", "Confirm venue", "Confirm venue booking, access time, parking, toilets, and security.", due(21)),
    item("Venue & Infrastructure", "Tables, chairs, gazebo", "Confirm tables, chairs, gazebo, signage stands, and customer flow.", due(14)),
    item("Technology & Connectivity", "Wi-Fi and mobile data backup", "Test payment connectivity, staff phones, mobile data, and device charging.", due(7)),
    item("Technology & Connectivity", "Extension cables and power backup", "Prepare extension leads, adapters, backup power, and safe cable layout.", due(7)),
    item("Branding", "Prepare PORTIONS and pharmacy branding", "Pack banners, flyers, price lists, staff badges, and offer cards.", due(10)),
    item("Staff & Operations", "Assign event team", "Confirm event lead, pharmacist coverage, support staff, and stock controller.", due(14)),
    item("Promotion", "Launch promotion plan", "Publish WhatsApp broadcast, branch posters, and partner invitations.", due(10)),
    item("Customer Experience", "Prepare registration and lead capture", "Prepare patient registration form, lead sheet, consent language, and follow-up owner.", due(5)),
    item("Compliance & Safety", "Clinical and safety review", "Confirm pharmacist supervision, privacy handling, and safe screening flow.", due(5)),
    item("Post-Event Follow-Up", "Assign post-event follow-up owners", "Assign owners for leads, patients registered, quotes, and chronic package follow-up.", due(2))
  ];

  if (eventType === EventType.CORPORATE_ACTIVATION || eventType === EventType.WELLNESS_DAY) {
    base.push(item("Customer Experience", "Corporate screening pack", "Prepare BP, glucose, BMI, wellness education, and employer feedback pack.", due(7)));
  }
  if (eventType === EventType.BRANCH_PROMOTION || eventType === EventType.PRODUCT_LAUNCH) {
    base.push(item("Promotion", "Offer and product display", "Confirm offer mechanics, shelf display, staff scripts, and bundle pricing.", due(7)));
  }

  return base;
}

export function getStatusActionLabel(status: EventStatus) {
  const labels: Record<EventStatus, string> = {
    DRAFT: "Event returned to draft.",
    SUBMITTED: "Event submitted for leadership approval.",
    APPROVED: "Event approved for preparation.",
    REJECTED: "Event rejected or returned for revision.",
    FUNDING_PENDING: "Funding requested for approved event.",
    FUNDED: "Funds released for event execution.",
    PREPARATION: "Event moved into preparation.",
    READY: "Event marked ready for execution.",
    IN_PROGRESS: "Event execution started.",
    COMPLETED: "Event completed.",
    CANCELLED: "Event cancelled."
  };
  return labels[status];
}

export function getSupportedStatusActions(event: EventWithRelations) {
  if (event.status === EventStatus.COMPLETED || event.status === EventStatus.CANCELLED) return [];
  const actions: EventStatus[] = [];
  if (event.status === EventStatus.DRAFT) actions.push(EventStatus.SUBMITTED);
  if (event.status === EventStatus.SUBMITTED) actions.push(EventStatus.APPROVED, EventStatus.REJECTED);
  if (event.status === EventStatus.APPROVED) actions.push(EventStatus.FUNDING_PENDING, EventStatus.PREPARATION);
  if (event.status === EventStatus.FUNDING_PENDING) actions.push(EventStatus.FUNDED);
  if (event.status === EventStatus.FUNDED) actions.push(EventStatus.PREPARATION);
  if (event.status === EventStatus.PREPARATION) actions.push(EventStatus.READY);
  if (event.status === EventStatus.READY) actions.push(EventStatus.IN_PROGRESS);
  if (event.status === EventStatus.IN_PROGRESS) actions.push(EventStatus.COMPLETED);
  actions.push(EventStatus.CANCELLED);
  return actions;
}

export function isEventAtRisk(event: EventWithRelations) {
  const daysUntil = Math.ceil((event.startDate.getTime() - Date.now()) / 86_400_000);
  return (
    event.status === EventStatus.REJECTED ||
    atRiskStatuses.has(event.status) ||
    event.fundingStatus === FundingStatus.OVER_BUDGET ||
    (daysUntil <= 14 && daysUntil >= 0 && getReadinessScore(event) < 70)
  );
}

function eventInclude() {
  return {
    branch: true,
    ownerStaff: true,
    checklistItems: {
      include: { assignedStaff: true, operationalAction: { include: { assignedStaff: true, branch: true } } },
      orderBy: [{ status: "asc" as const }, { dueDate: "asc" as const }]
    },
    expenses: { orderBy: { createdAt: "asc" as const } },
    activities: { orderBy: { createdAt: "desc" as const } },
    review: true
  };
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function activeWorkload(staffId: string, actions: Array<{ assignedStaffId: string | null; status: OperationalActionStatus; dueDate: Date | null }>) {
  return actions.filter((action) => action.assignedStaffId === staffId && action.status !== OperationalActionStatus.COMPLETED && action.status !== OperationalActionStatus.CANCELLED).length;
}

function overdueWorkload(staffId: string, actions: Array<{ assignedStaffId: string | null; status: OperationalActionStatus; dueDate: Date | null }>) {
  const today = startOfToday();
  return actions.filter((action) => action.assignedStaffId === staffId && action.dueDate && action.dueDate < today && action.status !== OperationalActionStatus.COMPLETED && action.status !== OperationalActionStatus.CANCELLED).length;
}

function roleMatchScore(role: string | null | undefined, preferred: string[]) {
  const normalized = (role ?? "").toLowerCase();
  const matchIndex = preferred.findIndex((item) => normalized.includes(item));
  return matchIndex >= 0 ? 40 - matchIndex * 5 : 0;
}

function pastEventScore(event: EventWithRelations, candidate: EventWithRelations) {
  let score = 0;
  if (event.companyName && candidate.companyName && event.companyName.toLowerCase() === candidate.companyName.toLowerCase()) score += 50;
  if (event.venueName && candidate.venueName && event.venueName.toLowerCase() === candidate.venueName.toLowerCase()) score += 35;
  if (event.eventType === candidate.eventType) score += 25;
  if (event.branchId && event.branchId === candidate.branchId) score += 15;
  if (event.objective && candidate.objective && event.objective.toLowerCase().split(" ").some((word) => word.length > 5 && candidate.objective.toLowerCase().includes(word))) score += 8;
  return score;
}

async function resolveEventNotifications(eventId: string, checklistItemId?: string) {
  const sourceIds = [eventId, checklistItemId].filter(Boolean) as string[];
  if (!sourceIds.length) return 0;
  const result = await prisma.notification.updateMany({
    where: {
      sourceId: { in: sourceIds },
      sourceType: { in: ["EVENT", "EVENT_CHECKLIST_ITEM", "EVENT_EXPENSE"] },
      status: { in: ["UNREAD", "READ", "ACKNOWLEDGED"] }
    },
    data: { status: "RESOLVED", resolvedAt: new Date() }
  });
  return result.count;
}

function item(category: string, title: string, description: string, dueDate: Date) {
  return { category, title, description, dueDate };
}

function clean(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function optional(value: FormDataEntryValue | null) {
  const cleaned = clean(value);
  return cleaned || null;
}

function parseDate(value: FormDataEntryValue | null) {
  const cleaned = clean(value);
  if (!cleaned) return null;
  const date = new Date(cleaned);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseOptionalInt(value: FormDataEntryValue | null) {
  const cleaned = clean(value);
  if (!cleaned) return null;
  const parsed = Number.parseInt(cleaned, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseRequiredInt(value: FormDataEntryValue | null) {
  return parseOptionalInt(value) ?? 0;
}

function parseOptionalDecimal(value: FormDataEntryValue | null) {
  const cleaned = clean(value);
  if (!cleaned) return null;
  const numeric = Number(cleaned);
  return Number.isFinite(numeric) && numeric >= 0 ? new Prisma.Decimal(numeric) : null;
}

function enumOrDefault<T extends Record<string, string>>(value: FormDataEntryValue | null, source: T, fallback: T[keyof T]) {
  const cleaned = clean(value);
  return Object.values(source).includes(cleaned) ? cleaned as T[keyof T] : fallback;
}

function sumMoney<T>(items: T[], selector: (item: T) => Prisma.Decimal | number | null | undefined) {
  return items.reduce((sum, item) => sum + Number(selector(item) ?? 0), 0);
}
