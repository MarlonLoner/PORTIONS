import { notFound } from "next/navigation";
import { ArrowLeft, ClipboardCheck } from "lucide-react";
import Link from "next/link";
import { createEventReview, getEventById, getEventAiSummary } from "@/lib/events";
import { formatCurrency } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function EventReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await getEventById(id);
  if (!event) notFound();

  async function reviewAction(formData: FormData) {
    "use server";
    await createEventReview(id, formData);
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-lg border border-navy-800 bg-navy-950 p-5 text-white shadow-[0_28px_80px_rgba(6,21,38,0.22)] sm:p-6 xl:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.13),transparent_36%),linear-gradient(180deg,rgba(16,185,129,0.13),transparent_58%)]" />
        <div className="relative">
          <Link href={`/events/${event.id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-clinical-100 hover:text-white">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to Event Profile
          </Link>
          <span className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-clinical-100 ring-1 ring-white/15">
            <ClipboardCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Post-event intelligence
          </span>
          <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">Event Review</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-200">
            Capture what happened, what worked, what failed, and how the next event should perform better.
          </p>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-5">
          <div className="rounded-lg border border-clinical-100 bg-clinical-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clinical-800">AI review prompt</p>
            <p className="mt-3 text-sm leading-7 text-clinical-950">{getEventAiSummary(event)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Current recorded results</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Mini label="Attendance" value={String(event.actualAttendance ?? event.review?.attendance ?? 0)} />
              <Mini label="Leads" value={String(event.leadsGenerated ?? event.review?.leadsGenerated ?? 0)} />
              <Mini label="Patients" value={String(event.patientsRegistered ?? event.review?.patientsRegistered ?? 0)} />
              <Mini label="Revenue" value={formatCurrency(event.revenueGenerated ?? event.review?.revenueGenerated ?? 0)} />
            </div>
          </div>
        </div>

        <form action={reviewAction} className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Attendance" name="attendance" type="number" min="0" defaultValue={String(event.review?.attendance ?? event.actualAttendance ?? 0)} />
            <Field label="Leads generated" name="leadsGenerated" type="number" min="0" defaultValue={String(event.review?.leadsGenerated ?? event.leadsGenerated ?? 0)} />
            <Field label="Patients registered" name="patientsRegistered" type="number" min="0" defaultValue={String(event.review?.patientsRegistered ?? event.patientsRegistered ?? 0)} />
            <Field label="Revenue generated" name="revenueGenerated" type="number" min="0" step="0.01" defaultValue={String(event.review?.revenueGenerated ?? event.revenueGenerated ?? 0)} />
            <Field label="Actual spend" name="actualSpend" type="number" min="0" step="0.01" defaultValue={String(event.actualSpend ?? 0)} />
            <Field label="Media links" name="mediaLinks" defaultValue={event.review?.mediaLinks ?? ""} />
            <div className="md:col-span-2">
              <Textarea label="What worked" name="whatWorked" defaultValue={event.review?.whatWorked ?? ""} placeholder="Strong turnout, staff flow, screening offer, partner support, product interest." />
            </div>
            <div className="md:col-span-2">
              <Textarea label="What failed" name="whatFailed" defaultValue={event.review?.whatFailed ?? ""} placeholder="Late funding, weak promotion, poor connectivity, missing stock, unclear follow-up owners." />
            </div>
            <div className="md:col-span-2">
              <Textarea label="Lessons learned" name="lessonsLearned" defaultValue={event.review?.lessonsLearned ?? ""} placeholder="What should leadership remember before approving the next event?" />
            </div>
            <div className="md:col-span-2">
              <Textarea label="Next-time recommendations" name="nextTimeRecommendations" defaultValue={event.review?.nextTimeRecommendations ?? ""} placeholder="Specific actions for the next promotion, branch activation, or outreach day." />
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <button className="focus-ring rounded-lg bg-navy-950 px-4 py-2.5 text-sm font-semibold text-white">Save Event Review</button>
            <Link href={`/events/${event.id}`} className="focus-ring rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700">Cancel</Link>
          </div>
        </form>
      </section>
    </div>
  );
}

function Field({ label, name, type = "text", min, step, defaultValue }: { label: string; name: string; type?: string; min?: string; step?: string; defaultValue?: string }) {
  return (
    <label className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
      {label}
      <input name={name} type={type} min={min} step={step} defaultValue={defaultValue} className="focus-ring mt-2 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold normal-case tracking-normal text-navy-950" />
    </label>
  );
}

function Textarea({ label, name, defaultValue, placeholder }: { label: string; name: string; defaultValue?: string; placeholder?: string }) {
  return (
    <label className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
      {label}
      <textarea name={name} rows={4} defaultValue={defaultValue} placeholder={placeholder} className="focus-ring mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold normal-case leading-6 tracking-normal text-navy-950 placeholder:text-slate-400" />
    </label>
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
