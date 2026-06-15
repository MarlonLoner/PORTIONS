import { Building2, Globe2, ShieldCheck } from "lucide-react";
import { OperatingUnitStatus, OperatingUnitType } from "@prisma/client";
import type { ReactNode } from "react";
import { requirePermission } from "@/lib/auth";
import { enumLabel } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function OperatingUnitsPage() {
  const currentUser = await requirePermission("manageOperatingUnits");
  const tenantWhere = currentUser.tenantId ? { tenantId: currentUser.tenantId } : {};
  const [units, branches, staff] = await Promise.all([
    prisma.operatingUnit.findMany({ where: tenantWhere, include: { branch: true, managerStaff: true, userAccess: true }, orderBy: [{ type: "asc" }, { name: "asc" }] }),
    prisma.branch.findMany({ where: tenantWhere, orderBy: { name: "asc" } }),
    prisma.staffMember.findMany({ where: tenantWhere, orderBy: { name: "asc" } })
  ]);

  async function updateUnit(formData: FormData) {
    "use server";
    const actor = await requirePermission("manageOperatingUnits");
    if (!actor.tenantId || actor.isDemo) return;
    const id = String(formData.get("id") ?? "");
    const managerStaffId = optional(String(formData.get("managerStaffId") ?? ""));
    const manager = managerStaffId ? await prisma.staffMember.findFirst({ where: { id: managerStaffId, tenantId: actor.tenantId }, select: { id: true } }) : null;
    const existing = await prisma.operatingUnit.findFirst({ where: { id, tenantId: actor.tenantId }, select: { id: true } });
    if (!existing) return;
    await prisma.operatingUnit.update({
      where: { id: existing.id },
      data: {
        name: String(formData.get("name") ?? "").trim(),
        status: String(formData.get("status") ?? "ACTIVE") as OperatingUnitStatus,
        location: optional(String(formData.get("location") ?? "")),
        phone: optional(String(formData.get("phone") ?? "")),
        whatsappNumber: optional(String(formData.get("whatsappNumber") ?? "")),
        email: optional(String(formData.get("email") ?? "")),
        contactLabel: optional(String(formData.get("contactLabel") ?? "")),
        managerStaffId: manager?.id ?? null,
        handlesOnlineOrders: formData.get("handlesOnlineOrders") === "on",
        handlesPatientFollowUps: formData.get("handlesPatientFollowUps") === "on",
        handlesStock: formData.get("handlesStock") === "on",
        handlesEvents: formData.get("handlesEvents") === "on",
        handlesCommunications: formData.get("handlesCommunications") === "on",
        isPrimaryOnlineUnit: formData.get("isPrimaryOnlineUnit") === "on"
      }
    });
  }

  async function createUnit(formData: FormData) {
    "use server";
    const actor = await requirePermission("manageOperatingUnits");
    if (!actor.tenantId || actor.isDemo) return;
    const name = String(formData.get("name") ?? "").trim();
    const code = String(formData.get("code") ?? "").trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_");
    const branchId = optional(String(formData.get("branchId") ?? ""));
    const branch = branchId ? await prisma.branch.findFirst({ where: { id: branchId, tenantId: actor.tenantId }, select: { id: true } }) : null;
    await prisma.operatingUnit.create({
      data: {
        tenantId: actor.tenantId,
        name,
        code,
        type: String(formData.get("type") ?? "OTHER") as OperatingUnitType,
        status: String(formData.get("status") ?? "SETUP") as OperatingUnitStatus,
        branchId: branch?.id ?? null,
        location: optional(String(formData.get("location") ?? "")),
        whatsappNumber: optional(String(formData.get("whatsappNumber") ?? "")),
        contactLabel: optional(String(formData.get("contactLabel") ?? "")),
        handlesOnlineOrders: formData.get("handlesOnlineOrders") === "on",
        handlesCommunications: true
      }
    });
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-lg border border-navy-800 bg-navy-950 p-5 text-white shadow-[0_28px_80px_rgba(6,21,38,0.22)] sm:p-6 xl:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.12),transparent_36%),linear-gradient(180deg,rgba(75,158,201,0.18),transparent_58%)]" />
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-clinical-100 ring-1 ring-white/15">
            <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
            Operating Units
          </span>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">Operating Units</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-200">Configure physical branches, Online Department, and future operational teams for permissions and communication ownership.</p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Metric icon={<Building2 className="h-5 w-5" />} label="Physical branch units" value={String(units.filter((unit) => unit.type === "PHYSICAL_BRANCH").length)} />
        <Metric icon={<Globe2 className="h-5 w-5" />} label="Online units" value={String(units.filter((unit) => unit.type === "ONLINE_DEPARTMENT").length)} />
        <Metric icon={<ShieldCheck className="h-5 w-5" />} label="Units with WhatsApp" value={String(units.filter((unit) => unit.whatsappNumber).length)} />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clinical-700">Create operating unit</p>
        <form action={createUnit} className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Name" name="name" />
          <Field label="Code" name="code" />
          <Select label="Type" name="type" options={Object.values(OperatingUnitType)} />
          <Select label="Status" name="status" options={Object.values(OperatingUnitStatus)} />
          <Select label="Linked branch" name="branchId" options={branches.map((branch) => branch.id)} labels={Object.fromEntries(branches.map((branch) => [branch.id, branch.name]))} includeNone />
          <Field label="Location" name="location" />
          <Field label="WhatsApp number" name="whatsappNumber" />
          <Field label="Contact label" name="contactLabel" />
          <label className="mt-7 flex items-center gap-2 text-sm font-semibold text-slate-700"><input type="checkbox" name="handlesOnlineOrders" /> Online orders</label>
          <button className="focus-ring mt-6 rounded-lg bg-navy-950 px-4 py-2.5 text-sm font-semibold text-white">Create unit</button>
        </form>
      </section>

      <section className="grid gap-5">
        {units.map((unit) => (
          <form key={unit.id} action={updateUnit} className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
            <input type="hidden" name="id" value={unit.id} />
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clinical-700">{enumLabel(unit.type)}</p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight text-navy-950">{unit.name}</h2>
                <p className="mt-1 text-sm text-slate-600">{unit.code} / {unit.branch?.name ?? "No physical branch"}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">{enumLabel(unit.status)}</span>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Field label="Name" name="name" defaultValue={unit.name} />
              <Select label="Status" name="status" value={unit.status} options={Object.values(OperatingUnitStatus)} />
              <Field label="Location" name="location" defaultValue={unit.location ?? ""} />
              <Field label="Phone" name="phone" defaultValue={unit.phone ?? ""} />
              <Field label="WhatsApp number" name="whatsappNumber" defaultValue={unit.whatsappNumber ?? ""} />
              <Field label="Email" name="email" defaultValue={unit.email ?? ""} />
              <Field label="Contact label" name="contactLabel" defaultValue={unit.contactLabel ?? ""} />
              <Select label="Manager" name="managerStaffId" value={unit.managerStaffId ?? ""} options={staff.map((member) => member.id)} labels={Object.fromEntries(staff.map((member) => [member.id, member.name]))} includeNone />
            </div>
            <div className="mt-4 flex flex-wrap gap-4 text-sm font-semibold text-slate-700">
              <Check name="handlesOnlineOrders" label="Online orders" checked={unit.handlesOnlineOrders} />
              <Check name="handlesPatientFollowUps" label="Patient follow-ups" checked={unit.handlesPatientFollowUps} />
              <Check name="handlesStock" label="Stock" checked={unit.handlesStock} />
              <Check name="handlesEvents" label="Events" checked={unit.handlesEvents} />
              <Check name="handlesCommunications" label="Communications" checked={unit.handlesCommunications} />
              <Check name="isPrimaryOnlineUnit" label="Primary online unit" checked={unit.isPrimaryOnlineUnit} />
            </div>
            <button className="focus-ring mt-4 rounded-lg bg-navy-950 px-4 py-2.5 text-sm font-semibold text-white">Save unit</button>
          </form>
        ))}
      </section>
    </div>
  );
}

function optional(value: string) {
  return value && value !== "none" ? value : null;
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

function Field({ label, name, defaultValue = "" }: { label: string; name: string; defaultValue?: string }) {
  return (
    <label>
      <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</span>
      <input name={name} defaultValue={defaultValue} className="focus-ring mt-2 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-navy-950" />
    </label>
  );
}

function Select({ label, name, options, labels, value, includeNone = false }: { label: string; name: string; options: string[]; labels?: Record<string, string>; value?: string; includeNone?: boolean }) {
  return (
    <label>
      <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</span>
      <select name={name} defaultValue={value} className="focus-ring mt-2 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-navy-950">
        {includeNone ? <option value="">None</option> : null}
        {options.map((option) => <option key={option} value={option}>{labels?.[option] ?? enumLabel(option)}</option>)}
      </select>
    </label>
  );
}

function Check({ name, label, checked }: { name: string; label: string; checked: boolean }) {
  return <label className="flex items-center gap-2"><input type="checkbox" name={name} defaultChecked={checked} /> {label}</label>;
}
