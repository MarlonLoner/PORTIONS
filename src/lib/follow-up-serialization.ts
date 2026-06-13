import type { Prisma } from "@prisma/client";

export type FollowUpCardTask = {
  id: string;
  customerName: string;
  reason: string;
  type: string;
  status: string;
  dueDate: string;
  snoozedUntil: string | null;
  completedAt: string | null;
  outcomeType: string | null;
  outcomeNotes: string | null;
  valueAmount: number;
  suggestedAction: string;
  suggestedMessage: string;
  branchId: string;
  branch: { name: string };
  assignedStaffId: string | null;
  assignedStaff: { name: string } | null;
  activities: Array<{ id: string; activityType: string; description: string; createdAt: string }>;
  patient: {
    name: string;
    phone: string;
    conditionCategory: string;
    packageType: string;
    status: string;
    riskScore: string;
    nextRefillDate: string;
    assignedStaffId: string | null;
    assignedStaff: { name: string } | null;
    refillEvents: Array<{ amount: number }>;
  } | null;
};

type FollowUpTaskForCard = Prisma.FollowUpTaskGetPayload<{
  include: {
    patient: { include: { assignedStaff: true; refillEvents: true } };
    branch: true;
    assignedStaff: true;
    activities: true;
  };
}>;

export function serializeFollowUpTaskForClient(task: FollowUpTaskForCard): FollowUpCardTask {
  return {
    id: task.id,
    customerName: task.customerName,
    reason: task.reason,
    type: task.type,
    status: task.status,
    dueDate: task.dueDate.toISOString(),
    snoozedUntil: task.snoozedUntil?.toISOString() ?? null,
    completedAt: task.completedAt?.toISOString() ?? null,
    outcomeType: task.outcomeType ?? null,
    outcomeNotes: task.outcomeNotes ?? null,
    valueAmount: Number(task.valueAmount ?? 0),
    suggestedAction: task.suggestedAction,
    suggestedMessage: task.suggestedMessage,
    branchId: task.branchId,
    branch: { name: task.branch?.name ?? "Unassigned branch" },
    assignedStaffId: task.assignedStaffId ?? null,
    assignedStaff: task.assignedStaff ? { name: task.assignedStaff.name } : null,
    activities: (task.activities ?? []).map((activity) => ({
      id: activity.id,
      activityType: activity.activityType,
      description: activity.description,
      createdAt: activity.createdAt.toISOString()
    })),
    patient: task.patient
      ? {
          name: task.patient.name,
          phone: task.patient.phone,
          conditionCategory: task.patient.conditionCategory,
          packageType: task.patient.packageType,
          status: task.patient.status,
          riskScore: task.patient.riskScore,
          nextRefillDate: task.patient.nextRefillDate.toISOString(),
          assignedStaffId: task.patient.assignedStaffId ?? null,
          assignedStaff: task.patient.assignedStaff ? { name: task.patient.assignedStaff.name } : null,
          refillEvents: (task.patient.refillEvents ?? []).map((event) => ({ amount: Number(event.amount ?? 0) }))
        }
      : null
  };
}
