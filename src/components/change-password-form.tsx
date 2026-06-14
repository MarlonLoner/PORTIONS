"use client";

import { KeyRound, Loader2 } from "lucide-react";
import { useState } from "react";

export function ChangePasswordForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/account/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: form.get("currentPassword"),
        password: form.get("password"),
        confirmPassword: form.get("confirmPassword")
      })
    });
    const result = await response.json().catch(() => ({ error: "Password could not be changed." }));
    setBusy(false);
    if (!response.ok) {
      setError(result.error ?? "Password could not be changed.");
      return;
    }
    window.location.href = "/dashboard";
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
      <div className="grid gap-4">
        <Field label="Current temporary password" name="currentPassword" type="password" />
        <Field label="New password" name="password" type="password" />
        <Field label="Confirm new password" name="confirmPassword" type="password" />
      </div>
      <button type="submit" disabled={busy} className="focus-ring mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-navy-950 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <KeyRound className="h-4 w-4" aria-hidden="true" />}
        Change password
      </button>
      {error ? <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 ring-1 ring-rose-100">{error}</p> : null}
      <p className="mt-4 text-xs leading-5 text-slate-500">New passwords must be 12+ characters and include uppercase, lowercase, number, and special character.</p>
    </form>
  );
}

function Field({ label, name, type }: { label: string; name: string; type: string }) {
  return (
    <label>
      <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</span>
      <input name={name} type={type} required className="focus-ring mt-2 h-12 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-navy-950" />
    </label>
  );
}
