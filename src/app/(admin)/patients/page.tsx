import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  Crown,
  DollarSign,
  Filter,
  ShieldAlert,
  UsersRound
} from "lucide-react";
import type { ReactNode } from "react";
import { DataTable } from "@/components/data-table";
import { PatientCard } from "@/components/patient-card";
import { RiskBadge } from "@/components/risk-badge";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { chronicActionCopy, estimateMonthlyPatientValue, isHighRisk, isPatientDueToday, isPatientOverdue } from "@/lib/chronic";
import { daysFromNow, enumLabel, formatCurrency, formatDate } from "@/lib/format";
import { getPatientList, packageTypeOptions, patientStatusOptions, riskScoreOptions } from "@/lib/data";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function param(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PatientsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const filters = {
    status: param(params.status),
    branchId: param(params.branchId),
    packageType: param(params.packageType),
    riskScore: param(params.riskScore)
  };
  const { patients, allPatients, branches } = await getPatientList(filters);
  const enrichedPatients = patients.map((patient) => ({
    ...patient,
    estimatedMonthlyValue: estimateMonthlyPatientValue(patient)
  }));
  const enrichedAllPatients = allPatients.map((patient) => ({
    ...patient,
    estimatedMonthlyValue: estimateMonthlyPatientValue(patient)
  }));

  const activePatients = enrichedAllPatients.filter((patient) => patient.status !== "LOST").length;
  const dueToday = enrichedAllPatients.filter(isPatientDueToday);
  const overduePatients = enrichedAllPatients.filter(isPatientOverdue);
  const highRiskPatients = enrichedAllPatients.filter(isHighRisk);
  const vipPatients = enrichedAllPatients.filter((patient) => patient.status === "VIP");
  const monthlyValue = enrichedAllPatients.reduce((sum, patient) => sum + patient.estimatedMonthlyValue, 0);
  const revenueAtRisk = enrichedAllPatients
    .filter((patient) => isPatientOverdue(patient) || isHighRisk(patient) || patient.status === "LOST")
    .sort((a, b) => b.estimatedMonthlyValue - a.estimatedMonthlyValue)
    .slice(0, 6);
  const refillOpportunities = enrichedAllPatients
    .filter((patient) => {
      const days = daysFromNow(patient.nextRefillDate);
      return patient.status !== "LOST" && days >= 0 && days <= 3;
    })
    .sort((a, b) => a.nextRefillDate.getTime() - b.nextRefillDate.getTime())
    .slice(0, 6);
  const riskValue = revenueAtRisk.reduce((sum, patient) => sum + patient.estimatedMonthlyValue, 0);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-lg border border-navy-800 bg-navy-950 p-5 text-white shadow-[0_28px_80px_rgba(6,21,38,0.22)] sm:p-6 xl:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.12),transparent_36%),linear-gradient(180deg,rgba(75,158,201,0.18),transparent_58%)]" />
        <div className="relative grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-clinical-100 ring-1 ring-white/15">
              <UsersRound className="h-3.5 w-3.5" aria-hidden="true" />
              Recurring Revenue Control
            </span>
            <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Chronic Revenue Engine
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-200">
              Track recurring patients, refill risk, package value, and follow-up discipline across every branch.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/action-center" className="focus-ring inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-navy-950 transition hover:bg-clinical-50">
                Create Chronic Patient Action
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <HeroSignal label="Revenue at risk" value={formatCurrency(riskValue)} helper={`${revenueAtRisk.length} patients need action`} tone="risk" />
            <HeroSignal label="Today's opportunity" value={formatCurrency(dueToday.reduce((sum, patient) => sum + patient.estimatedMonthlyValue, 0))} helper={`${dueToday.length} refills due today`} tone="success" />
            <HeroSignal label="High-value focus" value={`${vipPatients.length} VIP`} helper="Protect premium chronic relationships" />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <StatCard title="Active chronic patients" value={String(activePatients)} helper="All non-lost chronic profiles" icon={<UsersRound className="h-5 w-5" />} tone="navy" trend="Base" />
        <StatCard title="Due today" value={String(dueToday.length)} helper="Refills ready for capture" icon={<CalendarClock className="h-5 w-5" />} tone="blue" trend="Today" />
        <StatCard title="Overdue refills" value={String(overduePatients.length)} helper="Revenue and adherence risk" icon={<AlertTriangle className="h-5 w-5" />} tone="rose" trend="Risk" />
        <StatCard title="High-risk patients" value={String(highRiskPatients.length)} helper="Prioritize outreach first" icon={<ShieldAlert className="h-5 w-5" />} tone="amber" trend="Clinical" />
        <StatCard title="VIP packages" value={String(vipPatients.length)} helper="Premium retention accounts" icon={<Crown className="h-5 w-5" />} tone="emerald" trend="Value" />
        <StatCard title="Monthly chronic value" value={formatCurrency(monthlyValue)} helper="Estimated from refill history" icon={<DollarSign className="h-5 w-5" />} tone="white" trend="MRR" />
      </section>

      <form className="rounded-lg border border-slate-200 bg-white p-4 shadow-soft" action="/patients">
        <div className="mb-4 flex items-center gap-2">
          <Filter className="h-4 w-4 text-clinical-700" aria-hidden="true" />
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Retention Filters</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-5">
          <FilterSelect name="status" label="Status" value={filters.status} options={patientStatusOptions.map((value) => ({ value, label: enumLabel(value) }))} />
          <FilterSelect name="branchId" label="Branch" value={filters.branchId} options={branches.map((branch) => ({ value: branch.id, label: branch.name }))} />
          <FilterSelect name="packageType" label="Package" value={filters.packageType} options={packageTypeOptions.map((value) => ({ value, label: enumLabel(value) }))} />
          <FilterSelect name="riskScore" label="Risk" value={filters.riskScore} options={riskScoreOptions.map((value) => ({ value, label: enumLabel(value) }))} />
          <div className="flex items-end gap-2">
            <button type="submit" className="focus-ring h-10 flex-1 rounded-lg bg-navy-950 px-4 text-sm font-semibold text-white">Apply</button>
            <Link href="/patients" className="focus-ring inline-flex h-10 items-center rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700">Reset</Link>
          </div>
        </div>
      </form>

      <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <RevenueSection
          title="Revenue at Risk"
          eyebrow="Overdue, lost, or high-risk"
          empty="No chronic revenue is currently flagged as at risk."
        >
          {revenueAtRisk.map((patient) => (
            <RiskRow key={patient.id} patient={patient} />
          ))}
        </RevenueSection>

        <RevenueSection
          title="Today's Refill Opportunities"
          eyebrow="Due now or within 3 days"
          empty="No refill opportunities are due in the next 3 days."
        >
          {refillOpportunities.map((patient) => (
            <OpportunityRow key={patient.id} patient={patient} />
          ))}
        </RevenueSection>
      </section>

      <div className="grid gap-4 md:hidden">
        {enrichedPatients.map((patient) => (
          <PatientCard key={patient.id} patient={patient} />
        ))}
        {enrichedPatients.length === 0 ? <p className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-soft">No patients match these filters.</p> : null}
      </div>

      <section className="hidden md:block">
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <p className="section-title">Patient book</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-navy-950">Chronic Retention Register</h2>
          </div>
          <p className="text-sm text-slate-500">{enrichedPatients.length} patients shown</p>
        </div>
        <DataTable
          rows={enrichedPatients}
          emptyMessage="No chronic patients match these filters."
          columns={[
            {
              header: "Patient",
              cell: (patient) => (
                <Link href={`/patients/${patient.id}`} className="font-semibold text-navy-950 hover:text-clinical-700">
                  {patient.name}
                  <span className="block text-xs font-normal text-slate-500">{patient.phone}</span>
                </Link>
              )
            },
            { header: "Branch", cell: (patient) => patient.branch.name },
            { header: "Condition", cell: (patient) => patient.conditionCategory },
            { header: "Package", cell: (patient) => enumLabel(patient.packageType) },
            { header: "Next refill", cell: (patient) => <RefillDate patient={patient} /> },
            { header: "Value", cell: (patient) => formatCurrency(patient.estimatedMonthlyValue) },
            { header: "Status", cell: (patient) => <StatusBadge status={patient.status} /> },
            { header: "Risk", cell: (patient) => <RiskBadge risk={patient.riskScore} /> },
            { header: "Owner", cell: (patient) => patient.assignedStaff?.name ?? "Unassigned" },
            {
              header: "Action prompt",
              className: "min-w-[280px] px-4 py-4 text-slate-700",
              cell: (patient) => <span className="text-sm leading-6">{chronicActionCopy(patient)}</span>
            }
          ]}
        />
      </section>
    </div>
  );
}

function FilterSelect({
  name,
  label,
  value,
  options
}: {
  name: string;
  label: string;
  value?: string;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</span>
      <select name={name} defaultValue={value ?? ""} className="focus-ring mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700">
        <option value="">All</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function HeroSignal({
  label,
  value,
  helper,
  tone = "default"
}: {
  label: string;
  value: string;
  helper: string;
  tone?: "default" | "risk" | "success";
}) {
  const toneClass =
    tone === "risk"
      ? "border-rose-300/20 bg-rose-300/10"
      : tone === "success"
        ? "border-emerald-300/20 bg-emerald-300/10"
        : "border-white/10 bg-white/10";

  return (
    <div className={`rounded-lg border p-4 ${toneClass}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-white">{value}</p>
      <p className="mt-1 text-sm text-slate-300">{helper}</p>
    </div>
  );
}

function RevenueSection({
  title,
  eyebrow,
  empty,
  children
}: {
  title: string;
  eyebrow: string;
  empty: string;
  children: ReactNode;
}) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
      <div className="mb-5">
        <p className="section-title">{eyebrow}</p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-navy-950">{title}</h2>
      </div>
      <div className="space-y-3">
        {hasChildren ? children : <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">{empty}</p>}
      </div>
    </section>
  );
}

function RiskRow({
  patient
}: {
  patient: {
    id: string;
    name: string;
    phone: string;
    branch: { name: string };
    conditionCategory: string;
    status: string;
    riskScore: string;
    nextRefillDate: Date;
    estimatedMonthlyValue: number;
  };
}) {
  return (
    <Link href={`/patients/${patient.id}`} className="flex items-start justify-between gap-4 rounded-lg border border-rose-100 bg-rose-50/70 p-4 transition hover:border-rose-200">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-navy-950">{patient.name}</p>
          <StatusBadge status={patient.status} />
          <RiskBadge risk={patient.riskScore} />
        </div>
        <p className="mt-2 text-sm text-slate-600">{patient.conditionCategory} - {patient.branch.name}</p>
        <p className="mt-2 text-sm leading-5 text-rose-800">{chronicActionCopy(patient)}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-semibold text-rose-700">{formatCurrency(patient.estimatedMonthlyValue)}</p>
        <p className="mt-1 text-xs text-slate-500">monthly</p>
      </div>
    </Link>
  );
}

function OpportunityRow({
  patient
}: {
  patient: {
    id: string;
    name: string;
    branch: { name: string };
    conditionCategory: string;
    status: string;
    riskScore: string;
    nextRefillDate: Date;
    estimatedMonthlyValue: number;
  };
}) {
  const days = daysFromNow(patient.nextRefillDate);

  return (
    <Link href={`/patients/${patient.id}`} className="flex items-start justify-between gap-4 rounded-lg border border-clinical-100 bg-clinical-50/70 p-4 transition hover:border-clinical-200">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-navy-950">{patient.name}</p>
          <StatusBadge status={patient.status} />
        </div>
        <p className="mt-2 text-sm text-slate-600">{patient.conditionCategory} - {patient.branch.name}</p>
        <p className="mt-2 text-sm font-medium text-clinical-800">
          {days === 0 ? "Refill due today. Confirm and prepare pack now." : `Refill due in ${days} days. Send reminder and reserve stock.`}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-semibold text-navy-950">{formatCurrency(patient.estimatedMonthlyValue)}</p>
        <p className="mt-1 text-xs text-slate-500">{formatDate(patient.nextRefillDate)}</p>
      </div>
    </Link>
  );
}

function RefillDate({
  patient
}: {
  patient: {
    nextRefillDate: Date;
    status: string;
  };
}) {
  const days = daysFromNow(patient.nextRefillDate);
  const text = days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? "Due today" : `${days}d`;

  return (
    <div>
      <p className={days < 0 ? "font-semibold text-rose-700" : days === 0 ? "font-semibold text-clinical-800" : "font-medium text-slate-800"}>
        {formatDate(patient.nextRefillDate)}
      </p>
      <p className="text-xs text-slate-500">{text}</p>
    </div>
  );
}
