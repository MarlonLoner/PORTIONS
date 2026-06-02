import { AlertTriangle, ArrowLeftRight, CalendarClock, TrendingUp } from "lucide-react";
import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { StockStatusBadge } from "@/components/stock-status-badge";
import { formatCurrency, formatDate } from "@/lib/format";
import { getStockData } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function StockPage() {
  const { stockItems, smartCards } = await getStockData();

  return (
    <>
      <PageHeader
        eyebrow="Inventory Control"
        title="Stock Intelligence"
        description="Monitor low stock risks, overstock, near-expiry exposure, dead stock, chronic demand, and transfer opportunities by branch."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Low stock risks" value={String(smartCards.lowStockRisks)} helper="Items below reorder comfort" icon={<AlertTriangle className="h-5 w-5" />} tone="rose" />
        <StatCard title="Near-expiry value" value={formatCurrency(smartCards.nearExpiryValue)} helper="Value that needs controlled sell-through" icon={<CalendarClock className="h-5 w-5" />} tone="amber" />
        <StatCard title="Chronic demand forecast" value={String(smartCards.chronicDemandForecast)} helper="Patients due within 7 days" icon={<TrendingUp className="h-5 w-5" />} tone="blue" />
        <StatCard title="Suggested branch transfers" value={String(smartCards.suggestedBranchTransfers)} helper="Overstock items to move" icon={<ArrowLeftRight className="h-5 w-5" />} tone="emerald" />
      </section>

      <DataTable
        rows={stockItems}
        emptyMessage="No stock items have been loaded."
        columns={[
          { header: "Product", cell: (item) => item.productName },
          { header: "Category", cell: (item) => item.category },
          { header: "Branch", cell: (item) => item.branch.name },
          { header: "Stock level", cell: (item) => item.stockLevel },
          { header: "Reorder level", cell: (item) => item.reorderLevel },
          { header: "Status", cell: (item) => <StockStatusBadge status={item.status} /> },
          { header: "Expiry date", cell: (item) => item.expiryDate ? formatDate(item.expiryDate) : "Not tracked" },
          { header: "Suggested action", className: "min-w-[260px] px-4 py-4 text-slate-700", cell: (item) => item.suggestedAction }
        ]}
      />
    </>
  );
}
