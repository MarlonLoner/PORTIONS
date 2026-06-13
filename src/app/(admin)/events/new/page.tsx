import { ArrowLeft, CalendarPlus } from "lucide-react";
import Link from "next/link";
import { eventPriorities, eventTypes, createEventFromForm, getEventCommandData, getEventFormOptions } from "@/lib/events";
import { enumLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function NewEventPage() {
  const [{ branches, staff }, eventData] = await Promise.all([getEventFormOptions(), getEventCommandData()]);
  const completedEvents = eventData.allEvents.filter((event) => event.status === "COMPLETED").slice(0, 5);

  async function createAction(formData: FormData) {
    "use server";
    await createEventFromForm(formData);
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
          <span className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-clinical-100 ring-1 ring-white/15">
            <CalendarPlus className="h-3.5 w-3.5" aria-hidden="true" />
            New event plan
          </span>
          <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">Create Event</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-200">
            Capture the event objective, budget case, owner, venue, branch scope, and expected outcome before leadership approval.
          </p>
        </div>
      </section>

      <form action={createAction} className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="Event title" name="title" required placeholder="Avondale Hypertension Screening Day" />
          <Select label="Event type" name="eventType" options={eventTypes} />
          <Field label="Company" name="companyName" placeholder="Optional partner or employer" />
          <Field label="Venue" name="venueName" placeholder="Branch, conference venue, workplace, school" />
          <Field label="Location" name="location" placeholder="Physical location or area" />
          <Select label="Branch" name="branchId" options={branches.map((branch) => branch.id)} labels={Object.fromEntries(branches.map((branch) => [branch.id, branch.name]))} empty="Network-wide" />
          <Select label="Owner" name="ownerStaffId" options={staff.map((member) => member.id)} labels={Object.fromEntries(staff.map((member) => [member.id, `${member.name}${member.branch ? ` - ${member.branch.name}` : ""}`]))} empty="Assign later" />
          <Select label="Priority" name="priority" options={eventPriorities} />
          <Field label="Start date" name="startDate" type="datetime-local" required />
          <Field label="End date" name="endDate" type="datetime-local" required />
          <Field label="Expected attendance" name="expectedAttendance" type="number" min="0" placeholder="120" />
          <Field label="Proposed budget" name="proposedBudget" type="number" min="0" step="0.01" placeholder="750" />
          <div className="lg:col-span-2">
            <Textarea label="Objective" name="objective" required placeholder="Increase chronic screening, register high-risk patients, and capture follow-up leads." />
          </div>
          <div className="lg:col-span-2">
            <Textarea label="Expected outcome" name="expectedOutcome" placeholder="New chronic package leads, improved branch visibility, supplier activation, or patient retention lift." />
          </div>
          <div className="lg:col-span-2">
            <Textarea label="Description" name="description" placeholder="Commercial and operational context for leadership review." />
          </div>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button className="focus-ring rounded-lg bg-navy-950 px-4 py-2.5 text-sm font-semibold text-white">Create Draft Event</button>
          <Link href="/events" className="focus-ring rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700">Cancel</Link>
        </div>
      </form>

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-lg border border-clinical-100 bg-clinical-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clinical-800">Planning intelligence</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-navy-950">Start with what previous events taught the team</h2>
          <p className="mt-3 text-sm leading-7 text-clinical-950">
            Enter company, venue, event type, and branch details first. PORTIONS will compare the saved event against prior activations, promotion blockers, spend, attendance, leads, and patient registration outcomes.
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Recent event lessons</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {completedEvents.length ? completedEvents.map((event) => (
              <div key={event.id} className="rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
                <p className="font-semibold text-navy-950">{event.title}</p>
                <p className="mt-1 text-xs text-slate-500">{event.branch?.name ?? "Network"} / {event.eventType.replace(/_/g, " ")}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{event.review?.nextTimeRecommendations ?? "Capture a review next time to improve event recommendations."}</p>
              </div>
            )) : <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">No past event reviews yet. The first completed review will become the benchmark for future event planning.</p>}
          </div>
        </div>
      </section>
    </div>
  );
}

function Field({ label, name, type = "text", required = false, placeholder, min, step }: { label: string; name: string; type?: string; required?: boolean; placeholder?: string; min?: string; step?: string }) {
  return (
    <label className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
      {label}
      <input name={name} type={type} required={required} placeholder={placeholder} min={min} step={step} className="focus-ring mt-2 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold normal-case tracking-normal text-navy-950 placeholder:text-slate-400" />
    </label>
  );
}

function Select({ label, name, options, labels = {}, empty }: { label: string; name: string; options: string[]; labels?: Record<string, string>; empty?: string }) {
  return (
    <label className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
      {label}
      <select name={name} className="focus-ring mt-2 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold normal-case tracking-normal text-navy-950">
        {empty ? <option value="">{empty}</option> : null}
        {options.map((option) => <option key={option} value={option}>{labels[option] ?? enumLabel(option)}</option>)}
      </select>
    </label>
  );
}

function Textarea({ label, name, required = false, placeholder }: { label: string; name: string; required?: boolean; placeholder?: string }) {
  return (
    <label className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
      {label}
      <textarea name={name} required={required} rows={4} placeholder={placeholder} className="focus-ring mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold normal-case leading-6 tracking-normal text-navy-950 placeholder:text-slate-400" />
    </label>
  );
}
