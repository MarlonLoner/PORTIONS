import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { RiskBadge } from "@/components/risk-badge";
import { chronicActionCopy } from "@/lib/chronic";
import { daysFromNow, enumLabel, formatCurrency, formatDate } from "@/lib/format";

export function PatientCard({
  patient
}: {
  patient: {
    id: string;
    name: string;
    phone: string;
    conditionCategory: string;
    packageType: string;
    nextRefillDate: Date;
    status: string;
    riskScore: string;
    branch: { name: string };
    assignedStaff?: { name: string } | null;
    estimatedMonthlyValue?: number;
  };
}) {
  const days = daysFromNow(patient.nextRefillDate);
  const urgent = patient.status === "OVERDUE" || patient.riskScore === "HIGH" || days < 0;

  return (
    <Link
      href={`/patients/${patient.id}`}
      className={urgent ? "block rounded-lg border border-rose-200 bg-white p-4 shadow-soft transition hover:-translate-y-0.5 hover:border-rose-300" : "block rounded-lg border border-slate-200 bg-white p-4 shadow-soft transition hover:-translate-y-0.5 hover:border-clinical-200"}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-navy-950">{patient.name}</p>
          <p className="mt-1 text-sm text-slate-500">{patient.phone}</p>
        </div>
        <StatusBadge status={patient.status} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-slate-500">Branch</p>
          <p className="font-medium text-slate-800">{patient.branch.name}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Package</p>
          <p className="font-medium text-slate-800">{enumLabel(patient.packageType)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Next refill</p>
          <p className={days < 0 ? "font-semibold text-rose-700" : "font-medium text-slate-800"}>{formatDate(patient.nextRefillDate)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Risk</p>
          <RiskBadge risk={patient.riskScore} />
        </div>
      </div>
      <div className="mt-4 rounded-lg bg-slate-50 p-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Monthly value</p>
          <p className="text-sm font-semibold text-navy-950">{formatCurrency(patient.estimatedMonthlyValue ?? 0)}</p>
        </div>
        <p className="mt-2 text-sm leading-5 text-slate-600">{chronicActionCopy(patient)}</p>
        <p className="mt-2 text-xs text-slate-500">Owner: {patient.assignedStaff?.name ?? "Unassigned"}</p>
      </div>
    </Link>
  );
}
