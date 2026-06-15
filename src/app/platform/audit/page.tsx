import { requirePlatformUser } from "@/lib/platform-auth";
import { getPlatformAuditData } from "@/lib/platform";

export default async function PlatformAuditPage() {
  await requirePlatformUser();
  const logs = await getPlatformAuditData();
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-7 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-clinical-700">Platform accountability</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-navy-950">Audit Log</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Platform actions and authorised support actions are tracked separately from tenant operating data.</p>
      <div className="mt-7 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-[0.12em] text-slate-500">
              <th className="py-3 pr-4">Time</th>
              <th className="py-3 pr-4">Tenant</th>
              <th className="py-3 pr-4">Actor</th>
              <th className="py-3 pr-4">Action</th>
              <th className="py-3 pr-4">Record</th>
              <th className="py-3 pr-4">Outcome</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b border-slate-100">
                <td className="py-3 pr-4 text-slate-500">{log.createdAt.toLocaleString()}</td>
                <td className="py-3 pr-4 font-medium text-navy-950">{log.tenant?.name ?? "Platform"}</td>
                <td className="py-3 pr-4 text-slate-600">{log.actorLabel ?? log.actorType}</td>
                <td className="py-3 pr-4 text-slate-600">{log.action}</td>
                <td className="py-3 pr-4 text-slate-600">{log.recordType ?? "-"}</td>
                <td className="py-3 pr-4 text-slate-600">{log.outcome}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!logs.length ? <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">No audit records yet.</p> : null}
      </div>
    </section>
  );
}
