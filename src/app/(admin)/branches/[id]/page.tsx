import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Boxes,
  Building2,
  CreditCard,
  DollarSign,
  LineChart,
  MessageSquareReply,
  PackageSearch,
  Pill,
  ShoppingBag,
  UsersRound
} from "lucide-react";
import type { ReactNode } from "react";
import { AiBriefCard } from "@/components/ai-brief-card";
import { DataTable } from "@/components/data-table";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { RiskBadge } from "@/components/risk-badge";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { StockStatusBadge } from "@/components/stock-status-badge";
import { enumLabel, formatCurrency, formatPercent } from "@/lib/format";
import { getBranchDetail } from "@/lib/data";

export const dynamic = "force-dynamic";

const healthClasses = {
  Strong: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Stable: "bg-clinical-50 text-clinical-800 ring-clinical-200",
  Watch: "bg-amber-50 text-amber-700 ring-amber-200",
  Critical: "bg-rose-50 text-rose-700 ring-rose-200"
};

export default async function BranchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getBranchDetail(id);

  if (!data) {
    notFound();
  }

  const { branch, metrics, ordersByStatus, patientsDueToday, overduePatients, highRiskPatients, lowStockItems, nearExpiryItems } = data;
  const orderFlow = {
    newOrders: branch.orders.filter((order) => order.status === "NEW"),
    review: branch.orders.filter((order) => order.status === "PHARMACIST_REVIEW"),
    quoted: branch.orders.filter((order) => order.status === "QUOTED"),
    paid: branch.orders.filter((order) => order.status === "PAID"),
    dispatch: branch.orders.filter((order) => order.status === "PAID" || order.status === "PACKED" || order.status === "DISPATCHED")
  };
  const highValueOrders = branch.orders.filter((order) => Number(order.amount) >= 100).sort((a, b) => Number(b.amount) - Number(a.amount));
  const followUpsHandled = branch.followUpTasks.filter((task) => task.status === "DONE").length;
  const awaitingPaymentOrders = branch.orders.filter((order) => order.status === "AWAITING_PAYMENT" || order.status === "QUOTED");

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-lg border border-navy-800 bg-navy-950 p-5 text-white shadow-[0_28px_80px_rgba(6,21,38,0.22)] sm:p-6 xl:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.12),transparent_36%),linear-gradient(180deg,rgba(75,158,201,0.18),transparent_58%)]" />
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-4xl">
            <Link href="/branches" className="focus-ring inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold text-white ring-1 ring-white/15">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to branch command
            </Link>
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ring-1 ${healthClasses[metrics.health]}`}>
                {metrics.health}
              </span>
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-clinical-100 ring-1 ring-white/15">
                {branch.area}
              </span>
            </div>
            <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">{branch.name} Branch Command</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-200">
              Full command profile for revenue, order flow, chronic care, staff rhythm, and stock pressure.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 xl:w-[540px]">
            <HeroMetric label="Revenue today" value={formatCurrency(metrics.revenueToday)} />
            <HeroMetric label="Awaiting payment" value={formatCurrency(metrics.awaitingPaymentValue)} tone={metrics.awaitingPaymentValue > 0 ? "risk" : "default"} />
            <HeroMetric label="Response score" value={`${metrics.staffResponseScore}/100`} tone={metrics.staffResponseScore < 82 ? "risk" : "default"} />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Revenue today" value={formatCurrency(metrics.revenueToday)} helper={`Target ${formatCurrency(branch.revenueTarget)}`} icon={<LineChart className="h-5 w-5" />} tone="navy" trend="Today" />
        <StatCard title="Orders today" value={String(metrics.ordersToday)} helper={`${metrics.onlineRevenueToday ? formatCurrency(metrics.onlineRevenueToday) : "$0"} online revenue`} icon={<ShoppingBag className="h-5 w-5" />} tone="blue" trend="Orders" />
        <StatCard title="Conversion rate" value={formatPercent(metrics.conversionRate)} helper="Online paid conversion" icon={<CreditCard className="h-5 w-5" />} tone={metrics.conversionRate < 35 ? "amber" : "emerald"} trend="Funnel" />
        <StatCard title="Chronic due" value={String(metrics.chronicDue)} helper={`${metrics.overduePatients} overdue refill patients`} icon={<UsersRound className="h-5 w-5" />} tone={metrics.overduePatients > 0 ? "rose" : "emerald"} trend="Care" />
        <StatCard title="Pharmacist reviews" value={String(metrics.pendingPharmacistReviews)} helper="Clinical order blockers" icon={<Pill className="h-5 w-5" />} tone={metrics.pendingPharmacistReviews > 0 ? "amber" : "emerald"} trend="Clinical" />
        <StatCard title="Awaiting payment" value={formatCurrency(metrics.awaitingPaymentValue)} helper="Quoted or unpaid revenue" icon={<DollarSign className="h-5 w-5" />} tone={metrics.awaitingPaymentValue > 0 ? "amber" : "emerald"} trend="Cash" />
        <StatCard title="Stock alerts" value={String(metrics.stockAlerts)} helper={`${lowStockItems.length} low stock, ${nearExpiryItems.length} near expiry`} icon={<PackageSearch className="h-5 w-5" />} tone={metrics.stockAlerts > 0 ? "amber" : "emerald"} trend="Stock" />
        <StatCard title="Overdue follow-ups" value={String(metrics.overdueFollowUps)} helper="Manager attention queue" icon={<MessageSquareReply className="h-5 w-5" />} tone={metrics.overdueFollowUps > 0 ? "rose" : "emerald"} trend="Follow-up" />
        <StatCard title="Pending orders" value={String(metrics.pendingOrders)} helper="Active order workload" icon={<Boxes className="h-5 w-5" />} trend="Flow" />
        <StatCard title="Staff response" value={`${metrics.staffResponseScore}/100`} helper="Service rhythm score" icon={<Building2 className="h-5 w-5" />} tone={metrics.staffResponseScore < 82 ? "rose" : "emerald"} trend="Staff" />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <AiBriefCard title="AI Branch Coach" variant="executive" action={metrics.suggestedAction}>
          <p>{metrics.aiCoachSummary}</p>
        </AiBriefCard>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <p className="section-title">Recommended Actions</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-navy-950">Manager Moves</h2>
          <div className="mt-5 space-y-3">
            <ActionCard title="Clear payment leakage" detail={metrics.awaitingPaymentValue > 0 ? `Recover ${formatCurrency(metrics.awaitingPaymentValue)} in quoted or unpaid revenue.` : "No major payment leakage. Keep quote follow-up hourly."} tone={metrics.awaitingPaymentValue > 0 ? "warn" : "default"} />
            <ActionCard title="Protect chronic care" detail={metrics.overduePatients > 0 ? `Recover ${metrics.overduePatients} overdue refill patients before they become lost.` : "Chronic care load is controlled. Prepare due refills early."} tone={metrics.overduePatients > 0 ? "risk" : "default"} />
            <ActionCard title="Resolve stock pressure" detail={metrics.stockAlerts > 0 ? "Review low-stock and near-expiry items before the next purchasing cycle." : "Stock risk is controlled. Keep reorder rhythm stable."} tone={metrics.stockAlerts > 0 ? "warn" : "default"} />
          </div>
        </section>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Panel title="Revenue Pulse" eyebrow="Order value by stage">
          <div className="grid gap-3 sm:grid-cols-2">
            {ordersByStatus.map((item) => (
              <div key={item.status} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <OrderStatusBadge status={item.status} />
                  <span className="text-sm font-semibold text-navy-950">{formatCurrency(item.value)}</span>
                </div>
                <p className="mt-2 text-sm text-slate-500">{item.count} orders</p>
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <MiniMetric label="Awaiting payment value" value={formatCurrency(metrics.awaitingPaymentValue)} />
            <MiniMetric label="High-value orders" value={String(highValueOrders.length)} />
          </div>
        </Panel>

        <Panel title="Chronic Care Load" eyebrow="Patient pressure">
          <div className="grid gap-3 sm:grid-cols-3">
            <MiniMetric label="Due today" value={String(patientsDueToday.length)} />
            <MiniMetric label="Overdue patients" value={String(overduePatients.length)} tone={overduePatients.length > 0 ? "risk" : "normal"} />
            <MiniMetric label="High-risk patients" value={String(highRiskPatients.length)} tone={highRiskPatients.length > 0 ? "risk" : "normal"} />
          </div>
          <div className="mt-4 space-y-3">
            {[...overduePatients, ...patientsDueToday].slice(0, 5).map((patient) => (
              <div key={patient.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-navy-950">{patient.name}</p>
                  <StatusBadge status={patient.status} />
                  <RiskBadge risk={patient.riskScore} />
                </div>
                <p className="mt-1 text-sm text-slate-500">{patient.conditionCategory}</p>
              </div>
            ))}
            {patientsDueToday.length + overduePatients.length === 0 ? <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">No urgent chronic care load for this branch.</p> : null}
          </div>
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel title="Order Flow" eyebrow="Commercial movement">
          <div className="grid gap-3 sm:grid-cols-5">
            <MiniMetric label="New" value={String(orderFlow.newOrders.length)} />
            <MiniMetric label="Review" value={String(orderFlow.review.length)} tone={orderFlow.review.length > 0 ? "risk" : "normal"} />
            <MiniMetric label="Quoted" value={String(orderFlow.quoted.length)} tone={orderFlow.quoted.length > 0 ? "warn" : "normal"} />
            <MiniMetric label="Paid" value={String(orderFlow.paid.length)} />
            <MiniMetric label="Dispatch" value={String(orderFlow.dispatch.length)} />
          </div>
          <div className="mt-4">
            <DataTable
              rows={branch.orders.slice(0, 8)}
              emptyMessage="No orders recorded for this branch."
              columns={[
                { header: "Customer", cell: (order) => order.customerName },
                { header: "Status", cell: (order) => <OrderStatusBadge status={order.status} /> },
                { header: "Amount", cell: (order) => formatCurrency(order.amount) },
                { header: "Source", cell: (order) => enumLabel(order.source) }
              ]}
            />
          </div>
        </Panel>

        <Panel title="Staff Performance" eyebrow="Service rhythm">
          <div className="grid gap-3 sm:grid-cols-2">
            <MiniMetric label="Staff assigned" value={String(branch.staffMembers.length)} />
            <MiniMetric label="Tasks handled" value={String(followUpsHandled)} />
            <MiniMetric label="Response score" value={`${metrics.staffResponseScore}/100`} tone={metrics.staffResponseScore < 82 ? "risk" : "normal"} />
            <MiniMetric label="Open follow-ups" value={String(branch.followUpTasks.length - followUpsHandled)} />
          </div>
          <div className="mt-4 space-y-3">
            {branch.staffMembers.map((staff) => (
              <div key={staff.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <p className="font-semibold text-navy-950">{staff.name}</p>
                <p className="mt-1 text-sm text-slate-500">{staff.role}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 rounded-lg bg-clinical-50 p-3 text-sm leading-6 text-clinical-900">
            {metrics.staffResponseScore >= 90 ? "Coaching note: use this team rhythm as the network benchmark." : "Coaching note: tighten WhatsApp response times and assign one owner to every open blocker."}
          </p>
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
        <Panel title="Stock Risk" eyebrow="Inventory pressure">
          <div className="grid gap-3 sm:grid-cols-3">
            <MiniMetric label="Low stock items" value={String(lowStockItems.length)} tone={lowStockItems.length > 0 ? "risk" : "normal"} />
            <MiniMetric label="Near expiry items" value={String(nearExpiryItems.length)} tone={nearExpiryItems.length > 0 ? "warn" : "normal"} />
            <MiniMetric label="Total stock alerts" value={String(metrics.stockAlerts)} tone={metrics.stockAlerts > 0 ? "warn" : "normal"} />
          </div>
          <div className="mt-4">
            <DataTable
              rows={[...lowStockItems, ...nearExpiryItems].slice(0, 8)}
              emptyMessage="No low-stock or near-expiry issues for this branch."
              columns={[
                { header: "Product", cell: (item) => item.productName },
                { header: "Category", cell: (item) => item.category },
                { header: "Level", cell: (item) => `${item.stockLevel}/${item.reorderLevel}` },
                { header: "Status", cell: (item) => <StockStatusBadge status={item.status} /> },
                { header: "Suggested action", className: "min-w-[240px] px-4 py-4 text-slate-700", cell: (item) => item.suggestedAction }
              ]}
            />
          </div>
        </Panel>

        <Panel title="Revenue Leakage" eyebrow="Payment risk">
          <DataTable
            rows={awaitingPaymentOrders}
            emptyMessage="No quoted or awaiting-payment orders for this branch."
            columns={[
              { header: "Customer", cell: (order) => order.customerName },
              { header: "Status", cell: (order) => <OrderStatusBadge status={order.status} /> },
              { header: "Amount", cell: (order) => formatCurrency(order.amount) },
              { header: "Owner", cell: (order) => order.assignedStaff?.name ?? "Unassigned" }
            ]}
          />
        </Panel>
      </section>
    </div>
  );
}

function HeroMetric({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "risk" }) {
  return (
    <div className={tone === "risk" ? "rounded-lg border border-amber-300/20 bg-amber-300/10 p-4" : "rounded-lg border border-white/10 bg-white/10 p-4"}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300">{label}</p>
      <p className="mt-2 truncate text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function Panel({ title, eyebrow, children }: { title: string; eyebrow: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
      <div className="mb-5">
        <p className="section-title">{eyebrow}</p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-navy-950">{title}</h2>
      </div>
      {children}
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

function ActionCard({ title, detail, tone = "default" }: { title: string; detail: string; tone?: "default" | "risk" | "warn" }) {
  const className =
    tone === "risk"
      ? "rounded-lg border border-rose-100 bg-rose-50 p-4"
      : tone === "warn"
        ? "rounded-lg border border-amber-100 bg-amber-50 p-4"
        : "rounded-lg border border-slate-100 bg-slate-50 p-4";

  return (
    <article className={className}>
      <p className="font-semibold text-navy-950">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p>
    </article>
  );
}
