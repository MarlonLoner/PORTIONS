import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  ClipboardList,
  DollarSign,
  MessageSquareWarning,
  Phone,
  Pill,
  ShieldAlert,
  UserRound
} from "lucide-react";
import type { ReactNode } from "react";
import { DataTable } from "@/components/data-table";
import { PatientWhatsAppBox } from "@/components/patient-whatsapp-box";
import { RiskBadge } from "@/components/risk-badge";
import { StatusBadge } from "@/components/status-badge";
import { chronicActionCopy, estimateMonthlyPatientValue, isPatientOverdue } from "@/lib/chronic";
import { daysFromNow, enumLabel, formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { getPatientDetail } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const patient = await getPatientDetail(id);

  if (!patient) {
    notFound();
  }

  const refillDistance = daysFromNow(patient.nextRefillDate);
  const monthlyValue = estimateMonthlyPatientValue(patient);
  const overdue = isPatientOverdue(patient);
  const suggestedAction = chronicActionCopy(patient);
  const whatsappSuggestion = `Hi ${patient.name.split(" ")[0]}, this is PORTIONS ${patient.branch.name}. Your ${patient.conditionCategory.toLowerCase()} refill is ${overdue ? `${Math.abs(refillDistance)} day${Math.abs(refillDistance) === 1 ? "" : "s"} overdue` : refillDistance === 0 ? "due today" : `due on ${formatDate(patient.nextRefillDate)}`}. We can reserve your medicines now and arrange branch collection or delivery. What works best for you today?`;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-lg border border-navy-800 bg-navy-950 p-5 text-white shadow-[0_28px_80px_rgba(6,21,38,0.22)] sm:p-6 xl:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.12),transparent_36%),linear-gradient(180deg,rgba(75,158,201,0.18),transparent_58%)]" />
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-4xl">
            <Link href="/patients" className="focus-ring inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold text-white ring-1 ring-white/15">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to chronic engine
            </Link>
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <StatusBadge status={patient.status} />
              <RiskBadge risk={patient.riskScore} />
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-clinical-100 ring-1 ring-white/15">
                {enumLabel(patient.packageType)}
              </span>
            </div>
            <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">{patient.name}</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-200">
              {patient.conditionCategory} patient at {patient.branch.name}. Keep refill adherence, stock readiness, and follow-up ownership tight.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 xl:w-[520px]">
            <HeroMetric label="Monthly value" value={formatCurrency(monthlyValue)} />
            <HeroMetric label="Next refill" value={refillDistance < 0 ? `${Math.abs(refillDistance)}d overdue` : refillDistance === 0 ? "Today" : `${refillDistance}d`} tone={refillDistance < 0 ? "risk" : "default"} />
            <HeroMetric label="Owner" value={patient.assignedStaff?.name ?? "Unassigned"} />
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.86fr_1.14fr]">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="section-title">Patient command profile</p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-navy-950">Care and Revenue Context</h2>
            </div>
            <UserRound className="h-5 w-5 text-clinical-700" aria-hidden="true" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <ProfileItem icon={<Phone className="h-4 w-4" />} label="Phone" value={patient.phone} />
            <ProfileItem icon={<Pill className="h-4 w-4" />} label="Condition" value={patient.conditionCategory} />
            <ProfileItem icon={<CalendarClock className="h-4 w-4" />} label="Next refill date" value={formatDate(patient.nextRefillDate)} tone={refillDistance < 0 ? "risk" : "default"} />
            <ProfileItem icon={<ClipboardList className="h-4 w-4" />} label="Last contacted" value={patient.lastContactedAt ? formatDate(patient.lastContactedAt) : "Not contacted"} />
            <ProfileItem icon={<ShieldAlert className="h-4 w-4" />} label="Assigned staff" value={patient.assignedStaff?.name ?? "Unassigned"} />
            <ProfileItem icon={<DollarSign className="h-4 w-4" />} label="Monthly estimated value" value={formatCurrency(monthlyValue)} />
          </div>
        </article>

        <article className={overdue || patient.riskScore === "HIGH" ? "rounded-lg border border-rose-200 bg-white p-5 shadow-soft" : "rounded-lg border border-clinical-100 bg-white p-5 shadow-soft"}>
          <div className="flex items-start gap-3">
            <div className={overdue || patient.riskScore === "HIGH" ? "rounded-lg bg-rose-50 p-3 text-rose-700 ring-1 ring-rose-100" : "rounded-lg bg-clinical-50 p-3 text-clinical-700 ring-1 ring-clinical-100"}>
              <MessageSquareWarning className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="section-title">Recommended Action</p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-navy-950">
                {overdue ? "Recover refill today" : patient.riskScore === "HIGH" ? "Protect adherence" : "Prepare refill workflow"}
              </h2>
              <p className="mt-4 rounded-lg bg-slate-50 p-4 text-sm leading-6 text-slate-700">{suggestedAction}</p>
              <div className="mt-5">
                <PatientWhatsAppBox message={whatsappSuggestion} />
              </div>
            </div>
          </div>
        </article>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Panel title="Medication List" eyebrow="Dispensary readiness">
          <DataTable
            rows={patient.medications}
            columns={[
              { header: "Medication", cell: (item) => item.name },
              { header: "Dosage", cell: (item) => item.dosage },
              { header: "Frequency", cell: (item) => item.frequency },
              { header: "Category", cell: (item) => item.category },
              { header: "Notes", cell: (item) => item.notes ?? "None" }
            ]}
          />
        </Panel>
        <Panel title="Refill History" eyebrow="Recurring value trail">
          <DataTable
            rows={patient.refillEvents}
            columns={[
              { header: "Date", cell: (event) => formatDate(event.refillDate) },
              { header: "Status", cell: (event) => event.status },
              { header: "Branch", cell: (event) => event.branch.name },
              { header: "Amount", cell: (event) => formatCurrency(event.amount) },
              { header: "Handled by", cell: (event) => event.handledBy?.name ?? "Unassigned" }
            ]}
          />
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.18fr_0.82fr]">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <div className="mb-5">
            <p className="section-title">Follow-up discipline</p>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-navy-950">Timeline</h2>
              <Link href="/follow-ups" className="focus-ring rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">Open Follow-Up Queue</Link>
            </div>
          </div>
          <div className="space-y-4">
            {patient.followUpTasks.length > 0 ? (
              patient.followUpTasks.map((task) => (
                <div key={task.id} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={task.status} />
                    <span className="text-sm font-semibold text-slate-800">{enumLabel(task.type)}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{task.reason}</p>
                  <p className="mt-1 text-xs text-slate-500">{formatDateTime(task.dueDate)} by {task.assignedStaff?.name ?? "Unassigned"}</p>
                  {task.outcomeType ? <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-100">Latest outcome: {enumLabel(task.outcomeType)}{task.valueAmount ? ` / ${formatCurrency(task.valueAmount)}` : ""}</p> : null}
                  {task.activities[0] ? <p className="mt-2 text-xs leading-5 text-slate-500">Latest activity: {task.activities[0].description}</p> : null}
                  <p className="mt-3 text-sm leading-6 text-clinical-800">{task.suggestedAction}</p>
                </div>
              ))
            ) : (
              <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">No follow-up tasks have been created for this patient yet.</p>
            )}
          </div>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <div className="mb-5">
            <p className="section-title">Internal notes</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-navy-950">Staff Context</h2>
          </div>
          <div className="space-y-3 text-sm leading-6 text-slate-600">
            <Note>Patient prefers WhatsApp updates before calls. Confirm delivery address if refill moves to courier.</Note>
            <Note>Package should be synchronized with family pack reminders where possible.</Note>
            <Note>Review adherence if the next refill is missed or payment is delayed by more than 48 hours.</Note>
          </div>
          <div className="mt-5 rounded-lg bg-clinical-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-clinical-700">Recent order context</p>
            <p className="mt-2 text-sm leading-6 text-clinical-900">
              {patient.orders.length > 0
                ? `${patient.orders.length} recent linked order${patient.orders.length === 1 ? "" : "s"} available for staff review.`
                : "No recent linked orders. Keep refill recovery anchored on the chronic profile."}
            </p>
          </div>
        </article>
      </section>
    </div>
  );
}

function HeroMetric({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "risk" }) {
  return (
    <div className={tone === "risk" ? "rounded-lg border border-rose-300/20 bg-rose-300/10 p-4" : "rounded-lg border border-white/10 bg-white/10 p-4"}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300">{label}</p>
      <p className="mt-2 truncate text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function ProfileItem({ icon, label, value, tone = "default" }: { icon: ReactNode; label: string; value: string; tone?: "default" | "risk" }) {
  return (
    <div className={tone === "risk" ? "rounded-lg border border-rose-100 bg-rose-50 p-3" : "rounded-lg border border-slate-100 bg-slate-50 p-3"}>
      <div className={tone === "risk" ? "mb-2 text-rose-700" : "mb-2 text-clinical-700"}>{icon}</div>
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</p>
      <p className={tone === "risk" ? "mt-1 font-semibold text-rose-700" : "mt-1 font-semibold text-slate-800"}>{value}</p>
    </div>
  );
}

function Panel({ title, eyebrow, children }: { title: string; eyebrow: string; children: ReactNode }) {
  return (
    <section>
      <div className="mb-3">
        <p className="section-title">{eyebrow}</p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-navy-950">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Note({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-slate-100 bg-slate-50 p-3">{children}</p>;
}
