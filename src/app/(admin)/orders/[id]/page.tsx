import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  CreditCard,
  DollarSign,
  MessageSquareWarning,
  PackageCheck,
  Phone,
  ShoppingBag,
  Truck,
  UserRound
} from "lucide-react";
import type { ReactNode } from "react";
import { DataTable } from "@/components/data-table";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { OrderWhatsAppBox } from "@/components/order-whatsapp-box";
import { PrepareCommunicationButton } from "@/components/prepare-communication-button";
import { enumLabel, formatCurrency, formatDateTime } from "@/lib/format";
import { getOrderDetail, orderStatusOptions } from "@/lib/data";
import { orderCustomerMessage, orderRevenueUrgency, orderSuggestedAction } from "@/lib/orders";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrderDetail(id);

  if (!order) {
    notFound();
  }

  const currentIndex = orderStatusOptions.indexOf(order.status);
  const action = orderSuggestedAction(order);
  const urgency = orderRevenueUrgency(order);
  const customerUpdate = orderCustomerMessage(order);
  const revenueBlocked = order.status === "AWAITING_PAYMENT" || order.status === "QUOTED" || order.status === "PHARMACIST_REVIEW";

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-lg border border-navy-800 bg-navy-950 p-5 text-white shadow-[0_28px_80px_rgba(6,21,38,0.22)] sm:p-6 xl:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.12),transparent_36%),linear-gradient(180deg,rgba(75,158,201,0.18),transparent_58%)]" />
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-4xl">
            <Link href="/orders" className="focus-ring inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold text-white ring-1 ring-white/15">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to order pipeline
            </Link>
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <OrderStatusBadge status={order.status} />
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-clinical-100 ring-1 ring-white/15">
                {enumLabel(order.source)}
              </span>
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-clinical-100 ring-1 ring-white/15">
                {enumLabel(order.type)}
              </span>
            </div>
            <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">{order.customerName}</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-200">
              Order command profile for payment capture, pharmacist workflow, packing, dispatch, and branch fulfillment.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 xl:w-[540px]">
            <HeroMetric label="Order amount" value={formatCurrency(order.amount)} />
            <HeroMetric label="Payment" value={order.paymentStatus} tone={revenueBlocked ? "risk" : "default"} />
            <HeroMetric label="Fulfillment" value={order.fulfillmentPreference} />
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.88fr_1.12fr]">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="section-title">Order command profile</p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-navy-950">Customer and Fulfillment Context</h2>
            </div>
            <ShoppingBag className="h-5 w-5 text-clinical-700" aria-hidden="true" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <ProfileItem icon={<UserRound className="h-4 w-4" />} label="Customer" value={order.customerName} />
            <ProfileItem icon={<Phone className="h-4 w-4" />} label="Phone" value={order.phone} />
            <ProfileItem icon={<Building2 className="h-4 w-4" />} label="Branch" value={order.branch.name} />
            <ProfileItem icon={<ShoppingBag className="h-4 w-4" />} label="Source" value={enumLabel(order.source)} />
            <ProfileItem icon={<CreditCard className="h-4 w-4" />} label="Payment status" value={order.paymentStatus} tone={revenueBlocked ? "risk" : "default"} />
            <ProfileItem icon={<Truck className="h-4 w-4" />} label="Delivery or collection" value={order.fulfillmentPreference} />
            <ProfileItem icon={<DollarSign className="h-4 w-4" />} label="Amount" value={formatCurrency(order.amount)} />
            <ProfileItem icon={<PackageCheck className="h-4 w-4" />} label="Assigned staff" value={order.assignedStaff?.name ?? "Unassigned"} />
          </div>
        </article>

        <article className={revenueBlocked ? "rounded-lg border border-amber-200 bg-white p-5 shadow-soft" : "rounded-lg border border-clinical-100 bg-white p-5 shadow-soft"}>
          <div className="flex items-start gap-3">
            <div className={revenueBlocked ? "rounded-lg bg-amber-50 p-3 text-amber-700 ring-1 ring-amber-100" : "rounded-lg bg-clinical-50 p-3 text-clinical-700 ring-1 ring-clinical-100"}>
              <MessageSquareWarning className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="section-title">Revenue Action</p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-navy-950">{urgency}</h2>
              <p className="mt-4 rounded-lg bg-slate-50 p-4 text-sm leading-6 text-slate-700">{action}</p>
              <div className="mt-5">
                <OrderWhatsAppBox message={customerUpdate} />
              </div>
              <div className="mt-4">
                <PrepareCommunicationButton sourceType="ORDER" sourceId={order.id} templateType={revenueBlocked ? "ORDER_PAYMENT" : "ORDER_UPDATE"} label="Open Communication workflow" className="focus-ring inline-flex items-center gap-2 rounded-lg bg-navy-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-800" />
              </div>
            </div>
          </div>
        </article>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
        <Panel title="Items" eyebrow="Order contents">
          <DataTable
            rows={order.items}
            columns={[
              { header: "Product", cell: (item) => item.productName },
              { header: "Category", cell: (item) => item.category },
              { header: "Qty", cell: (item) => item.quantity },
              { header: "Unit price", cell: (item) => formatCurrency(item.unitPrice) },
              { header: "Line total", cell: (item) => formatCurrency(Number(item.unitPrice) * item.quantity) }
            ]}
          />
        </Panel>

        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <div className="mb-5">
            <p className="section-title">Status timeline</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-navy-950">Pipeline Movement</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {orderStatusOptions.map((status, index) => {
              const active = index <= currentIndex;
              const current = status === order.status;
              return (
                <div key={status} className={current ? "rounded-lg border border-navy-900 bg-navy-950 p-3 text-white" : active ? "rounded-lg border border-clinical-200 bg-clinical-50 p-3" : "rounded-lg border border-slate-200 bg-white p-3"}>
                  <p className={current ? "text-sm font-semibold text-white" : active ? "text-sm font-semibold text-clinical-800" : "text-sm font-semibold text-slate-500"}>{enumLabel(status)}</p>
                  <p className={current ? "mt-1 text-xs text-clinical-100" : "mt-1 text-xs text-slate-500"}>{current ? "Current stage" : active ? "Reached" : "Pending"}</p>
                </div>
              );
            })}
          </div>
        </article>
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <SmartCard title="Revenue stuck in Awaiting Payment" active={order.status === "AWAITING_PAYMENT" || order.status === "QUOTED"} value={order.status === "AWAITING_PAYMENT" || order.status === "QUOTED" ? formatCurrency(order.amount) : "$0"} detail={order.status === "AWAITING_PAYMENT" || order.status === "QUOTED" ? "Send payment reminder now." : "This order is not currently stuck at payment."} />
        <SmartCard title="Orders Needing Pharmacist Review" active={order.status === "PHARMACIST_REVIEW"} value={order.status === "PHARMACIST_REVIEW" ? "Review needed" : "Clear"} detail={order.status === "PHARMACIST_REVIEW" ? "Prioritize before customer switches pharmacy." : "No pharmacist review blocker on this order."} />
        <SmartCard title="Dispatch Queue" active={order.status === "PAID" || order.status === "PACKED" || order.status === "DISPATCHED"} value={enumLabel(order.status)} detail={order.status === "PAID" || order.status === "PACKED" || order.status === "DISPATCHED" ? "Move fulfillment forward before end of day." : "Order is not in dispatch workflow yet."} />
        <SmartCard title="Diaspora Order" active={order.source === "DIASPORA"} value={order.source === "DIASPORA" ? "Remote payer" : "No"} detail={order.source === "DIASPORA" ? "Keep payer and recipient updates clear on WhatsApp." : "Standard local order communication."} />
        <SmartCard title="High-Value Order" active={Number(order.amount) >= 100} value={formatCurrency(order.amount)} detail={Number(order.amount) >= 100 ? "Treat as priority revenue until completed." : "Standard value order."} />
        <SmartCard title="Internal Notes" active={Boolean(order.internalNotes)} value="Staff note" detail={order.internalNotes ?? "No internal notes recorded."} />
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

function ProfileItem({ icon, label, value, tone = "default" }: { icon: ReactNode; label: string; value: string; tone?: "default" | "risk" }) {
  return (
    <div className={tone === "risk" ? "rounded-lg border border-amber-100 bg-amber-50 p-3" : "rounded-lg border border-slate-100 bg-slate-50 p-3"}>
      <div className={tone === "risk" ? "mb-2 text-amber-700" : "mb-2 text-clinical-700"}>{icon}</div>
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</p>
      <p className={tone === "risk" ? "mt-1 font-semibold text-amber-700" : "mt-1 font-semibold text-slate-800"}>{value}</p>
    </div>
  );
}

function Panel({ title, eyebrow, children }: { title: string; eyebrow: string; children: ReactNode }) {
  return (
    <section>
      <div className="mb-3">
        <p className="section-title">{eyebrow}</p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-navy-950">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function SmartCard({ title, active, value, detail }: { title: string; active: boolean; value: string; detail: string }) {
  return (
    <article className={active ? "rounded-lg border border-clinical-200 bg-white p-5 shadow-soft" : "rounded-lg border border-slate-200 bg-white p-5 shadow-soft"}>
      <p className="section-title">{title}</p>
      <p className={active ? "mt-3 text-xl font-semibold text-navy-950" : "mt-3 text-xl font-semibold text-slate-500"}>{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p>
    </article>
  );
}
