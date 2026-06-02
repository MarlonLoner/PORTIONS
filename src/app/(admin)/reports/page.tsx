import { PageHeader } from "@/components/page-header";
import { ReportCard } from "@/components/report-card";
import { getReports } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const reports = await getReports();

  return (
    <>
      <PageHeader
        eyebrow="Executive Reporting"
        title="Reports"
        description="Operational reports for daily control, branch coaching, chronic retention, online sales, stock risk, and staff follow-up performance."
      />

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {reports.length > 0 ? (
          reports.map((report) => <ReportCard key={report.id} report={report} />)
        ) : (
          <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-soft">
            No reports have been generated yet.
          </div>
        )}
      </section>
    </>
  );
}
