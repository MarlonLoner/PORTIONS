import { KeyRound, Plus, ShieldCheck, UsersRound } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { UserRole, UserStatus } from "@prisma/client";
import { TenantEmptyState } from "@/components/tenant-empty-state";
import { requirePermission } from "@/lib/auth";
import { enumLabel, formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function UsersAdminPage() {
  const currentUser = await requirePermission("manageUsers");
  const users = await prisma.appUser.findMany({
    where: currentUser.tenantId ? { tenantId: currentUser.tenantId } : undefined,
    include: {
      primaryOperatingUnit: true,
      staffMember: true,
      unitAccess: { include: { operatingUnit: true } }
    },
    orderBy: [{ status: "asc" }, { name: "asc" }]
  });

  const active = users.filter((user) => user.status === UserStatus.ACTIVE).length;
  const adminRoles: UserRole[] = [UserRole.OWNER, UserRole.CEO, UserRole.SYSTEM_ADMIN];
  const admins = users.filter((user) => adminRoles.includes(user.role)).length;
  const firstRun = admins <= 1 && users.length <= 2;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-lg border border-navy-800 bg-navy-950 p-5 text-white shadow-[0_28px_80px_rgba(6,21,38,0.22)] sm:p-6 xl:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.12),transparent_36%),linear-gradient(180deg,rgba(75,158,201,0.18),transparent_58%)]" />
        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-clinical-100 ring-1 ring-white/15">
              <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
              User Administration
            </span>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">Users & Permissions</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-200">Manage secure accounts, roles, operating-unit access, and account status.</p>
          </div>
          <Link href="/admin/users/new" className="focus-ring inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-navy-950">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Create staff login
          </Link>
          <Link href="/admin/staff/new" className="focus-ring inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-white/15">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add staff record
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Metric icon={<UsersRound className="h-5 w-5" />} label="Total users" value={String(users.length)} />
        <Metric icon={<ShieldCheck className="h-5 w-5" />} label="Active users" value={String(active)} />
        <Metric icon={<KeyRound className="h-5 w-5" />} label="Admin-level users" value={String(admins)} />
      </section>

      {firstRun ? (
        <section className="rounded-lg border border-clinical-200 bg-clinical-50 p-5 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clinical-800">First-run onboarding</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-navy-950">Build the operating team</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-clinical-900">
            The first administrator is active. Create operational users next, then confirm units and WhatsApp numbers before handing the system to branch teams.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[
              ["Add staff record", "/admin/staff/new"],
              ["Create General Manager login", "/admin/users/new"],
              ["Create Branch Manager login", "/admin/users/new"],
              ["Create Online Orders Agent", "/admin/users/new"],
              ["Create Finance Admin", "/admin/users/new"],
              ["Configure operating units", "/admin/operating-units"],
              ["Add WhatsApp numbers", "/admin/operating-units"],
              ["Review role permissions", "/account"],
              ["Confirm your account", "/account"]
            ].map(([label, href]) => (
              <Link key={label} href={href} className="focus-ring rounded-lg bg-white p-3 text-sm font-semibold text-navy-950 ring-1 ring-clinical-100">{label}</Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
        <div className="grid gap-4">
          {users.length === 0 ? (
            <TenantEmptyState
              title="No staff logins have been created yet."
              description="Create staff records, then create secure logins and assign operating-unit access for the pharmacy team."
              primaryActionLabel="Add staff record"
              primaryActionHref="/admin/staff/new"
              secondaryActionLabel="Create staff login"
              secondaryActionHref="/admin/users/new"
              icon={UsersRound}
            />
          ) : users.map((user) => (
            <article key={user.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link href={`/admin/users/${user.id}`} className="text-lg font-semibold text-navy-950 hover:text-clinical-700">{user.name}</Link>
                  <p className="mt-1 text-sm text-slate-600">{user.email}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge label={enumLabel(user.role)} />
                  <Badge label={enumLabel(user.status)} tone={user.status === "ACTIVE" ? "success" : "warn"} />
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Mini label="Primary unit" value={user.primaryOperatingUnit?.name ?? "None"} />
                <Mini label="Staff link" value={user.staffMember?.name ?? "Not linked"} />
                <Mini label="Unit access" value={String(user.unitAccess.length)} />
                <Mini label="Password change" value={user.mustChangePassword ? "Required" : "No"} />
                <Mini label="Last login" value={user.lastLoginAt ? formatDate(user.lastLoginAt) : "Not recorded"} />
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
      <div className="text-clinical-700">{icon}</div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-navy-950">{value}</p>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white p-3 ring-1 ring-slate-200">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-navy-950">{value}</p>
    </div>
  );
}

function Badge({ label, tone = "normal" }: { label: string; tone?: "normal" | "success" | "warn" }) {
  const classes = tone === "success" ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : tone === "warn" ? "bg-amber-50 text-amber-700 ring-amber-200" : "bg-white text-slate-700 ring-slate-200";
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ring-1 ${classes}`}>{label}</span>;
}
