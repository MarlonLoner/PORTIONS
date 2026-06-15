import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { requirePlatformUser } from "@/lib/platform-auth";
import { getTenantControlPlaneDetail } from "@/lib/platform";

export default async function PlatformTenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePlatformUser();
  const { id } = await params;
  const tenant = await getTenantControlPlaneDetail(id);
  if (!tenant) notFound();

  return (
    <>
      <section className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-clinical-700">Tenant profile</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-navy-950">{tenant.name}</h1>
            <p className="mt-2 text-sm text-slate-500">{tenant.slug} / {tenant.country} / {tenant.timezone} / {tenant.currency}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge>{tenant.status}</Badge>
            <Badge>{tenant.plan}</Badge>
            <Badge>{tenant.subscriptionStatus}</Badge>
            {tenant.isDemoTenant ? <Badge>Demo tenant</Badge> : null}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric label="Operating units" value={tenant._count.operatingUnits} />
        <Metric label="Branches" value={tenant._count.branches} />
        <Metric label="Users" value={tenant._count.appUsers} />
        <Metric label="Staff" value={tenant._count.staffMembers} />
        <Metric label="Patient records" value={tenant._count.patients} />
        <Metric label="Orders" value={tenant._count.orders} />
        <Metric label="Stock records" value={tenant._count.stockItems} />
        <Metric label="Import batches" value={tenant._count.importBatches} />
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <Panel title="Tenant Administrators">
          {tenant.appUsers.length ? tenant.appUsers.map((user) => (
            <div key={user.id} className="rounded-lg border border-slate-100 p-4">
              <p className="font-semibold text-navy-950">{user.name}</p>
              <p className="mt-1 text-sm text-slate-500">{user.email} / {user.role} / {user.status}</p>
            </div>
          )) : <Empty>No tenant administrators are configured yet.</Empty>}
        </Panel>

        <Panel title="Support Access History">
          {tenant.supportRequests.length ? tenant.supportRequests.map((request) => (
            <div key={request.id} className="rounded-lg border border-slate-100 p-4">
              <p className="font-semibold text-navy-950">{request.scope} / {request.status}</p>
              <p className="mt-1 text-sm text-slate-500">Requested by {request.requestedByPlatformUser.name} ({request.requestedByPlatformUser.role})</p>
            </div>
          )) : <Empty>No support access requests are active for this tenant.</Empty>}
        </Panel>
      </section>

      <Panel title="Audit Summary">
        {tenant.auditLogs.length ? tenant.auditLogs.map((log) => (
          <div key={log.id} className="rounded-lg border border-slate-100 p-4">
            <p className="font-semibold text-navy-950">{log.action} / {log.outcome}</p>
            <p className="mt-1 text-sm text-slate-500">{log.actorLabel ?? log.actorType} / {log.recordType ?? "platform"} / {log.createdAt.toLocaleString()}</p>
          </div>
        )) : <Empty>No audit records have been captured for this tenant yet.</Empty>}
      </Panel>
    </>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">{children}</span>;
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-navy-950">{value}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-navy-950">{title}</h2>
      <div className="mt-5 grid gap-3">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">{children}</p>;
}
