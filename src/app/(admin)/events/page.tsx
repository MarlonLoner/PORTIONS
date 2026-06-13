import { CalendarDays, CheckCircle2, CircleDollarSign, Clock3, Flag, Megaphone, ShieldAlert, WalletCards } from "lucide-react";
import Link from "next/link";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { eventStatuses, eventTypes, fundingStatuses, getEventCommandData, getEventNextAction, getReadinessScore } from "@/lib/events";
import { enumLabel, formatCurrency, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function EventsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const { events, branches, staff, metrics, groups, intelligence } = await getEventCommandData(params);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-lg border border-navy-800 bg-navy-950 p-5 text-white shadow-[0_28px_80px_rgba(6,21,38,0.22)] sm:p-6 xl:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.13),transparent_36%),linear-gradient(180deg,rgba(16,185,129,0.13),transparent_58%)]" />
        <div className="relative grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-clinical-100 ring-1 ring-white/15">
              <Megaphone className="h-3.5 w-3.5" aria-hidden="true" />
              Event Planning & Execution
            </span>
            <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">Event Command Center</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-200">
              Plan, approve, fund, prepare, execute, and review pharmacy events from one command view.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/events/new" className="focus-ring rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-navy-950 transition hover:bg-clinical-50">Create Event</Link>
              <Link href="/events/calendar" className="focus-ring rounded-lg bg-white/10 px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-white/15 transition hover:bg-white/15">Annual Calendar</Link>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <HeroSignal label="Upcoming" value={String(metrics.upcomingEvents)} helper="Approved or funded events ahead" />
            <HeroSignal label="At risk" value={String(metrics.atRiskEvents)} helper="Funding, readiness, or timing risk" tone="risk" />
            <HeroSignal label="Completed this year" value={String(metrics.completedThisYear)} helper="Learning loop captured" />
            <HeroSignal label="Approved budget" value={formatCurrency(metrics.totalApprovedBudget)} helper="Leadership-approved spend" />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Upcoming events" value={String(metrics.upcomingEvents)} helper="Events moving toward execution" icon={<CalendarDays className="h-5 w-5" />} tone="blue" trend="Pipeline" />
        <StatCard title="Awaiting approval" value={String(metrics.awaitingApproval)} helper="Leadership decision required" icon={<Clock3 className="h-5 w-5" />} tone="amber" trend="Decision" />
        <StatCard title="Awaiting funding" value={String(metrics.awaitingFunding)} helper="Budget release blockers" icon={<WalletCards className="h-5 w-5" />} tone="rose" trend="Funding" />
        <StatCard title="At-risk events" value={String(metrics.atRiskEvents)} helper="Needs action before execution" icon={<ShieldAlert className="h-5 w-5" />} tone="rose" trend="Risk" />
        <StatCard title="Events this month" value={String(metrics.eventsThisMonth)} helper="Calendar pressure" icon={<Flag className="h-5 w-5" />} tone="white" trend="Month" />
        <StatCard title="Completed this year" value={String(metrics.completedThisYear)} helper="Event intelligence captured" icon={<CheckCircle2 className="h-5 w-5" />} tone="emerald" trend="Learning" />
        <StatCard title="Total approved budget" value={formatCurrency(metrics.totalApprovedBudget)} helper="Approved event investment" icon={<CircleDollarSign className="h-5 w-5" />} tone="navy" trend="Budget" />
        <StatCard title="Actual event spend" value={formatCurrency(metrics.actualEventSpend)} helper="Recorded event spend" icon={<WalletCards className="h-5 w-5" />} tone="white" trend="Spend" />
      </section>

      <form className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-soft md:grid-cols-3 xl:grid-cols-7">
        <Select name="year" label="Year" value={params.year ?? ""} options={["", "2026", "2027"]} labels={{ "": "All years" }} />
        <Select name="month" label="Month" value={params.month ?? ""} options={["", ...Array.from({ length: 12 }, (_, index) => String(index + 1))]} labels={{ "": "All months" }} />
        <Select name="status" label="Status" value={params.status ?? ""} options={["", ...eventStatuses]} labels={{ "": "All statuses" }} />
        <Select name="type" label="Type" value={params.type ?? ""} options={["", ...eventTypes]} labels={{ "": "All types" }} />
        <Select name="branchId" label="Branch" value={params.branchId ?? ""} options={["", ...branches.map((branch) => branch.id)]} labels={{ "": "All branches", ...Object.fromEntries(branches.map((branch) => [branch.id, branch.name])) }} />
        <Select name="ownerStaffId" label="Owner" value={params.ownerStaffId ?? ""} options={["", ...staff.map((member) => member.id)]} labels={{ "": "All owners", ...Object.fromEntries(staff.map((member) => [member.id, member.name])) }} />
        <Select name="fundingStatus" label="Funding" value={params.fundingStatus ?? ""} options={["", ...fundingStatuses]} labels={{ "": "All funding" }} />
        <div className="md:col-span-3 xl:col-span-7">
          <button className="focus-ring rounded-lg bg-navy-950 px-4 py-2.5 text-sm font-semibold text-white">Apply Filters</button>
        </div>
      </form>

      {events.length === 0 ? (
        <section className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center shadow-soft">
          <h2 className="text-2xl font-semibold tracking-tight text-navy-950">No events match this view</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-600">Create an event plan or loosen filters to review the full annual event calendar.</p>
          <Link href="/events/new" className="focus-ring mt-5 inline-flex rounded-lg bg-navy-950 px-4 py-2.5 text-sm font-semibold text-white">Create Event</Link>
        </section>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-2">
        {groups.map((group) => (
          <div key={group.title} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-navy-950">{group.title}</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">{group.helper}</p>
              </div>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">{group.events.length}</span>
            </div>
            <div className="grid gap-3">
              {group.events.length ? group.events.map((event) => <EventCard key={event.id} event={event} />) : <p className="rounded-lg border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">No events in this lane.</p>}
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clinical-700">Past-event intelligence</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-navy-950">What the calendar is teaching us</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Mini label="Completed" value={String(intelligence.completedCount)} />
            <Mini label="Leads" value={String(intelligence.leadsGenerated)} />
            <Mini label="Patients" value={String(intelligence.patientsRegistered)} />
          </div>
        </div>
        <div className="rounded-lg border border-clinical-100 bg-clinical-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clinical-800">Promotion suggestions</p>
          <div className="mt-4 space-y-3">
            {intelligence.promotionSuggestions.map((suggestion) => <p key={suggestion} className="rounded-lg bg-white p-3 text-sm leading-6 text-slate-700 ring-1 ring-clinical-100">{suggestion}</p>)}
          </div>
        </div>
      </section>
    </div>
  );
}

function EventCard({ event }: { event: Awaited<ReturnType<typeof getEventCommandData>>["events"][number] }) {
  const readiness = getReadinessScore(event);

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/events/${event.id}`} className="text-base font-semibold text-navy-950 hover:text-clinical-800">{event.title}</Link>
          <p className="mt-1 text-xs text-slate-500">{formatDate(event.startDate)} - {enumLabel(event.eventType)}</p>
        </div>
        <StatusBadge status={event.status} />
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Mini label="Company / venue" value={event.companyName ?? event.venueName ?? "Internal pharmacy event"} />
        <Mini label="Branch" value={event.branch?.name ?? "Network-wide"} />
        <Mini label="Owner" value={event.ownerStaff?.name ?? "Unassigned"} />
        <Mini label="Budget" value={formatCurrency(event.approvedBudget ?? event.proposedBudget ?? 0)} />
      </div>
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
          <span>Readiness</span>
          <span>{readiness}%</span>
        </div>
        <div className="mt-2 h-2 rounded-full bg-slate-100">
          <div className={readiness >= 80 ? "h-2 rounded-full bg-emerald-500" : readiness >= 60 ? "h-2 rounded-full bg-amber-500" : "h-2 rounded-full bg-rose-500"} style={{ width: `${readiness}%` }} />
        </div>
      </div>
      <p className="mt-4 rounded-lg bg-clinical-50 p-3 text-sm leading-6 text-clinical-900 ring-1 ring-clinical-100">{getEventNextAction(event)}</p>
    </article>
  );
}

function Select({ name, label, value, options, labels }: { name: string; label: string; value: string; options: string[]; labels?: Record<string, string> }) {
  return (
    <label className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
      {label}
      <select name={name} defaultValue={value} className="focus-ring mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold normal-case tracking-normal text-navy-950">
        {options.map((option) => <option key={option} value={option}>{labels?.[option] ?? enumLabel(option)}</option>)}
      </select>
    </label>
  );
}

function HeroSignal({ label, value, helper, tone = "default" }: { label: string; value: string; helper: string; tone?: "default" | "risk" }) {
  return (
    <div className={tone === "risk" ? "rounded-lg border border-rose-300/20 bg-rose-300/10 p-4" : "rounded-lg border border-white/10 bg-white/10 p-4"}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-white">{value}</p>
      <p className="mt-1 text-sm text-slate-300">{helper}</p>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-navy-950">{value}</p>
    </div>
  );
}
