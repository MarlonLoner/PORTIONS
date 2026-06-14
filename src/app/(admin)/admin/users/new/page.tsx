import { redirect } from "next/navigation";
import { OperatingUnitAccessLevel, UserRole, UserStatus } from "@prisma/client";
import { hashPassword, requirePermission, validatePasswordStrength } from "@/lib/auth";
import { enumLabel } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function NewUserPage() {
  await requirePermission("manageUsers");
  const [units, staff] = await Promise.all([
    prisma.operatingUnit.findMany({ orderBy: { name: "asc" } }),
    prisma.staffMember.findMany({ orderBy: { name: "asc" } })
  ]);

  async function createUser(formData: FormData) {
    "use server";
    await requirePermission("manageUsers");
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");
    const role = String(formData.get("role") ?? "VIEW_ONLY") as UserRole;
    const status = String(formData.get("status") ?? "ACTIVE") as UserStatus;
    const staffMemberId = optional(String(formData.get("staffMemberId") ?? ""));
    const primaryOperatingUnitId = optional(String(formData.get("primaryOperatingUnitId") ?? ""));
    const accessLevel = String(formData.get("accessLevel") ?? "VIEW") as OperatingUnitAccessLevel;
    const operatingUnitIds = Array.from(new Set([
      primaryOperatingUnitId,
      ...formData.getAll("operatingUnitIds").map((value) => optional(String(value ?? "")))
    ].filter((value): value is string => Boolean(value))));
    if (!name || !email) throw new Error("Name and email are required.");
    const passwordError = validatePasswordStrength(password);
    if (passwordError) throw new Error(passwordError);
    const user = await prisma.appUser.create({
      data: {
        name,
        email,
        passwordHash: hashPassword(password),
        role,
        status,
        mustChangePassword: true,
        staffMemberId,
        primaryOperatingUnitId,
        unitAccess: operatingUnitIds.length ? {
          create: operatingUnitIds.map((operatingUnitId) => ({
            operatingUnitId,
            accessLevel,
            isPrimary: operatingUnitId === primaryOperatingUnitId
          }))
        } : undefined
      }
    });
    redirect(`/admin/users/${user.id}`);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-navy-800 bg-navy-950 p-6 text-white shadow-[0_28px_80px_rgba(6,21,38,0.22)]">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clinical-100">User administration</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">Create User</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-200">Create a secure account and assign an initial operating unit. Password hashes are stored only as scrypt hashes.</p>
      </section>

      <form action={createUser} className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Name" name="name" required />
          <Field label="Email" name="email" type="email" required />
          <Field label="Temporary password" name="password" type="text" required />
          <Select label="Role" name="role" options={Object.values(UserRole)} />
          <Select label="Status" name="status" options={Object.values(UserStatus)} defaultValue={UserStatus.ACTIVE} />
          <Select label="Staff member" name="staffMemberId" options={staff.map((member) => member.id)} labels={Object.fromEntries(staff.map((member) => [member.id, `${member.name} - ${member.role}`]))} includeNone />
          <Select label="Primary operating unit" name="primaryOperatingUnitId" options={units.map((unit) => unit.id)} labels={Object.fromEntries(units.map((unit) => [unit.id, unit.name]))} includeNone />
          <Select label="Access level" name="accessLevel" options={Object.values(OperatingUnitAccessLevel)} defaultValue={OperatingUnitAccessLevel.OPERATE} />
        </div>

        <div className="mt-5 rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clinical-700">Additional operating-unit access</p>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {units.map((unit) => (
              <label key={unit.id} className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">
                <input type="checkbox" name="operatingUnitIds" value={unit.id} className="h-4 w-4 rounded border-slate-300" />
                {unit.name}
              </label>
            ))}
          </div>
        </div>

        <button className="focus-ring mt-5 rounded-lg bg-navy-950 px-4 py-2.5 text-sm font-semibold text-white">Create user</button>
        <p className="mt-3 text-xs leading-5 text-slate-500">New users must change their temporary password on first login. Passwords must be 12+ characters with uppercase, lowercase, number, and special character.</p>
      </form>
    </div>
  );
}

function optional(value: string) {
  return value && value !== "none" ? value : null;
}

function Field({ label, name, type = "text", required = false }: { label: string; name: string; type?: string; required?: boolean }) {
  return (
    <label>
      <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</span>
      <input name={name} type={type} required={required} className="focus-ring mt-2 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-navy-950" />
    </label>
  );
}

function Select({ label, name, options, labels, includeNone = false, defaultValue }: { label: string; name: string; options: string[]; labels?: Record<string, string>; includeNone?: boolean; defaultValue?: string }) {
  return (
    <label>
      <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</span>
      <select name={name} defaultValue={defaultValue} className="focus-ring mt-2 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-navy-950">
        {includeNone ? <option value="">None</option> : null}
        {options.map((option) => <option key={option} value={option}>{labels?.[option] ?? enumLabel(option)}</option>)}
      </select>
    </label>
  );
}
