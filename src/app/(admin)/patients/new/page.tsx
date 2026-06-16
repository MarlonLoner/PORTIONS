import { UsersRound } from "lucide-react";
import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createPatientAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function NewPatientPage() {
  const user = await requirePermission("managePatients");
  const [branches, staff] = user.tenantId ? await Promise.all([
    prisma.branch.findMany({ where: { tenantId: user.tenantId }, orderBy: { name: "asc" } }),
    prisma.staffMember.findMany({ where: { tenantId: user.tenantId }, orderBy: { name: "asc" } })
  ]) : [[], []];

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-navy-800 bg-navy-950 p-6 text-white shadow-[0_28px_80px_rgba(6,21,38,0.22)]">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-clinical-100 ring-1 ring-white/15">
          <UsersRound className="h-3.5 w-3.5" aria-hidden="true" />
          Patient Setup
        </span>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight">Add Patient</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-200">Create the first chronic or recurring patient profile for this tenant.</p>
      </section>

      {!branches.length ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm font-semibold text-amber-900">
          Create a branch before adding patient records.
          <Link href="/branches/new" className="ml-2 underline">Create first branch</Link>
        </div>
      ) : (
        <form action={createPatientAction} className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <div className="grid gap-4 md:grid-cols-2">
            <Field name="name" label="Full name" required />
            <Field name="phone" label="Phone" required />
            <Field name="dateOfBirth" label="Date of birth" type="date" />
            <Field name="gender" label="Gender" />
            <Select name="branchId" label="Branch" options={branches.map((branch) => [branch.id, branch.name])} />
            <Field name="conditionCategory" label="Chronic condition" />
            <Field name="nextRefillDate" label="Next refill date" type="date" />
            <Select name="assignedStaffId" label="Assigned staff" options={staff.map((member) => [member.id, `${member.name} - ${member.role}`])} includeNone />
            <label className="md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Notes</span>
              <textarea name="notes" rows={4} className="focus-ring mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-navy-950" />
            </label>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button className="focus-ring rounded-lg bg-navy-950 px-4 py-2.5 text-sm font-semibold text-white">Add patient</button>
            <Link href="/patients" className="focus-ring rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700">Cancel</Link>
          </div>
        </form>
      )}
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
      <select name={name} required={!includeNone} className="focus-ring mt-2 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-navy-950">
        {includeNone ? <option value="">Unassigned</option> : null}
        {options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
    </label>
  );
}
