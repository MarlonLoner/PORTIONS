import Link from "next/link";
import type { ReactNode } from "react";
import { requirePlatformUser } from "@/lib/platform-auth";
import { getTenantDirectory } from "@/lib/platform";

export default async function PlatformTenantsPage() {
  await requirePlatformUser();
  const tenants = await getTenantDirectory();
  return (
    <>
      <section className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-clinical-700">Tenant directory</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-navy-950">Tenants</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Review pharmacy organisations, plans, subscription state, and safe data-volume summaries.</p>
        </div>
        <Link href="/platform/tenants/new" className="focus-ring rounded-lg bg-navy-950 px-4 py-3 text-sm font-semibold text-white">Create Tenant</Link>
      </section>

      <section className="grid gap-4">
        {tenants.map((tenant) => (
          <Link key={tenant.id} href={`/platform/tenants/${tenant.id}`} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-clinical-200">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-navy-950">{tenant.name}</h2>
                  {tenant.isDemoTenant ? <Badge>Demo tenant</Badge> : null}
                  <Badge>{tenant.status}</Badge>
                  <Badge>{tenant.plan}</Badge>
                </div>
                <p className="mt-1 text-sm text-slate-500">{tenant.slug} / {tenant.country} / {tenant.currency}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
                <Mini label="Units" value={tenant._count.operatingUnits} />
                <Mini label="Branches" value={tenant._count.branches} />
                <Mini label="Users" value={tenant._count.appUsers} />
                <Mini label="Imports" value={tenant._count.importBatches} />
                <Mini label="Support" value={tenant._count.supportRequests} />
              </div>
            </div>
          </Link>
        ))}
      </section>
    </>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-600">{children}</span>;
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-navy-950">{value}</p>
    </div>
  );
}
