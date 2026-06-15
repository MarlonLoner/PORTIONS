import { SubscriptionStatus, TenantPlan, TenantStatus } from "@prisma/client";
import { requirePlatformUser } from "@/lib/platform-auth";
import { createTenantAction } from "./actions";

export default async function NewTenantPage() {
  await requirePlatformUser();
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-7 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-clinical-700">Tenant onboarding</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-navy-950">Create Pharmacy Tenant</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
        Create the tenant boundary first. Pharmacy owner invitations and tenant user setup should happen inside this boundary, not as global accounts.
      </p>
      <form action={createTenantAction} className="mt-7 grid gap-4 md:grid-cols-2">
        <Field label="Tenant name" name="name" required />
        <Field label="Slug" name="slug" placeholder="avondale-pharmacy-group" />
        <Field label="Legal name" name="legalName" />
        <Field label="Primary contact name" name="primaryContactName" />
        <Field label="Primary contact email" name="primaryContactEmail" type="email" />
        <Field label="Primary contact phone" name="primaryContactPhone" />
        <Field label="Country" name="country" defaultValue="Zimbabwe" />
        <Field label="Timezone" name="timezone" defaultValue="Africa/Harare" />
        <Field label="Currency" name="currency" defaultValue="USD" />
        <Select label="Plan" name="plan" options={Object.values(TenantPlan)} defaultValue={TenantPlan.PILOT} />
        <Select label="Status" name="status" options={Object.values(TenantStatus)} defaultValue={TenantStatus.SETUP} />
        <Select label="Subscription" name="subscriptionStatus" options={Object.values(SubscriptionStatus)} defaultValue={SubscriptionStatus.TRIAL} />
        <label className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-3 text-sm font-semibold text-slate-700 md:col-span-2">
          <input type="checkbox" name="createOnline" defaultChecked className="h-4 w-4" />
          Create Online Department
        </label>
        <div className="md:col-span-2">
          <button className="focus-ring rounded-lg bg-navy-950 px-4 py-3 text-sm font-semibold text-white">Create Tenant Boundary</button>
        </div>
      </form>
    </section>
  );
}

function Field({ label, name, type = "text", required, placeholder, defaultValue }: { label: string; name: string; type?: string; required?: boolean; placeholder?: string; defaultValue?: string }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-slate-700">
      {label}
      <input required={required} name={name} type={type} placeholder={placeholder} defaultValue={defaultValue} className="focus-ring rounded-lg border border-slate-200 px-3 py-3 text-sm text-navy-950" />
    </label>
  );
}

function Select({ label, name, options, defaultValue }: { label: string; name: string; options: string[]; defaultValue: string }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-slate-700">
      {label}
      <select name={name} defaultValue={defaultValue} className="focus-ring rounded-lg border border-slate-200 px-3 py-3 text-sm text-navy-950">
        {options.map((option) => <option key={option} value={option}>{option.replace(/_/g, " ")}</option>)}
      </select>
    </label>
  );
}
