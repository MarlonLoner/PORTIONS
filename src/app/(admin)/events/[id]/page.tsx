import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, CheckCircle2, ClipboardCheck, History, Megaphone, WalletCards } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import {
  createEventExpense,
  getEventAiSummary,
  getEventById,
  getEventNextAction,
  getReadinessScore,
  getStatusActionLabel,
  getSupportedStatusActions,
  updateChecklistItem,
  updateEventStatus
} from "@/lib/events";
import { EventChecklistStatus, EventStatus } from "@prisma/client";
import { enumLabel, formatCurrency, formatDate, formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await getEventById(id);
  if (!event) notFound();

  const readiness = getReadinessScore(event);
  const statusActions = getSupportedStatusActions(event);

  async function statusAction(formData: FormData) {
    "use server";
    const nextStatus = String(formData.get("status")) as EventStatus;
    const note = typeof formData.get("note") === "string" ? String(formData.get("note")) : undefined;
    await updateEventStatus(id, nextStatus, note);
  }

  async function checklistAction(formData: FormData) {
    "use server";
    const itemId = String(formData.get("itemId"));
    const status = String(formData.get("status")) as EventChecklistStatus;
    await updateChecklistItem(itemId, id, status);
  }

  async function expenseAction(formData: FormData) {
    "use server";
    await createEventExpense(id, formData);
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-lg border border-navy-800 bg-navy-950 p-5 text-white shadow-[0_28px_80px_rgba(6,21,38,0.22)] sm:p-6 xl:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.13),transparent_36%),linear-gradient(180deg,rgba(16,185,129,0.13),transparent_58%)]" />
        <div className="relative">
          <Link href="/events" className="inline-flex items-center gap-2 text-sm font-semibold text-clinical-100 hover:text-white">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to Event Command
          </Link>
          <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-clinical-100 ring-1 ring-white/15">
                <Megaphone className="h-3.5 w-3.5" aria-hidden="true" />
                Event command profile
              </span>
              <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">{event.title}</h1>
              <p className="mt-4 max-w-4xl text-base leading-7 text-slate-200">{event.objective}</p>
            </div>
            <StatusBadge status={event.status} />
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_0.8fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <div className="flex items-center gap-2 text-clinical-700">
            <CalendarClock className="h-5 w-5" aria-hidden="true" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em]">Execution summary</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-navy-950">Plan, budget, owner, readiness</h2>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <Mini label="Date" value={`${formatDate(event.startDate)} - ${formatDate(event.endDate)}`} />
            <Mini label="Type" value={enumLabel(event.eventType)} />
            <Mini label="Priority" value={enumLabel(event.priority)} />
            <Mini label="Company / venue" value={event.companyName ?? event.venueName ?? "Internal pharmacy event"} />
            <Mini label="Branch" value={event.branch?.name ?? "Network-wide"} />
            <Mini label="Owner" value={event.ownerStaff?.name ?? "Unassigned"} />
            <Mini label="Expected attendance" value={event.expectedAttendance ? String(event.expectedAttendance) : "Not set"} />
            <Mini label="Funding" value={enumLabel(event.fundingStatus)} />
            <Mini label="Budget" value={formatCurrency(event.approvedBudget ?? event.proposedBudget ?? 0)} />
          </div>
          <div className="mt-5 rounded-lg bg-clinical-50 p-4 ring-1 ring-clinical-100">
            <div className="flex items-center justify-between text-sm font-semibold text-clinical-900">
              <span>Readiness score</span>
              <span>{readiness}%</span>
            </div>
            <div className="mt-3 h-2.5 rounded-full bg-white">
              <div className={readiness >= 80 ? "h-2.5 rounded-full bg-emerald-500" : readiness >= 60 ? "h-2.5 rounded-full bg-amber-500" : "h-2.5 rounded-full bg-rose-500"} style={{ width: `${readiness}%` }} />
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-lg border border-clinical-100 bg-clinical-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clinical-800">AI event coach</p>
            <p className="mt-3 text-sm leading-7 text-clinical-950">{getEventAiSummary(event)}</p>
            <p className="mt-4 rounded-lg bg-white p-3 text-sm font-semibold leading-6 text-navy-950 ring-1 ring-clinical-100">{getEventNextAction(event)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Command actions</p>
            <div className="mt-4 grid gap-2">
              {statusActions.map((status) => (
                <form key={status} action={statusAction}>
                  <input type="hidden" name="status" value={status} />
                  <button className="focus-ring w-full rounded-lg bg-navy-950 px-3 py-2.5 text-left text-sm font-semibold text-white transition hover:bg-navy-800">{getStatusActionLabel(status)}</button>
                </form>
              ))}
              <Link href={`/events/${event.id}/review`} className="focus-ring rounded-lg bg-slate-100 px-3 py-2.5 text-sm font-semibold text-slate-700">Open event review</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <div className="flex items-center gap-2 text-clinical-700">
            <ClipboardCheck className="h-5 w-5" aria-hidden="true" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em]">Preparation checklist</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-navy-950">Materials, staff, compliance, promotion</h2>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {event.checklistItems.length ? event.checklistItems.map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-clinical-700">{item.category}</p>
                    <h3 className="mt-1 text-sm font-semibold text-navy-950">{item.title}</h3>
                    {item.description ? <p className="mt-1 text-sm leading-6 text-slate-600">{item.description}</p> : null}
                    <p className="mt-2 text-xs text-slate-500">Due: {item.dueDate ? formatDate(item.dueDate) : "No date"} / Owner: {item.assignedStaff?.name ?? "Unassigned"}</p>
                  </div>
                  <StatusBadge status={item.status} />
                </div>
                <form action={checklistAction} className="mt-3 flex flex-wrap gap-2">
                  <input type="hidden" name="itemId" value={item.id} />
                  <select name="status" defaultValue={item.status} className="focus-ring h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-navy-950">
                    {Object.values(EventChecklistStatus).map((status) => <option key={status} value={status}>{enumLabel(status)}</option>)}
                  </select>
                  <button className="focus-ring rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">Update</button>
                </form>
              </div>
            )) : <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">No checklist items are configured yet.</p>}
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
            <div className="flex items-center gap-2 text-clinical-700">
              <WalletCards className="h-5 w-5" aria-hidden="true" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em]">Budget and funding</p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight text-navy-950">Spend coordination</h2>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Mini label="Proposed" value={formatCurrency(event.proposedBudget ?? 0)} />
              <Mini label="Approved" value={formatCurrency(event.approvedBudget ?? 0)} />
              <Mini label="Funds released" value={formatCurrency(event.fundsReleased ?? 0)} />
              <Mini label="Actual spend" value={formatCurrency(event.actualSpend ?? 0)} />
            </div>
            <div className="mt-5 space-y-3">
              {event.expenses.length ? event.expenses.map((expense) => (
                <div key={expense.id} className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-navy-950">{expense.description}</p>
                    <p className="text-sm font-semibold text-slate-700">{formatCurrency(expense.amount)}</p>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{expense.category} / {enumLabel(expense.status)}</p>
                </div>
              )) : <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">No expense lines have been recorded yet.</p>}
            </div>
            <form action={expenseAction} className="mt-5 rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Add planned expense</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <input name="category" placeholder="Category" className="focus-ring h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-navy-950" />
                <input name="amount" type="number" min="0" step="0.01" placeholder="Amount" className="focus-ring h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-navy-950" />
                <input name="description" placeholder="Description" className="focus-ring h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-navy-950 sm:col-span-2" />
                <input name="supplier" placeholder="Supplier (optional)" className="focus-ring h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-navy-950 sm:col-span-2" />
              </div>
              <button className="focus-ring mt-3 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">Add Expense</button>
            </form>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
            <div className="flex items-center gap-2 text-clinical-700">
              <History className="h-5 w-5" aria-hidden="true" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em]">Activity timeline</p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight text-navy-950">Event audit trail</h2>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {event.activities.length ? event.activities.map((activity) => (
                <div key={activity.id} className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-navy-950">{activity.activityType.replace(/_/g, " ")}</p>
                    <p className="text-xs font-semibold text-slate-500">{formatDateTime(activity.createdAt)}</p>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{activity.description}</p>
                </div>
              )) : <p className="rounded-lg bg-slate-50 p-5 text-sm leading-6 text-slate-600 ring-1 ring-slate-200">No event activity has been recorded yet.</p>}
            </div>
          </div>
        </div>
      </section>
    </div>
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
