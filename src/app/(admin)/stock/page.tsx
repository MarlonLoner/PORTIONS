import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeftRight,
  ArrowRight,
  Boxes,
  CalendarClock,
  Filter,
  PackageSearch,
  Pill,
  Plus,
  ShieldAlert,
  TrendingUp,
  WalletCards
} from "lucide-react";
import type { ReactNode } from "react";
import { DataTable } from "@/components/data-table";
import { StatCard } from "@/components/stat-card";
import { StockStatusBadge } from "@/components/stock-status-badge";
import { TenantEmptyState } from "@/components/tenant-empty-state";
import { enumLabel, formatCurrency, formatDate } from "@/lib/format";
import { getStockData, stockStatusOptions } from "@/lib/data";
import { calculateEstimatedStockValue, getStockRiskLevel, getStockSuggestedAction } from "@/lib/stock";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type StockRow = {
  id: string;
  productName: string;
  category: string;
  stockLevel: number;
  reorderLevel: number;
  status: string;
  expiryDate: Date | null;
  suggestedAction: string;
  valueAtRisk: number | string | { toString(): string };
  estimatedStockValue?: number;
  riskLevel?: string;
  branch: { id: string; name: string };
};

function param(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function StockPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const filters = {
    branchId: param(params.branchId),
    category: param(params.category),
    status: param(params.status),
    expiryRisk: param(params.expiryRisk)
  };
  const {
    stockItems,
    branches,
    categories,
    lowStockItems,
    nearExpiryItems,
    overstockItems,
    deadStockItems,
    chronicDemandRisk,
    suggestedTransfers,
    aiSummaries,
    smartCards
  } = await getStockData(filters);
  const reorderItems = lowStockItems.filter((item) => item.stockLevel < item.reorderLevel);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-lg border border-navy-800 bg-navy-950 p-5 text-white shadow-[0_28px_80px_rgba(6,21,38,0.22)] sm:p-6 xl:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.12),transparent_36%),linear-gradient(180deg,rgba(75,158,201,0.18),transparent_58%)]" />
        <div className="relative grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-clinical-100 ring-1 ring-white/15">
              <PackageSearch className="h-3.5 w-3.5" aria-hidden="true" />
              Inventory Revenue Control
            </span>
            <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">Stock Intelligence</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-200">
              Track low stock, expiry pressure, dead stock, overstock, branch transfers, and chronic demand risk before they affect revenue.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/stock/new" className="focus-ring inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-navy-950 transition hover:bg-clinical-50">
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add stock item
              </Link>
              <Link href="/imports/upload" className="focus-ring inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-white/15 transition hover:bg-white/15">
                Import stock
              </Link>
              <Link href="/imports" className="focus-ring inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-white/15 transition hover:bg-white/15">
                Download stock template
              </Link>
              <Link href="/action-center" className="focus-ring inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-navy-950 transition hover:bg-clinical-50">
                Create Stock Intervention Action
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <HeroSignal label="Stock value" value={formatCurrency(smartCards.totalStockValue)} helper="Estimated inventory value" />
            <HeroSignal label="Patient risk" value={String(smartCards.chronicDemandRisk)} helper="Low-stock items tied to chronic demand" tone="risk" />
            <HeroSignal label="Transfer moves" value={String(smartCards.suggestedBranchTransfers)} helper="Branch-to-branch opportunities" />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total stock value" value={formatCurrency(smartCards.totalStockValue)} helper="Estimated across all branches" icon={<WalletCards className="h-5 w-5" />} tone="navy" trend="Value" />
        <StatCard title="Low stock alerts" value={String(smartCards.lowStockRisks)} helper="Below reorder comfort" icon={<AlertTriangle className="h-5 w-5" />} tone="rose" trend="Critical" />
        <StatCard title="Near-expiry value" value={formatCurrency(smartCards.nearExpiryValue)} helper="Value requiring sell-through" icon={<CalendarClock className="h-5 w-5" />} tone="amber" trend="Expiry" />
        <StatCard title="Overstock items" value={String(smartCards.overstockItems)} helper="Transfer or reduce purchasing" icon={<Boxes className="h-5 w-5" />} tone="blue" trend="Surplus" />
        <StatCard title="Dead stock items" value={String(smartCards.deadStockItems)} helper="Slow-moving watchlist" icon={<ShieldAlert className="h-5 w-5" />} tone="rose" trend="Dead" />
        <StatCard title="Chronic demand risk" value={String(smartCards.chronicDemandRisk)} helper={`${smartCards.chronicDemandForecast} patients due in 7 days`} icon={<Pill className="h-5 w-5" />} tone="amber" trend="Care" />
        <StatCard title="Suggested transfers" value={String(smartCards.suggestedBranchTransfers)} helper="Move stock before reorder" icon={<ArrowLeftRight className="h-5 w-5" />} tone="emerald" trend="Transfer" />
        <StatCard title="Reorder urgency" value={String(smartCards.reorderUrgency)} helper="Items below reorder level" icon={<TrendingUp className="h-5 w-5" />} tone={smartCards.reorderUrgency > 0 ? "rose" : "emerald"} trend="Reorder" />
      </section>

      <form className="rounded-lg border border-slate-200 bg-white p-4 shadow-soft" action="/stock">
        <div className="mb-4 flex items-center gap-2">
          <Filter className="h-4 w-4 text-clinical-700" aria-hidden="true" />
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Stock Filters</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-5">
          <FilterSelect name="branchId" label="Branch" value={filters.branchId} options={branches.map((branch) => ({ value: branch.id, label: branch.name }))} />
          <FilterSelect name="category" label="Category" value={filters.category} options={categories.map((category) => ({ value: category, label: category }))} />
          <FilterSelect name="status" label="Stock status" value={filters.status} options={stockStatusOptions.map((status) => ({ value: status, label: enumLabel(status) }))} />
          <FilterSelect
            name="expiryRisk"
            label="Expiry risk"
            value={filters.expiryRisk}
            options={[
              { value: "near", label: "Near expiry" },
              { value: "expired", label: "Expired" }
            ]}
          />
          <div className="flex items-end gap-2">
            <button type="submit" className="focus-ring h-10 flex-1 rounded-lg bg-navy-950 px-4 text-sm font-semibold text-white">Apply</button>
            <Link href="/stock" className="focus-ring inline-flex h-10 items-center rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700">Reset</Link>
          </div>
        </div>
      </form>

      <section className="grid gap-5 xl:grid-cols-3">
        {aiSummaries.map((summary, index) => (
          <AiStockCard key={summary} title={index === 0 ? "Chronic Stock Risk" : index === 1 ? "Expiry Intelligence" : "Transfer Intelligence"} detail={summary} tone={index === 0 ? "risk" : index === 1 ? "warn" : "blue"} />
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <SmartSection title="Low Stock Risks" eyebrow="Below reorder level" empty="No low-stock risk is active.">
          {lowStockItems.slice(0, 6).map((item) => <StockRiskRow key={item.id} item={item} />)}
        </SmartSection>

        <SmartSection title="Near-Expiry Pressure" eyebrow="Value at risk" empty="No near-expiry pressure found.">
          {nearExpiryItems.slice(0, 6).map((item) => <ExpiryRow key={item.id} item={item} />)}
        </SmartSection>

        <SmartSection title="Chronic Demand Forecast" eyebrow="Patient care pressure" empty="No low-stock item is currently tied to chronic demand.">
          {chronicDemandRisk.slice(0, 6).map((risk) => (
            <div key={risk.item.id} className="rounded-lg border border-amber-100 bg-amber-50 p-4">
              <p className="font-semibold text-navy-950">{risk.item.productName}</p>
              <p className="mt-1 text-sm text-slate-600">{risk.item.branch.name} - {risk.item.category}</p>
              <p className="mt-2 text-sm leading-6 text-amber-900">{risk.message}</p>
            </div>
          ))}
        </SmartSection>

        <SmartSection title="Suggested Branch Transfers" eyebrow="Move before buying" empty="No transfer pairing is obvious right now.">
          {suggestedTransfers.slice(0, 6).map((transfer) => (
            <div key={`${transfer.from}-${transfer.to}-${transfer.productName}`} className="rounded-lg border border-clinical-100 bg-clinical-50 p-4">
              <p className="font-semibold text-navy-950">{transfer.productName}</p>
              <p className="mt-1 text-sm text-slate-600">{transfer.from} to {transfer.to}</p>
              <p className="mt-2 text-sm leading-6 text-clinical-900">{transfer.message}</p>
            </div>
          ))}
        </SmartSection>

        <SmartSection title="Dead Stock Watchlist" eyebrow="Slow-moving value" empty="No dead stock watchlist items.">
          {deadStockItems.slice(0, 6).map((item) => <StockRiskRow key={item.id} item={item} />)}
        </SmartSection>

        <SmartSection title="Reorder Command" eyebrow="Urgent purchasing" empty="No urgent reorder command is active.">
          {reorderItems.slice(0, 6).map((item) => <StockRiskRow key={item.id} item={item} />)}
        </SmartSection>
      </section>

      <section>
        <div className="mb-3">
          <p className="section-title">Inventory command table</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-navy-950">Branch-Aware Stock Register</h2>
        </div>
        {stockItems.length === 0 ? (
          <TenantEmptyState
            title="No stock records yet."
            description="Add a stock item manually or import a stock sheet to unlock Stock Intelligence."
            primaryActionLabel="Add stock item"
            primaryActionHref="/stock/new"
            secondaryActionLabel="Import stock"
            secondaryActionHref="/imports/upload"
            icon={PackageSearch}
          />
        ) : (
          <DataTable
            rows={stockItems}
            emptyMessage="No stock items match these filters."
            columns={[
            { header: "Product", cell: (item) => <ProductCell item={item} /> },
            { header: "Category", cell: (item) => item.category },
            { header: "Branch", cell: (item) => item.branch.name },
            { header: "Stock", cell: (item) => <StockLevelCell item={item} /> },
            { header: "Status", cell: (item) => <StockStatusBadge status={item.status} /> },
            { header: "Expiry", cell: (item) => item.expiryDate ? formatDate(item.expiryDate) : "Not tracked" },
            { header: "Value", cell: (item) => formatCurrency(item.estimatedStockValue ?? calculateEstimatedStockValue(item)) },
            { header: "Risk", cell: (item) => <RiskBadge label={item.riskLevel ?? getStockRiskLevel(item)} /> },
            { header: "Suggested action", className: "min-w-[320px] px-4 py-4 text-slate-700", cell: (item) => <span className="text-sm leading-6">{getStockSuggestedAction(item)}</span> }
            ]}
          />
        )}
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

function HeroSignal({ label, value, helper, tone = "default" }: { label: string; value: string; helper: string; tone?: "default" | "risk" }) {
  return (
    <div className={tone === "risk" ? "rounded-lg border border-rose-300/20 bg-rose-300/10 p-4" : "rounded-lg border border-white/10 bg-white/10 p-4"}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300">{label}</p>
      <p className="mt-2 truncate text-2xl font-semibold tracking-tight text-white">{value}</p>
      <p className="mt-1 text-sm text-slate-300">{helper}</p>
    </div>
  );
}

function AiStockCard({ title, detail, tone }: { title: string; detail: string; tone: "risk" | "warn" | "blue" }) {
  const className =
    tone === "risk"
      ? "rounded-lg border border-rose-100 bg-white p-5 shadow-soft"
      : tone === "warn"
        ? "rounded-lg border border-amber-100 bg-white p-5 shadow-soft"
        : "rounded-lg border border-clinical-100 bg-white p-5 shadow-soft";

  return (
    <article className={className}>
      <p className="section-title">{title}</p>
      <p className="mt-3 text-sm leading-6 text-slate-600">{detail}</p>
    </article>
  );
}

function SmartSection({ title, eyebrow, empty, children }: { title: string; eyebrow: string; empty: string; children: ReactNode }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
      <div className="mb-5">
        <p className="section-title">{eyebrow}</p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-navy-950">{title}</h2>
      </div>
      <div className="space-y-3">
        {hasChildren ? children : <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">{empty}</p>}
      </div>
    </section>
  );
}

function StockRiskRow({ item }: { item: StockRow }) {
  const risk = getStockRiskLevel(item);

  return (
    <div className={risk === "Critical" ? "rounded-lg border border-rose-100 bg-rose-50 p-4" : "rounded-lg border border-slate-100 bg-slate-50 p-4"}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-navy-950">{item.productName}</p>
          <p className="mt-1 text-sm text-slate-600">{item.branch.name} - {item.category}</p>
        </div>
        <RiskBadge label={risk} />
      </div>
      <p className="mt-2 text-sm text-slate-600">Stock {item.stockLevel} / reorder {item.reorderLevel}</p>
      <p className="mt-2 text-sm leading-6 text-slate-700">{getStockSuggestedAction(item)}</p>
    </div>
  );
}

function ExpiryRow({ item }: { item: StockRow }) {
  return (
    <div className="rounded-lg border border-amber-100 bg-amber-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-navy-950">{item.productName}</p>
          <p className="mt-1 text-sm text-slate-600">{item.branch.name} - {item.category}</p>
        </div>
        <p className="text-sm font-semibold text-amber-700">{formatCurrency(item.valueAtRisk)}</p>
      </div>
      <p className="mt-2 text-sm text-slate-600">Expires {item.expiryDate ? formatDate(item.expiryDate) : "not tracked"}</p>
      <p className="mt-2 text-sm leading-6 text-amber-900">{getStockSuggestedAction(item)}</p>
    </div>
  );
}

function ProductCell({ item }: { item: StockRow }) {
  return (
    <div>
      <p className="font-semibold text-navy-950">{item.productName}</p>
      <p className="mt-1 text-xs text-slate-500">{getStockSuggestedAction(item).split(".")[0]}.</p>
    </div>
  );
}

function StockLevelCell({ item }: { item: StockRow }) {
  const low = item.stockLevel <= item.reorderLevel;

  return (
    <div>
      <p className={low ? "font-semibold text-rose-700" : "font-semibold text-navy-950"}>{item.stockLevel}</p>
      <p className="text-xs text-slate-500">Reorder {item.reorderLevel}</p>
    </div>
  );
}

function RiskBadge({ label }: { label: string }) {
  const className =
    label === "Critical"
      ? "bg-rose-50 text-rose-700 ring-rose-200"
      : label === "Watch"
        ? "bg-amber-50 text-amber-700 ring-amber-200"
        : label === "Transfer"
          ? "bg-clinical-50 text-clinical-800 ring-clinical-200"
          : label === "Dead stock"
            ? "bg-slate-100 text-slate-700 ring-slate-200"
            : "bg-emerald-50 text-emerald-700 ring-emerald-200";

  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ring-1 ${className}`}>{label}</span>;
}
