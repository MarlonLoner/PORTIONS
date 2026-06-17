"use client";

import { ArrowUpRight, Loader2 } from "lucide-react";
import { useActionState } from "react";
import type { SubmitGoLiveReviewState } from "@/app/(admin)/onboarding/actions";

export function TenantOnboardingSubmitForm({
  action
}: {
  action: (state: SubmitGoLiveReviewState, formData: FormData) => Promise<SubmitGoLiveReviewState>;
}) {
  const [state, formAction, pending] = useActionState(action, { error: "" });

  return (
    <form action={formAction} className="mt-5 space-y-3">
      <button
        disabled={pending}
        className="focus-ring inline-flex items-center gap-2 rounded-lg bg-navy-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ArrowUpRight className="h-4 w-4" aria-hidden="true" />}
        {pending ? "Submitting for review..." : "Submit for go-live review"}
      </button>
      {state.error ? (
        <p className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-900">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
