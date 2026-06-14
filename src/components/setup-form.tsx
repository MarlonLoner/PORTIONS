"use client";

import { Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";

export function SetupForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        setupKey: form.get("setupKey"),
        name: form.get("name"),
        email: form.get("email"),
        password: form.get("password"),
        confirmPassword: form.get("confirmPassword"),
        role: form.get("role")
      })
    });
    const result = await response.json().catch(() => ({ error: "Setup could not be completed." }));
    setBusy(false);
    if (!response.ok) {
      setError(result.error ?? "Setup could not be completed.");
      return;
    }
    window.location.href = result.redirectTo ?? "/admin/users";
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Setup key" name="setupKey" type="password" required />
        <Select label="Initial role" name="role" options={["OWNER", "SYSTEM_ADMIN"]} />
        <Field label="Full name" name="name" required />
        <Field label="Email" name="email" type="email" required />
        <Field label="Password" name="password" type="password" required />
        <Field label="Confirm password" name="confirmPassword" type="password" required />
      </div>
      <button type="submit" disabled={busy} className="focus-ring mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-navy-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-navy-800 disabled:opacity-60">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ShieldCheck className="h-4 w-4" aria-hidden="true" />}
        Initialize PORTIONS
      </button>
      {error ? <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 ring-1 ring-rose-100">{error}</p> : null}
      <p className="mt-4 text-xs leading-5 text-slate-500">Use a 12+ character password with uppercase, lowercase, number, and special character.</p>
    </form>
  );
}

function Field({ label, name, type = "text", required = false }: { label: string; name: string; type?: string; required?: boolean }) {
  return (
    <label>
      <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</span>
      <input name={name} type={type} required={required} className="focus-ring mt-2 h-12 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-navy-950" />
    </label>
  );
}

function Select({ label, name, options }: { label: string; name: string; options: string[] }) {
  return (
    <label>
      <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</span>
      <select name={name} className="focus-ring mt-2 h-12 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-navy-950">
        {options.map((option) => <option key={option} value={option}>{option.replace(/_/g, " ")}</option>)}
      </select>
    </label>
  );
}
