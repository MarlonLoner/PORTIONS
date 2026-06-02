import clsx from "clsx";
import { enumLabel } from "@/lib/format";

const classes: Record<string, string> = {
  HEALTHY: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  LOW_STOCK: "bg-rose-50 text-rose-700 ring-rose-200",
  OVERSTOCK: "bg-amber-50 text-amber-700 ring-amber-200",
  NEAR_EXPIRY: "bg-orange-50 text-orange-700 ring-orange-200",
  DEAD_STOCK: "bg-slate-100 text-slate-700 ring-slate-200"
};

export function StockStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ring-1",
        classes[status] ?? "bg-slate-100 text-slate-700 ring-slate-200"
      )}
    >
      {enumLabel(status)}
    </span>
  );
}
