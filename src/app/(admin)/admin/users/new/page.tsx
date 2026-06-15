import { redirect } from "next/navigation";
import { AdminUserCreateForm } from "@/components/admin-user-create-form";
import { enumLabel } from "@/lib/format";
import {
  getCurrentAdminUser,
  getUserCreationAccessLevels,
  getUserCreationOperatingUnits,
  getUserCreationRoleOptions,
  getUserCreationStaffOptions,
  getUserCreationStatusOptions
} from "@/lib/admin-user-creation";
import { createUserAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function NewUserPage() {
  const [adminUser, units, staff] = await Promise.all([
    getCurrentAdminUser(),
    getUserCreationOperatingUnits(),
    getUserCreationStaffOptions()
  ]);
  if (!adminUser) redirect("/access-denied");
  const roles = getUserCreationRoleOptions();
  const statuses = getUserCreationStatusOptions();
  const accessLevels = getUserCreationAccessLevels();

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-navy-800 bg-navy-950 p-6 text-white shadow-[0_28px_80px_rgba(6,21,38,0.22)]">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clinical-100">User administration</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">Create User</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-200">Create a secure account and assign an initial operating unit. Password hashes are stored only as scrypt hashes.</p>
      </section>

      <AdminUserCreateForm
        action={createUserAction}
        roles={roles}
        statuses={statuses}
        accessLevels={accessLevels}
        units={units.map((unit) => ({
          id: unit.id,
          name: unit.name,
          helper: `(${enumLabel(unit.type)}${unit.branchName ? ` / ${unit.branchName}` : ""})`
        }))}
        staff={staff.map((member) => ({
          id: member.id,
          name: `${member.name} - ${member.role}${member.branchName ? ` / ${member.branchName}` : ""}`
        }))}
      />
    </div>
  );
}
