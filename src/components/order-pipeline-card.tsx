import Link from "next/link";
import { ArrowRight, Clock3, DollarSign } from "lucide-react";
import type { ReactNode } from "react";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { PrepareCommunicationButton } from "@/components/prepare-communication-button";
import { orderRevenueUrgency, orderSuggestedAction } from "@/lib/orders";
import { enumLabel, formatCurrency, formatDateTime } from "@/lib/format";

export function OrderPipelineCard({
  order
}: {
  order: {
    id: string;
    customerName: string;
    source: string;
    branch: { name: string };
    type: string;
    status: string;
    amount: number | string | { toString(): string };
    createdAt: Date;
    assignedStaff?: { name: string } | null;
    fulfillmentPreference: string;
  };
}) {
  const urgency = orderRevenueUrgency(order);
  const urgent = order.status === "AWAITING_PAYMENT" || order.status === "PHARMACIST_REVIEW" || order.status === "QUOTED";

  return (
    <article className={urgent ? "rounded-lg border border-amber-200 bg-white p-4 shadow-soft transition hover:-translate-y-0.5 hover:border-amber-300" : "rounded-lg border border-slate-200 bg-white p-4 shadow-soft transition hover:-translate-y-0.5 hover:border-clinical-200"}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Link href={`/orders/${order.id}`} className="font-semibold text-navy-950 hover:text-clinical-700">
            {order.customerName}
          </Link>
          <p className="mt-1 text-xs text-slate-500">{enumLabel(order.source)} - {order.branch.name} - {enumLabel(order.type)}</p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Metric icon={<DollarSign className="h-3.5 w-3.5" />} label="Amount" value={formatCurrency(order.amount)} />
        <Metric icon={<Clock3 className="h-3.5 w-3.5" />} label="Created" value={formatDateTime(order.createdAt)} />
      </div>

      <p className={urgent ? "mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium leading-6 text-amber-800" : "mt-4 rounded-lg bg-clinical-50 px-3 py-2 text-sm font-medium leading-6 text-clinical-800"}>
        {urgency}
      </p>
      <p className="mt-3 text-sm leading-6 text-slate-600">{orderSuggestedAction(order)}</p>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
        <p className="text-xs text-slate-500">Owner: <span className="font-semibold text-slate-700">{order.assignedStaff?.name ?? "Unassigned"}</span></p>
        <div className="flex flex-wrap justify-end gap-2">
          <PrepareCommunicationButton sourceType="ORDER" sourceId={order.id} templateType={order.status === "AWAITING_PAYMENT" || order.status === "QUOTED" ? "ORDER_PAYMENT" : "ORDER_UPDATE"} label="Message" />
          <Link href={`/orders/${order.id}`} className="focus-ring inline-flex items-center gap-1.5 rounded-lg bg-navy-950 px-3 py-2 text-xs font-semibold text-white">
            Open
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
      <div className="flex items-center gap-1.5 text-clinical-700">
        {icon}
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</p>
      </div>
      <p className="mt-1 font-semibold text-navy-950">{value}</p>
    </div>
  );
}
