import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  DollarSign,
  MessageSquareReply,
  ShieldAlert
} from "lucide-react";
import Link from "next/link";
import { FollowUpTaskCard } from "@/components/follow-up-task-card";
import { StatCard } from "@/components/stat-card";
import { estimateMonthlyPatientValue } from "@/lib/chronic";
import { serializeFollowUpTaskForClient } from "@/lib/follow-up-serialization";
import { daysFromNow, formatCurrency } from "@/lib/format";
import { getFollowUpQueueData } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function FollowUpsPage() {
  const { tasks, staff, completedThisWeek } = await getFollowUpQueueData();
  const staffOptions = staff.map((member) => ({ id: member.id, name: member.name, role: member.role, branchId: member.branchId, branchName: member.branch?.name ?? null }));
  const workloadTasks = tasks.map((item) => ({ id: item.id, branchId: item.branchId, assignedStaffId: item.assignedStaffId, status: item.status, dueDate: item.dueDate.toISOString() }));
  const activeTasks = tasks.filter((task) => task.status !== "DONE" && task.status !== "CANCELLED");
  const tasksDueToday = activeTasks.filter((task) => daysFromNow(task.dueDate) === 0 && !isSnoozedFuture(task)).length;
  const overdueTasks = activeTasks.filter((task) => (daysFromNow(task.dueDate) < 0 || task.type === "OVERDUE") && !isSnoozedFuture(task)).length;
  const revenueAtRisk = activeTasks
    .filter((task) => daysFromNow(task.dueDate) < 0 || task.type === "OVERDUE" || task.patient?.riskScore === "HIGH" || task.type === "LOST_PATIENT_REVIVAL")
    .reduce((sum, task) => sum + (task.patient ? estimateMonthlyPatientValue(task.patient) : 0), 0);
  const highRiskTasks = activeTasks.filter((task) => task.patient?.riskScore === "HIGH").length;
  const lanes = [
    { title: "Critical overdue", helper: "Recover missed refills, patient risk, and revenue leakage first.", tasks: activeTasks.filter((task) => !isSnoozedFuture(task) && (daysFromNow(task.dueDate) < 0 || task.type === "OVERDUE" || task.patient?.riskScore === "HIGH")), urgent: true },
    { title: "Due today", helper: "Clear today’s refill and payment work before close.", tasks: activeTasks.filter((task) => !isSnoozedFuture(task) && daysFromNow(task.dueDate) === 0 && task.status !== "IN_PROGRESS"), urgent: false },
    { title: "In progress", helper: "Tasks already being worked by staff.", tasks: activeTasks.filter((task) => task.status === "IN_PROGRESS"), urgent: false },
    { title: "Snoozed", helper: "Paused follow-ups that return when their snooze date arrives.", tasks: activeTasks.filter(isSnoozedFuture), urgent: false },
    { title: "Upcoming", helper: "Next follow-ups to prepare before they become urgent.", tasks: activeTasks.filter((task) => !isSnoozedFuture(task) && daysFromNow(task.dueDate) > 0 && task.status !== "IN_PROGRESS"), urgent: false },
    { title: "Recently completed", helper: "Completed follow-ups with recorded outcomes and value.", tasks: tasks.filter((task) => task.status === "DONE").slice(0, 8), urgent: false }
  ];

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-lg border border-navy-800 bg-navy-950 p-5 text-white shadow-[0_28px_80px_rgba(6,21,38,0.22)] sm:p-6 xl:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.12),transparent_36%),linear-gradient(180deg,rgba(75,158,201,0.18),transparent_58%)]" />
        <div className="relative grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-clinical-100 ring-1 ring-white/15">
              <MessageSquareReply className="h-3.5 w-3.5" aria-hidden="true" />
              Chronic Revenue Recovery
            </span>
            <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Revenue Recovery Queue
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-200">
              Turn refill reminders, overdue patients, prescription blockers, payment nudges, and delivery checks into recovered chronic revenue.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <HeroSignal label="Revenue at risk" value={formatCurrency(revenueAtRisk)} helper="Linked chronic value in urgent queues" tone="risk" />
            <HeroSignal label="Overdue work" value={String(overdueTasks)} helper="Tasks needing immediate action" tone="risk" />
            <HeroSignal label="High-risk patients" value={String(highRiskTasks)} helper="Clinical and retention priority" />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Tasks due today" value={String(tasksDueToday)} helper="Follow-ups to clear before close" icon={<CalendarClock className="h-5 w-5" />} tone="blue" trend="Today" />
        <StatCard title="Overdue tasks" value={String(overdueTasks)} helper="Revenue recovery priority" icon={<AlertTriangle className="h-5 w-5" />} tone="rose" trend="Urgent" />
        <StatCard title="Revenue at risk" value={formatCurrency(revenueAtRisk)} helper="Estimated monthly chronic value" icon={<DollarSign className="h-5 w-5" />} tone="navy" trend="Recover" />
        <StatCard title="Completed this week" value={String(completedThisWeek)} helper="Done follow-ups since week start" icon={<CheckCircle2 className="h-5 w-5" />} tone="emerald" trend="Discipline" />
      </section>

      {tasks.length === 0 ? (
        <section className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center shadow-soft">
          <h2 className="text-2xl font-semibold tracking-tight text-navy-950">No follow-ups yet</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-600">Follow-ups protect chronic revenue by turning refill reminders, payment nudges, prescription renewals, and delivery checks into assigned work.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link href="/patients" className="focus-ring rounded-lg bg-navy-950 px-4 py-2.5 text-sm font-semibold text-white">Review Patients</Link>
            <Link href="/imports" className="focus-ring rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700">Import Follow-Ups</Link>
          </div>
        </section>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-2">
        {lanes.map((lane) => {
          const group = lane.tasks;
          const groupValue = group.reduce((sum, task) => sum + (task.patient ? estimateMonthlyPatientValue(task.patient) : 0), 0);
          const urgent = lane.urgent || group.some((task) => task.patient?.riskScore === "HIGH" || daysFromNow(task.dueDate) < 0);

          return (
            <section key={lane.title} className={urgent ? "rounded-lg border border-rose-200 bg-rose-50/50 p-4" : "rounded-lg border border-slate-200 bg-slate-50 p-4"}>
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    {urgent ? <ShieldAlert className="h-4 w-4 text-rose-700" aria-hidden="true" /> : <MessageSquareReply className="h-4 w-4 text-clinical-700" aria-hidden="true" />}
                    <h2 className="text-lg font-semibold text-navy-950">{lane.title}</h2>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{lane.helper}</p>
                </div>
                <div className="shrink-0 text-right">
                  <span className={urgent ? "rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700 ring-1 ring-rose-200" : "rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200"}>
                    {group.length}
                  </span>
                  <p className="mt-2 text-xs font-semibold text-slate-500">{formatCurrency(groupValue)}</p>
                </div>
              </div>
              <div className="grid gap-3">
                {group.length > 0 ? (
                  group.map((task) => <FollowUpTaskCard key={task.id} task={serializeFollowUpTaskForClient(task)} staff={staffOptions} allTasks={workloadTasks} />)
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">
                    No active tasks in this queue.
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function isSnoozedFuture(task: { status: string; snoozedUntil?: Date | null }) {
  if (task.status !== "SNOOZED" || !task.snoozedUntil) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return task.snoozedUntil >= today;
}

function HeroSignal({
  label,
  value,
  helper,
  tone = "default"
}: {
  label: string;
  value: string;
  helper: string;
  tone?: "default" | "risk";
}) {
  return (
    <div className={tone === "risk" ? "rounded-lg border border-rose-300/20 bg-rose-300/10 p-4" : "rounded-lg border border-white/10 bg-white/10 p-4"}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-white">{value}</p>
      <p className="mt-1 text-sm text-slate-300">{helper}</p>
    </div>
  );
}
