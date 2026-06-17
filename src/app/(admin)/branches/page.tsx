import Link from "next/link";
import {
  AlertTriangle,
  Building2,
  CreditCard,
  LineChart,
  PackageSearch,
  Pill,
  Plus,
  ShoppingBag,
  TrendingUp
} from "lucide-react";
import type { ReactNode } from "react";
import { BranchPerformanceCard } from "@/components/branch-performance-card";
import { StatCard } from "@/components/stat-card";
import { TenantEmptyState } from "@/components/tenant-empty-state";
import { formatCurrency, formatPercent } from "@/lib/format";
import { getBranchOverview } from "@/lib/data";

export const dynamic = "force-dynamic";

type SmartBranch = {
  id: string;
  name: string;
  suggestedAction: string;
  revenueToday: number;
  conversionRate: number;
  health: string;
  awaitingPaymentValue: number;
  delayedOrderValue: number;
  chronicDue: number;
  overduePatients: number;
  stockAlerts: number;
};

export default async function BranchesPage() {
  const branches = await getBranchOverview();
  const totalRevenueToday = branches.reduce((sum, branch) => sum + branch.revenueToday, 0);
  const totalOrdersToday = branches.reduce((sum, branch) => sum + branch.ordersToday, 0);
  const totalOnlineOrders = branches.reduce((sum, branch) => sum + branch.ordersToday, 0);
  const networkConversion = branches.length ? branches.reduce((sum, branch) => sum + branch.conversionRate, 0) / branches.length : 0;
  const overdueFollowUps = branches.reduce((sum, branch) => sum + branch.overdueFollowUps, 0);
  const pendingReviews = branches.reduce((sum, branch) => sum + branch.pendingPharmacistReviews, 0);
  const stockAlerts = branches.reduce((sum, branch) => sum + branch.stockAlerts, 0);
  const bestBranch = [...branches].sort((a, b) => b.revenueToday - a.revenueToday)[0];
  const branchNeedingAttention = [...branches].sort((a, b) => branchAttentionScore(b) - branchAttentionScore(a))[0];
  const networkWinners = [...branches].sort((a, b) => b.revenueToday + b.conversionRate * 10 - (a.revenueToday + a.conversionRate * 10)).slice(0, 3);
  const attentionBranches = [...branches].sort((a, b) => branchAttentionScore(b) - branchAttentionScore(a)).slice(0, 3);
  const revenueLeakage = [...branches].filter((branch) => branch.awaitingPaymentValue > 0 || branch.delayedOrderValue > 0).sort((a, b) => b.awaitingPaymentValue + b.delayedOrderValue - (a.awaitingPaymentValue + a.delayedOrderValue)).slice(0, 3);
  const patientCareLoad = [...branches].filter((branch) => branch.chronicDue > 0 || branch.overduePatients > 0 || branch.highRiskPatients > 0).sort((a, b) => b.chronicDue + b.overduePatients * 2 + b.highRiskPatients * 2 - (a.chronicDue + a.overduePatients * 2 + a.highRiskPatients * 2)).slice(0, 3);
  const stockPressure = [...branches].filter((branch) => branch.stockAlerts > 0).sort((a, b) => b.stockAlerts - a.stockAlerts).slice(0, 3);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-lg border border-navy-800 bg-navy-950 p-5 text-white shadow-[0_28px_80px_rgba(6,21,38,0.22)] sm:p-6 xl:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.12),transparent_36%),linear-gradient(180deg,rgba(75,158,201,0.18),transparent_58%)]" />
        <div className="relative grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-clinical-100 ring-1 ring-white/15">
              <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
              Network Business Units
            </span>
            <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">Branch Command</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-200">
              Monitor branch revenue, chronic follow-up discipline, order flow, stock risk, and service performance across the pharmacy network.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/branches/new" className="focus-ring inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-navy-950 transition hover:bg-clinical-50">
                <Plus className="h-4 w-4" aria-hidden="true" />
                Create branch
              </Link>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <HeroSignal label="Best branch" value={bestBranch?.name ?? "No data"} helper={bestBranch ? formatCurrency(bestBranch.revenueToday) : "No revenue today"} />
            <HeroSignal label="Needs attention" value={branchNeedingAttention?.name ?? "No data"} helper={branchNeedingAttention?.suggestedAction ?? "No branch issues"} tone="risk" />
            <HeroSignal label="Network conversion" value={formatPercent(networkConversion)} helper={`${totalOnlineOrders} orders feeding branch flow`} />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total branch revenue" value={formatCurrency(totalRevenueToday)} helper="Revenue captured today across network" icon={<TrendingUp className="h-5 w-5" />} tone="navy" trend="Today" />
        <StatCard title="Best performing branch" value={bestBranch?.name ?? "None"} helper={bestBranch ? `${formatCurrency(bestBranch.revenueToday)} today` : "No branch data"} icon={<LineChart className="h-5 w-5" />} tone="emerald" trend="Winner" />
        <StatCard title="Branch needing attention" value={branchNeedingAttention?.name ?? "None"} helper={branchNeedingAttention?.health ?? "No branch data"} icon={<AlertTriangle className="h-5 w-5" />} tone="rose" trend="Watch" />
        <StatCard title="Total orders today" value={String(totalOrdersToday)} helper="Orders created across branches" icon={<ShoppingBag className="h-5 w-5" />} tone="blue" trend="Orders" />
        <StatCard title="Network conversion" value={formatPercent(networkConversion)} helper="Average online conversion by branch" icon={<CreditCard className="h-5 w-5" />} trend="Funnel" />
        <StatCard title="Overdue follow-ups" value={String(overdueFollowUps)} helper="Retention discipline blockers" icon={<Pill className="h-5 w-5" />} tone={overdueFollowUps > 0 ? "rose" : "emerald"} trend="Care" />
        <StatCard title="Pharmacist reviews" value={String(pendingReviews)} helper="Clinical order blockers" icon={<Pill className="h-5 w-5" />} tone={pendingReviews > 0 ? "amber" : "emerald"} trend="Clinical" />
        <StatCard title="Stock alerts" value={String(stockAlerts)} helper="Low, expiry, overstock, dead stock" icon={<PackageSearch className="h-5 w-5" />} tone={stockAlerts > 0 ? "amber" : "emerald"} trend="Stock" />
      </section>

      <section className="grid gap-5 xl:grid-cols-5">
        <SmartSection title="Network Winners" eyebrow="Revenue and conversion" branches={networkWinners} empty="No branch winner data yet." metric={(branch) => `${formatCurrency(branch.revenueToday)} - ${formatPercent(branch.conversionRate)}`} />
        <SmartSection title="Branches Needing Attention" eyebrow="Operational pressure" branches={attentionBranches} empty="No branches need attention." metric={(branch) => branch.health} tone="risk" />
        <SmartSection title="Revenue Leakage" eyebrow="Payment and quote delay" branches={revenueLeakage} empty="No branch revenue leakage detected." metric={(branch) => formatCurrency(branch.awaitingPaymentValue + branch.delayedOrderValue)} tone="warn" />
        <SmartSection title="Patient Care Load" eyebrow="Chronic pressure" branches={patientCareLoad} empty="No branch patient load flagged." metric={(branch) => `${branch.chronicDue} due / ${branch.overduePatients} overdue`} tone="blue" />
        <SmartSection title="Stock Pressure" eyebrow="Inventory risk" branches={stockPressure} empty="No stock pressure detected." metric={(branch) => `${branch.stockAlerts} alerts`} tone="warn" />
      </section>

      <section>
        <div className="mb-4">
          <p className="section-title">Business units</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-navy-950">Branch Performance Cards</h2>
        </div>
        <div className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
          {branches.length > 0 ? (
            branches.map((branch) => <BranchPerformanceCard key={branch.id} branch={branch} />)
          ) : (
            <TenantEmptyState
              title="No branches have been configured yet."
              description="Create your first branch to begin tracking stock, patients, orders, and branch performance. PORTIONS will move onboarding forward automatically once the branch exists."
              primaryActionLabel="Create first branch"
              primaryActionHref="/branches/new"
              secondaryActionLabel="Open onboarding"
              secondaryActionHref="/onboarding"
              icon={Building2}
            />
          )}
        </div>
      </section>
    </div>
  );
}

function branchAttentionScore(branch: {
  overdueFollowUps: number;
  pendingPharmacistReviews: number;
  pendingOrders: number;
  stockAlerts: number;
  awaitingPaymentValue: number;
  overduePatients: number;
  conversionRate: number;
}) {
  return branch.overdueFollowUps * 3 + branch.pendingPharmacistReviews * 3 + branch.overduePatients * 2 + branch.stockAlerts * 1.5 + branch.pendingOrders + branch.awaitingPaymentValue / 20 + (branch.conversionRate < 35 ? 4 : 0);
}

function HeroSignal({ label, value, helper, tone = "default" }: { label: string; value: string; helper: string; tone?: "default" | "risk" }) {
  return (
    <div className={tone === "risk" ? "rounded-lg border border-rose-300/20 bg-rose-300/10 p-4" : "rounded-lg border border-white/10 bg-white/10 p-4"}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300">{label}</p>
      <p className="mt-2 truncate text-2xl font-semibold tracking-tight text-white">{value}</p>
      <p className="mt-1 text-sm text-slate-300">{helper}</p>
    </div>
  );
}

function SmartSection({
  title,
  eyebrow,
  branches,
  empty,
  metric,
  tone = "default"
}: {
  title: string;
  eyebrow: string;
  branches: SmartBranch[];
  empty: string;
  metric: (branch: SmartBranch) => string;
  tone?: "default" | "risk" | "warn" | "blue";
}) {
  const toneClass =
    tone === "risk"
      ? "bg-rose-50 text-rose-700 ring-rose-100"
      : tone === "warn"
        ? "bg-amber-50 text-amber-700 ring-amber-100"
        : tone === "blue"
          ? "bg-clinical-50 text-clinical-700 ring-clinical-100"
          : "bg-emerald-50 text-emerald-700 ring-emerald-100";

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-soft">
      <p className="section-title">{eyebrow}</p>
      <h2 className="mt-2 text-base font-semibold leading-6 text-navy-950">{title}</h2>
      <div className="mt-4 space-y-2">
        {branches.map((branch) => (
          <Link key={branch.id} href={`/branches/${branch.id}`} className="block rounded-lg bg-slate-50 p-3 hover:bg-clinical-50">
            <div className="flex items-center justify-between gap-3">
              <span className="truncate font-semibold text-slate-800">{branch.name}</span>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${toneClass}`}>{metric(branch)}</span>
            </div>
            <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{branch.suggestedAction}</p>
          </Link>
        ))}
        {branches.length === 0 ? <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">{empty}</p> : null}
      </div>
    </article>
  );
}
