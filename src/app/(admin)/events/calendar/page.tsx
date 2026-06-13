import { CalendarRange, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { getCalendarMonths, getEventCommandData, getEventReadinessSummary, getReadinessScore } from "@/lib/events";
import { enumLabel, formatCurrency, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function EventCalendarPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const year = Number(params.year) || new Date().getFullYear();
  const view = params.view === "quarter" || params.view === "year" ? params.view : "month";
  const quarter = Math.min(4, Math.max(1, Number(params.quarter) || Math.floor(new Date().getMonth() / 3) + 1));
  const { allEvents } = await getEventCommandData({ year: String(year) });
  const months = getCalendarMonths(year, allEvents);
  const visibleMonths = view === "year" ? months : view === "quarter" ? months.slice((quarter - 1) * 3, quarter * 3) : [months[new Date().getMonth()] ?? months[0]];

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-lg border border-navy-800 bg-navy-950 p-5 text-white shadow-[0_28px_80px_rgba(6,21,38,0.22)] sm:p-6 xl:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.13),transparent_36%),linear-gradient(180deg,rgba(75,158,201,0.16),transparent_58%)]" />
        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-clinical-100 ring-1 ring-white/15">
              <CalendarRange className="h-3.5 w-3.5" aria-hidden="true" />
              Annual planning calendar
            </span>
            <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">Event Calendar</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-200">See branch activations, outreach days, supplier events, conferences, and preparation risk across the year.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/events/calendar?year=${year - 1}&view=${view}&quarter=${quarter}`} className="focus-ring inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold text-white ring-1 ring-white/15"><ChevronLeft className="h-4 w-4" />{year - 1}</Link>
            <Link href={`/events/calendar?year=${year + 1}&view=${view}&quarter=${quarter}`} className="focus-ring inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold text-white ring-1 ring-white/15">{year + 1}<ChevronRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-soft">
        <div className="flex flex-wrap gap-2">
          <Link href={`/events/calendar?year=${year}&view=month`} className={tabClass(view === "month")}>Month</Link>
          <Link href={`/events/calendar?year=${year}&view=quarter&quarter=${quarter}`} className={tabClass(view === "quarter")}>Quarter</Link>
          <Link href={`/events/calendar?year=${year}&view=year`} className={tabClass(view === "year")}>Year</Link>
        </div>
        {view === "quarter" ? (
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4].map((item) => <Link key={item} href={`/events/calendar?year=${year}&view=quarter&quarter=${item}`} className={tabClass(quarter === item)}>Q{item}</Link>)}
          </div>
        ) : null}
      </div>

      <section className={view === "year" ? "grid gap-4 lg:grid-cols-2 xl:grid-cols-3" : "grid gap-4 xl:grid-cols-3"}>
        {visibleMonths.map((month) => (
          <div key={month.month} className="rounded-lg border border-slate-200 bg-white p-4 shadow-soft">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clinical-700">{year}</p>
                <h2 className="mt-1 text-xl font-semibold text-navy-950">{month.label}</h2>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{month.events.length} events</span>
            </div>
            <div className="mt-4 space-y-3">
              {month.events.length ? month.events.map((event) => (
                <Link key={event.id} href={`/events/${event.id}`} className="block rounded-lg border border-slate-200 bg-slate-50 p-3 transition hover:border-clinical-200 hover:bg-clinical-50">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-navy-950">{event.title}</p>
                      <p className="mt-1 text-xs text-slate-500">{formatDate(event.startDate)} - {enumLabel(event.eventType)}</p>
                    </div>
                    <StatusBadge status={event.status} />
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <Mini label="Branch" value={event.branch?.name ?? "Network"} />
                    <Mini label="Owner" value={event.ownerStaff?.name ?? "Unassigned"} />
                    <Mini label="Budget" value={formatCurrency(event.approvedBudget ?? event.proposedBudget ?? 0)} />
                    <Mini label="Funding" value={enumLabel(event.fundingStatus)} />
                    <Mini label="Risk" value={getEventReadinessSummary(event).riskLevel} />
                    <Mini label="Checklist" value={`${getEventReadinessSummary(event).checklist.percentage}%`} />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs font-semibold text-slate-500">
                    <span>Readiness</span>
                    <span>{getReadinessScore(event)}%</span>
                  </div>
                </Link>
              )) : <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">No events planned for this month.</p>}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

function tabClass(active: boolean) {
  return active ? "focus-ring rounded-lg bg-navy-950 px-3 py-2 text-sm font-semibold text-white" : "focus-ring rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600";
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">{label}</p>
      <p className="mt-0.5 truncate text-xs font-semibold text-slate-700">{value}</p>
    </div>
  );
}
