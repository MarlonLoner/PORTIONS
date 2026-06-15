"use client";

import { Loader2, Send } from "lucide-react";
import { useActionState } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OwnerInvitationState } from "@/app/platform/tenants/[id]/actions";
import { TenantInvitationLinkCard } from "@/components/tenant-invitation-link-card";

type PendingOwnerInvitation = {
  id: string;
  name: string;
  email: string;
  expiresAt: Date;
};

export function TenantOwnerInvitationForm({
  action,
  revokeAction,
  pendingInvitation,
  emailConfigured
}: {
  action: (state: OwnerInvitationState, formData: FormData) => Promise<OwnerInvitationState>;
  revokeAction: (formData: FormData) => Promise<void>;
  pendingInvitation?: PendingOwnerInvitation | null;
  emailConfigured: boolean;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(action, { ok: false, error: "" });
  const [dismissedInvitationId, setDismissedInvitationId] = useState("");
  const showOneTimeLink = state.ok && dismissedInvitationId !== state.invitationId;
  const hasBlockingPending = Boolean(pendingInvitation) && !showOneTimeLink;

  return (
    <div className="grid gap-4">
      {showOneTimeLink ? (
        <TenantInvitationLinkCard
          invitationUrl={state.invitationUrl}
          expiresAt={state.expiresAt}
          deliveryMode={state.deliveryMode}
          deliveryStatus={state.deliveryStatus}
          recipientEmail={state.recipientEmail}
          providerMessageId={state.providerMessageId}
          deliveryError={state.deliveryError}
          onDone={() => {
            setDismissedInvitationId(state.invitationId);
            router.refresh();
          }}
        />
      ) : null}
      {hasBlockingPending && pendingInvitation ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-950">Owner invitation pending</p>
          <p className="mt-2 text-lg font-semibold text-navy-950">{pendingInvitation.name}</p>
          <p className="mt-1 text-sm text-amber-800">{pendingInvitation.email} / status PENDING / expires {pendingInvitation.expiresAt.toLocaleString()}</p>
          <p className="mt-3 rounded-lg bg-white/70 px-3 py-2 text-sm font-semibold text-amber-900 ring-1 ring-amber-100">
            Delivery: Manual handoff. The one-time link was only available when this invitation was created.
          </p>
          <p className="mt-2 text-sm leading-6 text-amber-800">
            If the original link was not copied, revoke this invitation and create a replacement. PORTIONS cannot reconstruct the old token from its stored hash.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <form action={revokeAction}>
              <input type="hidden" name="invitationId" value={pendingInvitation.id} />
              <button className="focus-ring rounded-lg bg-white px-3 py-2 text-xs font-semibold text-rose-700 ring-1 ring-rose-100">Revoke Invitation</button>
            </form>
            <button disabled className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-500 ring-1 ring-slate-100">
              {emailConfigured ? "Create replacement to send email" : "Email delivery not configured"}
            </button>
            <button disabled className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-500 ring-1 ring-slate-100">Create replacement after revoke</button>
          </div>
        </div>
      ) : null}
      <form action={formAction} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-navy-950">Create First Owner / Send Owner Invitation</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Generate a one-use invite link for the pharmacy owner. Use manual handoff now, or email delivery when a provider is configured.
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
          <fieldset className="rounded-lg border border-slate-200 bg-white p-3">
            <legend className="px-1 text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Delivery method</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-900">
                <input type="radio" name="deliveryMethod" value="MANUAL" defaultChecked className="mt-1" />
                <span><span className="font-semibold">Copy secure link</span><br />Show the one-time setup URL immediately.</span>
              </label>
              <label className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${emailConfigured ? "cursor-pointer border-slate-200 bg-white text-slate-700" : "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400"}`}>
                <input type="radio" name="deliveryMethod" value="EMAIL" disabled={!emailConfigured} className="mt-1" />
                <span><span className="font-semibold">Send by email</span><br />{emailConfigured ? "Use configured email provider." : "Email delivery is not configured. Use Copy secure link."}</span>
              </label>
            </div>
          </fieldset>
          <button
            disabled={pending || hasBlockingPending}
            className="focus-ring inline-flex items-center justify-center gap-2 rounded-lg bg-navy-950 px-4 py-3 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-60"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
            Create Owner Invitation
          </button>
          {hasBlockingPending ? <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 ring-1 ring-amber-100">Revoke the current pending invitation before creating a replacement.</p> : null}
          {!state.ok && state.error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 ring-1 ring-rose-100">{state.error}</p> : null}
        </div>
      </form>
    </div>
  );
}
