import Link from "next/link";
import { requirePlatformUser } from "@/lib/platform-auth";
import { getPlatformDashboardData } from "@/lib/platform";

export default async function PlatformPage() {
  await requirePlatformUser();
  const data = await getPlatformDashboardData();
  const metrics = [
    ["Total tenants", data.metrics.totalTenants],
    ["Active pilots", data.metrics.activePilots],
    ["Active subscriptions", data.metrics.activeSubscriptions],
    ["Suspended tenants", data.metrics.suspendedTenants],
    ["Demo tenants", data.metrics.demoTenants],
    ["Pending pilot requests", data.metrics.pendingPilotRequests],
    ["Imports needing cleanup", data.metrics.failedImportBatches],
    ["System health", data.metrics.systemHealth]
  ];

  return (
    <>
      <section className="rounded-2xl bg-navy-950 p-8 text-white shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-clinical-200">Platform control</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">PORTIONS Platform Control Plane</h1>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300">
          Manage tenant onboarding, subscription health, support access, and platform risk without exposing pharmacy patient, order, or clinical records by default.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
            <p className="mt-3 text-2xl font-semibold text-navy-950">{value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-navy-950">Recent Tenants</h2>
            <Link href="/platform/tenants" className="text-sm font-semibold text-clinical-700">View all</Link>
          </div>
          <div className="mt-5 grid gap-3">
            {data.recentTenants.map((tenant) => (
              <Link key={tenant.id} href={`/platform/tenants/${tenant.id}`} className="rounded-lg border border-slate-100 p-4 hover:border-clinical-200">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-navy-950">{tenant.name}</p>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">{tenant.status}</span>
                </div>
                <p className="mt-1 text-sm text-slate-500">{tenant.plan} / {tenant.subscriptionStatus}</p>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-navy-950">Support Access Requests</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Support access is explicit, tenant-bound, scoped, and auditable. No invisible backdoor is provided.</p>
          <div className="mt-5 grid gap-3">
            {data.recentSupportRequests.length ? data.recentSupportRequests.map((request) => (
              <div key={request.id} className="rounded-lg border border-slate-100 p-4">
                <p className="font-semibold text-navy-950">{request.tenant.name}</p>
                <p className="mt-1 text-sm text-slate-500">{request.scope} / {request.status} / requested by {request.requestedByPlatformUser.name}</p>
              </div>
            )) : (
              <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">No support access requests yet.</p>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
