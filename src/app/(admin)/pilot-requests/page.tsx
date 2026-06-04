import { Building2, ClipboardList, MessageSquare, ShieldCheck, TrendingUp, UsersRound } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { getPilotRequestsData } from "@/lib/data";
import { formatDate } from "@/lib/format";
import {
  getPilotRequestOverview,
  getPilotRequestUrgencyTone,
  pilotRequestStatusClasses,
  pilotRequestStatusLabels
} from "@/lib/pilot-requests";

export const dynamic = "force-dynamic";

export default async function PilotRequestsPage() {
  const requests = await getPilotRequestsData();
  const overview = getPilotRequestOverview(requests);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-lg border border-navy-800 bg-navy-950 p-5 text-white shadow-[0_28px_80px_rgba(6,21,38,0.22)] sm:p-6 xl:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.12),transparent_36%),linear-gradient(180deg,rgba(75,158,201,0.18),transparent_58%)]" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-clinical-100 ring-1 ring-white/15">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Pilot Pipeline
            </span>
            <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">Pilot Requests</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-200">
              Review pharmacy owners requesting a 30-day PORTIONS pilot across chronic patients, orders, branches, stock, and executive reporting.
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clinical-100">Total requests</p>
            <p className="mt-2 text-4xl font-semibold tracking-tight">{requests.length}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="New requests" value={String(overview.newRequests)} helper="Awaiting first review" icon={<ClipboardList className="h-5 w-5" />} tone={overview.newRequests > 0 ? "amber" : "emerald"} trend="New" />
        <StatCard title="Contacted" value={String(overview.contacted)} helper="Follow-up already started" icon={<MessageSquare className="h-5 w-5" />} tone="blue" trend="Contact" />
        <StatCard title="Qualified" value={String(overview.qualified)} helper="Pilot-fit opportunities" icon={<TrendingUp className="h-5 w-5" />} tone={overview.qualified > 0 ? "emerald" : "white"} trend="Pipeline" />
        <StatCard title="Average branch count" value={String(overview.averageBranchCount)} helper="Multi-branch potential" icon={<Building2 className="h-5 w-5" />} tone="navy" trend="Branches" />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clinical-700">Lead review</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-navy-950">Submitted Pilot Requests</h2>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">No editing yet</span>
        </div>

        {requests.length > 0 ? (
          <div className="mt-5 grid gap-4">
            {requests.map((request) => (
              <article key={request.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-navy-950">{request.pharmacyName}</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {request.contactName} - {request.whatsappNumber}
                    </p>
                    {request.email ? <p className="mt-1 text-sm text-slate-500">{request.email}</p> : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ring-1 ${pilotRequestStatusClasses[request.status]}`}>
                      {pilotRequestStatusLabels[request.status]}
                    </span>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ring-1 ${getPilotRequestUrgencyTone(request.urgency)}`}>
                      {request.urgency}
                    </span>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <MiniMetric label="Branches" value={String(request.branchCount)} />
                  <MiniMetric label="Current system" value={request.currentSystem} />
                  <MiniMetric label="Created" value={formatDate(request.createdAt)} />
                  <MiniMetric label="Status" value={pilotRequestStatusLabels[request.status]} />
                </div>

                <div className="mt-4 grid gap-3 xl:grid-cols-[1fr_1fr]">
                  <div className="rounded-lg bg-white p-3 ring-1 ring-slate-200">
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Main pain</p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{request.mainPain}</p>
                  </div>
                  <div className="rounded-lg bg-white p-3 ring-1 ring-slate-200">
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Notes</p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{request.notes ?? "No additional notes provided."}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <UsersRound className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
            <h3 className="mt-4 font-semibold text-navy-950">No pilot requests yet</h3>
            <p className="mt-2 text-sm text-slate-500">Requests submitted from the public pilot page will appear here.</p>
          </div>
        )}
      </section>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white p-3 ring-1 ring-slate-200">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</p>
      <p className="mt-2 truncate text-sm font-semibold text-navy-950">{value}</p>
    </div>
  );
}
