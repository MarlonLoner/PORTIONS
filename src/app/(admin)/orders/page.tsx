import Link from "next/link";
import { DataTable } from "@/components/data-table";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { PageHeader } from "@/components/page-header";
import { enumLabel, formatCurrency, formatDateTime } from "@/lib/format";
import { getOrders } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const orders = await getOrders();

  return (
    <>
      <PageHeader
        eyebrow="Order Flow"
        title="Orders"
        description="Track WhatsApp, website, app, walk-in, and diaspora orders from pharmacist review through payment, packing, dispatch, and delivery."
      />

      <DataTable
        rows={orders}
        emptyMessage="No orders have been created yet."
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
          { header: "Assigned staff", cell: (order) => order.assignedStaff?.name ?? "Unassigned" }
        ]}
      />
    </>
  );
}
