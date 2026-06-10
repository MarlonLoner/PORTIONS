import { AlertTriangle, BarChart3, Building2, ClipboardCheck, FileSpreadsheet, LineChart, PackageSearch, ShieldCheck, UsersRound } from "lucide-react";
import type { ReactNode } from "react";
import { ExecutivePackActions } from "@/components/executive-pack-actions";
import {
  getBranchPerformanceSummary,
  getChronicRetentionSummary,
  getExecutivePackData,
  getExecutiveSummary,
  getImportedDataSummary,
  getPilotRiskSummary,
  getPrintMetadata,
  getRevenueControlSummary,
  getRolloutRecommendation,
  getStaffExecutionSummary,
  getStockRiskSummary,
  getValueCreatedSummary
} from "@/lib/executive-pack";
import { formatCurrency } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ExecutivePackPage() {
  const data = await getExecutivePackData();
  const metadata = getPrintMetadata(data);
  const executive = getExecutiveSummary(data);
  const imported = getImportedDataSummary(data);
  const revenue = getRevenueControlSummary(data);
  const chronic = getChronicRetentionSummary(data);
  const branch = getBranchPerformanceSummary(data);
  const stock = getStockRiskSummary(data);
  const staff = getStaffExecutionSummary(data);
  const value = getValueCreatedSummary(data);
  const risks = getPilotRiskSummary(data);
  const rollout = getRolloutRecommendation(data);

  return (
    <div className="executive-pack space-y-6">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              aside, header, nav, .no-print { display: none !important; }
              body { background: white !important; }
              .lg\\:pl-72 { padding-left: 0 !important; }
              main { max-width: none !important; padding: 0 !important; gap: 0 !important; }
              .executive-pack { color: #0f172a !important; }
              .print-section { break-inside: avoid; page-break-inside: avoid; box-shadow: none !important; border-color: #d9e2ec !important; background: white !important; margin-bottom: 18px !important; }
              .print-hero { background: white !important; color: #0f172a !important; border: 1px solid #d9e2ec !important; box-shadow: none !important; }
              .print-hero * { color: #0f172a !important; }
            }
          `
        }}
      />

      <section className="print-hero relative overflow-hidden rounded-lg border border-navy-800 bg-navy-950 p-5 text-white shadow-[0_28px_80px_rgba(6,21,38,0.22)] sm:p-6 xl:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.12),transparent_36%),linear-gradient(180deg,rgba(75,158,201,0.18),transparent_58%)]" />
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-clinical-100 ring-1 ring-white/15">
              <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden="true" />
              {metadata.packType}
            </span>
            <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">Executive Export Pack</h1>
            <p className="mt-4 max-w-4xl text-base leading-7 text-slate-200">
              Package pilot performance, revenue risk, patient follow-up, branch discipline, stock pressure, and rollout recommendations into a boardroom-ready review.
            </p>
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">Generated {metadata.generatedAt}</p>
          </div>
          <ExecutivePackActions />
        </div>
        <div className="relative mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <HeroMetric label="Pilot status" value={metadata.pilotStatus} />
          <HeroMetric label="Review period" value={metadata.reviewPeriod} />
          <HeroMetric label="Readiness" value={`${metadata.readinessScore}%`} />
          <HeroMetric label="Value confidence" value={`${metadata.valueConfidenceScore}%`} />
          <HeroMetric label="Recommendation" value={metadata.rolloutRecommendation} />
        </div>
      </section>

      <ReportSection title="Executive Summary" eyebrow="Boardroom narrative" icon={<ShieldCheck className="h-5 w-5" />}>
        <div className="grid gap-4 xl:grid-cols-2">
          <Narrative label="What PORTIONS discovered" value={executive.discovered} />
          <Narrative label="Where value is being created" value={executive.valueCreated} />
          <Narrative label="What risks remain" value={executive.risksRemain} />
          <Narrative label="What should happen next" value={executive.next} />
        </div>
      </ReportSection>

      <ReportSection title="Imported Data Summary" eyebrow="Pilot setup evidence" icon={<FileSpreadsheet className="h-5 w-5" />}>
        <MetricGrid>
          <Metric label="Branches imported" value={String(imported.branchesImported)} />
          <Metric label="Staff imported" value={String(imported.staffImported)} />
          <Metric label="Chronic patients" value={String(imported.chronicPatientsImported)} />
          <Metric label="Stock items" value={String(imported.stockItemsImported)} />
          <Metric label="Orders imported" value={String(imported.ordersImported)} />
          <Metric label="Follow-up tasks" value={String(imported.followUpTasksImported)} />
          <Metric label="Batches reviewed" value={String(imported.importBatchesReviewed)} />
          <Metric label="Approved/imported" value={String(imported.approvedImportedBatches)} />
        </MetricGrid>
      </ReportSection>

      <div className="grid gap-6 xl:grid-cols-2">
        <ReportSection title="Revenue & Order Control" eyebrow="Cash capture" icon={<LineChart className="h-5 w-5" />}>
          <MetricGrid compact>
            <Metric label="Online/order revenue" value={formatCurrency(revenue.onlineOrderRevenue)} />
            <Metric label="Awaiting payment value" value={formatCurrency(revenue.awaitingPaymentValue)} />
            <Metric label="Orders needing action" value={String(revenue.ordersNeedingAction)} />
            <Metric label="High-value orders" value={String(revenue.highValueOrders)} />
          </MetricGrid>
          <Narrative label="Payment leakage narrative" value={revenue.narrative} />
          <ActionList actions={revenue.actions} />
        </ReportSection>

        <ReportSection title="Chronic Patient Retention" eyebrow="Recurring revenue" icon={<UsersRound className="h-5 w-5" />}>
          <MetricGrid compact>
            <Metric label="Chronic due" value={String(chronic.dueToday)} />
            <Metric label="Overdue patients" value={String(chronic.overdue)} />
            <Metric label="High-risk patients" value={String(chronic.highRisk)} />
            <Metric label="VIP patients" value={String(chronic.vip)} />
            <Metric label="Follow-up workload" value={String(chronic.followUpWorkload)} />
          </MetricGrid>
          <Narrative label="Retention risk narrative" value={chronic.narrative} />
          <ActionList actions={chronic.actions} />
        </ReportSection>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ReportSection title="Branch Performance" eyebrow="Network discipline" icon={<Building2 className="h-5 w-5" />}>
          <MetricGrid compact>
            <Metric label="Best branch" value={branch.bestPerformingBranch} />
            <Metric label="Needs attention" value={branch.branchNeedingAttention} />
            <Metric label="Branches reviewed" value={String(branch.branchesReviewed)} />
            <Metric label="Bottlenecks" value={String(branch.branchBottlenecks)} />
          </MetricGrid>
          <ActionList actions={branch.actions} />
        </ReportSection>

        <ReportSection title="Stock Risk" eyebrow="Inventory exposure" icon={<PackageSearch className="h-5 w-5" />}>
          <MetricGrid compact>
            <Metric label="Low stock alerts" value={String(stock.lowStockAlerts)} />
            <Metric label="Near-expiry pressure" value={String(stock.nearExpiryPressure)} />
            <Metric label="Overstock/dead stock" value={String(stock.overstockDeadStock)} />
            <Metric label="Stock risk value" value={formatCurrency(stock.stockRiskValue)} />
          </MetricGrid>
          <ActionList actions={stock.actions} />
        </ReportSection>
      </div>

      <ReportSection title="Staff Execution" eyebrow="Operating discipline" icon={<ClipboardCheck className="h-5 w-5" />}>
        <MetricGrid>
          <Metric label="Follow-ups due" value={String(staff.followUpTasksDue)} />
          <Metric label="Completed" value={String(staff.completed)} />
          <Metric label="Pending" value={String(staff.pending)} />
          <Metric label="Staff workload" value={String(staff.staffWorkload)} />
        </MetricGrid>
        <Narrative label="Response discipline narrative" value={staff.narrative} />
        <ActionList actions={staff.actions} />
      </ReportSection>

      <ReportSection title="Value Created" eyebrow="Pilot proof" icon={<BarChart3 className="h-5 w-5" />}>
        <MetricGrid>
          {value.map((item) => (
            <Metric key={item.label} label={item.label} value={item.countOnly ? String(item.value) : formatCurrency(item.value)} detail={item.detail} />
          ))}
        </MetricGrid>
      </ReportSection>

      <ReportSection title="Pilot Risks" eyebrow="Management attention" icon={<AlertTriangle className="h-5 w-5" />}>
        <div className="grid gap-3 md:grid-cols-2">
          {risks.map((risk) => (
            <article key={risk.title} className="rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-navy-950">{risk.title}</p>
                <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-700 ring-1 ring-slate-200">{risk.severity}</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">{risk.why}</p>
              <p className="mt-3 rounded-lg bg-white p-3 text-sm font-semibold leading-6 text-clinical-900 ring-1 ring-clinical-100">{risk.action}</p>
            </article>
          ))}
        </div>
      </ReportSection>

      <ReportSection title="Rollout Recommendation" eyebrow="Final decision" icon={<ShieldCheck className="h-5 w-5" />}>
        <div className="rounded-lg bg-navy-950 p-5 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clinical-100">Recommendation</p>
          <p className="mt-2 text-3xl font-semibold">{rollout.recommendation}</p>
          <p className="mt-3 text-sm leading-7 text-slate-200">{rollout.why}</p>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <DecisionList title="Next 7 days" items={rollout.nextSevenDays} />
          <DecisionList title="Next 30 days" items={rollout.nextThirtyDays} />
          <DecisionList title="Required decisions" items={rollout.requiredDecisions} />
        </div>
      </ReportSection>
    </div>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white p-4 text-navy-950">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold leading-6">{value}</p>
    </div>
  );
}

function ReportSection({ title, eyebrow, icon, children }: { title: string; eyebrow: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="print-section rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
      <div className="flex items-center gap-2 text-clinical-700">
        {icon}
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em]">{eyebrow}</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-navy-950">{title}</h2>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function MetricGrid({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  return <div className={compact ? "grid gap-3 sm:grid-cols-2" : "grid gap-3 sm:grid-cols-2 xl:grid-cols-4"}>{children}</div>;
}

function Metric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-semibold text-navy-950">{value}</p>
      {detail ? <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p> : null}
    </div>
  );
}

function Narrative({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-4 first:mt-0 rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm leading-7 text-slate-700">{value}</p>
    </div>
  );
}

function ActionList({ actions }: { actions: string[] }) {
  return (
    <div className="mt-4 grid gap-2 sm:grid-cols-2">
      {actions.map((action) => (
        <p key={action} className="rounded-lg bg-clinical-50 p-3 text-sm font-semibold leading-6 text-clinical-900">{action}</p>
      ))}
    </div>
  );
}

function DecisionList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
      <p className="font-semibold text-navy-950">{title}</p>
      <div className="mt-3 space-y-2">
        {items.map((item) => <p key={item} className="text-sm leading-6 text-slate-700">{item}</p>)}
      </div>
    </div>
  );
}
