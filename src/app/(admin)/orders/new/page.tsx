import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { OrderSource, OrderStatus, OrderType } from "@prisma/client";
import { requirePermission } from "@/lib/auth";
import { enumLabel } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { createOrderAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function NewOrderPage() {
  const user = await requirePermission("manageOrders");
  const [branches, units, staff] = user.tenantId ? await Promise.all([
    prisma.branch.findMany({ where: { tenantId: user.tenantId }, orderBy: { name: "asc" } }),
    prisma.operatingUnit.findMany({ where: { tenantId: user.tenantId }, orderBy: [{ type: "asc" }, { name: "asc" }] }),
    prisma.staffMember.findMany({ where: { tenantId: user.tenantId }, orderBy: { name: "asc" } })
  ]) : [[], [], []];

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-navy-800 bg-navy-950 p-6 text-white shadow-[0_28px_80px_rgba(6,21,38,0.22)]">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-clinical-100 ring-1 ring-white/15">
          <ShoppingBag className="h-3.5 w-3.5" aria-hidden="true" />
          Order Setup
        </span>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight">Create Order</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-200">Capture a prescription, refill, OTC, or family-pack order into the tenant revenue pipeline.</p>
      </section>

      {!branches.length ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm font-semibold text-amber-900">
          Create a branch before creating orders.
          <Link href="/branches/new" className="ml-2 underline">Create first branch</Link>
        </div>
      ) : (
        <form action={createOrderAction} className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <div className="grid gap-4 md:grid-cols-2">
            <Field name="customerName" label="Patient / customer" required />
            <Field name="phone" label="Phone" required />
            <Select name="source" label="Source" options={Object.values(OrderSource).map((value) => [value, enumLabel(value)])} />
            <Select name="type" label="Order type" options={Object.values(OrderType).map((value) => [value, enumLabel(value)])} />
            <Select name="status" label="Order status" options={Object.values(OrderStatus).map((value) => [value, enumLabel(value)])} />
            <Select name="branchId" label="Fulfilment branch" options={branches.map((branch) => [branch.id, branch.name])} />
            <Select name="originatingOperatingUnitId" label="Originating unit" options={units.map((unit) => [unit.id, `${unit.name} - ${enumLabel(unit.type)}`])} includeNone />
            <Select name="assignedStaffId" label="Assigned staff" options={staff.map((member) => [member.id, `${member.name} - ${member.role}`])} includeNone />
            <Field name="amount" label="Amount" type="number" step="0.01" required />
            <Field name="paymentStatus" label="Payment status" />
            <Field name="fulfillmentPreference" label="Delivery or collection preference" />
            <Field name="productName" label="Item" />
            <Field name="category" label="Item category" />
            <label className="md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Notes</span>
              <textarea name="notes" rows={4} className="focus-ring mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-navy-950" />
            </label>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button className="focus-ring rounded-lg bg-navy-950 px-4 py-2.5 text-sm font-semibold text-white">Create order</button>
            <Link href="/orders" className="focus-ring rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700">Cancel</Link>
          </div>
        </form>
      )}
    </div>
  );
}

function Field({ name, label, type = "text", step, required = false }: { name: string; label: string; type?: string; step?: string; required?: boolean }) {
  return (
    <label>
      <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</span>
      <input name={name} type={type} step={step} required={required} className="focus-ring mt-2 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-navy-950" />
    </label>
  );
}

function Select({ name, label, options, includeNone = false }: { name: string; label: string; options: string[][]; includeNone?: boolean }) {
  return (
    <label>
      <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</span>
      <select name={name} required={!includeNone} className="focus-ring mt-2 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-navy-950">
        {includeNone ? <option value="">None</option> : null}
        {options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
    </label>
  );
}
