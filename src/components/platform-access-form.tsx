"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PlatformAccessForm({ mode }: { mode: "setup" | "login" }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(formData: FormData) {
    setLoading(true);
    setError("");
    const endpoint = mode === "setup" ? "/api/platform/setup" : "/api/platform/login";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(formData.entries()))
    });
    const body = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok) {
      setError(body.error ?? "Request could not be completed.");
      return;
    }
    router.push(body.redirectTo ?? "/platform");
    router.refresh();
  }

  return (
    <form action={submit} className="mt-8 grid gap-4">
      {mode === "setup" ? (
        <>
          <Field label="Platform setup key" name="setupKey" type="password" />
          <Field label="Owner name" name="name" />
        </>
      ) : null}
      <Field label="Email" name="email" type="email" />
      <Field label="Password" name="password" type="password" />
      {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div> : null}
      <button disabled={loading} className="focus-ring rounded-lg bg-navy-950 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
        {loading ? "Please wait..." : mode === "setup" ? "Create Platform Owner" : "Enter Platform"}
      </button>
    </form>
  );
}

function Field({ label, name, type = "text" }: { label: string; name: string; type?: string }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-slate-700">
      {label}
      <input
        required
        name={name}
        type={type}
        className="focus-ring rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-navy-950"
      />
    </label>
  );
}
