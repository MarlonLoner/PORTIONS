import { KeyRound, LogOut, ShieldCheck, UsersRound } from "lucide-react";
import { getCurrentAccessUser, getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const accessUser = await getCurrentAccessUser();
  const realUser = await getCurrentUser();
  const dbUser = realUser ? await prisma.appUser.findUnique({
    where: { id: realUser.id },
    include: { primaryOperatingUnit: true, unitAccess: { include: { operatingUnit: true } } }
  }) : null;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-lg border border-navy-800 bg-navy-950 p-5 text-white shadow-[0_28px_80px_rgba(6,21,38,0.22)] sm:p-6 xl:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.12),transparent_36%),linear-gradient(180deg,rgba(75,158,201,0.18),transparent_58%)]" />
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-clinical-100 ring-1 ring-white/15">
            <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
            Secure Account
          </span>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">{accessUser?.name ?? "PORTIONS Account"}</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-200">
            Review your role, operating-unit access, session type, and command permissions.
          </p>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <div className="flex items-center gap-2 text-clinical-700">
            <UsersRound className="h-5 w-5" aria-hidden="true" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em]">Profile</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-navy-950">{accessUser?.email}</h2>
            </div>
          </div>
          <div className="mt-5 grid gap-3">
            <Mini label="Role" value={accessUser?.role.replace(/_/g, " ") ?? "Demo"} />
            <Mini label="Session" value={accessUser?.isDemo ? "Demo access" : "Real user account"} />
            <Mini label="Primary unit" value={accessUser?.primaryOperatingUnitName ?? "Network"} />
            <Mini label="Last login" value={dbUser?.lastLoginAt ? dbUser.lastLoginAt.toLocaleString("en-ZW") : accessUser?.isDemo ? "Demo session" : "Not recorded"} />
          </div>
          <form action={accessUser?.isDemo ? "/api/demo-access/logout" : "/api/auth/logout"} method="post" className="mt-5">
            <button className="focus-ring inline-flex items-center gap-2 rounded-lg bg-navy-950 px-4 py-2.5 text-sm font-semibold text-white">
              <LogOut className="h-4 w-4" aria-hidden="true" />
              {accessUser?.isDemo ? "Exit demo" : "Sign out"}
            </button>
          </form>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <div className="flex items-center gap-2 text-clinical-700">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em]">Operating units</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-navy-950">Access scope</h2>
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {accessUser?.isDemo ? (
              <Mini label="Demo scope" value="Presentation-ready owner access" />
            ) : accessUser?.accessibleOperatingUnits.length ? accessUser.accessibleOperatingUnits.map((unit) => (
              <div key={unit.id} className="rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
                <p className="font-semibold text-navy-950">{unit.name}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.1em] text-clinical-700">{unit.type.replace(/_/g, " ")} / {unit.accessLevel}</p>
                {unit.isPrimary ? <p className="mt-2 text-xs font-semibold text-emerald-700">Primary unit</p> : null}
              </div>
            )) : (
              <p className="rounded-lg bg-amber-50 p-4 text-sm leading-6 text-amber-800 ring-1 ring-amber-100">No operating-unit access is configured yet.</p>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-navy-950">{value}</p>
    </div>
  );
}
