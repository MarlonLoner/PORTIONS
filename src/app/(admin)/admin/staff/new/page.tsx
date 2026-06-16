import { UsersRound } from "lucide-react";
import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createStaffAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function NewStaffPage() {
  const user = await requirePermission("manageUsers");
  const branches = user.tenantId ? await prisma.branch.findMany({ where: { tenantId: user.tenantId }, orderBy: { name: "asc" } }) : [];

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-navy-800 bg-navy-950 p-6 text-white shadow-[0_28px_80px_rgba(6,21,38,0.22)]">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-clinical-100 ring-1 ring-white/15">
          <UsersRound className="h-3.5 w-3.5" aria-hidden="true" />
          Staff Setup
        </span>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight">Add Staff Record</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-200">Create the staff profile first, then create a secure login and operating-unit access.</p>
      </section>

      <form action={createStaffAction} className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
        <div className="grid gap-4 md:grid-cols-2">
          <Field name="name" label="Staff name" required />
          <Field name="role" label="Role" required />
          <Field name="phone" label="Phone" required />
          <Field name="email" label="Email" type="email" />
          <Select name="branchId" label="Branch" options={branches.map((branch) => [branch.id, branch.name])} includeNone />
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <button className="focus-ring rounded-lg bg-navy-950 px-4 py-2.5 text-sm font-semibold text-white">Add staff and create login</button>
          <Link href="/admin/users" className="focus-ring rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700">Cancel</Link>
        </div>
      </form>
    </div>
  );
}

function Field({ name, label, type = "text", required = false }: { name: string; label: string; type?: string; required?: boolean }) {
  return (
    <label>
      <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</span>
      <input name={name} type={type} required={required} className="focus-ring mt-2 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-navy-950" />
    </label>
  );
}

function Select({ name, label, options, includeNone = false }: { name: string; label: string; options: string[][]; includeNone?: boolean }) {
  return (
    <label>
      <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</span>
      <select name={name} className="focus-ring mt-2 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-navy-950">
        {includeNone ? <option value="">No branch yet</option> : null}
        {options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
    </label>
  );
}
