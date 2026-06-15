import { requirePlatformUser } from "@/lib/platform-auth";
import { prisma } from "@/lib/prisma";

export default async function PlatformSupportPage() {
  await requirePlatformUser();
  const requests = await prisma.tenantSupportAccessRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { tenant: true, requestedByPlatformUser: true }
  });
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-7 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-clinical-700">No-backdoor support</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-navy-950">Support Access</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
        Platform support requires explicit tenant-scoped approval, defined scope, expiry, and audit logging. Patient and customer records are not exposed by default.
      </p>
      <div className="mt-7 grid gap-3">
        {requests.length ? requests.map((request) => (
          <div key={request.id} className="rounded-lg border border-slate-100 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-semibold text-navy-950">{request.tenant.name}</p>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{request.status}</span>
            </div>
            <p className="mt-1 text-sm text-slate-500">{request.scope} / requested by {request.requestedByPlatformUser.name}</p>
            <p className="mt-2 text-sm text-slate-600">{request.reason}</p>
          </div>
        )) : (
          <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">No support access requests have been created yet.</p>
        )}
      </div>
    </section>
  );
}
