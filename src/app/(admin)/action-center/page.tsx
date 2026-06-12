import { AlertTriangle, CheckCircle2, ClipboardCheck, DollarSign, Flag, Target, Timer, UsersRound } from "lucide-react";
import Link from "next/link";
import { ActionCenterBoard, type ActionCenterRecord } from "@/components/action-center-board";
import { StatCard } from "@/components/stat-card";
import { getOperationalActionsData } from "@/lib/data";
import { formatCurrency } from "@/lib/format";
import {
  getActionCenterMetrics,
  getActionSuggestedNextStep,
  getActionUrgency,
  getActionsByBranch,
  getActionsByStaff,
  getActionValueSummary,
  getExecutionAiSummary,
  getRecentActionActivity
} from "@/lib/operational-actions";

export const dynamic = "force-dynamic";

export default async function ActionCenterPage() {
  const { actions, branches, staff } = await getOperationalActionsData();
  const metrics = getActionCenterMetrics(actions);
  const branchLoad = getActionsByBranch(actions.filter((action) => action.status !== "COMPLETED" && action.status !== "CANCELLED")).slice(0, 4);
  const staffLoad = getActionsByStaff(actions.filter((action) => action.status !== "COMPLETED" && action.status !== "CANCELLED")).slice(0, 4);
  const recentActivity = getRecentActionActivity(actions);
  const records: ActionCenterRecord[] = actions.map((action) => ({
    id: action.id,
    title: action.title,
    description: action.description,
    category: action.category,
    priority: action.priority,
    status: action.status,
    sourceType: action.sourceType,
    sourceId: action.sourceId,
    branchId: action.branchId,
    branchName: action.branch?.name ?? null,
    assignedStaffId: action.assignedStaffId,
    assignedStaffName: action.assignedStaff?.name ?? null,
    dueDate: action.dueDate?.toISOString() ?? null,
    completedAt: action.completedAt?.toISOString() ?? null,
    outcomeType: action.outcomeType,
    outcomeNotes: action.outcomeNotes,
    valueAmount: Number(action.valueAmount),
    createdAt: action.createdAt.toISOString(),
    urgency: getActionUrgency(action),
    suggestedNextStep: getActionSuggestedNextStep(action)
  }));

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-lg border border-navy-800 bg-navy-950 p-5 text-white shadow-[0_28px_80px_rgba(6,21,38,0.22)] sm:p-6 xl:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.12),transparent_36%),linear-gradient(180deg,rgba(75,158,201,0.18),transparent_58%)]" />
        <div className="relative grid gap-7 xl:grid-cols-[1.1fr_0.9fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-clinical-100 ring-1 ring-white/15">
              <ClipboardCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Execution Discipline
            </span>
            <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">Execution & Accountability Center</h1>
            <p className="mt-4 max-w-4xl text-base leading-7 text-slate-200">
              Turn PORTIONS insights into assigned work, completed actions, and measurable operational outcomes.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/follow-ups" className="focus-ring inline-flex items-center rounded-lg bg-white/10 px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-white/15 transition hover:bg-white/15">Review Follow-Ups</Link>
              <Link href="/orders" className="focus-ring inline-flex items-center rounded-lg bg-white/10 px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-white/15 transition hover:bg-white/15">Review Orders</Link>
              <Link href="/pilot-command" className="focus-ring inline-flex items-center rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-navy-950 transition hover:bg-clinical-50">Open Pilot Command</Link>
            </div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/10 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clinical-100">AI-style execution summary</p>
            <p className="mt-4 text-sm leading-7 text-slate-100">{getExecutionAiSummary(actions)}</p>
            <p className="mt-4 rounded-lg bg-white p-3 text-sm font-semibold leading-6 text-navy-950">{getActionValueSummary(actions)}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Open actions" value={String(metrics.openActions)} helper="Unresolved accountability work" icon={<ClipboardCheck className="h-5 w-5" />} tone="navy" trend="Open" />
        <StatCard title="Due today" value={String(metrics.dueToday)} helper="Must clear before close" icon={<Timer className="h-5 w-5" />} tone={metrics.dueToday > 0 ? "amber" : "emerald"} trend="Today" />
        <StatCard title="Overdue" value={String(metrics.overdue)} helper="Needs escalation or recovery" icon={<AlertTriangle className="h-5 w-5" />} tone={metrics.overdue > 0 ? "rose" : "emerald"} trend="Risk" />
        <StatCard title="In progress" value={String(metrics.inProgress)} helper="Work currently being handled" icon={<Target className="h-5 w-5" />} tone="blue" trend="Active" />
        <StatCard title="Completed this week" value={String(metrics.completedThisWeek)} helper="Recorded outcomes" icon={<CheckCircle2 className="h-5 w-5" />} tone="emerald" trend="Done" />
        <StatCard title="Value recovered" value={formatCurrency(metrics.valueRecovered)} helper="Outcome value recovered" icon={<DollarSign className="h-5 w-5" />} tone="emerald" trend="Recovered" />
        <StatCard title="Value protected" value={formatCurrency(metrics.valueProtected)} helper="Revenue or risk value protected" icon={<Flag className="h-5 w-5" />} tone="navy" trend="Protected" />
        <StatCard title="Critical actions" value={String(metrics.criticalActions)} helper="Highest urgency queue" icon={<AlertTriangle className="h-5 w-5" />} tone={metrics.criticalActions > 0 ? "rose" : "emerald"} trend="Critical" />
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <SignalPanel title="Branch workload" items={branchLoad.map((item) => `${item.name}: ${item.count} open`)} />
        <SignalPanel title="Staff workload" items={staffLoad.map((item) => `${item.name}: ${item.count} assigned`)} />
        <SignalPanel title="Recent activity" items={recentActivity.map((activity) => `${activity.actionTitle}: ${activity.description}`)} />
      </section>

      <ActionCenterBoard
        initialActions={records}
        branches={branches.map((branch) => ({ id: branch.id, name: branch.name }))}
        staff={staff.map((member) => ({ id: member.id, name: member.name, branchId: member.branchId }))}
      />
    </div>
  );
}

function SignalPanel({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clinical-700">Accountability signal</p>
      <h2 className="mt-2 text-xl font-semibold tracking-tight text-navy-950">{title}</h2>
      <div className="mt-4 space-y-2">
        {items.length > 0 ? items.map((item) => (
          <p key={item} className="rounded-lg bg-slate-50 p-3 text-sm font-semibold leading-6 text-slate-700 ring-1 ring-slate-200">{item}</p>
        )) : <p className="rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-600 ring-1 ring-slate-200">No signal yet. Create or complete actions to build accountability history.</p>}
      </div>
    </section>
  );
}
