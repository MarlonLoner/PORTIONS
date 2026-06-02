import { BranchPerformanceCard } from "@/components/branch-performance-card";
import { PageHeader } from "@/components/page-header";
import { getBranchOverview } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function BranchesPage() {
  const branches = await getBranchOverview();

  return (
    <>
      <PageHeader
        eyebrow="Network Performance"
        title="Branches"
        description="Compare revenue, chronic workload, order flow, stock exceptions, and team response quality across the pharmacy network."
      />

      <section className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
        {branches.length > 0 ? (
          branches.map((branch) => <BranchPerformanceCard key={branch.id} branch={branch} />)
        ) : (
          <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-soft">
            No branches have been configured yet.
          </div>
        )}
      </section>
    </>
  );
}
