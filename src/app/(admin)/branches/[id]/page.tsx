import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Boxes, LineChart, MessageSquareReply, PackageSearch } from "lucide-react";
import { AiBriefCard } from "@/components/ai-brief-card";
import { DataTable } from "@/components/data-table";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { StockStatusBadge } from "@/components/stock-status-badge";
import { enumLabel, formatCurrency, formatPercent } from "@/lib/format";
import { getBranchDetail } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function BranchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getBranchDetail(id);

  if (!data) {
    notFound();
  }

  const { branch, metrics, categoryRevenue, onlineOrders, stockIssues } = data;
  const maxCategoryRevenue = Math.max(...categoryRevenue.map((item) => item.revenue), 1);

  return (
    <>
      <PageHeader
        eyebrow="Branch detail"
        title={branch.name}
        description={`${branch.area} branch managed by ${branch.managerName ?? "the branch team"}.`}
        action={
          <Link href="/branches" className="focus-ring inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back
          </Link>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Revenue today" value={formatCurrency(metrics.revenueToday)} helper={`Target ${formatCurrency(branch.revenueTarget)}`} icon={<LineChart className="h-5 w-5" />} tone="navy" />
        <StatCard title="Orders today" value={String(metrics.ordersToday)} helper={`${onlineOrders.length} online orders in branch`} icon={<Boxes className="h-5 w-5" />} />
        <StatCard title="Overdue follow-ups" value={String(metrics.overdueFollowUps)} helper="Requires branch manager attention" icon={<MessageSquareReply className="h-5 w-5" />} tone={metrics.overdueFollowUps > 3 ? "rose" : "emerald"} />
        <StatCard title="Stock alerts" value={String(metrics.stockAlerts)} helper="Low, expiry, overstock, dead stock" icon={<PackageSearch className="h-5 w-5" />} tone={metrics.stockAlerts > 4 ? "amber" : "blue"} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <h2 className="text-lg font-semibold text-navy-950">Revenue Trend</h2>
          <div className="mt-5 flex h-52 items-end gap-3 rounded-lg bg-slate-50 p-4">
            {[48, 68, 52, 76, 62, 84, 72].map((height, index) => (
              <div key={index} className="flex flex-1 flex-col items-center gap-2">
                <div className="w-full rounded-t-lg bg-clinical-500" style={{ height: `${height}%` }} />
                <span className="text-xs text-slate-500">D{index + 1}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <h2 className="text-lg font-semibold text-navy-950">Top Product Categories</h2>
          <div className="mt-5 space-y-4">
            {categoryRevenue.length > 0 ? (
              categoryRevenue.map((item) => (
                <div key={item.category}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">{enumLabel(item.category)}</span>
                    <span className="font-semibold text-navy-950">{formatCurrency(item.revenue)}</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${Math.max((item.revenue / maxCategoryRevenue) * 100, 6)}%` }} />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No category revenue has been recorded yet.</p>
            )}
          </div>
        </article>
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <h2 className="text-lg font-semibold text-navy-950">Follow-Up Performance</h2>
          <div className="mt-5 rounded-lg bg-clinical-50 p-4">
            <p className="text-sm text-clinical-700">Completion rate</p>
            <p className="mt-1 text-3xl font-semibold text-navy-950">{formatPercent(data.followUpCompletion)}</p>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-600">{metrics.overdueFollowUps} overdue tasks are blocking retention confidence.</p>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft xl:col-span-2">
          <h2 className="mb-3 text-lg font-semibold text-navy-950">Online Order Performance</h2>
          <DataTable
            rows={onlineOrders.slice(0, 6)}
            emptyMessage="No online orders recorded for this branch."
            columns={[
              { header: "Customer", cell: (order) => order.customerName },
              { header: "Source", cell: (order) => enumLabel(order.source) },
              { header: "Status", cell: (order) => <OrderStatusBadge status={order.status} /> },
              { header: "Amount", cell: (order) => formatCurrency(order.amount) }
            ]}
          />
        </article>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <h2 className="mb-3 text-lg font-semibold text-navy-950">Stock Issues</h2>
          <DataTable
            rows={stockIssues.slice(0, 8)}
            emptyMessage="No stock issues for this branch."
            columns={[
              { header: "Product", cell: (item) => item.productName },
              { header: "Category", cell: (item) => item.category },
              { header: "Level", cell: (item) => `${item.stockLevel}/${item.reorderLevel}` },
              { header: "Status", cell: (item) => <StockStatusBadge status={item.status} /> }
            ]}
          />
        </article>

        <AiBriefCard title="AI Branch Coach Summary" action="Coach focus: clear overdue follow-ups before 11:00 and move stock exceptions into the manager huddle.">
          <p>
            {branch.name} is running at {formatPercent(metrics.conversionRate)} online conversion with a response score of {metrics.staffResponseScore}/100.
            The branch should protect chronic refill availability, resolve {metrics.stockAlerts} stock alerts, and keep pharmacist review queues short.
          </p>
        </AiBriefCard>
      </section>
    </>
  );
}
