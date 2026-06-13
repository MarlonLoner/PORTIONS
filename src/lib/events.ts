import {
  EventChecklistStatus,
  EventExpenseStatus,
  EventPriority,
  EventStatus,
  EventType,
  FundingStatus,
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
    checklistItems: { include: { assignedStaff: true } };
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
  await prisma.eventChecklistItem.update({
    where: { id: itemId },
    data: {
      status,
      completedAt: status === EventChecklistStatus.COMPLETED ? new Date() : null
    }
  });
  await prisma.eventActivity.create({
    data: {
      eventId,
      activityType: "CHECKLIST_UPDATED",
      description: `Checklist item marked ${status.toLowerCase().replace(/_/g, " ")}.`,
      actorName: "PORTIONS"
    }
  });
  revalidatePath(`/events/${eventId}`);
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

export function getReadinessScore(event: EventWithRelations) {
  const checklist = event.checklistItems ?? [];
  const required = checklist.filter((item) => item.status !== EventChecklistStatus.NOT_REQUIRED);
  const completed = required.filter((item) => item.status === EventChecklistStatus.COMPLETED).length;
  const checklistScore = required.length ? (completed / required.length) * 60 : 20;
  const fundingScore = event.fundingStatus === FundingStatus.FUNDED || !event.proposedBudget ? 20 : event.fundingStatus === FundingStatus.PARTIALLY_FUNDED ? 10 : 0;
  const ownershipScore = event.ownerStaffId ? 10 : 0;
  const venueScore = event.venueName || event.location ? 10 : 0;
  return Math.min(100, Math.round(checklistScore + fundingScore + ownershipScore + venueScore));
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
    checklistItems: { include: { assignedStaff: true }, orderBy: [{ status: "asc" as const }, { dueDate: "asc" as const }] },
    expenses: { orderBy: { createdAt: "asc" as const } },
    activities: { orderBy: { createdAt: "desc" as const } },
    review: true
  };
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
