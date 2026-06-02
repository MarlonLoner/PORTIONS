import Link from "next/link";
import { ArrowRight, Gauge, MessageSquareWarning } from "lucide-react";
import { formatCurrency, formatPercent } from "@/lib/format";

const healthClasses = {
  Strong: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Stable: "bg-clinical-50 text-clinical-800 ring-clinical-200",
  Watch: "bg-amber-50 text-amber-700 ring-amber-200",
  Critical: "bg-rose-50 text-rose-700 ring-rose-200"
};

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
    pendingPharmacistReviews: number;
    awaitingPaymentValue: number;
    stockAlerts: number;
    staffResponseScore: number;
    health: "Strong" | "Stable" | "Watch" | "Critical";
    suggestedAction: string;
  };
}) {
  const urgent = branch.health === "Critical" || branch.health === "Watch";

  return (
    <article className={urgent ? "relative overflow-hidden rounded-lg border border-amber-200 bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-amber-300" : "relative overflow-hidden rounded-lg border border-slate-200 bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-clinical-200"}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-clinical-100/70 to-transparent" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold tracking-tight text-navy-950">{branch.name}</h2>
            <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ring-1 ${healthClasses[branch.health]}`}>
              {branch.health}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">{branch.area}</p>
        </div>
        <Link href={`/branches/${branch.id}`} className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-lg bg-navy-950 text-white" aria-label={`Open ${branch.name}`}>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      <div className="relative mt-5 grid grid-cols-2 gap-3 text-sm">
        <Metric label="Revenue today" value={formatCurrency(branch.revenueToday)} />
        <Metric label="Orders today" value={String(branch.ordersToday)} />
        <Metric label="Online conversion" value={formatPercent(branch.conversionRate)} tone={branch.conversionRate < 35 ? "risk" : "normal"} />
        <Metric label="Chronic due" value={String(branch.chronicDue)} />
        <Metric label="Overdue follow-ups" value={String(branch.overdueFollowUps)} tone={branch.overdueFollowUps > 0 ? "risk" : "normal"} />
        <Metric label="Pending orders" value={String(branch.pendingOrders)} />
        <Metric label="Pharmacist reviews" value={String(branch.pendingPharmacistReviews)} tone={branch.pendingPharmacistReviews > 0 ? "risk" : "normal"} />
        <Metric label="Awaiting payment" value={formatCurrency(branch.awaitingPaymentValue)} tone={branch.awaitingPaymentValue > 0 ? "risk" : "normal"} />
        <Metric label="Stock alerts" value={String(branch.stockAlerts)} tone={branch.stockAlerts > 4 ? "risk" : "normal"} />
        <Metric label="Response score" value={`${branch.staffResponseScore}/100`} tone={branch.staffResponseScore < 82 ? "risk" : "normal"} />
      </div>

      <div className={urgent ? "relative mt-5 rounded-lg border border-amber-100 bg-amber-50 p-3" : "relative mt-5 rounded-lg border border-slate-100 bg-slate-50 p-3"}>
        <div className="flex items-start gap-2">
          {urgent ? <MessageSquareWarning className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" /> : <Gauge className="mt-0.5 h-4 w-4 shrink-0 text-clinical-700" aria-hidden="true" />}
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Suggested next action</p>
            <p className={urgent ? "mt-1 text-sm leading-6 text-amber-900" : "mt-1 text-sm leading-6 text-slate-600"}>{branch.suggestedAction}</p>
          </div>
        </div>
      </div>

      <Link href={`/branches/${branch.id}`} className="focus-ring relative mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-navy-950 px-4 py-2.5 text-sm font-semibold text-white">
        View branch command
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </article>
  );
}

function Metric({ label, value, tone = "normal" }: { label: string; value: string; tone?: "normal" | "risk" }) {
  return (
    <div className={tone === "risk" ? "rounded-lg border border-rose-100 bg-rose-50 p-3" : "rounded-lg border border-slate-100 bg-slate-50 p-3"}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</p>
      <p className={tone === "risk" ? "mt-1 font-semibold text-rose-700" : "mt-1 font-semibold text-navy-950"}>{value}</p>
    </div>
  );
}
