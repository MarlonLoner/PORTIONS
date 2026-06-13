import { CheckCircle2, ExternalLink, MessageSquareText, PhoneCall, Send, ShieldAlert, UsersRound } from "lucide-react";
import Link from "next/link";
import { CommunicationsCenter, type CommunicationRecord } from "@/components/communications-center";
import { StatCard } from "@/components/stat-card";
import { getCommunicationCenterData, buildCommunicationMetrics } from "@/lib/communications";

export const dynamic = "force-dynamic";

export default async function CommunicationsPage() {
  const { communications, branches, staff } = await getCommunicationCenterData();
  const metrics = buildCommunicationMetrics(communications);
  const records: CommunicationRecord[] = communications.map((communication) => ({
    id: communication.id,
    channel: communication.channel,
    status: communication.status,
    direction: communication.direction,
    recipientName: communication.recipientName,
    recipientPhone: communication.recipientPhone,
    recipientType: communication.recipientType,
    message: communication.message,
    subject: communication.subject,
    sourceType: communication.sourceType,
    sourceId: communication.sourceId,
    patientId: communication.patientId,
    orderId: communication.orderId,
    followUpTaskId: communication.followUpTaskId,
    operationalActionId: communication.operationalActionId,
    notificationId: communication.notificationId,
    eventId: communication.eventId,
    assignedStaffId: communication.assignedStaffId,
    assignedStaff: communication.assignedStaff ? { id: communication.assignedStaff.id, name: communication.assignedStaff.name, role: communication.assignedStaff.role } : null,
    branchId: communication.branchId,
    branch: communication.branch ? { id: communication.branch.id, name: communication.branch.name } : null,
    openedAt: communication.openedAt?.toISOString() ?? null,
    sentAt: communication.sentAt?.toISOString() ?? null,
    respondedAt: communication.respondedAt?.toISOString() ?? null,
    completedAt: communication.completedAt?.toISOString() ?? null,
    responseText: communication.responseText,
    outcomeType: communication.outcomeType,
    followUpRequired: communication.followUpRequired,
    createdAt: communication.createdAt.toISOString()
  }));

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-lg border border-navy-800 bg-navy-950 p-5 text-white shadow-[0_28px_80px_rgba(6,21,38,0.22)] sm:p-6 xl:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.12),transparent_36%),linear-gradient(180deg,rgba(75,158,201,0.18),transparent_58%)]" />
        <div className="relative grid gap-7 xl:grid-cols-[1.15fr_0.85fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-clinical-100 ring-1 ring-white/15">
              <MessageSquareText className="h-3.5 w-3.5" aria-hidden="true" />
              Manual Delivery Control
            </span>
            <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">Communication Delivery Center</h1>
            <p className="mt-4 max-w-4xl text-base leading-7 text-slate-200">
              Prepare, send, confirm, and track messages linked to patient care, revenue recovery, events, orders, and operational execution.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/follow-ups" className="focus-ring inline-flex items-center rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-navy-950">Open Follow-Up Queue</Link>
              <Link href="/notifications" className="focus-ring inline-flex items-center rounded-lg bg-white/10 px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-white/15">Open Notifications</Link>
              <Link href="/action-center" className="focus-ring inline-flex items-center rounded-lg bg-white/10 px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-white/15">Open Action Center</Link>
            </div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/10 p-5">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-emerald-200" aria-hidden="true" />
              <h2 className="text-lg font-semibold">Delivery rule</h2>
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-100">{metrics.summary}</p>
            <p className="mt-4 rounded-lg bg-white p-3 text-sm font-semibold leading-6 text-navy-950">
              Opening WhatsApp prepares the handoff. Staff must still confirm sent, record the response, and close the outcome manually.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Drafts" value={String(metrics.drafts)} helper="Need phone or message cleanup" icon={<MessageSquareText className="h-5 w-5" />} tone={metrics.drafts > 0 ? "amber" : "emerald"} trend="Draft" />
        <StatCard title="Ready to send" value={String(metrics.ready)} helper="Prepared for manual handoff" icon={<ExternalLink className="h-5 w-5" />} tone={metrics.ready > 0 ? "blue" : "emerald"} trend="Ready" />
        <StatCard title="Opened in WhatsApp" value={String(metrics.opened)} helper="Not yet confirmed sent" icon={<PhoneCall className="h-5 w-5" />} tone={metrics.opened > 0 ? "amber" : "emerald"} trend="Opened" />
        <StatCard title="Sent today" value={String(metrics.sentToday)} helper="Manually confirmed deliveries" icon={<Send className="h-5 w-5" />} tone="emerald" trend="Sent" />
        <StatCard title="Awaiting response" value={String(metrics.awaitingResponse)} helper="Sent but no outcome yet" icon={<UsersRound className="h-5 w-5" />} tone={metrics.awaitingResponse > 0 ? "amber" : "emerald"} trend="Response" />
        <StatCard title="Responses received" value={String(metrics.responsesReceived)} helper={`${metrics.responseRate}% response rate`} icon={<CheckCircle2 className="h-5 w-5" />} tone="emerald" trend="Outcome" />
        <StatCard title="Follow-ups required" value={String(metrics.followUpsRequired)} helper="Needs next action date" icon={<ShieldAlert className="h-5 w-5" />} tone={metrics.followUpsRequired > 0 ? "rose" : "emerald"} trend="Follow-up" />
        <StatCard title="Failed communications" value={String(metrics.failed)} helper="Delivery or contact problem" icon={<ShieldAlert className="h-5 w-5" />} tone={metrics.failed > 0 ? "rose" : "emerald"} trend="Failed" />
      </section>

      <CommunicationsCenter
        initialCommunications={records}
        branches={branches.map((branch) => ({ id: branch.id, name: branch.name }))}
        staff={staff.map((member) => ({ id: member.id, name: member.name, role: member.role, branchId: member.branchId }))}
      />
    </div>
  );
}
