import { AiBriefCard } from "@/components/ai-brief-card";
import { PageHeader } from "@/components/page-header";
import { WhatsAppMessageBox } from "@/components/whatsapp-message-box";
import { enumLabel, formatCurrency, formatPercent } from "@/lib/format";
import { getAiBriefData } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AiBriefPage() {
  const { dashboard, branches, stock } = await getAiBriefData();
  const strongestBranch = [...branches].sort((a, b) => b.revenueToday - a.revenueToday)[0];
  const riskBranch = [...branches].sort((a, b) => b.overdueFollowUps + b.stockAlerts - (a.overdueFollowUps + a.stockAlerts))[0];
  const topFollowUp = [...dashboard.followUpUrgency].sort((a, b) => b.count - a.count)[0];

  return (
    <>
      <PageHeader
        eyebrow="AI Analyst"
        title="AI Brief"
        description="A business analyst view for revenue diagnosis, chronic patient risk, branch coaching, stock intelligence, and suggested daily actions."
      />

      <section className="grid gap-5 xl:grid-cols-2">
        <AiBriefCard title="CEO Morning Brief" action="Start with revenue review, pharmacist queue, and overdue refill recovery.">
          <p>
            Today revenue is {formatCurrency(dashboard.totalRevenueToday)} with {dashboard.ordersToday} orders.
            Online revenue is {formatCurrency(dashboard.onlineSalesRevenue)} at {formatPercent(dashboard.conversionRate)} conversion.
            {dashboard.overdueRefillPatients} refill patients need recovery action.
          </p>
        </AiBriefCard>

        <AiBriefCard title="Revenue Diagnosis" action={`Protect ${strongestBranch?.name ?? "top branch"} momentum and lift online payment completion.`}>
          <p>
            {strongestBranch?.name ?? "The leading branch"} is the strongest branch today at {formatCurrency(strongestBranch?.revenueToday ?? 0)}.
            The biggest revenue unlock is moving quoted and awaiting-payment orders into paid status before afternoon dispatch.
          </p>
        </AiBriefCard>

        <AiBriefCard title="Chronic Patient Risk Summary" action={`${enumLabel(topFollowUp?.type ?? "DUE_TODAY")} is the largest active follow-up queue.`}>
          <p>
            There are {dashboard.chronicDueToday} chronic patients due today and {dashboard.overdueRefillPatients} overdue refill patients.
            Focus staff on high-risk patients first, then clear due-today reminders by branch.
          </p>
        </AiBriefCard>

        <AiBriefCard title="Branch Coach" action={`${riskBranch?.name ?? "A risk branch"} should receive the first manager check-in.`}>
          <p>
            {riskBranch?.name ?? "One branch"} has the heaviest combined burden of overdue follow-ups and stock alerts.
            Use a short huddle: overdue patients, unpaid orders, top two stock blockers, then response quality.
          </p>
        </AiBriefCard>

        <AiBriefCard title="Stock Intelligence Summary" action="Move overstock before reordering and reserve chronic-critical lines.">
          <p>
            Stock has {stock.smartCards.lowStockRisks} low-stock risks, {stock.smartCards.suggestedBranchTransfers} transfer opportunities,
            and {formatCurrency(stock.smartCards.nearExpiryValue)} in near-expiry exposure.
          </p>
        </AiBriefCard>

        <AiBriefCard title="Suggested Actions for Today" action="Assign one owner to each action and review progress at 15:00.">
          <ul className="space-y-2">
            <li>Clear pharmacist review orders and send payment links.</li>
            <li>Contact all overdue chronic refill patients before lunch.</li>
            <li>Prioritize low-stock chronic medicines across branches.</li>
            <li>Ask {dashboard.branchNeedingAttention} for a branch recovery update.</li>
          </ul>
        </AiBriefCard>
      </section>

      <WhatsAppMessageBox />
    </>
  );
}
