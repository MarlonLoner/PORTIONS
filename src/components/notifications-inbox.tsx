"use client";

import { CheckCircle2, Clipboard, Loader2, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { PrepareCommunicationButton } from "@/components/prepare-communication-button";
import { enumLabel, formatDateTime } from "@/lib/format";

export type NotificationInboxRecord = {
  id: string;
  type: string;
  severity: string;
  status: string;
  title: string;
  message: string;
  recipientType: string;
  recipientStaffName: string | null;
  recipientRole: string | null;
  branchId: string | null;
  branchName: string | null;
  actionId: string | null;
  sourceType: string | null;
  sourceId: string | null;
  createdAt: string;
  triggeredAt: string | null;
  deliveryChannel: string;
  deliveryStatus: string;
  suggestedAction: string;
  copyMessage: string;
};

const statuses = ["UNREAD", "READ", "ACKNOWLEDGED", "RESOLVED", "DISMISSED"];
const severities = ["INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"];
const channels = ["IN_APP", "EMAIL_READY", "WHATSAPP_READY", "SMS_READY"];

const severityClasses: Record<string, string> = {
  INFO: "bg-slate-100 text-slate-700 ring-slate-200",
  LOW: "bg-clinical-50 text-clinical-800 ring-clinical-200",
  MEDIUM: "bg-amber-50 text-amber-700 ring-amber-200",
  HIGH: "bg-rose-50 text-rose-700 ring-rose-200",
  CRITICAL: "bg-navy-950 text-white ring-navy-900"
};

const statusClasses: Record<string, string> = {
  UNREAD: "bg-clinical-50 text-clinical-800 ring-clinical-200",
  READ: "bg-slate-100 text-slate-700 ring-slate-200",
  ACKNOWLEDGED: "bg-amber-50 text-amber-700 ring-amber-200",
  RESOLVED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  DISMISSED: "bg-slate-100 text-slate-500 ring-slate-200"
};

export function NotificationsInbox({ initialNotifications }: { initialNotifications: NotificationInboxRecord[] }) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [busyId, setBusyId] = useState("");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({ status: "ALL", severity: "ALL", type: "ALL", branch: "ALL", recipient: "ALL", channel: "ALL" });

  const typeOptions = useMemo(() => Array.from(new Set(notifications.map((item) => item.type))).sort(), [notifications]);
  const branchOptions = useMemo(() => Array.from(new Set(notifications.map((item) => item.branchName).filter(Boolean))) as string[], [notifications]);
  const recipientOptions = useMemo(() => Array.from(new Set(notifications.map((item) => item.recipientStaffName ?? item.recipientRole ?? item.recipientType))).sort(), [notifications]);

  const filtered = notifications.filter((item) =>
    (filters.status === "ALL" || item.status === filters.status) &&
    (filters.severity === "ALL" || item.severity === filters.severity) &&
    (filters.type === "ALL" || item.type === filters.type) &&
    (filters.branch === "ALL" || item.branchName === filters.branch) &&
    (filters.recipient === "ALL" || (item.recipientStaffName ?? item.recipientRole ?? item.recipientType) === filters.recipient) &&
    (filters.channel === "ALL" || item.deliveryChannel === filters.channel)
  );

  async function refreshNotifications() {
    setBusyId("generate");
    setError("");
    setFeedback("");
    const response = await fetch("/api/notifications/generate", { method: "POST" });
    if (!response.ok) {
      const result = await response.json().catch(() => ({ error: "Notification refresh failed." }));
      setBusyId("");
      setError(result.error ?? "Notification refresh failed.");
      return;
    }
    const result = await response.json();
    const inbox = await fetch("/api/notifications").then((res) => res.json());
    setNotifications(inbox.map(toRecord));
    setBusyId("");
    if ((result.created ?? 0) + (result.updated ?? 0) + (result.skipped ?? 0) + (result.automaticallyResolved ?? 0) + (result.duplicatesCleaned ?? 0) === 0) {
      setFeedback("Notifications are up to date. No duplicates found.");
    } else {
      setFeedback(`${result.created ?? 0} new alerts created, ${result.updated ?? 0} updated, ${result.skipped ?? 0} already existed, ${result.automaticallyResolved ?? 0} resolved, and ${result.duplicatesCleaned ?? 0} duplicates cleaned.`);
    }
  }

  async function updateNotification(id: string, payload: Record<string, string>, message: string) {
    setBusyId(id);
    setError("");
    setFeedback("");
    const response = await fetch(`/api/notifications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    setBusyId("");
    if (!response.ok) {
      const result = await response.json().catch(() => ({ error: "Notification update failed." }));
      setError(result.error ?? "Notification update failed.");
      return;
    }
    const updated = await response.json();
    setNotifications((current) => current.map((item) => item.id === id ? toRecord(updated) : item));
    setFeedback(message);
  }

  async function copyMessage(message: string) {
    await navigator.clipboard.writeText(message);
    setFeedback("Message copied.");
  }

  const groups = [
    { title: "Critical", items: filtered.filter((item) => item.severity === "CRITICAL" && !isClosed(item)) },
    { title: "Requires attention today", items: filtered.filter((item) => item.type === "ACTION_DUE" && !isClosed(item)) },
    { title: "Overdue", items: filtered.filter((item) => item.type === "ACTION_OVERDUE" && !isClosed(item)) },
    { title: "Management escalations", items: filtered.filter((item) => ["BRANCH_ESCALATION", "MANAGEMENT_ALERT"].includes(item.type) && !isClosed(item)) },
    { title: "Recent", items: filtered.filter((item) => !isClosed(item)).slice(0, 8) },
    { title: "Resolved", items: filtered.filter(isClosed).slice(0, 8) }
  ];

  return (
    <section className="space-y-5">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clinical-700">Notification inbox</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-navy-950">Alerts, reminders, and escalations</h2>
          </div>
          <button type="button" disabled={busyId === "generate"} onClick={refreshNotifications} className="focus-ring inline-flex items-center gap-2 rounded-lg bg-navy-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-800 disabled:opacity-60">
            {busyId === "generate" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />}
            Refresh Notifications
          </button>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <Filter label="Status" value={filters.status} options={["ALL", ...statuses]} onChange={(value) => setFilters((current) => ({ ...current, status: value }))} />
          <Filter label="Severity" value={filters.severity} options={["ALL", ...severities]} onChange={(value) => setFilters((current) => ({ ...current, severity: value }))} />
          <Filter label="Type" value={filters.type} options={["ALL", ...typeOptions]} onChange={(value) => setFilters((current) => ({ ...current, type: value }))} />
          <Filter label="Branch" value={filters.branch} options={["ALL", ...branchOptions]} onChange={(value) => setFilters((current) => ({ ...current, branch: value }))} />
          <Filter label="Recipient" value={filters.recipient} options={["ALL", ...recipientOptions]} onChange={(value) => setFilters((current) => ({ ...current, recipient: value }))} />
          <Filter label="Channel" value={filters.channel} options={["ALL", ...channels]} onChange={(value) => setFilters((current) => ({ ...current, channel: value }))} />
        </div>
        {feedback ? <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-100">{feedback}</p> : null}
        {error ? <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 ring-1 ring-rose-100">{error}</p> : null}
      </div>

      {!notifications.length ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center shadow-soft">
          <h2 className="text-2xl font-semibold tracking-tight text-navy-950">No active alerts</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-600">PORTIONS will surface due, overdue, blocked, unassigned, and critical actions here once notifications are refreshed.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <button type="button" onClick={refreshNotifications} className="focus-ring rounded-lg bg-navy-950 px-4 py-2.5 text-sm font-semibold text-white">Refresh Notifications</button>
            <Link href="/action-center" className="focus-ring rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700">Open Action Center</Link>
          </div>
        </div>
      ) : null}

      {groups.map((group) => (
        <div key={group.title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clinical-700">Inbox group</p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-navy-950">{group.title}</h2>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">{group.items.length}</span>
          </div>
          <div className="mt-5 grid gap-4">
            {group.items.length ? group.items.map((item) => (
              <NotificationCard key={item.id} notification={item} busy={busyId === item.id} onUpdate={updateNotification} onCopy={copyMessage} />
            )) : <p className="rounded-lg bg-slate-50 p-4 text-sm leading-6 text-slate-600 ring-1 ring-slate-200">No notifications in this group.</p>}
          </div>
        </div>
      ))}
    </section>
  );
}

function NotificationCard({ notification, busy, onUpdate, onCopy }: { notification: NotificationInboxRecord; busy: boolean; onUpdate: (id: string, payload: Record<string, string>, message: string) => Promise<void>; onCopy: (message: string) => Promise<void> }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-navy-950">{notification.title}</h3>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">{notification.message}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge label={enumLabel(notification.severity)} className={severityClasses[notification.severity]} />
          <Badge label={enumLabel(notification.status)} className={statusClasses[notification.status]} />
          <Badge label={enumLabel(notification.type)} className="bg-white text-slate-700 ring-slate-200" />
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Mini label="Recipient" value={notification.recipientStaffName ?? notification.recipientRole ?? enumLabel(notification.recipientType)} />
        <Mini label="Branch" value={notification.branchName ?? "Network"} />
        <Mini label="Source" value={notification.sourceType ? enumLabel(notification.sourceType) : "General"} />
        <Mini label="Created" value={formatDateTime(notification.triggeredAt ?? notification.createdAt)} />
        <Mini label="Channel" value={`${enumLabel(notification.deliveryChannel)} / ${enumLabel(notification.deliveryStatus)}`} />
      </div>
      <p className="mt-4 rounded-lg bg-white p-3 text-sm font-semibold leading-6 text-clinical-900 ring-1 ring-clinical-100">{notification.suggestedAction}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Action label="Mark read" busy={busy} onClick={() => onUpdate(notification.id, { status: "READ" }, "Marked read.")} />
        <Action label="Acknowledge" busy={busy} onClick={() => onUpdate(notification.id, { status: "ACKNOWLEDGED" }, "Notification acknowledged.")} />
        <Action label="Resolve" busy={busy} onClick={() => onUpdate(notification.id, { status: "RESOLVED" }, "Notification resolved.")} />
        <Action label="Dismiss" busy={busy} onClick={() => onUpdate(notification.id, { status: "DISMISSED" }, "Notification dismissed.")} />
        <Action label="WhatsApp Ready" busy={busy} onClick={() => onUpdate(notification.id, { deliveryChannel: "WHATSAPP_READY" }, "Marked WhatsApp ready.")} />
        <Action label="Email Ready" busy={busy} onClick={() => onUpdate(notification.id, { deliveryChannel: "EMAIL_READY" }, "Marked email ready.")} />
        <PrepareCommunicationButton sourceType="NOTIFICATION" sourceId={notification.id} templateType="NOTIFICATION_ESCALATION" label="Prepare escalation" />
        {notification.actionId ? <Link href={`/action-center/${notification.actionId}`} className="focus-ring inline-flex items-center rounded-lg bg-navy-950 px-3 py-2 text-xs font-semibold text-white">Open source action</Link> : null}
        <Link href="/action-center" className="focus-ring inline-flex items-center rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">Open Action Center</Link>
        <button type="button" onClick={() => onCopy(notification.copyMessage)} className="focus-ring inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
          <Clipboard className="h-3.5 w-3.5" aria-hidden="true" />
          Copy message
        </button>
      </div>
    </article>
  );
}

function Action({ label, busy, onClick }: { label: string; busy: boolean; onClick: () => void }) {
  return (
    <button type="button" disabled={busy} onClick={onClick} className="focus-ring inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:opacity-60">
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />}
      {label}
    </button>
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

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white p-3 ring-1 ring-slate-200">
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</p>
      <p className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-navy-950">{value}</p>
    </div>
  );
}

function Badge({ label, className }: { label: string; className: string }) {
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ring-1 ${className}`}>{label}</span>;
}

function isClosed(notification: NotificationInboxRecord) {
  return notification.status === "RESOLVED" || notification.status === "DISMISSED";
}

function toRecord(notification: any): NotificationInboxRecord {
  return {
    id: notification.id,
    type: notification.type,
    severity: notification.severity,
    status: notification.status,
    title: notification.title,
    message: notification.message,
    recipientType: notification.recipientType,
    recipientStaffName: notification.recipientStaff?.name ?? null,
    recipientRole: notification.recipientRole,
    branchId: notification.branchId,
    branchName: notification.branch?.name ?? null,
    actionId: notification.actionId,
    sourceType: notification.sourceType,
    sourceId: notification.sourceId,
    createdAt: notification.createdAt,
    triggeredAt: notification.triggeredAt,
    deliveryChannel: notification.deliveryChannel,
    deliveryStatus: notification.deliveryStatus,
    suggestedAction: notification.suggestedAction ?? "Review this notification.",
    copyMessage: notification.copyMessage ?? notification.message
  };
}
