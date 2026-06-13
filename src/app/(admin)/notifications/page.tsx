import { AlertTriangle, BellRing, CheckCircle2, ClipboardCheck, MessageSquareWarning, RadioTower, ShieldAlert, UsersRound } from "lucide-react";
import Link from "next/link";
import { NotificationsInbox, type NotificationInboxRecord } from "@/components/notifications-inbox";
import { StatCard } from "@/components/stat-card";
import { getNotificationInbox, getNotificationCopyMessage, getNotificationSuggestedAction, getNotificationSummary, getEscalationAiSummary, reconcileNotifications } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  await reconcileNotifications();
  const notifications = await getNotificationInbox();
  const summary = getNotificationSummary(notifications);
  const records: NotificationInboxRecord[] = notifications.map((notification) => ({
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
    createdAt: notification.createdAt.toISOString(),
    triggeredAt: notification.triggeredAt?.toISOString() ?? null,
    deliveryChannel: notification.deliveryChannel,
    deliveryStatus: notification.deliveryStatus,
    suggestedAction: getNotificationSuggestedAction(notification),
    copyMessage: getNotificationCopyMessage(notification)
  }));

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-lg border border-navy-800 bg-navy-950 p-5 text-white shadow-[0_28px_80px_rgba(6,21,38,0.22)] sm:p-6 xl:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.12),transparent_36%),linear-gradient(180deg,rgba(75,158,201,0.18),transparent_58%)]" />
        <div className="relative grid gap-7 xl:grid-cols-[1.1fr_0.9fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-clinical-100 ring-1 ring-white/15">
              <BellRing className="h-3.5 w-3.5" aria-hidden="true" />
              Notifications & Escalations
            </span>
            <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">Notifications & Escalations</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-200">
              Surface urgent work, overdue execution, critical risks, and management escalations across PORTIONS.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/action-center" className="focus-ring inline-flex items-center rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-navy-950 transition hover:bg-clinical-50">Open Action Center</Link>
              <Link href="/ai-brief" className="focus-ring inline-flex items-center rounded-lg bg-white/10 px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-white/15 transition hover:bg-white/15">Open AI Brief</Link>
            </div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/10 p-5">
            <div className="flex items-center gap-2">
              <RadioTower className="h-4 w-4 text-emerald-200" aria-hidden="true" />
              <h2 className="text-lg font-semibold">Escalation intelligence</h2>
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-100">{getEscalationAiSummary(notifications)}</p>
            <p className="mt-4 rounded-lg bg-white p-3 text-sm font-semibold leading-6 text-navy-950">
              Operational rule: due, overdue, blocked, unassigned, and critical actions are turned into internal alerts without sending external messages.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Unread alerts" value={String(summary.unread)} helper="Inbox items needing review" icon={<BellRing className="h-5 w-5" />} tone={summary.unread > 0 ? "blue" : "emerald"} trend="Inbox" />
        <StatCard title="Critical alerts" value={String(summary.critical)} helper="Management attention now" icon={<ShieldAlert className="h-5 w-5" />} tone={summary.critical > 0 ? "rose" : "emerald"} trend="Critical" />
        <StatCard title="Due today" value={String(summary.dueToday)} helper="Actions to clear before close" icon={<ClipboardCheck className="h-5 w-5" />} tone={summary.dueToday > 0 ? "amber" : "emerald"} trend="Today" />
        <StatCard title="Overdue escalations" value={String(summary.overdue)} helper="Execution delay risk" icon={<AlertTriangle className="h-5 w-5" />} tone={summary.overdue > 0 ? "rose" : "emerald"} trend="Overdue" />
        <StatCard title="Blocked actions" value={String(summary.blocked)} helper="Needs decision owner" icon={<MessageSquareWarning className="h-5 w-5" />} tone={summary.blocked > 0 ? "amber" : "emerald"} trend="Blocked" />
        <StatCard title="Unassigned risk" value={String(summary.unassigned)} helper="High-priority work without an owner" icon={<UsersRound className="h-5 w-5" />} tone={summary.unassigned > 0 ? "rose" : "emerald"} trend="Assign" />
        <StatCard title="Management escalations" value={String(summary.managementEscalations)} helper="Branch or owner-level alerts" icon={<RadioTower className="h-5 w-5" />} tone={summary.managementEscalations > 0 ? "amber" : "emerald"} trend="Manager" />
        <StatCard title="Resolved this week" value={String(summary.resolvedThisWeek)} helper={`${summary.acknowledged} acknowledged`} icon={<CheckCircle2 className="h-5 w-5" />} tone="emerald" trend="Closed" />
      </section>

      <NotificationsInbox initialNotifications={records} />
    </div>
  );
}
