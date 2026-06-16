import { PackageSearch } from "lucide-react";
import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createStockItemAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function NewStockItemPage() {
  const user = await requirePermission("manageStock");
  const branches = user.tenantId ? await prisma.branch.findMany({ where: { tenantId: user.tenantId }, orderBy: { name: "asc" } }) : [];

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-navy-800 bg-navy-950 p-6 text-white shadow-[0_28px_80px_rgba(6,21,38,0.22)]">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-clinical-100 ring-1 ring-white/15">
          <PackageSearch className="h-3.5 w-3.5" aria-hidden="true" />
          Stock Setup
        </span>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight">Add Stock Item</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-200">Create the first stock records for a tenant branch and unlock Stock Intelligence.</p>
      </section>

      {!branches.length ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm font-semibold text-amber-900">
          Create a branch before adding stock records.
          <Link href="/branches/new" className="ml-2 underline">Create first branch</Link>
        </div>
      ) : (
        <form action={createStockItemAction} className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <div className="grid gap-4 md:grid-cols-2">
            <Field name="productName" label="Product name" required />
            <Field name="category" label="Category" required />
            <Select name="branchId" label="Branch" options={branches.map((branch) => [branch.id, branch.name])} />
            <Field name="stockLevel" label="Quantity" type="number" required />
            <Field name="reorderLevel" label="Reorder level" type="number" required />
            <Field name="unitCost" label="Unit cost" type="number" step="0.01" />
            <Field name="sellingPrice" label="Selling price" type="number" step="0.01" />
            <Field name="expiryDate" label="Expiry date" type="date" />
            <Field name="batchNumber" label="Batch number" />
            <label>
              <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Status</span>
              <select name="status" defaultValue="" className="focus-ring mt-2 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-navy-950">
                <option value="">Infer automatically</option>
                <option value="HEALTHY">Healthy</option>
                <option value="LOW_STOCK">Low stock</option>
                <option value="OVERSTOCK">Overstock</option>
                <option value="NEAR_EXPIRY">Near expiry</option>
                <option value="DEAD_STOCK">Dead stock</option>
              </select>
            </label>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button className="focus-ring rounded-lg bg-navy-950 px-4 py-2.5 text-sm font-semibold text-white">Add stock item</button>
            <Link href="/stock" className="focus-ring rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700">Cancel</Link>
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

function Select({ name, label, options }: { name: string; label: string; options: string[][] }) {
  return (
    <label>
      <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</span>
      <select name={name} required className="focus-ring mt-2 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-navy-950">
        {options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
    </label>
  );
}
