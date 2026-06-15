"use client";

import { Clipboard, KeyRound, RefreshCw } from "lucide-react";
import { useActionState, useMemo, useState } from "react";
import type { CreateUserState } from "@/app/(admin)/admin/users/new/actions";

type Option = { id: string; name: string; helper?: string };

export function AdminUserCreateForm({
  action,
  roles,
  statuses,
  accessLevels,
  units,
  staff
}: {
  action: (state: CreateUserState, formData: FormData) => Promise<CreateUserState>;
  roles: string[];
  statuses: string[];
  accessLevels: string[];
  units: Option[];
  staff: Option[];
}) {
  const [state, formAction, pending] = useActionState(action, { error: "" });
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [copied, setCopied] = useState(false);

  const credentialText = useMemo(() => `PORTIONS login\nEmail: ${email || "[email]"}\nTemporary password: ${password || "[generate password]"}\nSign in and change this password on first login.`, [email, password]);

  function generatePassword() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
    const required = ["A", "a", "7", "!"];
    const random = new Uint32Array(16);
    window.crypto.getRandomValues(random);
    const generated = [...required, ...Array.from(random).map((value) => chars[value % chars.length])].sort(() => Math.random() - 0.5).join("");
    setPassword(generated);
    setCopied(false);
  }

  async function copyCredentials() {
    await navigator.clipboard.writeText(credentialText);
    setCopied(true);
  }

  return (
    <form action={formAction} className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Name" name="name" value={name} onChange={setName} required />
        <Field label="Email" name="email" value={email} onChange={setEmail} type="email" required />
        <label>
          <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Temporary password</span>
          <div className="mt-2 flex gap-2">
            <input name="password" value={password} onChange={(event) => setPassword(event.target.value)} type="text" required className="focus-ring h-11 min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-navy-950" />
            <button type="button" onClick={generatePassword} className="focus-ring inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Generate
            </button>
          </div>
        </label>
        <Select label="Role" name="role" options={roles} />
        <Select label="Status" name="status" options={statuses} defaultValue="ACTIVE" />
        <Select label="Staff member" name="staffMemberId" options={staff.map((item) => item.id)} labels={Object.fromEntries(staff.map((item) => [item.id, item.name]))} includeNone />
        <Select label="Primary operating unit" name="primaryOperatingUnitId" options={units.map((item) => item.id)} labels={Object.fromEntries(units.map((item) => [item.id, item.name]))} includeNone />
        <Select label="Access level" name="accessLevel" options={accessLevels} defaultValue="OPERATE" />
      </div>

      <div className="mt-5 rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
        <div className="flex items-center gap-2 text-clinical-700">
          <KeyRound className="h-4 w-4" aria-hidden="true" />
          <p className="text-xs font-semibold uppercase tracking-[0.14em]">Additional operating-unit access</p>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {units.map((unit) => (
            <label key={unit.id} className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">
              <input type="checkbox" name="operatingUnitIds" value={unit.id} className="h-4 w-4 rounded border-slate-300" />
              <span>{unit.name}{unit.helper ? <span className="ml-1 text-xs font-medium text-slate-500">{unit.helper}</span> : null}</span>
            </label>
          ))}
          {!units.length ? <p className="rounded-lg bg-amber-50 p-3 text-sm font-semibold text-amber-800 ring-1 ring-amber-100">No operating units are configured yet. You can still create the login account and add access later.</p> : null}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button disabled={pending} className="focus-ring rounded-lg bg-navy-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{pending ? "Creating..." : "Create user"}</button>
        <button type="button" onClick={copyCredentials} disabled={!email || !password} className="focus-ring inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 disabled:opacity-60">
          <Clipboard className="h-3.5 w-3.5" aria-hidden="true" />
          {copied ? "Copied" : "Copy temporary credentials"}
        </button>
      </div>
      {state.error ? <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 ring-1 ring-rose-100">{state.error}</p> : null}
      <p className="mt-3 text-xs leading-5 text-slate-500">New users must change their temporary password on first login.</p>
    </form>
  );
}

function Field({ label, name, value, onChange, type = "text", required = false }: { label: string; name: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return (
    <label>
      <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</span>
      <input name={name} value={value} onChange={(event) => onChange(event.target.value)} type={type} required={required} className="focus-ring mt-2 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-navy-950" />
    </label>
  );
}

function Select({ label, name, options, labels, includeNone = false, defaultValue }: { label: string; name: string; options: string[]; labels?: Record<string, string>; includeNone?: boolean; defaultValue?: string }) {
  return (
    <label>
      <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</span>
      <select name={name} defaultValue={defaultValue} className="focus-ring mt-2 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-navy-950">
        {includeNone ? <option value="">None</option> : null}
        {options.map((option) => <option key={option} value={option}>{labels?.[option] ?? option.replace(/_/g, " ")}</option>)}
      </select>
    </label>
  );
}
