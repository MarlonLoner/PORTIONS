import clsx from "clsx";
import { enumLabel } from "@/lib/format";

const classes: Record<string, string> = {
  NEW: "bg-sky-50 text-sky-700 ring-sky-200",
  PHARMACIST_REVIEW: "bg-violet-50 text-violet-700 ring-violet-200",
  QUOTED: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  AWAITING_PAYMENT: "bg-amber-50 text-amber-700 ring-amber-200",
  PAID: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  PACKED: "bg-teal-50 text-teal-700 ring-teal-200",
  DISPATCHED: "bg-cyan-50 text-cyan-700 ring-cyan-200",
  DELIVERED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  CANCELLED: "bg-rose-50 text-rose-700 ring-rose-200"
};

export function OrderStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1",
        classes[status] ?? "bg-slate-100 text-slate-700 ring-slate-200"
      )}
    >
      {enumLabel(status)}
    </span>
  );
}
