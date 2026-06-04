import { AlertTriangle, Building2, ClipboardList, MessageSquare, ShieldCheck, TrendingUp, UsersRound, XCircle } from "lucide-react";
import { PilotRequestsCrm, type PilotRequestCrmRecord } from "@/components/pilot-requests-crm";
import { StatCard } from "@/components/stat-card";
import { getPilotRequestsData } from "@/lib/data";
import { getPilotRequestPipelineMetrics } from "@/lib/pilot-requests";

export const dynamic = "force-dynamic";

export default async function PilotRequestsPage() {
  const requests = await getPilotRequestsData();
  const records: PilotRequestCrmRecord[] = requests.map((request) => ({
    id: request.id,
    pharmacyName: request.pharmacyName,
    contactName: request.contactName,
    whatsappNumber: request.whatsappNumber,
    email: request.email,
    branchCount: request.branchCount,
    currentSystem: request.currentSystem,
    mainPain: request.mainPain,
    urgency: request.urgency,
    notes: request.notes,
    internalNotes: request.internalNotes,
    nextAction: request.nextAction,
    status: request.status,
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString()
  }));
  const metrics = getPilotRequestPipelineMetrics(records);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-lg border border-navy-800 bg-navy-950 p-5 text-white shadow-[0_28px_80px_rgba(6,21,38,0.22)] sm:p-6 xl:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.12),transparent_36%),linear-gradient(180deg,rgba(75,158,201,0.18),transparent_58%)]" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-clinical-100 ring-1 ring-white/15">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Lightweight Internal CRM
            </span>
            <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">Pilot Requests</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-200">
              Review, contact, qualify, and close pharmacy owners requesting a 30-day PORTIONS pilot.
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clinical-100">Pipeline value signal</p>
            <p className="mt-2 text-4xl font-semibold tracking-tight">{metrics.highPriority}</p>
            <p className="mt-1 text-xs text-slate-300">high priority leads</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total requests" value={String(metrics.totalRequests)} helper="All submitted pilot leads" icon={<ClipboardList className="h-5 w-5" />} tone="navy" trend="CRM" />
        <StatCard title="New requests" value={String(metrics.newRequests)} helper="Awaiting first review" icon={<UsersRound className="h-5 w-5" />} tone={metrics.newRequests > 0 ? "amber" : "emerald"} trend="New" />
        <StatCard title="High priority" value={String(metrics.highPriority)} helper="Urgent or multi-branch fit" icon={<AlertTriangle className="h-5 w-5" />} tone={metrics.highPriority > 0 ? "rose" : "emerald"} trend="Priority" />
        <StatCard title="Contacted" value={String(metrics.contacted)} helper="Follow-up already started" icon={<MessageSquare className="h-5 w-5" />} tone="blue" trend="Contact" />
        <StatCard title="Qualified" value={String(metrics.qualified)} helper="Pilot-fit opportunities" icon={<TrendingUp className="h-5 w-5" />} tone={metrics.qualified > 0 ? "emerald" : "white"} trend="Pipeline" />
        <StatCard title="Closed" value={String(metrics.closed)} helper="No active pilot path" icon={<XCircle className="h-5 w-5" />} tone="white" trend="Closed" />
        <StatCard title="Average branch count" value={String(metrics.averageBranchCount)} helper="Multi-branch potential" icon={<Building2 className="h-5 w-5" />} tone="navy" trend="Branches" />
        <StatCard title="Urgent requests" value={String(metrics.urgentRequests)} helper="Immediate or 30-day urgency" icon={<AlertTriangle className="h-5 w-5" />} tone={metrics.urgentRequests > 0 ? "amber" : "emerald"} trend="Urgency" />
      </section>

      <PilotRequestsCrm initialRequests={records} />
    </div>
  );
}
