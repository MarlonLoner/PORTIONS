"use client";

import { CheckCircle2, Clipboard, Loader2, MessageSquareText, Send, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { enumLabel, formatDateTime } from "@/lib/format";

export type CommunicationRecord = {
  id: string;
  channel: string;
  status: string;
  direction: string;
  recipientName: string;
  recipientPhone: string | null;
  recipientType: string;
  message: string;
  subject: string | null;
  sourceType: string;
  sourceId: string | null;
  patientId: string | null;
  orderId: string | null;
  followUpTaskId: string | null;
  operationalActionId: string | null;
  notificationId: string | null;
  eventId: string | null;
  assignedStaffId: string | null;
  assignedStaff?: { id: string; name: string; role: string } | null;
  branchId: string | null;
  branch?: { id: string; name: string } | null;
  sendingOperatingUnitId: string | null;
  sendingOperatingUnit?: { id: string; name: string; contactLabel: string | null; whatsappNumber: string | null } | null;
  sendingWhatsappNumber: string | null;
  sendingContactLabel: string | null;
  openedAt: string | null;
  sentAt: string | null;
  respondedAt: string | null;
  completedAt: string | null;
  responseText: string | null;
  outcomeType: string | null;
  followUpRequired: boolean;
  createdAt: string;
};

type Option = { id: string; name: string };

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

export function CommunicationsCenter({
  initialCommunications,
  branches,
  staff
}: {
  initialCommunications: CommunicationRecord[];
  branches: Option[];
  staff: Array<Option & { branchId: string | null; role: string }>;
}) {
  const [communications, setCommunications] = useState(initialCommunications);
  const [busyId, setBusyId] = useState("");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({ status: "ALL", channel: "ALL", branch: "ALL", staff: "ALL", recipientType: "ALL", sourceType: "ALL" });
  const [manual, setManual] = useState({ recipientName: "", recipientPhone: "", message: "", branchId: "", assignedStaffId: "" });

  const statusOptions = useMemo(() => Array.from(new Set(communications.map((item) => item.status))).sort(), [communications]);
  const channelOptions = useMemo(() => Array.from(new Set(communications.map((item) => item.channel))).sort(), [communications]);
  const recipientOptions = useMemo(() => Array.from(new Set(communications.map((item) => item.recipientType))).sort(), [communications]);
  const sourceOptions = useMemo(() => Array.from(new Set(communications.map((item) => item.sourceType))).sort(), [communications]);

  const filtered = communications.filter((item) =>
    (filters.status === "ALL" || item.status === filters.status) &&
    (filters.channel === "ALL" || item.channel === filters.channel) &&
    (filters.branch === "ALL" || item.branchId === filters.branch) &&
    (filters.staff === "ALL" || item.assignedStaffId === filters.staff) &&
    (filters.recipientType === "ALL" || item.recipientType === filters.recipientType) &&
    (filters.sourceType === "ALL" || item.sourceType === filters.sourceType)
  );

  const groups = [
    { title: "Ready to send", items: filtered.filter((item) => item.status === "READY") },
    { title: "Opened but not confirmed sent", items: filtered.filter((item) => item.status === "OPENED") },
    { title: "Awaiting response", items: filtered.filter((item) => item.status === "SENT") },
    { title: "Follow-up required", items: filtered.filter((item) => item.followUpRequired) },
    { title: "Recently sent", items: filtered.filter((item) => item.sentAt).slice(0, 8) },
    { title: "Completed", items: filtered.filter((item) => item.status === "COMPLETED") },
    { title: "Failed", items: filtered.filter((item) => item.status === "FAILED") }
  ];

  async function createManualCommunication() {
    setBusyId("manual");
    setError("");
    setFeedback("");
    const response = await fetch("/api/communications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceType: "MANUAL",
        templateType: "GENERAL",
        recipientName: manual.recipientName,
        recipientPhone: manual.recipientPhone,
        message: manual.message,
        branchId: manual.branchId || null,
        assignedStaffId: manual.assignedStaffId || null
      })
    });
    setBusyId("");
    if (!response.ok) {
      const result = await response.json().catch(() => ({ error: "Communication could not be prepared." }));
      setError(result.error ?? "Communication could not be prepared.");
      return;
    }
    const created = await response.json();
    setCommunications((current) => [toRecord(created), ...current.filter((item) => item.id !== created.id)]);
    setManual({ recipientName: "", recipientPhone: "", message: "", branchId: "", assignedStaffId: "" });
    setFeedback("Communication prepared for manual delivery.");
  }

  async function updateCommunication(id: string, payload: Record<string, unknown>, successMessage: string, openWhatsapp = false) {
    setBusyId(id);
    setError("");
    setFeedback("");
    const response = await fetch(`/api/communications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    setBusyId("");
    const result = await response.json().catch(() => ({ error: "Communication update failed." }));
    if (!response.ok) {
      setError(result.error ?? "Communication update failed.");
      return;
    }
    setCommunications((current) => current.map((item) => item.id === id ? toRecord(result) : item));
    setFeedback(successMessage);
    if (openWhatsapp && result.whatsappUrl) window.open(result.whatsappUrl, "_blank", "noopener,noreferrer");
  }

  async function copyMessage(message: string) {
    await navigator.clipboard.writeText(message);
    setFeedback("Message copied.");
  }

  return (
    <section className="space-y-5">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clinical-700">Manual delivery workflow</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-navy-950">Prepare a communication</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Prepare a message, open WhatsApp manually, then confirm sent and record response or outcome inside PORTIONS.
            </p>
          </div>
          <Link href="/notifications" className="focus-ring rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">Open Notifications</Link>
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-5">
          <Input label="Recipient" value={manual.recipientName} onChange={(value) => setManual((current) => ({ ...current, recipientName: value }))} />
          <Input label="Phone" value={manual.recipientPhone} onChange={(value) => setManual((current) => ({ ...current, recipientPhone: value }))} />
          <Select label="Branch" value={manual.branchId} options={branches} onChange={(value) => setManual((current) => ({ ...current, branchId: value }))} />
          <Select label="Sender" value={manual.assignedStaffId} options={staff.filter((member) => !manual.branchId || member.branchId === manual.branchId)} onChange={(value) => setManual((current) => ({ ...current, assignedStaffId: value }))} />
          <button type="button" disabled={busyId === "manual" || !manual.recipientName || !manual.message} onClick={createManualCommunication} className="focus-ring mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-navy-950 px-4 text-sm font-semibold text-white transition hover:bg-navy-800 disabled:opacity-60">
            {busyId === "manual" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <MessageSquareText className="h-4 w-4" aria-hidden="true" />}
            Prepare
          </button>
        </div>
        <label className="mt-3 block">
          <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Message</span>
          <textarea value={manual.message} onChange={(event) => setManual((current) => ({ ...current, message: event.target.value }))} rows={3} className="focus-ring mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-navy-950" />
        </label>
        {feedback ? <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-100">{feedback}</p> : null}
        {error ? <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 ring-1 ring-rose-100">{error}</p> : null}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clinical-700">Filters</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <Filter label="Status" value={filters.status} options={["ALL", ...statusOptions]} onChange={(value) => setFilters((current) => ({ ...current, status: value }))} />
          <Filter label="Channel" value={filters.channel} options={["ALL", ...channelOptions]} onChange={(value) => setFilters((current) => ({ ...current, channel: value }))} />
          <Select label="Branch" value={filters.branch === "ALL" ? "" : filters.branch} options={branches} includeAll onChange={(value) => setFilters((current) => ({ ...current, branch: value || "ALL" }))} />
          <Select label="Assigned staff" value={filters.staff === "ALL" ? "" : filters.staff} options={staff} includeAll onChange={(value) => setFilters((current) => ({ ...current, staff: value || "ALL" }))} />
          <Filter label="Recipient" value={filters.recipientType} options={["ALL", ...recipientOptions]} onChange={(value) => setFilters((current) => ({ ...current, recipientType: value }))} />
          <Filter label="Source" value={filters.sourceType} options={["ALL", ...sourceOptions]} onChange={(value) => setFilters((current) => ({ ...current, sourceType: value }))} />
        </div>
      </div>

      {!communications.length ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center shadow-soft">
          <h2 className="text-2xl font-semibold tracking-tight text-navy-950">No communications prepared yet</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-600">Prepare messages from follow-ups, orders, actions, events, notifications, or manual recipients. PORTIONS will track opened, sent, responses, and outcomes here.</p>
        </div>
      ) : null}

      {groups.map((group) => (
        <div key={group.title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clinical-700">Delivery group</p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-navy-950">{group.title}</h2>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">{group.items.length}</span>
          </div>
          <div className="mt-5 grid gap-4">
            {group.items.length ? group.items.map((communication) => (
              <CommunicationCard
                key={communication.id}
                communication={communication}
                busy={busyId === communication.id}
                onUpdate={updateCommunication}
                onCopy={copyMessage}
              />
            )) : <p className="rounded-lg bg-slate-50 p-4 text-sm leading-6 text-slate-600 ring-1 ring-slate-200">No communications in this group.</p>}
          </div>
        </div>
      ))}
    </section>
  );
}

function CommunicationCard({
  communication,
  busy,
  onUpdate,
  onCopy
}: {
  communication: CommunicationRecord;
  busy: boolean;
  onUpdate: (id: string, payload: Record<string, unknown>, message: string, openWhatsapp?: boolean) => Promise<void>;
  onCopy: (message: string) => Promise<void>;
}) {
  const canOpen = Boolean(communication.recipientPhone && communication.message && !["CANCELLED", "COMPLETED"].includes(communication.status));
  return (
    <article className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-navy-950">{communication.recipientName}</h3>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">{communication.message}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge label={enumLabel(communication.status)} className={statusClasses[communication.status] ?? statusClasses.DRAFT} />
          <Badge label={enumLabel(communication.channel)} className="bg-white text-slate-700 ring-slate-200" />
          <Badge label={enumLabel(communication.sourceType)} className="bg-white text-slate-700 ring-slate-200" />
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <Mini label="Phone" value={communication.recipientPhone ?? "Phone required"} tone={communication.recipientPhone ? "normal" : "risk"} />
        <Mini label="Branch" value={communication.branch?.name ?? "Network"} />
        <Mini label="Send from" value={communication.sendingContactLabel ?? communication.sendingOperatingUnit?.name ?? "Not configured"} tone={communication.sendingWhatsappNumber ? "normal" : "risk"} />
        <Mini label="Sender" value={communication.assignedStaff?.name ?? "Unassigned"} />
        <Mini label="Created" value={formatDateTime(communication.createdAt)} />
        <Mini label="Outcome" value={communication.outcomeType ? enumLabel(communication.outcomeType) : "Not recorded"} />
      </div>
      {!communication.recipientPhone ? (
        <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm font-semibold leading-6 text-amber-800 ring-1 ring-amber-100">Recipient phone number is required before WhatsApp delivery.</p>
      ) : null}
      {!communication.sendingWhatsappNumber ? (
        <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm font-semibold leading-6 text-amber-800 ring-1 ring-amber-100">Sending WhatsApp number is not configured for this operating unit.</p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href={`/communications/${communication.id}`} className="focus-ring inline-flex items-center rounded-lg bg-navy-950 px-3 py-2 text-xs font-semibold text-white">Open Communication</Link>
        <Action label="Open WhatsApp" busy={busy} disabled={!canOpen} icon="external" onClick={() => onUpdate(communication.id, { action: "open_whatsapp" }, "WhatsApp handoff opened. Confirm sent after delivery.", true)} />
        <Action label="Mark sent" busy={busy} disabled={communication.status === "CANCELLED" || Boolean(communication.sentAt)} onClick={() => onUpdate(communication.id, { action: "mark_sent" }, "Manual delivery marked sent.")} />
        <Action label="Mark failed" busy={busy} disabled={communication.status === "CANCELLED"} onClick={() => onUpdate(communication.id, { action: "mark_failed" }, "Communication marked failed.")} />
        <Action label="Complete" busy={busy} disabled={communication.status === "COMPLETED"} onClick={() => onUpdate(communication.id, { action: "complete" }, "Communication completed.")} />
        <button type="button" onClick={() => onCopy(communication.message)} className="focus-ring inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
          <Clipboard className="h-3.5 w-3.5" aria-hidden="true" />
          Copy message
        </button>
      </div>
    </article>
  );
}

function Action({ label, busy, disabled, icon, onClick }: { label: string; busy: boolean; disabled?: boolean; icon?: "external"; onClick: () => void }) {
  return (
    <button type="button" disabled={busy || disabled} onClick={onClick} className="focus-ring inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:opacity-60">
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : icon === "external" ? <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /> : <Send className="h-3.5 w-3.5" aria-hidden="true" />}
      {label}
    </button>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label>
      <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} className="focus-ring mt-2 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-navy-950" />
    </label>
  );
}

function Select({ label, value, options, includeAll, onChange }: { label: string; value: string; options: Option[]; includeAll?: boolean; onChange: (value: string) => void }) {
  return (
    <label>
      <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="focus-ring mt-2 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-navy-950">
        <option value="">{includeAll ? "All" : "None"}</option>
        {options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
      </select>
    </label>
  );
}

function Filter({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label>
      <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="focus-ring mt-2 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-navy-950">
        {options.map((option) => <option key={option} value={option}>{option === "ALL" ? "All" : enumLabel(option)}</option>)}
      </select>
    </label>
  );
}

function Mini({ label, value, tone = "normal" }: { label: string; value: string; tone?: "normal" | "risk" }) {
  return (
    <div className={tone === "risk" ? "rounded-lg bg-rose-50 p-3 ring-1 ring-rose-100" : "rounded-lg bg-white p-3 ring-1 ring-slate-200"}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</p>
      <p className={tone === "risk" ? "mt-1 line-clamp-2 text-sm font-semibold leading-5 text-rose-700" : "mt-1 line-clamp-2 text-sm font-semibold leading-5 text-navy-950"}>{value}</p>
    </div>
  );
}

function Badge({ label, className }: { label: string; className: string }) {
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ring-1 ${className}`}>{label}</span>;
}

function toRecord(communication: any): CommunicationRecord {
  return {
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
    assignedStaff: communication.assignedStaff,
    branchId: communication.branchId,
    branch: communication.branch,
    sendingOperatingUnitId: communication.sendingOperatingUnitId,
    sendingOperatingUnit: communication.sendingOperatingUnit,
    sendingWhatsappNumber: communication.sendingWhatsappNumber,
    sendingContactLabel: communication.sendingContactLabel,
    openedAt: communication.openedAt,
    sentAt: communication.sentAt,
    respondedAt: communication.respondedAt,
    completedAt: communication.completedAt,
    responseText: communication.responseText,
    outcomeType: communication.outcomeType,
    followUpRequired: communication.followUpRequired,
    createdAt: communication.createdAt
  };
}
