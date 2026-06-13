import {
  AlertTriangle,
  Bot,
  Building2,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  DollarSign,
  MessageSquareReply,
  MessageSquareText,
  PackageSearch,
  Pill,
  Sparkles,
  TrendingUp,
  UsersRound
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { AiBriefCard } from "@/components/ai-brief-card";
import { StatCard } from "@/components/stat-card";
import { WhatsAppMessageBox } from "@/components/whatsapp-message-box";
import {
  getBranchCoachNotes,
  getCeoMorningBrief,
  getChronicRiskSummary,
  getDailyCommandChecklist,
  getRevenueDiagnosis,
  getStaffActionPlan,
  getStockIntelligenceSummary,
  getTopPriorities
} from "@/lib/ai-brief";
import type { NetworkHealthStatus } from "@/lib/ai-brief";
import { enumLabel, formatCurrency, formatPercent } from "@/lib/format";
import { getAiBriefData } from "@/lib/data";
import {
  getAccountabilityAiSummary,
  getAccountabilityMetrics,
  getAccountabilityRisks
} from "@/lib/accountability-intelligence";
import { getEscalationAiSummary, getNotificationSummary } from "@/lib/notifications";
import { getCommunicationMetrics } from "@/lib/communications";
import { getEventFundingSummary, getEventReadinessSummary } from "@/lib/events";

export const dynamic = "force-dynamic";

const healthClasses: Record<NetworkHealthStatus, string> = {
  Strong: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Stable: "bg-clinical-50 text-clinical-800 ring-clinical-200",
  Watch: "bg-amber-50 text-amber-700 ring-amber-200",
  Critical: "bg-rose-50 text-rose-700 ring-rose-200"
};

export default async function AiBriefPage() {
  const briefData = await getAiBriefData();
  const communicationMetrics = await getCommunicationMetrics();
  const intelligence = {
    orders: briefData.orders,
    patients: briefData.patients,
    followUps: briefData.followUps,
    branches: briefData.rawBranches,
    stockItems: briefData.stockItems
  };
  const ceo = getCeoMorningBrief(intelligence);
  const priorities = getTopPriorities(intelligence);
  const revenue = getRevenueDiagnosis(intelligence);
  const chronic = getChronicRiskSummary(intelligence);
  const branchCoach = getBranchCoachNotes(intelligence);
  const stock = getStockIntelligenceSummary(intelligence);
  const staffPlan = getStaffActionPlan(intelligence);
  const checklist = getDailyCommandChecklist(intelligence);
  const accountability = getAccountabilityMetrics(briefData.operationalActions);
  const accountabilityRisks = getAccountabilityRisks(briefData.operationalActions);
  const notificationSummary = getNotificationSummary(briefData.notifications);
  const nextEvent = briefData.events.find((event) => event.startDate >= new Date() && event.status !== "CANCELLED" && event.status !== "COMPLETED");
  const eventReadiness = nextEvent ? getEventReadinessSummary(nextEvent) : null;
  const eventFunding = nextEvent ? getEventFundingSummary(nextEvent) : null;
  const overdueEventItems = briefData.events.flatMap((event) => event.checklistItems).filter((item) => item.dueDate && item.dueDate < new Date() && item.status !== "COMPLETED" && item.status !== "NOT_REQUIRED");
  const ordersNeedingAction = revenue.delayedOrders.length + briefData.orders.filter((order) => order.status === "PHARMACIST_REVIEW" || order.status === "AWAITING_PAYMENT" || order.status === "QUOTED").length;
  const branchesNeedingAttention = briefData.branches.filter((branch) => branch.health === "Watch" || branch.health === "Critical").length;
  const followUpsDueToday = briefData.followUps.filter((task) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return task.dueDate >= today && task.dueDate < tomorrow;
  }).length;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-lg border border-navy-800 bg-navy-950 p-5 text-white shadow-[0_28px_80px_rgba(6,21,38,0.22)] sm:p-6 xl:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.12),transparent_36%),linear-gradient(180deg,rgba(75,158,201,0.18),transparent_58%)]" />
        <div className="relative grid gap-7 xl:grid-cols-[1.15fr_0.85fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-clinical-100 ring-1 ring-white/15">
              <Bot className="h-3.5 w-3.5" aria-hidden="true" />
              Daily CEO Operator Brief
            </span>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">AI Brief</h1>
              <span className={`inline-flex rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] ring-1 ${healthClasses[ceo.health]}`}>
                {ceo.health}
              </span>
            </div>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-200">
              A daily command brief showing what money is stuck, which patients are at risk, where branches need coaching, and what staff must clear today.
            </p>
            <p className="mt-5 max-w-4xl text-sm leading-7 text-slate-100">{ceo.summary}</p>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/10 p-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-200" aria-hidden="true" />
              <h2 className="text-lg font-semibold">Owner Priorities Today</h2>
            </div>
            <div className="mt-4 space-y-3">
              {priorities.map((priority, index) => (
                <div key={priority.title} className="rounded-lg bg-white p-4 text-navy-950">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Priority {index + 1}</p>
                  <p className="mt-2 font-semibold">{priority.title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{priority.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Revenue pulse" value={formatCurrency(briefData.dashboard.totalRevenueToday)} helper={`${formatCurrency(revenue.onlineRevenue)} online revenue`} icon={<TrendingUp className="h-5 w-5" />} tone="navy" trend="Today" />
        <StatCard title="Chronic at risk" value={String(chronic.overdue.length)} helper={`${formatCurrency(chronic.valueAtRisk)} recurring value exposed`} icon={<UsersRound className="h-5 w-5" />} tone={chronic.overdue.length > 0 ? "rose" : "emerald"} trend="Care" />
        <StatCard title="Orders needing action" value={String(ordersNeedingAction)} helper="Review, payment, or delay blockers" icon={<CreditCard className="h-5 w-5" />} tone={ordersNeedingAction > 0 ? "amber" : "emerald"} trend="Orders" />
        <StatCard title="Revenue stuck" value={formatCurrency(revenue.awaitingPaymentValue)} helper="Quote or awaiting-payment exposure" icon={<DollarSign className="h-5 w-5" />} tone={revenue.awaitingPaymentValue > 0 ? "amber" : "emerald"} trend="Cash" />
        <StatCard title="Stock risk" value={String(stock.lowStock.length)} helper={`${formatCurrency(stock.nearExpiryValue)} near-expiry value`} icon={<PackageSearch className="h-5 w-5" />} tone={stock.lowStock.length > 0 ? "amber" : "emerald"} trend="Stock" />
        <StatCard title="Branches needing attention" value={String(branchesNeedingAttention)} helper={branchCoach.attentionBranch?.name ?? "No branch pressure"} icon={<Building2 className="h-5 w-5" />} tone={branchesNeedingAttention > 0 ? "rose" : "emerald"} trend="Branch" />
        <StatCard title="Follow-ups due today" value={String(followUpsDueToday)} helper="Tasks to clear before close" icon={<MessageSquareReply className="h-5 w-5" />} tone={followUpsDueToday > 0 ? "blue" : "emerald"} trend="Follow-up" />
        <StatCard title="Suggested actions" value={String(staffPlan.length)} helper="Operational actions grouped by owner" icon={<ClipboardList className="h-5 w-5" />} tone="white" trend="Plan" />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.12fr_0.88fr]">
        <AiBriefCard title="CEO Morning Brief" variant="executive" action={priorities[0]?.detail}>
          <p>{ceo.summary}</p>
        </AiBriefCard>

        <Panel title="Revenue Diagnosis" eyebrow="Where money is stuck">
          <div className="grid gap-3 sm:grid-cols-2">
            <MiniMetric label="Online revenue" value={formatCurrency(revenue.onlineRevenue)} />
            <MiniMetric label="Awaiting payment" value={formatCurrency(revenue.awaitingPaymentValue)} tone={revenue.awaitingPaymentValue > 0 ? "warn" : "normal"} />
            <MiniMetric label="Delayed orders" value={String(revenue.delayedOrders.length)} tone={revenue.delayedOrders.length > 0 ? "risk" : "normal"} />
            <MiniMetric label="High-value orders" value={String(revenue.highValueOrders.length)} />
          </div>
          <p className="mt-4 rounded-lg bg-clinical-50 p-4 text-sm leading-6 text-clinical-900">{revenue.explanation}</p>
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
        <AiBriefCard title="Communication Brief" variant="executive" action={communicationMetrics.ready > 0 ? "Open the Communication Center and send the ready refill/payment messages before 10:00." : "Prepare messages from the highest-risk follow-up, order, event, and action queues."}>
          <p>{communicationMetrics.summary}</p>
          <div className="mt-4">
            <Link href="/communications" className="focus-ring inline-flex rounded-lg bg-white px-3 py-2 text-xs font-semibold text-navy-950 ring-1 ring-slate-200 transition hover:bg-clinical-50">
              Open Communication Center
            </Link>
          </div>
        </AiBriefCard>

        <Panel title="Communication Signals" eyebrow="Manual delivery discipline">
          <div className="grid gap-3 sm:grid-cols-2">
            <MiniMetric label="Ready to send" value={String(communicationMetrics.ready)} tone={communicationMetrics.ready > 0 ? "warn" : "normal"} />
            <MiniMetric label="Sent today" value={String(communicationMetrics.sentToday)} />
            <MiniMetric label="Awaiting response" value={String(communicationMetrics.awaitingResponse)} tone={communicationMetrics.awaitingResponse > 0 ? "warn" : "normal"} />
            <MiniMetric label="Responses received" value={String(communicationMetrics.responsesReceived)} />
            <MiniMetric label="Follow-ups required" value={String(communicationMetrics.followUpsRequired)} tone={communicationMetrics.followUpsRequired > 0 ? "risk" : "normal"} />
            <MiniMetric label="Response rate" value={`${communicationMetrics.responseRate}%`} />
          </div>
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
        <AiBriefCard title="Event Brief" variant="executive" action={nextEvent ? eventReadiness?.nextBestAction : "Create the next pharmacy activation in Event Command."}>
          <p>
            {nextEvent && eventReadiness && eventFunding
              ? `${nextEvent.title} begins in ${eventReadiness.daysUntilStart} days and is ${eventReadiness.score}% ready. Funding risk is ${eventFunding.risk.toLowerCase()}, ${overdueEventItems.length} event checklist items are overdue, and the owner is ${nextEvent.ownerStaff?.name ?? "not assigned"}. ${eventReadiness.nextBestAction}`
              : "No upcoming event is currently driving execution pressure. Use Event Command to plan the next outreach, branch promotion, supplier activation, or wellness day."}
          </p>
          <div className="mt-4">
            <Link href="/events" className="focus-ring inline-flex rounded-lg bg-white px-3 py-2 text-xs font-semibold text-navy-950 ring-1 ring-slate-200 transition hover:bg-clinical-50">
              Open Event Command
            </Link>
          </div>
        </AiBriefCard>

        <Panel title="Event Execution Signals" eyebrow="Calendar and funding discipline">
          <div className="grid gap-3 sm:grid-cols-2">
            <MiniMetric label="Next event" value={nextEvent?.title ?? "None planned"} />
            <MiniMetric label="Readiness" value={eventReadiness ? `${eventReadiness.score}%` : "No event"} tone={eventReadiness && eventReadiness.riskLevel !== "Low" ? "warn" : "normal"} />
            <MiniMetric label="Funding gap" value={eventFunding ? formatCurrency(eventFunding.fundingGap) : "$0"} tone={eventFunding && eventFunding.fundingGap > 0 ? "warn" : "normal"} />
            <MiniMetric label="Overdue prep" value={String(overdueEventItems.length)} tone={overdueEventItems.length > 0 ? "risk" : "normal"} />
            <MiniMetric label="Budget risk" value={eventFunding?.risk ?? "Low"} tone={eventFunding && eventFunding.risk !== "Low" ? "warn" : "normal"} />
            <MiniMetric label="Owner" value={nextEvent?.ownerStaff?.name ?? "Unassigned"} tone={nextEvent && !nextEvent.ownerStaff ? "risk" : "normal"} />
          </div>
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
        <AiBriefCard title="Execution Brief" variant="executive" action={accountabilityRisks.highestValueUnresolvedAction ? `Assign or clear ${accountabilityRisks.highestValueUnresolvedAction.title} before midday.` : "Create actions from today's highest-risk insights."}>
          <p>{getAccountabilityAiSummary(briefData.operationalActions)}</p>
          <div className="mt-4">
            <Link href="/action-center" className="focus-ring inline-flex rounded-lg bg-white px-3 py-2 text-xs font-semibold text-navy-950 ring-1 ring-slate-200 transition hover:bg-clinical-50">
              Open Action Center
            </Link>
          </div>
        </AiBriefCard>

        <Panel title="Execution Signals" eyebrow="Staff and branch accountability">
          <div className="grid gap-3 sm:grid-cols-2">
            <MiniMetric label="Urgent today" value={String(accountability.dueToday + accountability.overdue)} tone={accountability.dueToday + accountability.overdue > 0 ? "warn" : "normal"} />
            <MiniMetric label="Overdue actions" value={String(accountability.overdue)} tone={accountability.overdue > 0 ? "risk" : "normal"} />
            <MiniMetric label="Blocked actions" value={String(accountability.blockedActions)} tone={accountability.blockedActions > 0 ? "warn" : "normal"} />
            <MiniMetric label="Highest value unresolved" value={accountabilityRisks.highestValueUnresolvedAction ? formatCurrency(accountabilityRisks.highestValueUnresolvedAction.valueAmount) : "$0"} />
            <MiniMetric label="Largest branch workload" value={accountabilityRisks.branchWithLargestOpenWorkload?.branch ?? "None"} />
            <MiniMetric label="Largest staff queue" value={accountabilityRisks.staffWithLargestAssignedWorkload?.staff ?? "None"} />
            <MiniMetric label="Value recovered" value={formatCurrency(accountability.valueRecovered)} />
            <MiniMetric label="Value protected" value={formatCurrency(accountability.valueProtected)} />
          </div>
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
        <AiBriefCard title="Escalation Brief" variant="executive" action={notificationSummary.critical > 0 ? "Resolve critical alerts before routine branch updates." : "Acknowledge due alerts and keep branch managers aligned before close."}>
          <p>{getEscalationAiSummary(briefData.notifications)}</p>
          <div className="mt-4">
            <Link href="/notifications" className="focus-ring inline-flex rounded-lg bg-white px-3 py-2 text-xs font-semibold text-navy-950 ring-1 ring-slate-200 transition hover:bg-clinical-50">
              Open Notifications
            </Link>
          </div>
        </AiBriefCard>

        <Panel title="Escalation Signals" eyebrow="Alert discipline">
          <div className="grid gap-3 sm:grid-cols-2">
            <MiniMetric label="Unread alerts" value={String(notificationSummary.unread)} tone={notificationSummary.unread > 0 ? "warn" : "normal"} />
            <MiniMetric label="Critical alerts" value={String(notificationSummary.critical)} tone={notificationSummary.critical > 0 ? "risk" : "normal"} />
            <MiniMetric label="Due today" value={String(notificationSummary.dueToday)} tone={notificationSummary.dueToday > 0 ? "warn" : "normal"} />
            <MiniMetric label="Overdue alerts" value={String(notificationSummary.overdue)} tone={notificationSummary.overdue > 0 ? "risk" : "normal"} />
            <MiniMetric label="Blocked alerts" value={String(notificationSummary.blocked)} tone={notificationSummary.blocked > 0 ? "warn" : "normal"} />
            <MiniMetric label="Unassigned alerts" value={String(notificationSummary.unassigned)} tone={notificationSummary.unassigned > 0 ? "risk" : "normal"} />
            <MiniMetric label="Acknowledged" value={String(notificationSummary.acknowledged)} />
            <MiniMetric label="Resolved this week" value={String(notificationSummary.resolvedThisWeek)} />
          </div>
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <Panel title="Chronic Patient Risk Summary" eyebrow="Retention exposure">
          <div className="grid gap-3 sm:grid-cols-2">
            <MiniMetric label="Due today" value={String(chronic.dueToday.length)} />
            <MiniMetric label="Overdue" value={String(chronic.overdue.length)} tone={chronic.overdue.length > 0 ? "risk" : "normal"} />
            <MiniMetric label="High risk" value={String(chronic.highRisk.length)} tone={chronic.highRisk.length > 0 ? "warn" : "normal"} />
            <MiniMetric label="VIP care" value={String(chronic.vipPatients.length)} />
          </div>
          <p className="mt-4 rounded-lg bg-rose-50 p-4 text-sm leading-6 text-rose-900">{chronic.explanation}</p>
        </Panel>

        <Panel title="Branch Coach" eyebrow="Manager notes">
          <div className="grid gap-3">
            <MiniMetric label="Best branch" value={branchCoach.bestBranch?.name ?? "None"} />
            <MiniMetric label="Needs attention" value={branchCoach.attentionBranch?.name ?? "None"} tone={branchCoach.attentionBranch ? "warn" : "normal"} />
          </div>
          <div className="mt-4 space-y-3">
            {branchCoach.notes.slice(0, 4).map((note) => (
              <div key={note.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-navy-950">{note.name}</p>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ring-1 ${healthClasses[note.health]}`}>{note.health}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{note.action}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Stock Intelligence Summary" eyebrow="Care and inventory pressure">
          <div className="grid gap-3 sm:grid-cols-2">
            <MiniMetric label="Low stock" value={String(stock.lowStock.length)} tone={stock.lowStock.length > 0 ? "risk" : "normal"} />
            <MiniMetric label="Near-expiry value" value={formatCurrency(stock.nearExpiryValue)} tone={stock.nearExpiryValue > 0 ? "warn" : "normal"} />
            <MiniMetric label="Chronic demand risk" value={String(stock.chronicDemandRisk.length)} tone={stock.chronicDemandRisk.length > 0 ? "warn" : "normal"} />
            <MiniMetric label="Transfers" value={String(stock.suggestedTransfers.length)} />
          </div>
          <p className="mt-4 rounded-lg bg-amber-50 p-4 text-sm leading-6 text-amber-900">{stock.explanation}</p>
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
        <Panel title="Staff Action Plan" eyebrow="Grouped operating moves">
          <div className="grid gap-3 md:grid-cols-2">
            {staffPlan.map((action) => (
              <ActionCard key={action.title} title={action.title} owner={action.owner} detail={action.detail} />
            ))}
          </div>
        </Panel>

        <Panel title="Daily Command Checklist" eyebrow="Morning, midday, closing">
          <Checklist title="Morning actions" items={checklist.morning} />
          <Checklist title="Midday actions" items={checklist.midday} />
          <Checklist title="Closing actions" items={checklist.closing} />
        </Panel>
      </section>

      <WhatsAppMessageBox />
    </div>
  );
}

function Panel({ title, eyebrow, children }: { title: string; eyebrow: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
      <p className="section-title">{eyebrow}</p>
      <h2 className="mt-2 text-xl font-semibold tracking-tight text-navy-950">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function MiniMetric({ label, value, tone = "normal" }: { label: string; value: string; tone?: "normal" | "risk" | "warn" }) {
  const className =
    tone === "risk"
      ? "rounded-lg border border-rose-100 bg-rose-50 p-3"
      : tone === "warn"
        ? "rounded-lg border border-amber-100 bg-amber-50 p-3"
        : "rounded-lg border border-slate-100 bg-slate-50 p-3";

  return (
    <div className={className}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</p>
      <p className={tone === "risk" ? "mt-1 font-semibold text-rose-700" : tone === "warn" ? "mt-1 font-semibold text-amber-700" : "mt-1 font-semibold text-navy-950"}>{value}</p>
    </div>
  );
}

function ActionCard({ title, owner, detail }: { title: string; owner: string; detail: string }) {
  return (
    <article className="rounded-lg border border-slate-100 bg-slate-50 p-4">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
        <div>
          <p className="font-semibold text-navy-950">{title}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.1em] text-clinical-700">{owner}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p>
        </div>
      </div>
    </article>
  );
}

function Checklist({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mb-4 last:mb-0">
      <p className="font-semibold text-navy-950">{title}</p>
      <div className="mt-2 space-y-2">
        {items.map((item) => (
          <div key={item} className="flex gap-2 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-600">
            <AlertTriangle className="mt-1 h-3.5 w-3.5 shrink-0 text-clinical-700" aria-hidden="true" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
