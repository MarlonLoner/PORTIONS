"use client";

import { Loader2, LogIn } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const result = await response.json().catch(() => ({ error: "Login failed." }));
    setBusy(false);
    if (!response.ok) {
      setError(result.error ?? "Login failed.");
      return;
    }
    router.push(searchParams.get("next") || "/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Email</span>
        <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" className="focus-ring mt-2 h-12 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-navy-950" />
      </label>
      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Password</span>
        <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" className="focus-ring mt-2 h-12 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-navy-950" />
      </label>
      <button type="submit" disabled={busy} className="focus-ring inline-flex w-full items-center justify-center gap-2 rounded-lg bg-navy-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-navy-800 disabled:opacity-60">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <LogIn className="h-4 w-4" aria-hidden="true" />}
        Sign in
      </button>
      {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 ring-1 ring-rose-100">{error}</p> : null}
    </form>
  );
}
