"use client";

import { Loader2, Send } from "lucide-react";
import { useActionState } from "react";
import type { OwnerInvitationState } from "@/app/platform/tenants/[id]/actions";
import { TenantInvitationLinkCard } from "@/components/tenant-invitation-link-card";

export function TenantOwnerInvitationForm({
  action
}: {
  action: (state: OwnerInvitationState, formData: FormData) => Promise<OwnerInvitationState>;
}) {
  const [state, formAction, pending] = useActionState(action, { error: "", token: "" });

  return (
    <div className="grid gap-4">
      {state.token ? <TenantInvitationLinkCard token={state.token} /> : null}
      <form action={formAction} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-navy-950">Create First Owner / Send Owner Invitation</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Generate a one-use invite link for the pharmacy owner. The raw token is shown once and no password is created by the platform.
        </p>
        <div className="mt-4 grid gap-3">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Owner name</span>
            <input name="name" required className="focus-ring mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy-950" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Owner email</span>
            <input name="email" type="email" required className="focus-ring mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy-950" />
          </label>
          <button
            disabled={pending}
            className="focus-ring inline-flex items-center justify-center gap-2 rounded-lg bg-navy-950 px-4 py-3 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-60"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
            Create Owner Invitation
          </button>
          {state.error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 ring-1 ring-rose-100">{state.error}</p> : null}
        </div>
      </form>
    </div>
  );
}
