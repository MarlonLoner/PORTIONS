import Link from "next/link";
import { ArrowUpRight, Gauge } from "lucide-react";
import { formatCurrency, formatPercent } from "@/lib/format";

export function BranchPerformanceCard({
  branch
}: {
  branch: {
    id: string;
    name: string;
    area: string;
    revenueToday: number;
    ordersToday: number;
    conversionRate: number;
    chronicDue: number;
    overdueFollowUps: number;
    pendingOrders: number;
    stockAlerts: number;
    staffResponseScore: number;
  };
}) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-navy-950">{branch.name}</h2>
          <p className="text-sm text-slate-500">{branch.area}</p>
        </div>
        <Link href={`/branches/${branch.id}`} className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-clinical-50" aria-label={`Open ${branch.name}`}>
          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <Metric label="Revenue today" value={formatCurrency(branch.revenueToday)} />
        <Metric label="Orders today" value={String(branch.ordersToday)} />
        <Metric label="Online conversion" value={formatPercent(branch.conversionRate)} />
        <Metric label="Chronic due" value={String(branch.chronicDue)} />
        <Metric label="Overdue follow-ups" value={String(branch.overdueFollowUps)} tone={branch.overdueFollowUps > 3 ? "risk" : "normal"} />
        <Metric label="Pending orders" value={String(branch.pendingOrders)} />
        <Metric label="Stock alerts" value={String(branch.stockAlerts)} tone={branch.stockAlerts > 4 ? "risk" : "normal"} />
        <Metric label="Response score" value={`${branch.staffResponseScore}/100`} />
      </div>
      <div className="mt-5 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
        <Gauge className="h-4 w-4 text-clinical-700" aria-hidden="true" />
        {branch.staffResponseScore >= 90 ? "Strong staff rhythm" : "Needs tighter response cadence"}
      </div>
    </article>
  );
}

function Metric({ label, value, tone = "normal" }: { label: string; value: string; tone?: "normal" | "risk" }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={tone === "risk" ? "mt-1 font-semibold text-rose-700" : "mt-1 font-semibold text-navy-950"}>{value}</p>
    </div>
  );
}
