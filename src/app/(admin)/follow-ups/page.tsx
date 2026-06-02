import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  DollarSign,
  MessageSquareReply,
  ShieldAlert
} from "lucide-react";
import { FollowUpTaskCard } from "@/components/follow-up-task-card";
import { StatCard } from "@/components/stat-card";
import { estimateMonthlyPatientValue } from "@/lib/chronic";
import { daysFromNow, enumLabel, formatCurrency } from "@/lib/format";
import { followUpTypeOptions, getFollowUpQueueData } from "@/lib/data";

export const dynamic = "force-dynamic";

const groupCopy: Record<string, string> = {
  DUE_TODAY: "Convert due refills before patients drift into overdue status.",
  OVERDUE: "Recover missed chronic revenue and protect medication adherence.",
  PRESCRIPTION_RENEWAL_NEEDED: "Remove prescription blockers before the next refill cycle.",
  PAYMENT_PENDING: "Turn prepared orders into collected revenue.",
  DELIVERY_CONFIRMATION: "Confirm delivery details before dispatch friction appears.",
  LOST_PATIENT_REVIVAL: "Win back patients before they disappear from the chronic book."
};

export default async function FollowUpsPage() {
  const { tasks, completedThisWeek } = await getFollowUpQueueData();
  const tasksDueToday = tasks.filter((task) => daysFromNow(task.dueDate) === 0).length;
  const overdueTasks = tasks.filter((task) => daysFromNow(task.dueDate) < 0 || task.type === "OVERDUE").length;
  const revenueAtRisk = tasks
    .filter((task) => daysFromNow(task.dueDate) < 0 || task.type === "OVERDUE" || task.patient?.riskScore === "HIGH" || task.type === "LOST_PATIENT_REVIVAL")
    .reduce((sum, task) => sum + (task.patient ? estimateMonthlyPatientValue(task.patient) : 0), 0);
  const highRiskTasks = tasks.filter((task) => task.patient?.riskScore === "HIGH").length;

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

      <div className="grid gap-5 xl:grid-cols-2">
        {followUpTypeOptions.map((type) => {
          const group = tasks.filter((task) => task.type === type);
          const groupValue = group.reduce((sum, task) => sum + (task.patient ? estimateMonthlyPatientValue(task.patient) : 0), 0);
          const urgent = type === "OVERDUE" || type === "LOST_PATIENT_REVIVAL" || group.some((task) => task.patient?.riskScore === "HIGH" || daysFromNow(task.dueDate) < 0);

          return (
            <section key={type} className={urgent ? "rounded-lg border border-rose-200 bg-rose-50/50 p-4" : "rounded-lg border border-slate-200 bg-slate-50 p-4"}>
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    {urgent ? <ShieldAlert className="h-4 w-4 text-rose-700" aria-hidden="true" /> : <MessageSquareReply className="h-4 w-4 text-clinical-700" aria-hidden="true" />}
                    <h2 className="text-lg font-semibold text-navy-950">{enumLabel(type)}</h2>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{groupCopy[type]}</p>
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
                  group.map((task) => <FollowUpTaskCard key={task.id} task={task} />)
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
