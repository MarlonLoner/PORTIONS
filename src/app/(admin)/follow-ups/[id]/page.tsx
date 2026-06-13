import { notFound } from "next/navigation";
import { ArrowLeft, History, MessageSquareReply, Pill, UserRound } from "lucide-react";
import Link from "next/link";
import { FollowUpTaskCard } from "@/components/follow-up-task-card";
import { StatusBadge } from "@/components/status-badge";
import { enumLabel, formatCurrency, formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function FollowUpDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [task, staff, allTasks] = await Promise.all([
    prisma.followUpTask.findUnique({
      where: { id },
      include: {
        branch: true,
        assignedStaff: true,
        patient: { include: { assignedStaff: true, medications: true, refillEvents: true } },
        activities: { orderBy: { createdAt: "desc" } }
      }
    }),
    prisma.staffMember.findMany({ include: { branch: true }, orderBy: { name: "asc" } }),
    prisma.followUpTask.findMany({ select: { id: true, branchId: true, assignedStaffId: true, status: true, dueDate: true } })
  ]);

  if (!task) notFound();

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-lg border border-navy-800 bg-navy-950 p-5 text-white shadow-[0_28px_80px_rgba(6,21,38,0.22)] sm:p-6 xl:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.12),transparent_36%),linear-gradient(180deg,rgba(75,158,201,0.18),transparent_58%)]" />
        <div className="relative">
          <Link href="/follow-ups" className="inline-flex items-center gap-2 text-sm font-semibold text-clinical-100 hover:text-white">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to Follow-Up Queue
          </Link>
          <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-clinical-100 ring-1 ring-white/15">
                <MessageSquareReply className="h-3.5 w-3.5" aria-hidden="true" />
                Follow-up command profile
              </span>
              <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">{task.customerName}</h1>
              <p className="mt-4 max-w-4xl text-base leading-7 text-slate-200">{task.reason}</p>
            </div>
            <StatusBadge status={task.status} />
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_0.8fr]">
        <FollowUpTaskCard
          task={task}
          staff={staff.map((member) => ({ id: member.id, name: member.name, role: member.role, branchId: member.branchId, branchName: member.branch?.name ?? null }))}
          allTasks={allTasks.map((item) => ({ id: item.id, branchId: item.branchId, assignedStaffId: item.assignedStaffId, status: item.status, dueDate: item.dueDate.toISOString() }))}
        />

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <div className="flex items-center gap-2 text-clinical-700">
            <UserRound className="h-5 w-5" aria-hidden="true" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em]">Patient context</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-navy-950">{task.patient?.name ?? task.customerName}</h2>
            </div>
          </div>
          <div className="mt-5 grid gap-3">
            <Mini label="Branch" value={task.branch.name} />
            <Mini label="Type" value={enumLabel(task.type)} />
            <Mini label="Due date" value={formatDateTime(task.dueDate)} />
            <Mini label="Assigned staff" value={task.assignedStaff?.name ?? "Unassigned"} />
            <Mini label="Outcome" value={task.outcomeType ? enumLabel(task.outcomeType) : "Not recorded"} />
            <Mini label="Value" value={formatCurrency(task.valueAmount)} />
          </div>
          {task.patient?.medications.length ? (
            <div className="mt-5 rounded-lg bg-clinical-50 p-4 ring-1 ring-clinical-100">
              <div className="flex items-center gap-2 text-clinical-800">
                <Pill className="h-4 w-4" aria-hidden="true" />
                <p className="text-sm font-semibold">Medication context</p>
              </div>
              <div className="mt-3 space-y-2">
                {task.patient.medications.map((medication) => <p key={medication.id} className="text-sm leading-6 text-clinical-900">{medication.name} - {medication.frequency}</p>)}
              </div>
            </div>
          ) : null}
        </section>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
        <div className="flex items-center gap-2 text-clinical-700">
          <History className="h-5 w-5" aria-hidden="true" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em]">Audit timeline</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-navy-950">Execution History</h2>
          </div>
        </div>
        <div className="mt-5 space-y-3">
          {task.activities.length ? task.activities.map((activity) => (
            <div key={activity.id} className="rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-navy-950">{activity.activityType.replace(/_/g, " ")}</p>
                <p className="text-xs font-semibold text-slate-500">{formatDateTime(activity.createdAt)}</p>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">{activity.description}</p>
            </div>
          )) : <p className="rounded-lg bg-slate-50 p-5 text-sm leading-6 text-slate-600 ring-1 ring-slate-200">No follow-up activity has been recorded yet.</p>}
        </div>
      </section>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold leading-5 text-navy-950">{value}</p>
    </div>
  );
}
