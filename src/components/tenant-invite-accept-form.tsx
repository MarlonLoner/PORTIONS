"use client";

import { Loader2, ShieldCheck } from "lucide-react";
import { useActionState } from "react";
import type { TenantInviteAcceptState } from "@/app/tenant-invite/[token]/actions";

export function TenantInviteAcceptForm({
  action
}: {
  action: (state: TenantInviteAcceptState, formData: FormData) => Promise<TenantInviteAcceptState>;
}) {
  const [state, formAction, pending] = useActionState(action, { error: "" });

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Create password</span>
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          required
          className="focus-ring mt-2 h-12 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-navy-950"
        />
      </label>
      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Confirm password</span>
        <input
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          className="focus-ring mt-2 h-12 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-navy-950"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="focus-ring inline-flex w-full items-center justify-center gap-2 rounded-lg bg-navy-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-navy-800 disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ShieldCheck className="h-4 w-4" aria-hidden="true" />}
        Activate Owner Account
      </button>
      {state.error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 ring-1 ring-rose-100">{state.error}</p> : null}
    </form>
  );
}
