import { PackageType, PatientStatus, RiskScore } from "@prisma/client";

const packageFallbackValue: Record<PackageType, number> = {
  STANDARD: 38,
  PREMIUM: 68,
  FAMILY_PACK: 92,
  CORPORATE: 118,
  CHRONIC_PLUS: 78
};

export function estimateMonthlyPatientValue(patient: {
  packageType: PackageType | string;
  refillEvents?: Array<{ amount: number | string | { toString(): string } }>;
}) {
  const refillEvents = patient.refillEvents ?? [];

  if (refillEvents.length > 0) {
    const total = refillEvents.reduce((sum, event) => sum + Number(event.amount), 0);
    return Math.round(total / refillEvents.length);
  }

  return packageFallbackValue[patient.packageType as PackageType] ?? 45;
}

export function isPatientOverdue(patient: {
  status: PatientStatus | string;
  nextRefillDate: Date;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const refill = new Date(patient.nextRefillDate);
  refill.setHours(0, 0, 0, 0);

  return patient.status === PatientStatus.OVERDUE || refill < today;
}

export function isPatientDueToday(patient: { nextRefillDate: Date }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return patient.nextRefillDate >= today && patient.nextRefillDate < tomorrow;
}

export function isHighRisk(patient: { riskScore: RiskScore | string }) {
  return patient.riskScore === RiskScore.HIGH;
}

export function chronicActionCopy(patient: {
  name: string;
  conditionCategory: string;
  status: PatientStatus | string;
  riskScore: RiskScore | string;
  nextRefillDate: Date;
}) {
  const firstName = patient.name.split(" ")[0];
  const daysOverdue = Math.max(0, Math.floor((Date.now() - patient.nextRefillDate.getTime()) / 86_400_000));

  if (isPatientOverdue(patient)) {
    return `This patient is ${daysOverdue || 1} days overdue on a ${patient.conditionCategory.toLowerCase()} refill. Contact today and offer delivery or branch collection before marking as lost.`;
  }

  if (isHighRisk(patient)) {
    return `${firstName} is high risk. Confirm adherence, reserve stock, and ask whether delivery would prevent a missed refill.`;
  }

  return `Confirm ${firstName}'s refill preference and prepare the chronic pack before the next scheduled cycle.`;
}
