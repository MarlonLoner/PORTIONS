import {
  AlertTriangle,
  BarChart3,
  Bot,
  Building2,
  ClipboardList,
  DollarSign,
  FileText,
  PackageSearch,
  ShieldCheck,
  UsersRound
} from "lucide-react";
import type { ReactNode } from "react";
import { ReportCard } from "@/components/report-card";
import { StatCard } from "@/components/stat-card";
import { getReportsData } from "@/lib/data";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  buildReportDocuments,
  getBranchManagerReportPack,
  getOwnerReportPack,
  getReportsNeedingAttention,
  getReportsOverview,
  getRevenueProtectionPack,
  getStockControlPack
} from "@/lib/reports";

export const dynamic = "force-dynamic";

const statusClasses = {
  Ready: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  "Needs Review": "bg-amber-50 text-amber-700 ring-amber-200",
  "Action Required": "bg-rose-50 text-rose-700 ring-rose-200"
};

export default async function ReportsPage() {
  const reportData = await getReportsData();
  const overview = getReportsOverview(reportData);
  const reports = buildReportDocuments(reportData);
  const reportsNeedingAttention = getReportsNeedingAttention(reportData);
  const ownerPack = getOwnerReportPack(reportData);
  const branchManagerPack = getBranchManagerReportPack(reportData);
  const revenueProtectionPack = getRevenueProtectionPack(reportData);
  const stockControlPack = getStockControlPack(reportData);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-lg border border-navy-800 bg-navy-950 p-5 text-white shadow-[0_28px_80px_rgba(6,21,38,0.22)] sm:p-6 xl:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.12),transparent_36%),linear-gradient(180deg,rgba(75,158,201,0.18),transparent_58%)]" />
        <div className="relative grid gap-7 xl:grid-cols-[1.1fr_0.9fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-clinical-100 ring-1 ring-white/15">
              <FileText className="h-3.5 w-3.5" aria-hidden="true" />
              Accountability Layer
            </span>
            <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">Reports</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-200">
              Generate executive, branch, patient, order, stock, and staff performance reports from one command view.
            </p>
            <p className="mt-5 max-w-4xl text-sm leading-7 text-slate-100">
              PORTIONS turns daily activity into evidence: what changed, where revenue is exposed, which teams need attention, and what managers should do before close of business.
            </p>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/10 p-4">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-emerald-200" aria-hidden="true" />
              <h2 className="text-lg font-semibold">Boardroom Snapshot</h2>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <HeroMetric label="Reports available" value={String(overview.reportsAvailable)} />
              <HeroMetric label="Needs attention" value={String(overview.reportsNeedingAttention)} tone={overview.reportsNeedingAttention > 0 ? "risk" : "normal"} />
              <HeroMetric label="Revenue reviewed" value={formatCurrency(overview.revenueReviewed)} />
              <HeroMetric label="Branches reviewed" value={String(overview.branchesReviewed)} />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Reports available" value={String(overview.reportsAvailable)} helper="Executive evidence packs" icon={<FileText className="h-5 w-5" />} tone="navy" trend="Reports" />
        <StatCard title="Last executive report" value={overview.lastExecutiveReport ? formatDate(overview.lastExecutiveReport) : "Not generated"} helper="Daily owner pack" icon={<ShieldCheck className="h-5 w-5" />} tone="white" trend="Executive" />
        <StatCard title="Revenue reviewed" value={formatCurrency(overview.revenueReviewed)} helper="Today plus exposed payment value" icon={<DollarSign className="h-5 w-5" />} tone="blue" trend="Revenue" />
        <StatCard title="Chronic retention risk" value={String(overview.chronicRetentionRisk)} helper="High-risk, overdue, or lost patients" icon={<UsersRound className="h-5 w-5" />} tone={overview.chronicRetentionRisk > 0 ? "rose" : "emerald"} trend="Care" />
        <StatCard title="Branches reviewed" value={String(overview.branchesReviewed)} helper="Network accountability coverage" icon={<Building2 className="h-5 w-5" />} tone="white" trend="Branch" />
        <StatCard title="Stock risk value" value={formatCurrency(overview.stockRiskValue)} helper="Near-expiry exposure" icon={<PackageSearch className="h-5 w-5" />} tone={overview.stockRiskValue > 0 ? "amber" : "emerald"} trend="Stock" />
        <StatCard title="Staff actions pending" value={String(overview.staffActionsPending)} helper="Open follow-up tasks" icon={<ClipboardList className="h-5 w-5" />} tone={overview.staffActionsPending > 0 ? "amber" : "emerald"} trend="Staff" />
        <StatCard title="Reports needing attention" value={String(overview.reportsNeedingAttention)} helper="Needs Review or Action Required" icon={<AlertTriangle className="h-5 w-5" />} tone={overview.reportsNeedingAttention > 0 ? "rose" : "emerald"} trend="Risk" />
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {reports.length > 0 ? (
          reports.map((report) => <ReportCard key={report.id} report={report} />)
        ) : (
          <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-soft">
            No reports have been generated yet.
          </div>
        )}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel title="Reports Needing Attention" eyebrow="High-risk evidence">
          {reportsNeedingAttention.length > 0 ? (
            <div className="space-y-3">
              {reports
                .filter((report) => reportsNeedingAttention.some((item) => item.id === report.id))
                .map((report) => (
                  <div key={report.id} className="rounded-lg border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-navy-950">{report.title}</h3>
                        <p className="mt-1 text-sm text-slate-500">{report.keyMetric}</p>
                      </div>
                      <StatusBadge status={report.status} />
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{report.aiSummary}</p>
                  </div>
                ))}
            </div>
          ) : (
            <p className="rounded-lg bg-emerald-50 p-4 text-sm leading-6 text-emerald-800">All reports are ready. Keep the normal review rhythm and close the day with manager notes.</p>
          )}
        </Panel>

        <Panel title="Report Packs" eyebrow="Role-based review">
          <div className="grid gap-3">
            <PackCard title="Owner Pack" reports={ownerPack.map((report) => report.title)} helper="CEO and owner review across revenue, branches, and sales." />
            <PackCard title="Branch Manager Pack" reports={branchManagerPack.map((report) => report.title)} helper="Branch operations, staff rhythm, and stock control." />
            <PackCard title="Revenue Protection Pack" reports={revenueProtectionPack.map((report) => report.title)} helper="Chronic retention, online sales, and follow-up recovery." />
            <PackCard title="Stock Control Pack" reports={stockControlPack.map((report) => report.title)} helper="Stock risk, reorder pressure, and transfers." />
          </div>
        </Panel>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clinical-700">Decision Documents</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-navy-950">Report Detail Sections</h2>
          </div>
          <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">Executive summary, risks, and manager actions</span>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          {reports.map((report) => (
            <article key={report.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Executive Summary</p>
                  <h3 className="mt-2 text-lg font-semibold text-navy-950">{report.title}</h3>
                </div>
                <StatusBadge status={report.status} />
              </div>
              <p className="mt-4 rounded-lg bg-navy-950 p-4 text-sm leading-6 text-white">{report.aiSummary}</p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <MiniSection title="Key Metrics" items={[report.keyMetric, `Last generated ${formatDate(report.lastGeneratedAt)}`]} />
                <MiniSection title="What Changed" items={report.whatChanged} />
                <MiniSection title="Risks" items={report.risks} />
                <MiniSection title="Recommended Actions" items={report.recommendedActions} />
              </div>

              <div className="mt-4 rounded-lg border border-clinical-100 bg-clinical-50 p-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-clinical-700" aria-hidden="true" />
                  <p className="text-sm font-semibold text-clinical-950">Manager notes</p>
                </div>
                <p className="mt-2 text-sm leading-6 text-clinical-900">{report.managerNotes}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function HeroMetric({ label, value, tone = "normal" }: { label: string; value: string; tone?: "normal" | "risk" }) {
  return (
    <div className="rounded-lg bg-white p-4 text-navy-950">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</p>
      <p className={tone === "risk" ? "mt-2 text-2xl font-semibold text-rose-700" : "mt-2 text-2xl font-semibold text-navy-950"}>{value}</p>
    </div>
  );
}

function Panel({ title, eyebrow, children }: { title: string; eyebrow: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-clinical-700">{eyebrow}</p>
      <h2 className="mt-2 text-xl font-semibold tracking-tight text-navy-950">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function StatusBadge({ status }: { status: keyof typeof statusClasses }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ring-1 ${statusClasses[status]}`}>
      {status}
    </span>
  );
}

function PackCard({ title, reports, helper }: { title: string; reports: string[]; helper: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-navy-950">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">{helper}</p>
        </div>
        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">{reports.length}</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {reports.map((report) => (
          <span key={report} className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
            {report}
          </span>
        ))}
      </div>
    </div>
  );
}

function MiniSection({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{title}</p>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item} className="text-sm leading-6 text-slate-700">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
