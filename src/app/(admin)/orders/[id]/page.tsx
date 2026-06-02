import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { DataTable } from "@/components/data-table";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { PageHeader } from "@/components/page-header";
import { enumLabel, formatCurrency, formatDateTime } from "@/lib/format";
import { getOrderDetail, orderStatusOptions } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrderDetail(id);

  if (!order) {
    notFound();
  }

  const currentIndex = orderStatusOptions.indexOf(order.status);
  const customerUpdate = `Hi ${order.customerName.split(" ")[0]}, your PORTIONS order is currently ${enumLabel(order.status).toLowerCase()}. We will update you as soon as the next step is completed.`;

  return (
    <>
      <PageHeader
        eyebrow="Order detail"
        title={order.customerName}
        description={`${enumLabel(order.source)} ${enumLabel(order.type)} order at ${order.branch.name}.`}
        action={
          <Link href="/orders" className="focus-ring inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back
          </Link>
        }
      />

      <section className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-navy-950">Order Summary</h2>
              <p className="mt-1 text-sm text-slate-500">{formatDateTime(order.createdAt)}</p>
            </div>
            <OrderStatusBadge status={order.status} />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <SummaryItem label="Amount" value={formatCurrency(order.amount)} />
            <SummaryItem label="Payment status" value={order.paymentStatus} />
            <SummaryItem label="Fulfillment" value={order.fulfillmentPreference} />
            <SummaryItem label="Assigned staff" value={order.assignedStaff?.name ?? "Unassigned"} />
            <SummaryItem label="Branch" value={order.branch.name} />
            <SummaryItem label="Phone" value={order.phone} />
          </div>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <h2 className="text-lg font-semibold text-navy-950">Status Timeline</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {orderStatusOptions.map((status, index) => {
              const active = index <= currentIndex;
              return (
                <div key={status} className={active ? "rounded-lg border border-clinical-200 bg-clinical-50 p-3" : "rounded-lg border border-slate-200 bg-white p-3"}>
                  <p className={active ? "text-sm font-semibold text-clinical-800" : "text-sm font-semibold text-slate-500"}>{enumLabel(status)}</p>
                  <p className="mt-1 text-xs text-slate-500">{active ? "Reached" : "Pending"}</p>
                </div>
              );
            })}
          </div>
        </article>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div>
          <h2 className="mb-3 text-lg font-semibold text-navy-950">Items</h2>
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
        </div>

        <div className="grid gap-5">
          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
            <h2 className="text-lg font-semibold text-navy-950">Customer Info</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <p><span className="font-semibold text-slate-800">Name:</span> {order.customerName}</p>
              <p><span className="font-semibold text-slate-800">Phone:</span> {order.phone}</p>
              <p><span className="font-semibold text-slate-800">Patient profile:</span> {order.patient?.name ?? "Not linked"}</p>
            </div>
          </article>

          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
            <h2 className="text-lg font-semibold text-navy-950">Internal Notes</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">{order.internalNotes ?? "No internal notes recorded."}</p>
          </article>

          <article className="rounded-lg border border-emerald-100 bg-emerald-50 p-5">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-emerald-600" aria-hidden="true" />
              <h2 className="text-base font-semibold text-emerald-950">AI Suggested Customer Update</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-emerald-950">{customerUpdate}</p>
          </article>
        </div>
      </section>
    </>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-800">{value}</p>
    </div>
  );
}
