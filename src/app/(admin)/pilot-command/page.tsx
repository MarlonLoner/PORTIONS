import {
  AlertTriangle,
  BarChart3,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  FileSpreadsheet,
  Flag,
  Layers3,
  LineChart,
  PackageSearch,
  ShieldCheck,
  Target,
  UsersRound
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { HorizontalBarChart, ProgressTimelineChart } from "@/components/simple-charts";
import { getPilotCommandData as loadPilotCommandData } from "@/lib/data";
import { formatCurrency } from "@/lib/format";
import {
  getAccountabilityAiSummary,
  getAccountabilityMetrics,
  getActionCategoryBreakdown,
  getOpenVsCompletedChartData,
  getOutcomeBreakdown,
  toBranchChartData,
  toStaffChartData
} from "@/lib/accountability-intelligence";
import {
  getDataImportCompletion,
  getImportCompletionChartData,
  getOperationalActivationScore,
  getPilotCommandData,
  getPilotDecisionReadiness,
  getPilotProgressChartData,
  getPilotReadinessScore,
  getPilotRisks,
  getPilotTimeline,
  getPilotValueCreated,
  getRiskBreakdownChartData,
  getRoleBasedActionPlan,
  getSevenDayReviewPack,
  getValueCreatedChartData,
  getValueConfidenceScore,
  type PilotPhaseStatus,
  type PilotRiskSeverity,
  type PilotStatus
} from "@/lib/pilot-command";
import { getEscalationAiSummary, getNotificationSummary } from "@/lib/notifications";

const statusClasses: Record<PilotStatus, string> = {
  Setup: "bg-amber-50 text-amber-700 ring-amber-200",
  Active: "bg-clinical-50 text-clinical-800 ring-clinical-200",
  Review: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Completed: "bg-navy-950 text-white ring-navy-900"
};

const phaseClasses: Record<PilotPhaseStatus, string> = {
  "Not Started": "bg-slate-100 text-slate-600 ring-slate-200",
  "In Progress": "bg-clinical-50 text-clinical-800 ring-clinical-200",
  Complete: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  "Needs Attention": "bg-rose-50 text-rose-700 ring-rose-200"
};

const severityClasses: Record<PilotRiskSeverity, string> = {
  Low: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Medium: "bg-amber-50 text-amber-700 ring-amber-200",
  High: "bg-rose-50 text-rose-700 ring-rose-200"
};

export const dynamic = "force-dynamic";

export default async function PilotCommandPage() {
  const data = await loadPilotCommandData();
  const command = getPilotCommandData(data);
  const timeline = getPilotTimeline(data);
  const valueCreated = getPilotValueCreated(data);
  const risks = getPilotRisks(data);
  const rolePlan = getRoleBasedActionPlan();
  const reviewPack = getSevenDayReviewPack(data);
  const decision = getPilotDecisionReadiness(data);
  const progressChart = getPilotProgressChartData(data);
  const importChart = getImportCompletionChartData(data);
  const valueChart = getValueCreatedChartData(data);
  const riskChart = getRiskBreakdownChartData(data);
  const execution = getAccountabilityMetrics(data.operationalActions);
  const categoryChart = getActionCategoryBreakdown(data.operationalActions);
  const branchExecutionChart = toBranchChartData(data.operationalActions);
  const staffExecutionChart = toStaffChartData(data.operationalActions);
  const outcomeChart = getOutcomeBreakdown(data.operationalActions);
  const openCompletedChart = getOpenVsCompletedChartData(data.operationalActions);
  const notificationSummary = getNotificationSummary(data.notifications);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-lg border border-navy-800 bg-navy-950 p-5 text-white shadow-[0_28px_80px_rgba(6,21,38,0.22)] sm:p-6 xl:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.12),transparent_36%),linear-gradient(180deg,rgba(75,158,201,0.18),transparent_58%)]" />
        <div className="relative grid gap-7 xl:grid-cols-[1fr_0.95fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-clinical-100 ring-1 ring-white/15">
              <Flag className="h-3.5 w-3.5" aria-hidden="true" />
              30-Day Pilot Control Room
            </span>
            <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">Pilot Command Center</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-200">
              Track the 30-day PORTIONS pilot from setup and imports to chronic recovery, order control, stock visibility, branch discipline, and executive reporting.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Badge label={command.status} className={statusClasses[command.status]} />
              <Badge label={`Day ${command.currentDay} of 30`} className="bg-white text-navy-950 ring-white" />
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/action-center" className="focus-ring inline-flex items-center rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-navy-950 transition hover:bg-clinical-50">
                Open Action Center
              </Link>
              <Link href="/action-center" className="focus-ring inline-flex items-center rounded-lg bg-white/10 px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-white/15 transition hover:bg-white/15">
                Create Pilot Task
              </Link>
            </div>
            <p className="mt-5 rounded-lg bg-white/10 p-4 text-sm font-medium leading-7 text-slate-100 ring-1 ring-white/15">{command.suggestedNextAction}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <HeroMetric label="Readiness score" value={`${command.readinessScore}%`} />
            <HeroMetric label="Data import completion" value={`${command.dataImportCompletion}%`} />
            <HeroMetric label="Operational activation" value={`${command.operationalActivationScore}%`} />
            <HeroMetric label="Value confidence" value={`${command.valueConfidenceScore}%`} />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Kpi title="Branches imported" value={String(command.kpis.branchesImported)} icon={<Layers3 className="h-5 w-5" />} />
        <Kpi title="Staff imported" value={String(command.kpis.staffImported)} icon={<UsersRound className="h-5 w-5" />} />
        <Kpi title="Chronic patients" value={String(command.kpis.chronicPatientsImported)} icon={<ShieldCheck className="h-5 w-5" />} />
        <Kpi title="Stock items" value={String(command.kpis.stockItemsImported)} icon={<PackageSearch className="h-5 w-5" />} />
        <Kpi title="Orders imported" value={String(command.kpis.ordersImported)} icon={<BarChart3 className="h-5 w-5" />} />
        <Kpi title="Follow-up tasks" value={String(command.kpis.followUpTasksImported)} icon={<ClipboardCheck className="h-5 w-5" />} />
        <Kpi title="Due today" value={String(command.kpis.followUpsDueToday)} icon={<Target className="h-5 w-5" />} tone={command.kpis.followUpsDueToday > 0 ? "amber" : "white"} />
        <Kpi title="Orders needing action" value={String(command.kpis.ordersNeedingAction)} icon={<LineChart className="h-5 w-5" />} tone={command.kpis.ordersNeedingAction > 0 ? "amber" : "white"} />
        <Kpi title="Stock risks" value={String(command.kpis.stockRisks)} icon={<AlertTriangle className="h-5 w-5" />} tone={command.kpis.stockRisks > 0 ? "rose" : "white"} />
        <Kpi title="Branches needing attention" value={String(command.kpis.branchesNeedingAttention)} icon={<Flag className="h-5 w-5" />} tone={command.kpis.branchesNeedingAttention > 0 ? "amber" : "white"} />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
        <SectionHeader eyebrow="Pilot execution accountability" title="Is the pilot turning insight into completed work?" icon={<ClipboardCheck className="h-5 w-5" />} />
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Kpi title="Actions created" value={String(execution.totalActions)} icon={<ClipboardCheck className="h-5 w-5" />} />
          <Kpi title="Actions completed" value={String(execution.completedActions)} icon={<CheckCircle2 className="h-5 w-5" />} tone="emerald" />
          <Kpi title="Completion rate" value={`${execution.completionRate}%`} icon={<Target className="h-5 w-5" />} tone={execution.completionRate >= 60 ? "emerald" : "amber"} />
          <Kpi title="Avg resolution" value={`${execution.averageResolutionDays} days`} icon={<LineChart className="h-5 w-5" />} />
          <Kpi title="Overdue actions" value={String(execution.overdue)} icon={<AlertTriangle className="h-5 w-5" />} tone={execution.overdue > 0 ? "rose" : "white"} />
          <Kpi title="Blocked actions" value={String(execution.blockedActions)} icon={<AlertTriangle className="h-5 w-5" />} tone={execution.blockedActions > 0 ? "amber" : "white"} />
          <Kpi title="Revenue recovered" value={formatCurrency(execution.valueRecovered)} icon={<BarChart3 className="h-5 w-5" />} tone="emerald" />
          <Kpi title="Revenue protected" value={formatCurrency(execution.valueProtected)} icon={<ShieldCheck className="h-5 w-5" />} tone="emerald" />
        </div>
        <p className="mt-5 rounded-lg bg-navy-950 p-4 text-sm font-semibold leading-7 text-white">{getAccountabilityAiSummary(data.operationalActions)}</p>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
        <SectionHeader eyebrow="Notification discipline" title="Are escalations being seen and cleared?" icon={<AlertTriangle className="h-5 w-5" />} />
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Kpi title="Alerts generated" value={String(notificationSummary.total)} icon={<AlertTriangle className="h-5 w-5" />} />
          <Kpi title="Unresolved critical" value={String(notificationSummary.critical)} icon={<ShieldCheck className="h-5 w-5" />} tone={notificationSummary.critical > 0 ? "rose" : "emerald"} />
          <Kpi title="Acknowledged" value={String(notificationSummary.acknowledged)} icon={<CheckCircle2 className="h-5 w-5" />} tone="emerald" />
          <Kpi title="Branch escalations" value={String(notificationSummary.managementEscalations)} icon={<Flag className="h-5 w-5" />} tone={notificationSummary.managementEscalations > 0 ? "amber" : "white"} />
        </div>
        <p className="mt-5 rounded-lg bg-clinical-50 p-4 text-sm font-semibold leading-7 text-clinical-900">{getEscalationAiSummary(data.notifications)}</p>
        <div className="mt-4">
          <Link href="/notifications" className="focus-ring inline-flex items-center rounded-lg bg-navy-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-800">
            Review Notifications
          </Link>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Panel title="Completion By Category" eyebrow="Execution mix" icon={<BarChart3 className="h-5 w-5" />}>
          <HorizontalBarChart data={categoryChart} tone="clinical" />
        </Panel>
        <Panel title="Open Versus Completed Actions" eyebrow="Execution health" icon={<LineChart className="h-5 w-5" />}>
          <HorizontalBarChart data={openCompletedChart} tone="emerald" />
        </Panel>
        <Panel title="Execution By Branch" eyebrow="Branch accountability" icon={<Flag className="h-5 w-5" />}>
          <HorizontalBarChart data={branchExecutionChart} valueType="percent" tone="navy" />
        </Panel>
        <Panel title="Execution By Staff" eyebrow="Staff accountability" icon={<UsersRound className="h-5 w-5" />}>
          <HorizontalBarChart data={staffExecutionChart} tone="amber" />
        </Panel>
        <Panel title="Outcomes By Type" eyebrow="Recorded value" icon={<ShieldCheck className="h-5 w-5" />}>
          <HorizontalBarChart data={outcomeChart} tone="emerald" />
        </Panel>
        <Panel title="Pilot Execution Commentary" eyebrow="Expansion readiness" icon={<Bot className="h-5 w-5" />}>
          <ReviewLine label="What improved" value={`${execution.completedActions} actions have completed, with ${formatCurrency(execution.valueRecovered + execution.valueProtected)} in recorded recovered or protected value.`} />
          <ReviewLine label="What remains unresolved" value={`${execution.overdue} overdue and ${execution.blockedActions} blocked actions still need management attention.`} />
          <ReviewLine label="Staff adoption" value={execution.completionRate >= 60 ? "Execution discipline is strong enough to support the next pilot review." : "Staff adoption needs coaching before expanding the pilot scope."} />
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel title="Pilot Progress Chart" eyebrow="30-day motion" icon={<LineChart className="h-5 w-5" />}>
          <ProgressTimelineChart data={progressChart} />
        </Panel>
        <Panel title="Import Completion Chart" eyebrow="Data readiness" icon={<FileSpreadsheet className="h-5 w-5" />}>
          <HorizontalBarChart data={importChart} tone="clinical" />
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Panel title="Value Created Chart" eyebrow="Pilot proof" icon={<BarChart3 className="h-5 w-5" />}>
          <HorizontalBarChart data={valueChart} valueType="currency" tone="emerald" />
        </Panel>
        <Panel title="Risk Breakdown Chart" eyebrow="Management pressure" icon={<AlertTriangle className="h-5 w-5" />}>
          <HorizontalBarChart data={riskChart} tone="rose" />
        </Panel>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
        <SectionHeader eyebrow="30-day pilot timeline" title="From Setup To Rollout Decision" icon={<ClipboardCheck className="h-5 w-5" />} />
        <div className="mt-5 grid gap-4 xl:grid-cols-3">
          {timeline.map((phase) => (
            <article key={phase.title} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-clinical-700">{phase.days}</p>
                <Badge label={phase.status} className={phaseClasses[phase.status]} />
              </div>
              <h3 className="mt-3 text-lg font-semibold tracking-tight text-navy-950">{phase.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{phase.goal}</p>
              <div className="mt-4 space-y-2">
                {phase.tasks.map((task) => (
                  <p key={task} className="flex items-start gap-2 text-sm font-medium leading-6 text-slate-700">
                    <CheckCircle2 className="mt-1 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
                    {task}
                  </p>
                ))}
              </div>
              <p className="mt-4 rounded-lg bg-white p-3 text-xs font-semibold leading-5 text-navy-900 ring-1 ring-slate-200">{phase.successSignal}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <Panel title="Value Created" eyebrow="Pilot evidence" icon={<LineChart className="h-5 w-5" />}>
          <div className="grid gap-3 sm:grid-cols-2">
            {valueCreated.map((item) => (
              <div key={item.label} className="rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{item.label}</p>
                <p className="mt-2 text-2xl font-semibold text-navy-950">{item.countOnly ? item.value : formatCurrency(item.value)}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.detail}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Pilot Risks" eyebrow="Risk control" icon={<AlertTriangle className="h-5 w-5" />}>
          <div className="space-y-3">
            {risks.map((risk) => (
              <div key={risk.title} className="rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-navy-950">{risk.title}</p>
                  <Badge label={risk.severity} className={severityClasses[risk.severity]} />
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{risk.why}</p>
                <p className="mt-3 rounded-lg bg-white p-3 text-sm font-semibold leading-6 text-clinical-900 ring-1 ring-clinical-100">{risk.action}</p>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
        <SectionHeader eyebrow="Role-based action plan" title="Who Does What Today" icon={<UsersRound className="h-5 w-5" />} />
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rolePlan.map((role) => (
            <article key={role.role} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-lg font-semibold tracking-tight text-navy-950">{role.role}</h3>
              <div className="mt-3 space-y-2">
                {role.actions.map((action) => <p key={action} className="text-sm font-medium leading-6 text-slate-700">{action}</p>)}
              </div>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.1em] text-clinical-700">Pages</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {role.pages.map((page) => <span key={page} className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">{page}</span>)}
              </div>
              <p className="mt-4 rounded-lg bg-white p-3 text-sm font-semibold leading-6 text-navy-900 ring-1 ring-slate-200">{role.successMeasure}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <Panel title="First 7-Day Executive Review Pack" eyebrow="Boardroom evidence" icon={<FileSpreadsheet className="h-5 w-5" />}>
          <ReviewLine label="Imported data summary" value={reviewPack.importedDataSummary} />
          <ReviewLine label="Discovered issues" value={reviewPack.discoveredIssues} />
          <ReviewLine label="Actions taken" value={reviewPack.actionsTaken} />
          <ReviewLine label="Revenue/patient risks" value={reviewPack.revenuePatientRisks} />
          <div className="mt-4 rounded-lg bg-navy-950 p-4 text-sm leading-7 text-white">{reviewPack.summary}</div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {reviewPack.nextPriorities.map((priority) => (
              <p key={priority} className="rounded-lg bg-clinical-50 p-3 text-sm font-semibold leading-6 text-clinical-900">{priority}</p>
            ))}
          </div>
        </Panel>

        <Panel title="Pilot Decision Readiness" eyebrow="Rollout gate" icon={<Bot className="h-5 w-5" />}>
          <div className="grid gap-3">
            {decision.options.map((option) => (
              <div key={option.label} className={option.active ? "rounded-lg bg-emerald-50 p-4 ring-1 ring-emerald-100" : "rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200"}>
                <p className={option.active ? "text-sm font-semibold text-emerald-700" : "text-sm font-semibold text-slate-700"}>{option.label}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 rounded-lg bg-navy-950 p-4 text-sm font-semibold leading-7 text-white">Recommendation: {decision.recommendation}</p>
          <p className="mt-3 text-sm leading-7 text-slate-600">{decision.summary}</p>
        </Panel>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <ScoreCard label="Readiness formula" value={`${getPilotReadinessScore(data)}%`} detail="Blends import completion, activation, and value confidence." />
        <ScoreCard label="Import completion" value={`${getDataImportCompletion(data)}%`} detail="Measures core template coverage across the pilot." />
        <ScoreCard label="Value confidence" value={`${getValueConfidenceScore(data)}%`} detail="Measures whether enough live data exists to prove value." />
        <ScoreCard label="Activation score" value={`${getOperationalActivationScore(data)}%`} detail="Measures whether teams have actionable workflows." />
      </section>
    </div>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-lg bg-white p-4 text-navy-950">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold leading-7">{value}</p>
    </article>
  );
}

function Kpi({ title, value, icon, tone = "white" }: { title: string; value: string; icon: ReactNode; tone?: "white" | "amber" | "rose" | "emerald" }) {
  const toneClass = tone === "amber" ? "bg-amber-50 text-amber-700" : tone === "rose" ? "bg-rose-50 text-rose-700" : tone === "emerald" ? "bg-emerald-50 text-emerald-700" : "bg-white text-clinical-700";
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-soft">
      <div className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${toneClass}`}>{icon}</div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-navy-950">{value}</p>
    </article>
  );
}

function Badge({ label, className }: { label: string; className: string }) {
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ring-1 ${className}`}>{label}</span>;
}

function SectionHeader({ eyebrow, title, icon }: { eyebrow: string; title: string; icon: ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-clinical-700">
      {icon}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em]">{eyebrow}</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-navy-950">{title}</h2>
      </div>
    </div>
  );
}

function Panel({ title, eyebrow, icon, children }: { title: string; eyebrow: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
      <SectionHeader eyebrow={eyebrow} title={title} icon={icon} />
      <div className="mt-5">{children}</div>
    </section>
  );
}

function ReviewLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-3 rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm leading-6 text-slate-700">{value}</p>
    </div>
  );
}

function ScoreCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-soft">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-navy-950">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p>
    </article>
  );
}
