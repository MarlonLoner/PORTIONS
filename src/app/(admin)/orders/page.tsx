import Link from "next/link";
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  CreditCard,
  DollarSign,
  Filter,
  Globe2,
  Pill,
  Plane,
  ShieldCheck,
  ShoppingBag,
  Truck
} from "lucide-react";
import type { ReactNode } from "react";
import { DataTable } from "@/components/data-table";
import { OrderPipelineCard } from "@/components/order-pipeline-card";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { StatCard } from "@/components/stat-card";
import { enumLabel, formatCurrency, formatDateTime } from "@/lib/format";
import { getOrders, orderSourceOptions, orderStatusOptions, orderTypeOptions } from "@/lib/data";
import { isDelayedOrder, isOnlineOrder, isOrderToday, orderRevenueUrgency, orderSuggestedAction } from "@/lib/orders";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function param(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function OrdersPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const filters = {
    status: param(params.status),
    source: param(params.source),
    branchId: param(params.branchId),
    type: param(params.type)
  };
  const { orders, allOrders, branches } = await getOrders(filters);

  const ordersToday = allOrders.filter(isOrderToday);
  const onlineRevenue = allOrders.filter(isOnlineOrder).reduce((sum, order) => sum + Number(order.amount), 0);
  const awaitingReview = allOrders.filter((order) => order.status === "PHARMACIST_REVIEW");
  const awaitingPayment = allOrders.filter((order) => order.status === "AWAITING_PAYMENT");
  const packedForDispatch = allOrders.filter((order) => order.status === "PACKED");
  const delivered = allOrders.filter((order) => order.status === "DELIVERED");
  const abandonedDelayValue = allOrders
    .filter((order) => order.status === "CANCELLED" || isDelayedOrder(order))
    .reduce((sum, order) => sum + Number(order.amount), 0);
  const smartSections = [
    {
      title: "Revenue stuck in Awaiting Payment",
      eyebrow: "Cash conversion",
      orders: awaitingPayment,
      empty: "No orders are currently stuck at payment.",
      tone: "amber" as const
    },
    {
      title: "Orders Needing Pharmacist Review",
      eyebrow: "Clinical blocker",
      orders: awaitingReview,
      empty: "No orders are waiting for pharmacist review.",
      tone: "rose" as const
    },
    {
      title: "Dispatch Queue",
      eyebrow: "Fulfillment",
      orders: allOrders.filter((order) => order.status === "PAID" || order.status === "PACKED" || order.status === "DISPATCHED"),
      empty: "No paid or packed orders are waiting on fulfillment.",
      tone: "blue" as const
    },
    {
      title: "Diaspora Orders",
      eyebrow: "Remote payer",
      orders: allOrders.filter((order) => order.source === "DIASPORA"),
      empty: "No diaspora orders are active right now.",
      tone: "emerald" as const
    },
    {
      title: "High-Value Orders",
      eyebrow: "Priority revenue",
      orders: [...allOrders].filter((order) => Number(order.amount) >= 100).sort((a, b) => Number(b.amount) - Number(a.amount)),
      empty: "No high-value orders in the current data.",
      tone: "navy" as const
    }
  ];

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-lg border border-navy-800 bg-navy-950 p-5 text-white shadow-[0_28px_80px_rgba(6,21,38,0.22)] sm:p-6 xl:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.12),transparent_36%),linear-gradient(180deg,rgba(75,158,201,0.18),transparent_58%)]" />
        <div className="relative grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-clinical-100 ring-1 ring-white/15">
              <ShoppingBag className="h-3.5 w-3.5" aria-hidden="true" />
              Revenue Capture Pipeline
            </span>
            <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">Order Pipeline</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-200">
              Track prescriptions, refills, online orders, payments, dispatch, and branch fulfillment from one command view.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <HeroSignal label="Online revenue" value={formatCurrency(onlineRevenue)} helper="WhatsApp, website, app, diaspora" />
            <HeroSignal label="Payment queue" value={formatCurrency(awaitingPayment.reduce((sum, order) => sum + Number(order.amount), 0))} helper={`${awaitingPayment.length} orders awaiting payment`} tone="warn" />
            <HeroSignal label="Delay value" value={formatCurrency(abandonedDelayValue)} helper="Cancelled or delayed sales" tone="risk" />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
        <StatCard title="Orders today" value={String(ordersToday.length)} helper="New orders created today" icon={<ShoppingBag className="h-5 w-5" />} tone="navy" trend="Today" />
        <StatCard title="Online revenue" value={formatCurrency(onlineRevenue)} helper="Digital channel revenue" icon={<Globe2 className="h-5 w-5" />} tone="blue" trend="Online" />
        <StatCard title="Pharmacist review" value={String(awaitingReview.length)} helper="Clinical review blocker" icon={<Pill className="h-5 w-5" />} tone="rose" trend="Review" />
        <StatCard title="Awaiting payment" value={String(awaitingPayment.length)} helper="Quoted but unpaid" icon={<CreditCard className="h-5 w-5" />} tone="amber" trend="Cash" />
        <StatCard title="Packed dispatch" value={String(packedForDispatch.length)} helper="Ready for handover" icon={<Boxes className="h-5 w-5" />} tone="emerald" trend="Pack" />
        <StatCard title="Delivered" value={String(delivered.length)} helper="Completed fulfillment" icon={<CheckCircle2 className="h-5 w-5" />} tone="white" trend="Done" />
        <StatCard title="Delay value" value={formatCurrency(abandonedDelayValue)} helper="Abandoned or stalled orders" icon={<AlertTriangle className="h-5 w-5" />} tone="rose" trend="Risk" />
      </section>

      <form className="rounded-lg border border-slate-200 bg-white p-4 shadow-soft" action="/orders">
        <div className="mb-4 flex items-center gap-2">
          <Filter className="h-4 w-4 text-clinical-700" aria-hidden="true" />
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Pipeline Filters</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-5">
          <FilterSelect name="status" label="Status" value={filters.status} options={orderStatusOptions.map((value) => ({ value, label: enumLabel(value) }))} />
          <FilterSelect name="source" label="Source" value={filters.source} options={orderSourceOptions.map((value) => ({ value, label: enumLabel(value) }))} />
          <FilterSelect name="branchId" label="Branch" value={filters.branchId} options={branches.map((branch) => ({ value: branch.id, label: branch.name }))} />
          <FilterSelect name="type" label="Order type" value={filters.type} options={orderTypeOptions.map((value) => ({ value, label: enumLabel(value) }))} />
          <div className="flex items-end gap-2">
            <button type="submit" className="focus-ring h-10 flex-1 rounded-lg bg-navy-950 px-4 text-sm font-semibold text-white">Apply</button>
            <Link href="/orders" className="focus-ring inline-flex h-10 items-center rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700">Reset</Link>
          </div>
        </div>
      </form>

      <section className="grid gap-5 xl:grid-cols-5">
        {smartSections.map((section) => (
          <SmartSection key={section.title} {...section} />
        ))}
      </section>

      <section>
        <div className="mb-4">
          <p className="section-title">Pipeline lanes</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-navy-950">Order Revenue Flow</h2>
        </div>
        <div className="grid gap-5 xl:grid-cols-3">
          {orderStatusOptions.map((status) => {
            const group = orders.filter((order) => order.status === status);
            const groupValue = group.reduce((sum, order) => sum + Number(order.amount), 0);
            const urgent = status === "PHARMACIST_REVIEW" || status === "AWAITING_PAYMENT" || status === "QUOTED";

            return (
              <section key={status} className={urgent ? "rounded-lg border border-amber-200 bg-amber-50/50 p-4" : "rounded-lg border border-slate-200 bg-slate-50 p-4"}>
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-navy-950">{enumLabel(status)}</h3>
                    <p className="mt-1 text-sm text-slate-500">{formatCurrency(groupValue)} in lane</p>
                  </div>
                  <span className={urgent ? "rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200" : "rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200"}>{group.length}</span>
                </div>
                <div className="grid gap-3">
                  {group.length > 0 ? group.map((order) => <OrderPipelineCard key={order.id} order={order} />) : <p className="rounded-lg border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">No orders in this lane.</p>}
                </div>
              </section>
            );
          })}
        </div>
      </section>

      <section className="hidden xl:block">
        <div className="mb-3">
          <p className="section-title">Command table</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-navy-950">All Filtered Orders</h2>
        </div>
        <DataTable
          rows={orders}
          emptyMessage="No orders match these filters."
          columns={[
            {
              header: "Customer",
              cell: (order) => (
                <Link href={`/orders/${order.id}`} className="font-semibold text-navy-950 hover:text-clinical-700">
                  {order.customerName}
                  <span className="block text-xs font-normal text-slate-500">{order.phone}</span>
                </Link>
              )
            },
            { header: "Source", cell: (order) => enumLabel(order.source) },
            { header: "Branch", cell: (order) => order.branch.name },
            { header: "Type", cell: (order) => enumLabel(order.type) },
            { header: "Status", cell: (order) => <OrderStatusBadge status={order.status} /> },
            { header: "Amount", cell: (order) => formatCurrency(order.amount) },
            { header: "Created", cell: (order) => formatDateTime(order.createdAt) },
            { header: "Owner", cell: (order) => order.assignedStaff?.name ?? "Unassigned" },
            { header: "Urgency", className: "min-w-[220px] px-4 py-4 text-slate-700", cell: (order) => orderRevenueUrgency(order) },
            { header: "Next action", className: "min-w-[320px] px-4 py-4 text-slate-700", cell: (order) => orderSuggestedAction(order) }
          ]}
        />
      </section>
    </div>
  );
}

function FilterSelect({
  name,
  label,
  value,
  options
}: {
  name: string;
  label: string;
  value?: string;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</span>
      <select name={name} defaultValue={value ?? ""} className="focus-ring mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700">
        <option value="">All</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function HeroSignal({ label, value, helper, tone = "default" }: { label: string; value: string; helper: string; tone?: "default" | "warn" | "risk" }) {
  const toneClass = tone === "risk" ? "border-rose-300/20 bg-rose-300/10" : tone === "warn" ? "border-amber-300/20 bg-amber-300/10" : "border-white/10 bg-white/10";

  return (
    <div className={`rounded-lg border p-4 ${toneClass}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-white">{value}</p>
      <p className="mt-1 text-sm text-slate-300">{helper}</p>
    </div>
  );
}

function SmartSection({
  title,
  eyebrow,
  orders,
  empty,
  tone
}: {
  title: string;
  eyebrow: string;
  orders: Array<{
    id: string;
    customerName: string;
    amount: number | string | { toString(): string };
    status: string;
    source: string;
  }>;
  empty: string;
  tone: "amber" | "rose" | "blue" | "emerald" | "navy";
}) {
  const iconMap: Record<typeof tone, ReactNode> = {
    amber: <CreditCard className="h-4 w-4" />,
    rose: <ShieldCheck className="h-4 w-4" />,
    blue: <Truck className="h-4 w-4" />,
    emerald: <Plane className="h-4 w-4" />,
    navy: <DollarSign className="h-4 w-4" />
  };
  const toneClass =
    tone === "rose"
      ? "bg-rose-50 text-rose-700 ring-rose-100"
      : tone === "amber"
        ? "bg-amber-50 text-amber-700 ring-amber-100"
        : tone === "emerald"
          ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
          : tone === "navy"
            ? "bg-navy-950 text-white ring-navy-900"
            : "bg-clinical-50 text-clinical-700 ring-clinical-100";

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-soft">
      <div className={`mb-4 inline-flex rounded-lg p-2 ring-1 ${toneClass}`}>{iconMap[tone]}</div>
      <p className="section-title">{eyebrow}</p>
      <h2 className="mt-2 text-base font-semibold leading-6 text-navy-950">{title}</h2>
      <div className="mt-4 space-y-2">
        {orders.slice(0, 3).map((order) => (
          <Link key={order.id} href={`/orders/${order.id}`} className="block rounded-lg bg-slate-50 p-3 text-sm hover:bg-clinical-50">
            <div className="flex items-center justify-between gap-3">
              <span className="truncate font-semibold text-slate-800">{order.customerName}</span>
              <span className="shrink-0 font-semibold text-navy-950">{formatCurrency(order.amount)}</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">{enumLabel(order.source)} - {enumLabel(order.status)}</p>
          </Link>
        ))}
        {orders.length === 0 ? <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">{empty}</p> : null}
      </div>
    </article>
  );
}
