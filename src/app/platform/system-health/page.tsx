import { requirePlatformUser } from "@/lib/platform-auth";
import { getPlatformSystemHealth } from "@/lib/platform";
import type { ReactNode } from "react";

export default async function PlatformSystemHealthPage() {
  await requirePlatformUser();
  const health = await getPlatformSystemHealth();
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-7 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-clinical-700">SaaS operations</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-navy-950">System Health</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Monitor tenant state, import readiness, active platform sessions, and support access exposure.</p>
      <div className="mt-7 grid gap-5 lg:grid-cols-2">
        <Panel title="Tenant Status">
          {health.tenants.map((item) => <Row key={item.status} label={item.status} value={item._count} />)}
        </Panel>
        <Panel title="Import Batch Status">
          {health.imports.map((item) => <Row key={item.status} label={item.status} value={item._count} />)}
        </Panel>
        <Panel title="Platform Sessions">
          <Row label="Active platform sessions" value={health.activePlatformSessions} />
        </Panel>
        <Panel title="Support Exposure">
          <Row label="Approved active support access" value={health.activeSupportAccess} />
        </Panel>
      </div>
    </section>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 p-5">
      <h2 className="font-semibold text-navy-950">{title}</h2>
      <div className="mt-4 grid gap-2">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
      <span className="font-medium text-slate-600">{label.replace(/_/g, " ")}</span>
      <span className="font-semibold text-navy-950">{value}</span>
    </div>
  );
}
