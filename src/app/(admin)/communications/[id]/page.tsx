import { notFound } from "next/navigation";
import { ArrowLeft, Clock, ExternalLink, History, MessageSquareText, PhoneCall, UserRound } from "lucide-react";
import Link from "next/link";
import { CommunicationDetailActions } from "@/components/communication-detail-actions";
import { getCommunicationDetail, getRecommendedCommunicationSender, getWhatsappUrl } from "@/lib/communications";
import { enumLabel, formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const statusClasses: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700 ring-slate-200",
  READY: "bg-clinical-50 text-clinical-800 ring-clinical-200",
  OPENED: "bg-amber-50 text-amber-700 ring-amber-200",
  SENT: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  FAILED: "bg-rose-50 text-rose-700 ring-rose-200",
  RESPONDED: "bg-blue-50 text-blue-700 ring-blue-200",
  COMPLETED: "bg-navy-950 text-white ring-navy-900",
  CANCELLED: "bg-slate-100 text-slate-500 ring-slate-200"
};

export default async function CommunicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [communication, staff] = await Promise.all([
    getCommunicationDetail(id),
    prisma.staffMember.findMany({ include: { branch: true }, orderBy: { name: "asc" } })
  ]);
  if (!communication) notFound();

  const recommendation = getRecommendedCommunicationSender(communication, staff.map((member) => ({ id: member.id, name: member.name, role: member.role, branchId: member.branchId })));
  const whatsappUrl = getWhatsappUrl(communication);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-lg border border-navy-800 bg-navy-950 p-5 text-white shadow-[0_28px_80px_rgba(6,21,38,0.22)] sm:p-6 xl:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.12),transparent_36%),linear-gradient(180deg,rgba(75,158,201,0.18),transparent_58%)]" />
        <div className="relative">
          <Link href="/communications" className="inline-flex items-center gap-2 text-sm font-semibold text-clinical-100 hover:text-white">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to Communication Center
          </Link>
          <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-clinical-100 ring-1 ring-white/15">
                <MessageSquareText className="h-3.5 w-3.5" aria-hidden="true" />
                Communication command profile
              </span>
              <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">{communication.recipientName}</h1>
              <p className="mt-4 max-w-4xl text-base leading-7 text-slate-200">{communication.subject ?? "Manual communication workflow"}</p>
            </div>
            <span className={`rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] ring-1 ${statusClasses[communication.status]}`}>
              {enumLabel(communication.status)}
            </span>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <div className="flex items-center gap-2 text-clinical-700">
            <UserRound className="h-5 w-5" aria-hidden="true" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em]">Recipient and source</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-navy-950">{communication.recipientName}</h2>
            </div>
          </div>
          <div className="mt-5 grid gap-3">
            <Mini label="Phone" value={communication.recipientPhone ?? "Phone required"} tone={communication.recipientPhone ? "normal" : "risk"} />
            <Mini label="Recipient type" value={enumLabel(communication.recipientType)} />
            <Mini label="Channel" value={enumLabel(communication.channel)} />
            <Mini label="Branch" value={communication.branch?.name ?? "Network"} />
            <Mini label="Assigned sender" value={communication.assignedStaff?.name ?? "Unassigned"} />
            <Mini label="Source" value={enumLabel(communication.sourceType)} />
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {sourceLink(communication) ? <Link href={sourceLink(communication)!} className="focus-ring inline-flex items-center gap-2 rounded-lg bg-navy-950 px-3 py-2 text-xs font-semibold text-white">Open linked source <ExternalLink className="h-3.5 w-3.5" /></Link> : null}
            {whatsappUrl ? <a href={whatsappUrl} target="_blank" rel="noreferrer" className="focus-ring inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">Preview WhatsApp link <ExternalLink className="h-3.5 w-3.5" /></a> : null}
          </div>
        </section>

        <CommunicationDetailActions
          communication={{
            id: communication.id,
            status: communication.status,
            message: communication.message,
            recipientPhone: communication.recipientPhone,
            assignedStaffId: communication.assignedStaffId,
            branchId: communication.branchId,
            outcomeType: communication.outcomeType,
            outcomeNotes: communication.outcomeNotes,
            responseText: communication.responseText,
            followUpRequired: communication.followUpRequired,
            followUpDate: communication.followUpDate?.toISOString() ?? null,
            followUpTaskId: communication.followUpTaskId,
            orderId: communication.orderId
          }}
          staff={staff.map((member) => ({ id: member.id, name: member.name, role: member.role, branchId: member.branchId }))}
          recommendedSender={recommendation.staff ? { id: recommendation.staff.id, name: recommendation.staff.name } : null}
          recommendationReason={recommendation.reason}
          whatsappUrl={whatsappUrl}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <div className="flex items-center gap-2 text-clinical-700">
            <Clock className="h-5 w-5" aria-hidden="true" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em]">Timestamps</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-navy-950">Delivery lifecycle</h2>
            </div>
          </div>
          <div className="mt-5 grid gap-3">
            <Mini label="Created" value={formatDateTime(communication.createdAt)} />
            <Mini label="Opened" value={communication.openedAt ? formatDateTime(communication.openedAt) : "Not opened"} />
            <Mini label="Sent" value={communication.sentAt ? formatDateTime(communication.sentAt) : "Not confirmed sent"} />
            <Mini label="Responded" value={communication.respondedAt ? formatDateTime(communication.respondedAt) : "No response recorded"} />
            <Mini label="Completed" value={communication.completedAt ? formatDateTime(communication.completedAt) : "Not completed"} />
          </div>
          <div className="mt-5 rounded-lg bg-clinical-50 p-4 ring-1 ring-clinical-100">
            <div className="flex items-center gap-2 text-clinical-800">
              <PhoneCall className="h-4 w-4" aria-hidden="true" />
              <p className="text-sm font-semibold">Manual delivery discipline</p>
            </div>
            <p className="mt-2 text-sm leading-6 text-clinical-900">PORTIONS tracks preparation, WhatsApp opening, manual sent confirmation, responses, outcomes, and follow-up requirements. It does not claim provider delivery success.</p>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <div className="flex items-center gap-2 text-clinical-700">
            <History className="h-5 w-5" aria-hidden="true" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em]">Audit timeline</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-navy-950">Communication activity</h2>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {communication.activities.length ? communication.activities.map((activity) => (
              <div key={activity.id} className="rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-navy-950">{activity.activityType.replace(/_/g, " ")}</p>
                  <p className="text-xs font-semibold text-slate-500">{formatDateTime(activity.createdAt)}</p>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{activity.description}</p>
              </div>
            )) : <p className="rounded-lg bg-slate-50 p-5 text-sm leading-6 text-slate-600 ring-1 ring-slate-200">No communication activity has been recorded yet.</p>}
          </div>
        </section>
      </section>
    </div>
  );
}

function sourceLink(communication: { followUpTaskId: string | null; orderId: string | null; operationalActionId: string | null; notificationId: string | null; eventId: string | null; patientId: string | null }) {
  if (communication.followUpTaskId) return `/follow-ups/${communication.followUpTaskId}`;
  if (communication.orderId) return `/orders/${communication.orderId}`;
  if (communication.operationalActionId) return `/action-center/${communication.operationalActionId}`;
  if (communication.notificationId) return "/notifications";
  if (communication.eventId) return `/events/${communication.eventId}`;
  if (communication.patientId) return `/patients/${communication.patientId}`;
  return "";
}

function Mini({ label, value, tone = "normal" }: { label: string; value: string; tone?: "normal" | "risk" }) {
  return (
    <div className={tone === "risk" ? "rounded-lg bg-rose-50 p-3 ring-1 ring-rose-100" : "rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200"}>
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</p>
      <p className={tone === "risk" ? "mt-2 text-sm font-semibold leading-5 text-rose-700" : "mt-2 text-sm font-semibold leading-5 text-navy-950"}>{value}</p>
    </div>
  );
}
