import { notFound, redirect } from "next/navigation";
import { OperatingUnitAccessLevel, UserRole, UserStatus } from "@prisma/client";
import { hashPassword, requirePermission } from "@/lib/auth";
import { enumLabel, formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("manageUsers");
  const { id } = await params;
  const [user, units] = await Promise.all([
    prisma.appUser.findUnique({
      where: { id },
      include: { staffMember: true, primaryOperatingUnit: true, unitAccess: { include: { operatingUnit: true }, orderBy: { isPrimary: "desc" } } }
    }),
    prisma.operatingUnit.findMany({ orderBy: { name: "asc" } })
  ]);
  if (!user) notFound();

  async function updateUser(formData: FormData) {
    "use server";
    await requirePermission("manageUsers");
    await prisma.appUser.update({
      where: { id },
      data: {
        name: String(formData.get("name") ?? "").trim(),
        role: String(formData.get("role") ?? "VIEW_ONLY") as UserRole,
        status: String(formData.get("status") ?? "ACTIVE") as UserStatus,
        primaryOperatingUnitId: optional(String(formData.get("primaryOperatingUnitId") ?? ""))
      }
    });
    redirect(`/admin/users/${id}`);
  }

  async function resetPassword(formData: FormData) {
    "use server";
    await requirePermission("manageUsers");
    const password = String(formData.get("password") ?? "");
    if (password.length < 10) throw new Error("Password must be at least 10 characters.");
    await prisma.appUser.update({ where: { id }, data: { passwordHash: hashPassword(password), failedLoginCount: 0, lockedUntil: null } });
    await prisma.appSession.deleteMany({ where: { userId: id } });
    redirect(`/admin/users/${id}`);
  }

  async function addUnitAccess(formData: FormData) {
    "use server";
    await requirePermission("manageUsers");
    const operatingUnitId = String(formData.get("operatingUnitId") ?? "");
    if (!operatingUnitId) return;
    const accessLevel = String(formData.get("accessLevel") ?? "VIEW") as OperatingUnitAccessLevel;
    const isPrimary = formData.get("isPrimary") === "on";
    await prisma.userOperatingUnitAccess.upsert({
      where: { userId_operatingUnitId: { userId: id, operatingUnitId } },
      update: { accessLevel, isPrimary },
      create: { userId: id, operatingUnitId, accessLevel, isPrimary }
    });
    if (isPrimary) await prisma.appUser.update({ where: { id }, data: { primaryOperatingUnitId: operatingUnitId } });
    redirect(`/admin/users/${id}`);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-navy-800 bg-navy-950 p-6 text-white shadow-[0_28px_80px_rgba(6,21,38,0.22)]">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clinical-100">User profile</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">{user.name}</h1>
        <p className="mt-3 text-sm leading-7 text-slate-200">{user.email} / {enumLabel(user.role)} / {enumLabel(user.status)}</p>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <form action={updateUser} className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clinical-700">Account settings</p>
          <div className="mt-4 grid gap-3">
            <Field label="Name" name="name" defaultValue={user.name} />
            <Select label="Role" name="role" value={user.role} options={Object.values(UserRole)} />
            <Select label="Status" name="status" value={user.status} options={Object.values(UserStatus)} />
            <Select label="Primary unit" name="primaryOperatingUnitId" value={user.primaryOperatingUnitId ?? ""} options={units.map((unit) => unit.id)} labels={Object.fromEntries(units.map((unit) => [unit.id, unit.name]))} includeNone />
          </div>
          <button className="focus-ring mt-4 rounded-lg bg-navy-950 px-4 py-2.5 text-sm font-semibold text-white">Save user</button>
        </form>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clinical-700">Operating-unit access</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {user.unitAccess.map((access) => (
              <div key={access.id} className="rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
                <p className="font-semibold text-navy-950">{access.operatingUnit.name}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.1em] text-clinical-700">{enumLabel(access.accessLevel)} / {enumLabel(access.operatingUnit.type)}</p>
                {access.isPrimary ? <p className="mt-2 text-xs font-semibold text-emerald-700">Primary</p> : null}
              </div>
            ))}
          </div>
          <form action={addUnitAccess} className="mt-5 rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="grid gap-3 md:grid-cols-3">
              <Select label="Unit" name="operatingUnitId" options={units.map((unit) => unit.id)} labels={Object.fromEntries(units.map((unit) => [unit.id, unit.name]))} />
              <Select label="Access" name="accessLevel" options={Object.values(OperatingUnitAccessLevel)} />
              <label className="mt-7 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input type="checkbox" name="isPrimary" className="h-4 w-4 rounded border-slate-300" />
                Primary
              </label>
            </div>
            <button className="focus-ring mt-4 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">Add/update access</button>
          </form>
        </section>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <form action={resetPassword} className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clinical-700">Password reset</p>
          <Field label="New temporary password" name="password" type="password" />
          <button className="focus-ring mt-4 rounded-lg bg-navy-950 px-4 py-2.5 text-sm font-semibold text-white">Reset password</button>
          <p className="mt-3 text-xs leading-5 text-slate-500">Existing sessions for this user are revoked after reset.</p>
        </form>
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clinical-700">Security summary</p>
          <div className="mt-4 grid gap-3">
            <Mini label="Failed logins" value={String(user.failedLoginCount)} />
            <Mini label="Locked until" value={user.lockedUntil ? formatDate(user.lockedUntil) : "Not locked"} />
            <Mini label="Last login" value={user.lastLoginAt ? formatDate(user.lastLoginAt) : "Not recorded"} />
            <Mini label="Staff member" value={user.staffMember?.name ?? "Not linked"} />
          </div>
        </div>
      </section>
    </div>
  );
}

function optional(value: string) {
  return value && value !== "none" ? value : null;
}

function Field({ label, name, type = "text", defaultValue }: { label: string; name: string; type?: string; defaultValue?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</span>
      <input name={name} type={type} defaultValue={defaultValue} className="focus-ring mt-2 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-navy-950" />
    </label>
  );
}

function Select({ label, name, options, labels, value, includeNone = false }: { label: string; name: string; options: string[]; labels?: Record<string, string>; value?: string; includeNone?: boolean }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</span>
      <select name={name} defaultValue={value} className="focus-ring mt-2 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-navy-950">
        {includeNone ? <option value="">None</option> : null}
        {options.map((option) => <option key={option} value={option}>{labels?.[option] ?? enumLabel(option)}</option>)}
      </select>
    </label>
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
