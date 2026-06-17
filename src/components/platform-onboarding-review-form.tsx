"use client";

import { Loader2 } from "lucide-react";
import { useActionState } from "react";
import type { PlatformOnboardingReviewState } from "@/app/platform/tenants/[id]/actions";

export function PlatformOnboardingReviewForm({
  action,
  defaultNotes
}: {
  action: (state: PlatformOnboardingReviewState, formData: FormData) => Promise<PlatformOnboardingReviewState>;
  defaultNotes: string;
}) {
  const [state, formAction, pending] = useActionState(action, { error: "" });

  return (
    <form action={formAction} className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5">
      <label className="grid gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Review notes</span>
        <textarea
          name="reviewNotes"
          defaultValue={defaultNotes}
          rows={5}
          className="focus-ring w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-navy-950"
          placeholder="Add platform review notes, missing evidence, or go-live conditions."
        />
      </label>
      <div className="grid gap-2 sm:grid-cols-2">
        <button
          disabled={pending}
          name="decision"
          value="UNDER_REVIEW"
          className="focus-ring rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-60"
        >
          {pending ? <PendingLabel label="Starting review" /> : "Start review"}
        </button>
        <button
          disabled={pending}
          name="decision"
          value="REQUEST_CHANGES"
          className="focus-ring rounded-lg bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-800 disabled:opacity-60"
        >
          {pending ? <PendingLabel label="Requesting changes" /> : "Request changes"}
        </button>
        <button
          disabled={pending}
          name="decision"
          value="APPROVE"
          className="focus-ring rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? <PendingLabel label="Approving go-live" /> : "Approve go-live"}
        </button>
        <button
          disabled={pending}
          name="decision"
          value="BLOCK"
          className="focus-ring rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? <PendingLabel label="Marking blocked" /> : "Mark blocked"}
        </button>
      </div>
      {state.error ? (
        <p className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-900">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

function PendingLabel({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center justify-center gap-2">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      {label}...
    </span>
  );
}
