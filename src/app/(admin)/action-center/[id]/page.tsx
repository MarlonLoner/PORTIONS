import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, ClipboardCheck, DollarSign, History, ShieldCheck, UsersRound } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { ActionDetailActions } from "@/components/action-detail-actions";
import { getOperationalActionById, getOperationalActionsData } from "@/lib/data";
import { enumLabel, formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import {
  actionPriorityClasses,
  actionStatusClasses,
  getActionSuggestedNextStep,
  getActionUrgency
} from "@/lib/operational-actions";

export const dynamic = "force-dynamic";

export default async function ActionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [action, data] = await Promise.all([
    getOperationalActionById(id),
    getOperationalActionsData()
  ]);
  if (!action) notFound();

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-lg border border-navy-800 bg-navy-950 p-5 text-white shadow-[0_28px_80px_rgba(6,21,38,0.22)] sm:p-6 xl:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.12),transparent_36%),linear-gradient(180deg,rgba(75,158,201,0.18),transparent_58%)]" />
        <div className="relative">
          <Link href="/action-center" className="inline-flex items-center gap-2 text-sm font-semibold text-clinical-100 hover:text-white">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to Action Center
          </Link>
          <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-clinical-100 ring-1 ring-white/15">
                <ClipboardCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Action command profile
              </span>
              <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">{action.title}</h1>
              <p className="mt-4 max-w-4xl text-base leading-7 text-slate-200">{action.description}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge label={enumLabel(action.priority)} className={actionPriorityClasses[action.priority]} />
              <Badge label={enumLabel(action.status)} className={actionStatusClasses[action.status]} />
              <Badge label={getActionUrgency(action)} className="bg-white text-navy-950 ring-white" />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric icon={<UsersRound className="h-5 w-5" />} label="Branch" value={action.branch?.name ?? "Network"} />
        <Metric icon={<ShieldCheck className="h-5 w-5" />} label="Assigned staff" value={action.assignedStaff?.name ?? "Unassigned"} />
        <Metric icon={<CalendarClock className="h-5 w-5" />} label="Due date" value={action.dueDate ? formatDate(action.dueDate) : "No due date"} />
        <Metric icon={<DollarSign className="h-5 w-5" />} label="Value result" value={formatCurrency(action.valueAmount)} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clinical-700">Recommended action</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-navy-950">What should happen next</h2>
          <p className="mt-4 rounded-lg bg-clinical-50 p-4 text-sm font-semibold leading-7 text-clinical-900 ring-1 ring-clinical-100">{getActionSuggestedNextStep(action)}</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Mini label="Category" value={enumLabel(action.category)} />
            <Mini label="Source" value={action.sourceType.replace(/_/g, " ")} />
            <Mini label="Source ID" value={action.sourceId ?? "Not linked"} />
            <Mini label="Created" value={formatDate(action.createdAt)} />
            <Mini label="Completed" value={action.completedAt ? formatDate(action.completedAt) : "Not completed"} />
            <Mini label="Outcome" value={action.outcomeType ? enumLabel(action.outcomeType) : "No outcome recorded"} />
          </div>
          {action.outcomeNotes ? <p className="mt-4 rounded-lg bg-slate-50 p-4 text-sm leading-7 text-slate-700 ring-1 ring-slate-200">{action.outcomeNotes}</p> : null}
        </section>

        <ActionDetailActions
          actionId={action.id}
          status={action.status}
          priority={action.priority}
          dueDate={action.dueDate?.toISOString() ?? null}
          assignedStaffId={action.assignedStaffId}
          staff={data.staff.map((member) => ({ id: member.id, name: member.name }))}
          outcomeType={action.outcomeType}
          outcomeNotes={action.outcomeNotes}
          valueAmount={Number(action.valueAmount)}
        />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
        <div className="flex items-center gap-2 text-clinical-700">
          <History className="h-5 w-5" aria-hidden="true" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em]">Audit trail</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-navy-950">Action Activity History</h2>
          </div>
        </div>
        <div className="mt-5 space-y-3">
          {action.activities.length > 0 ? action.activities.map((activity) => (
            <div key={activity.id} className="rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-navy-950">{activity.activityType.replace(/_/g, " ")}</p>
                <p className="text-xs font-semibold text-slate-500">{formatDateTime(activity.createdAt)}</p>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">{activity.description}</p>
              {activity.actorName ? <p className="mt-2 text-xs font-semibold uppercase tracking-[0.1em] text-clinical-700">{activity.actorName}</p> : null}
            </div>
          )) : <p className="rounded-lg bg-slate-50 p-5 text-sm leading-6 text-slate-600 ring-1 ring-slate-200">No activity has been recorded yet.</p>}
        </div>
      </section>
    </div>
  );
}

function Badge({ label, className }: { label: string; className: string }) {
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ring-1 ${className}`}>{label}</span>;
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
      <div className="text-clinical-700">{icon}</div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-semibold tracking-tight text-navy-950">{value}</p>
    </article>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold leading-5 text-navy-950">{value}</p>
    </div>
  );
}
