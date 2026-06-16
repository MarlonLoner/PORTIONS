import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Building2,
  CalendarDays,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  KeyRound,
  LineChart,
  MessageSquareWarning,
  MessageSquareText,
  PackageCheck,
  RadioTower,
  Settings2,
  ShoppingCart,
  Smartphone,
  Target,
  TrendingUp,
  UserPlus,
  UsersRound
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { AiBriefCard } from "@/components/ai-brief-card";
import { StatCard } from "@/components/stat-card";
import { enumLabel, formatCurrency, formatPercent } from "@/lib/format";
import { getDashboardData } from "@/lib/data";
import {
  getAccountabilityMetrics,
  getAccountabilityRisks,
  getBranchExecutionRanking,
  getStaffExecutionRanking
} from "@/lib/accountability-intelligence";
import { getEscalationAiSummary, getNotificationSummary } from "@/lib/notifications";
import { getCommunicationMetrics } from "@/lib/communications";
import { getEventMetrics, getEventNextAction, getEventReadinessSummary } from "@/lib/events";
import { canManageSettings, canManageUsers, getCurrentAccessUser } from "@/lib/auth";
import { getAdminControlCenterMetrics } from "@/lib/admin-user-creation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const data = await getDashboardData();
  const user = await getCurrentAccessUser();
  const showAdminControl = user ? canManageUsers(user) || canManageSettings(user) : false;
  const adminMetrics = showAdminControl ? await getAdminControlCenterMetrics() : null;
  const setupCounts = user?.tenantId ? await getTenantSetupCounts(user.tenantId) : null;
  const showSetupPanel = setupCounts ? setupCounts.branches === 0 || setupCounts.stockItems === 0 || setupCounts.patients === 0 || setupCounts.staffMembers === 0 || setupCounts.orders === 0 : false;
  const communicationMetrics = await getCommunicationMetrics();
  const maxRevenue = Math.max(...data.revenueByBranch.map((branch) => branch.revenue), 1);
  const topUrgency = [...data.followUpUrgency].sort((a, b) => b.count - a.count)[0];
  const activePipeline = data.orderPipeline.filter((item) => item.count > 0);
  const revenueIntensity = Math.min((data.totalRevenueToday / Math.max(data.totalRevenueToday + 1200, 1)) * 100, 92);
  const accountability = getAccountabilityMetrics(data.operationalActions);
  const accountabilityRisks = getAccountabilityRisks(data.operationalActions);
  const topBranchExecution = getBranchExecutionRanking(data.operationalActions).find((branch) => branch.total >= 2) ?? getBranchExecutionRanking(data.operationalActions)[0];
  const branchNeedingExecution = [...getBranchExecutionRanking(data.operationalActions)].sort((a, b) => b.overdue + b.blocked - (a.overdue + a.blocked))[0];
  const topStaffExecutor = getStaffExecutionRanking(data.operationalActions).find((staff) => staff.staff !== "Unassigned");
  const notificationSummary = getNotificationSummary(data.notifications);
  const eventMetrics = getEventMetrics(data.events);
  const nextEvent = data.events.find((event) => event.startDate >= new Date() && event.status !== "CANCELLED" && event.status !== "COMPLETED");
  const nextEventReadiness = nextEvent ? getEventReadinessSummary(nextEvent) : null;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-lg border border-navy-800 bg-navy-950 p-5 text-white shadow-[0_28px_80px_rgba(6,21,38,0.22)] sm:p-6 xl:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.12),transparent_36%),linear-gradient(180deg,rgba(75,158,201,0.18),transparent_58%)]" />
        <div className="relative grid gap-7 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="flex min-h-[310px] flex-col justify-between gap-8">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-clinical-100 ring-1 ring-white/15">
                  <RadioTower className="h-3.5 w-3.5" aria-hidden="true" />
                  Live Executive Command
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-400/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-100 ring-1 ring-emerald-300/20">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Branch Network Online
                </span>
              </div>
              <h1 className="mt-6 max-w-4xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
                PORTIONS Pharmacy Command OS
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-200">
                A command layer above daily pharmacy operations: protect chronic revenue, expose order and payment leakage, compare branches, and act on stock risk before manual updates arrive.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <HeroLink href="/ai-brief" label="Open AI Brief" />
                <HeroLink href="/pilot-command" label="Pilot Command" />
                <HeroLink href="/executive-pack" label="Executive Pack" />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <CommandSignal label="Best branch" value={data.bestBranch} helper="Performance benchmark" />
              <CommandSignal label="Watch branch" value={data.branchNeedingAttention} helper="Manager attention" tone="risk" />
              <CommandSignal label="Top queue" value={enumLabel(topUrgency?.type ?? "DUE_TODAY")} helper={`${topUrgency?.count ?? 0} active tasks`} tone="blue" />
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/10 p-4 backdrop-blur">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-clinical-100">Today</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">Executive Pulse</h2>
              </div>
              <div className="rounded-lg bg-white p-2.5 text-navy-950">
                <Activity className="h-5 w-5" aria-hidden="true" />
              </div>
            </div>

            <div className="mt-6 rounded-lg bg-white p-5 text-navy-950">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Revenue capture</p>
              <p className="mt-3 text-4xl font-semibold tracking-tight">{formatCurrency(data.totalRevenueToday)}</p>
              <div className="mt-4 h-2 rounded-full bg-slate-100">
                <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${Math.max(revenueIntensity, 12)}%` }} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <PulseMetric label="Online revenue" value={formatCurrency(data.onlineSalesRevenue)} />
                <PulseMetric label="Conversion" value={formatPercent(data.conversionRate)} />
                <PulseMetric label="Orders today" value={String(data.ordersToday)} />
                <PulseMetric label="Stock alerts" value={String(data.stockAlertCount)} tone={data.stockAlertCount > 0 ? "warn" : "normal"} />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <ExecutiveFlag label="Overdue refills" value={String(data.overdueRefillPatients)} intent="risk" />
              <ExecutiveFlag label="Pharmacist reviews" value={String(data.pendingPharmacistReviews)} intent="warn" />
            </div>
          </div>
        </div>
      </section>

      {showSetupPanel && setupCounts ? (
        <section className="rounded-lg border border-clinical-200 bg-clinical-50 p-5 shadow-soft">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clinical-800">First-use setup</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-navy-950">Set up your pharmacy</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-clinical-900">
                Your pharmacy workspace is ready. Start by creating your first branch, then add team members, patients, stock, and order flow.
              </p>
            </div>
            <Link href="/onboarding" className="focus-ring rounded-lg bg-navy-950 px-4 py-2.5 text-sm font-semibold text-white">Continue onboarding</Link>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <SetupCard title="Create first branch" status={setupCounts.branches > 0 ? "Complete" : "Start here"} href="/branches/new" detail={`${setupCounts.branches} branches`} icon={<Building2 className="h-4 w-4" />} />
            <SetupCard title="Add pharmacy team" status={setupCounts.staffMembers > 0 ? "Complete" : "Needed"} href="/admin/staff/new" detail={`${setupCounts.staffMembers} staff records`} icon={<UsersRound className="h-4 w-4" />} />
            <SetupCard title="Add or import patients" status={setupCounts.patients > 0 ? "Complete" : "Needed"} href="/patients/new" detail={`${setupCounts.patients} patient records`} icon={<UserPlus className="h-4 w-4" />} />
            <SetupCard title="Add or import stock" status={setupCounts.stockItems > 0 ? "Complete" : "Needed"} href="/stock/new" detail={`${setupCounts.stockItems} stock records`} icon={<PackageCheck className="h-4 w-4" />} />
            <SetupCard title="Configure WhatsApp" status={setupCounts.unitsWithWhatsapp > 0 ? "Started" : "Needed"} href="/admin/operating-units" detail={`${setupCounts.unitsWithWhatsapp} units configured`} icon={<Smartphone className="h-4 w-4" />} />
            <SetupCard title="Review operating units" status={setupCounts.operatingUnits > 0 ? "Ready" : "Needed"} href="/admin/operating-units" detail={`${setupCounts.operatingUnits} units`} icon={<Settings2 className="h-4 w-4" />} />
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Today's total revenue" value={formatCurrency(data.totalRevenueToday)} helper="All branch revenue captured today" icon={<TrendingUp className="h-5 w-5" />} tone="navy" trend="Live" />
        <StatCard title="Online sales revenue" value={formatCurrency(data.onlineSalesRevenue)} helper="WhatsApp, website, app, diaspora" icon={<CreditCard className="h-5 w-5" />} tone="blue" trend="Digital" />
        <StatCard title="Orders today" value={String(data.ordersToday)} helper="New and active order records" icon={<ShoppingCart className="h-5 w-5" />} trend="Ops" />
        <StatCard title="Conversion rate" value={formatPercent(data.conversionRate)} helper="Paid online orders from today's funnel" icon={<LineChart className="h-5 w-5" />} tone="emerald" trend="Funnel" />
        <StatCard title="Chronic due today" value={String(data.chronicDueToday)} helper="Patients needing refill action now" icon={<UsersRound className="h-5 w-5" />} trend="Retention" />
        <StatCard title="Overdue refill patients" value={String(data.overdueRefillPatients)} helper="Retention risk requiring follow-up" icon={<AlertTriangle className="h-5 w-5" />} tone="rose" trend="Risk" />
        <StatCard title="Pharmacist reviews" value={String(data.pendingPharmacistReviews)} helper="Orders waiting for clinical review" icon={<ClipboardCheck className="h-5 w-5" />} tone="amber" trend="Clinical" />
        <StatCard title="Active stock alerts" value={String(data.stockAlertCount)} helper="Low, expiry, dead, and overstock issues" icon={<PackageCheck className="h-5 w-5" />} trend="Stock" />
      </section>

      {showAdminControl && adminMetrics ? (
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clinical-700">Owner controls</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-navy-950">Administration & Access</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Manage user accounts, operating-unit access, WhatsApp sender setup, and temporary-password cleanup from the command dashboard.
              </p>
            </div>
            <Link href="/admin/users" className="focus-ring rounded-lg bg-navy-950 px-4 py-2.5 text-sm font-semibold text-white">Open Admin Control</Link>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <AdminControlCard
              icon={<KeyRound className="h-5 w-5" />}
              title="User Accounts"
              detail={`${adminMetrics.activeUsers} active / ${adminMetrics.invitedUsers} invited / ${adminMetrics.suspendedUsers} suspended`}
              href="/admin/users"
              cta="Manage users"
            />
            <AdminControlCard
              icon={<UserPlus className="h-5 w-5" />}
              title="Create Staff Login"
              detail="Create secure staff access and force first-login password change."
              href="/admin/users/new"
              cta="Create user"
            />
            <AdminControlCard
              icon={<Settings2 className="h-5 w-5" />}
              title="Operating Units"
              detail={`${adminMetrics.physicalBranches} branches / ${adminMetrics.onlineDepartments} online / ${adminMetrics.headOfficeUnits} head office / ${adminMetrics.financeUnits} finance`}
              href="/admin/operating-units"
              cta="Configure units"
            />
            <AdminControlCard
              icon={<Smartphone className="h-5 w-5" />}
              title="WhatsApp Configuration"
              detail={`${adminMetrics.unitsMissingWhatsapp} units need sender WhatsApp numbers`}
              href="/admin/operating-units"
              cta="Review units"
              tone={adminMetrics.unitsMissingWhatsapp > 0 ? "warn" : "normal"}
            />
            <AdminControlCard
              icon={<UsersRound className="h-5 w-5" />}
              title="Access & Permissions"
              detail={`${adminMetrics.usersWithoutPrimaryUnit} without primary unit / ${adminMetrics.usersWithTemporaryPasswords} temporary passwords`}
              href="/admin/users"
              cta="Review users"
              tone={adminMetrics.usersWithTemporaryPasswords > 0 || adminMetrics.usersWithoutPrimaryUnit > 0 ? "warn" : "normal"}
            />
          </div>
        </section>
      ) : null}

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="section-title">Communication Delivery</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-navy-950">Manual messages that move revenue and patient care</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{communicationMetrics.summary}</p>
          </div>
          <Link href="/communications" className="focus-ring rounded-lg bg-navy-950 px-3 py-2 text-xs font-semibold text-white">Open Communication Center</Link>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <MiniExecMetric label="Ready to send" value={String(communicationMetrics.ready)} tone={communicationMetrics.ready > 0 ? "warn" : "normal"} />
          <MiniExecMetric label="Sent today" value={String(communicationMetrics.sentToday)} tone="success" />
          <MiniExecMetric label="Awaiting response" value={String(communicationMetrics.awaitingResponse)} tone={communicationMetrics.awaitingResponse > 0 ? "warn" : "normal"} />
          <MiniExecMetric label="Follow-ups required" value={String(communicationMetrics.followUpsRequired)} tone={communicationMetrics.followUpsRequired > 0 ? "risk" : "normal"} />
          <MiniExecMetric label="Response rate" value={`${communicationMetrics.responseRate}%`} />
        </div>
        <div className="mt-5 rounded-lg bg-clinical-50 p-4 ring-1 ring-clinical-100">
          <div className="flex items-center gap-2 text-clinical-800">
            <MessageSquareText className="h-4 w-4" aria-hidden="true" />
            <p className="text-sm font-semibold">Next highest-value communication</p>
          </div>
          <p className="mt-2 text-sm leading-6 text-clinical-900">
            Prioritize ready chronic refill reminders and payment recovery messages before opening routine internal updates.
          </p>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="section-title">Event Execution</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-navy-950">Calendar, funding, and preparation risk</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Event Command tracks whether approved activations have owners, funding, checklists, and post-event review discipline.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/events" className="focus-ring rounded-lg bg-navy-950 px-3 py-2 text-xs font-semibold text-white">Open Event Command</Link>
            <Link href="/events?status=SUBMITTED" className="focus-ring rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">Review approvals</Link>
            <Link href="/events/calendar" className="focus-ring rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">Open calendar</Link>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MiniExecMetric label="Upcoming events" value={String(eventMetrics.upcomingEvents)} />
          <MiniExecMetric label="Awaiting approval" value={String(eventMetrics.awaitingApproval)} tone={eventMetrics.awaitingApproval > 0 ? "warn" : "normal"} />
          <MiniExecMetric label="Awaiting funding" value={String(eventMetrics.awaitingFunding)} tone={eventMetrics.awaitingFunding > 0 ? "warn" : "normal"} />
          <MiniExecMetric label="Events at risk" value={String(eventMetrics.atRiskEvents)} tone={eventMetrics.atRiskEvents > 0 ? "risk" : "normal"} />
          <MiniExecMetric label="Overdue checklist" value={String(data.events.flatMap((event) => event.checklistItems).filter((item) => item.dueDate && item.dueDate < new Date() && item.status !== "COMPLETED" && item.status !== "NOT_REQUIRED").length)} tone="warn" />
          <MiniExecMetric label="Approved budget" value={formatCurrency(eventMetrics.totalApprovedBudget)} />
          <MiniExecMetric label="Next event" value={nextEvent?.title ?? "No upcoming event"} />
          <MiniExecMetric label="Readiness" value={nextEventReadiness ? `${nextEventReadiness.score}%` : "No event"} tone={nextEventReadiness && nextEventReadiness.riskLevel !== "Low" ? "warn" : "normal"} />
        </div>
        {nextEvent ? (
          <div className="mt-5 rounded-lg bg-clinical-50 p-4 ring-1 ring-clinical-100">
            <div className="flex items-center gap-2 text-clinical-800">
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
              <p className="text-sm font-semibold">Next decision required</p>
            </div>
            <p className="mt-2 text-sm leading-6 text-clinical-900">{getEventNextAction(nextEvent)}</p>
          </div>
        ) : null}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="section-title">Notifications & Escalations</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-navy-950">What needs attention before the next call?</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{getEscalationAiSummary(data.notifications)}</p>
          </div>
          <Link href="/notifications" className="focus-ring rounded-lg bg-navy-950 px-3 py-2 text-xs font-semibold text-white">Open Notifications</Link>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MiniExecMetric label="Unread alerts" value={String(notificationSummary.unread)} tone={notificationSummary.unread > 0 ? "warn" : "normal"} />
          <MiniExecMetric label="Critical alerts" value={String(notificationSummary.critical)} tone={notificationSummary.critical > 0 ? "risk" : "normal"} />
          <MiniExecMetric label="Overdue escalations" value={String(notificationSummary.overdue)} tone={notificationSummary.overdue > 0 ? "risk" : "normal"} />
          <MiniExecMetric label="Resolved this week" value={String(notificationSummary.resolvedThisWeek)} tone="success" />
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="section-title">Execution & Accountability</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-navy-950">Are insights becoming completed work?</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              PORTIONS tracks whether operational risks are assigned, completed, and converted into recovered or protected value.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/action-center" className="focus-ring rounded-lg bg-navy-950 px-3 py-2 text-xs font-semibold text-white">Open Action Center</Link>
            <Link href="/action-center?dueState=Overdue" className="focus-ring rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">Review overdue actions</Link>
            <Link href="/executive-pack" className="focus-ring rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">View Executive Pack</Link>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MiniExecMetric label="Open actions" value={String(accountability.openActions)} />
          <MiniExecMetric label="Due today" value={String(accountability.dueToday)} tone={accountability.dueToday > 0 ? "warn" : "normal"} />
          <MiniExecMetric label="Overdue" value={String(accountability.overdue)} tone={accountability.overdue > 0 ? "risk" : "normal"} />
          <MiniExecMetric label="Critical" value={String(accountability.criticalActions)} tone={accountability.criticalActions > 0 ? "risk" : "normal"} />
          <MiniExecMetric label="Completion rate" value={`${accountability.completionRate}%`} />
          <MiniExecMetric label="Completed this week" value={String(accountability.completedThisWeek)} />
          <MiniExecMetric label="Value recovered" value={formatCurrency(accountability.valueRecovered)} tone="success" />
          <MiniExecMetric label="Value protected" value={formatCurrency(accountability.valueProtected)} tone="success" />
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SignalTile icon={<CheckCircle2 className="h-4 w-4" />} label="Top execution branch" value={topBranchExecution?.branch ?? "No action data"} helper={topBranchExecution ? `${topBranchExecution.completionRate}% completion` : "Create actions to rank branch execution."} tone="success" />
          <SignalTile icon={<MessageSquareWarning className="h-4 w-4" />} label="Needs attention" value={branchNeedingExecution?.branch ?? "No action data"} helper={branchNeedingExecution ? `${branchNeedingExecution.overdue} overdue, ${branchNeedingExecution.blocked} blocked` : "No branch action pressure yet."} tone="risk" />
          <SignalTile icon={<ClipboardCheck className="h-4 w-4" />} label="Top staff executor" value={topStaffExecutor?.staff ?? "No staff data"} helper={topStaffExecutor ? `${topStaffExecutor.completed} completed actions` : "Assign actions to staff to build rankings."} tone="blue" />
          <SignalTile icon={<Target className="h-4 w-4" />} label="Most urgent action" value={accountabilityRisks.highestValueUnresolvedAction?.title ?? "No urgent action"} helper={accountabilityRisks.highestValueUnresolvedAction ? formatCurrency(accountabilityRisks.highestValueUnresolvedAction.valueAmount) : "Action Center is ready for assignments."} tone="blue" />
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.28fr_0.72fr]">
        <AiBriefCard
          title="CEO Morning Brief"
          variant="executive"
          action={`Owner action: review ${data.branchNeedingAttention}, recover overdue refills, and clear pharmacist review before payment reminders.`}
        >
          <div className="grid gap-4 md:grid-cols-3">
            <BriefPoint
              label="Revenue read"
              value={`${data.bestBranch} leads`}
              detail={`${formatCurrency(data.onlineSalesRevenue)} online revenue is ready to convert into stronger cash collection.`}
            />
            <BriefPoint
              label="Patient risk"
              value={`${data.overdueRefillPatients} overdue`}
              detail="The retention queue needs direct WhatsApp follow-up before refill behavior drifts."
              tone="risk"
            />
            <BriefPoint
              label="Operational drag"
              value={`${data.pendingPharmacistReviews} reviews`}
              detail="Clinical review is the key workflow gate before quotes, payments, and dispatch can move."
              tone="warn"
            />
          </div>
        </AiBriefCard>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="section-title">Branch Signals</p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-navy-950">Manager Focus</h2>
            </div>
            <Building2 className="h-5 w-5 text-clinical-700" aria-hidden="true" />
          </div>
          <div className="mt-5 space-y-3">
            <SignalTile icon={<CheckCircle2 className="h-4 w-4" />} label="Best performance" value={data.bestBranch} helper="Use this branch as today's execution benchmark." tone="success" />
            <SignalTile icon={<MessageSquareWarning className="h-4 w-4" />} label="Needs attention" value={data.branchNeedingAttention} helper="Review overdue follow-ups, pending orders, and stock alerts." tone="risk" />
            <SignalTile icon={<Target className="h-4 w-4" />} label="Primary action" value="Clear blockers" helper="Move review, payment, and refill queues before midday." tone="blue" />
          </div>
        </section>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr_1fr]">
        <SectionCard title="Revenue by Branch" eyebrow="Today's collection" icon={<ArrowUpRight className="h-4 w-4" />}>
          <div className="space-y-4">
            {data.revenueByBranch.length > 0 ? (
              data.revenueByBranch.map((branch, index) => (
                <div key={branch.id} className="rounded-lg border border-slate-100 bg-slate-50/80 p-3">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-xs font-semibold text-slate-500 ring-1 ring-slate-200">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-semibold text-slate-800">{branch.name}</p>
                        <p className="text-xs text-slate-500">{branch.orders} orders today</p>
                      </div>
                    </div>
                    <span className="font-semibold text-navy-950">{formatCurrency(branch.revenue)}</span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-white ring-1 ring-slate-100">
                    <div className="h-2 rounded-full bg-clinical-500" style={{ width: `${Math.max((branch.revenue / maxRevenue) * 100, 6)}%` }} />
                  </div>
                </div>
              ))
            ) : (
              <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                Import orders or connect branch sales data to see which location is carrying revenue and which one needs manager attention.
              </p>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Follow-Up Urgency" eyebrow="Retention queue" icon={<CalendarClock className="h-4 w-4" />}>
          <div className="space-y-3">
            {data.followUpUrgency.map((item) => (
              <QueueRow key={item.type} label={enumLabel(item.type)} count={item.count} />
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Online Order Pipeline" eyebrow="Digital workflow" icon={<ShoppingCart className="h-4 w-4" />}>
          <div className="grid grid-cols-2 gap-3">
            {(activePipeline.length > 0 ? activePipeline : data.orderPipeline).map((item) => (
              <PipelineTile key={item.status} label={enumLabel(item.status)} count={item.count} />
            ))}
          </div>
        </SectionCard>
      </section>
    </div>
  );
}

function HeroLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="focus-ring inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-white/15 transition hover:bg-white/15">
      {label}
      <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
    </Link>
  );
}

function MiniExecMetric({ label, value, tone = "normal" }: { label: string; value: string; tone?: "normal" | "warn" | "risk" | "success" }) {
  const className =
    tone === "risk"
      ? "rounded-lg border border-rose-100 bg-rose-50 p-3"
      : tone === "warn"
        ? "rounded-lg border border-amber-100 bg-amber-50 p-3"
        : tone === "success"
          ? "rounded-lg border border-emerald-100 bg-emerald-50 p-3"
          : "rounded-lg border border-slate-100 bg-slate-50 p-3";
  return (
    <div className={className}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-navy-950">{value}</p>
    </div>
  );
}

function CommandSignal({
  label,
  value,
  helper,
  tone = "default"
}: {
  label: string;
  value: string;
  helper: string;
  tone?: "default" | "risk" | "blue";
}) {
  const toneClass =
    tone === "risk"
      ? "border-rose-300/20 bg-rose-300/10"
      : tone === "blue"
        ? "border-clinical-200/20 bg-clinical-200/10"
        : "border-white/10 bg-white/10";

  return (
    <div className={`rounded-lg border p-4 ${toneClass}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300">{label}</p>
      <p className="mt-2 truncate text-lg font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-300">{helper}</p>
    </div>
  );
}

function PulseMetric({ label, value, tone = "normal" }: { label: string; value: string; tone?: "normal" | "warn" }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</p>
      <p className={tone === "warn" ? "mt-1 text-lg font-semibold text-amber-700" : "mt-1 text-lg font-semibold text-navy-950"}>{value}</p>
    </div>
  );
}

function ExecutiveFlag({ label, value, intent }: { label: string; value: string; intent: "risk" | "warn" }) {
  return (
    <div className={intent === "risk" ? "rounded-lg border border-rose-300/20 bg-rose-300/10 p-4" : "rounded-lg border border-amber-300/20 bg-amber-300/10 p-4"}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-white">{value}</p>
    </div>
  );
}

function AdminControlCard({
  icon,
  title,
  detail,
  href,
  cta,
  tone = "normal"
}: {
  icon: ReactNode;
  title: string;
  detail: string;
  href: string;
  cta: string;
  tone?: "normal" | "warn";
}) {
  const toneClass = tone === "warn" ? "border-amber-200 bg-amber-50/70" : "border-slate-200 bg-slate-50";
  const iconClass = tone === "warn" ? "text-amber-700" : "text-clinical-700";
  return (
    <article className={`rounded-lg border p-4 ${toneClass}`}>
      <div className={iconClass}>{icon}</div>
      <h3 className="mt-3 text-base font-semibold tracking-tight text-navy-950">{title}</h3>
      <p className="mt-2 min-h-[48px] text-sm leading-6 text-slate-600">{detail}</p>
      <Link href={href} className="focus-ring mt-4 inline-flex rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">{cta}</Link>
    </article>
  );
}

async function getTenantSetupCounts(tenantId: string) {
  const [branches, staffMembers, patients, stockItems, orders, operatingUnits, unitsWithWhatsapp] = await Promise.all([
    prisma.branch.count({ where: { tenantId } }),
    prisma.staffMember.count({ where: { tenantId } }),
    prisma.patient.count({ where: { tenantId } }),
    prisma.stockItem.count({ where: { tenantId } }),
    prisma.order.count({ where: { tenantId } }),
    prisma.operatingUnit.count({ where: { tenantId } }),
    prisma.operatingUnit.count({ where: { tenantId, whatsappNumber: { not: null } } })
  ]);
  return { branches, staffMembers, patients, stockItems, orders, operatingUnits, unitsWithWhatsapp };
}

function SetupCard({ title, status, detail, href, icon }: { title: string; status: string; detail: string; href: string; icon: ReactNode }) {
  const complete = ["Complete", "Ready", "Started"].includes(status);
  return (
    <Link href={href} className="focus-ring rounded-lg border border-clinical-100 bg-white p-4 hover:bg-slate-50">
      <div className={complete ? "inline-flex rounded-lg bg-emerald-50 p-2 text-emerald-700 ring-1 ring-emerald-100" : "inline-flex rounded-lg bg-amber-50 p-2 text-amber-700 ring-1 ring-amber-100"}>{icon}</div>
      <h3 className="mt-3 text-sm font-semibold leading-5 text-navy-950">{title}</h3>
      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.08em] text-clinical-800">{status}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </Link>
  );
}

function BriefPoint({
  label,
  value,
  detail,
  tone = "default"
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "default" | "risk" | "warn";
}) {
  const toneClass =
    tone === "risk"
      ? "border-rose-300/20 bg-rose-300/10"
      : tone === "warn"
        ? "border-amber-300/20 bg-amber-300/10"
        : "border-white/10 bg-white/10";

  return (
    <div className={`rounded-lg border p-4 ${toneClass}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-200">{detail}</p>
    </div>
  );
}

function SignalTile({
  icon,
  label,
  value,
  helper,
  tone
}: {
  icon: ReactNode;
  label: string;
  value: string;
  helper: string;
  tone: "success" | "risk" | "blue";
}) {
  const toneClass =
    tone === "success"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
      : tone === "risk"
        ? "bg-rose-50 text-rose-700 ring-rose-100"
        : "bg-clinical-50 text-clinical-700 ring-clinical-100";

  return (
    <div className="flex gap-3 rounded-lg border border-slate-100 bg-slate-50/70 p-3">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ${toneClass}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</p>
        <p className="mt-1 truncate font-semibold text-navy-950">{value}</p>
        <p className="mt-1 text-sm leading-5 text-slate-500">{helper}</p>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  eyebrow,
  icon,
  children
}: {
  title: string;
  eyebrow: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{eyebrow}</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-navy-950">{title}</h2>
        </div>
        <div className="rounded-lg bg-clinical-50 p-2 text-clinical-700 ring-1 ring-clinical-100">{icon}</div>
      </div>
      {children}
    </section>
  );
}

function QueueRow({ label, count }: { label: string; count: number }) {
  const active = count > 0;

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-3 text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      <span className={active ? "rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 ring-1 ring-rose-100" : "rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-500 ring-1 ring-slate-200"}>
        {count}
      </span>
    </div>
  );
}

function PipelineTile({ label, count }: { label: string; count: number }) {
  return (
    <div className="rounded-lg border border-clinical-100 bg-clinical-50 p-3">
      <p className="min-h-8 text-xs font-medium leading-4 text-clinical-800">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-navy-950">{count}</p>
    </div>
  );
}
