import { redirect } from "next/navigation";
import { OperatingUnitAccessLevel, UserRole, UserStatus } from "@prisma/client";
import { AdminUserCreateForm } from "@/components/admin-user-create-form";
import { hashPassword, requirePermission, validatePasswordStrength } from "@/lib/auth";
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

      <AdminUserCreateForm
        action={createUser}
        roles={Object.values(UserRole)}
        statuses={Object.values(UserStatus)}
        accessLevels={Object.values(OperatingUnitAccessLevel)}
        units={units.map((unit) => ({ id: unit.id, name: unit.name }))}
        staff={staff.map((member) => ({ id: member.id, name: `${member.name} - ${member.role}` }))}
      />
    </div>
  );
}

function optional(value: string) {
  return value && value !== "none" ? value : null;
}
