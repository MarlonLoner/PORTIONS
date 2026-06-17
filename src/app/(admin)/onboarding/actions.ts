"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { submitTenantForReview } from "@/lib/onboarding";

export type SubmitGoLiveReviewState = {
  error: string;
};

function getSubmissionRedirect(outcome: "submitted" | "already_submitted" | "already_active") {
  if (outcome === "already_submitted") {
    return "/onboarding?success=review-already-submitted";
  }

  if (outcome === "already_active") {
    return "/onboarding?success=tenant-already-active";
  }

  return "/onboarding?success=review-submitted";
}

export async function submitGoLiveReviewAction(
  _state: SubmitGoLiveReviewState,
  _formData: FormData
): Promise<SubmitGoLiveReviewState> {
  let destination = "/onboarding";

  try {
    const result = await submitTenantForReview();
    revalidatePath("/dashboard");
    revalidatePath("/onboarding");
    revalidatePath("/platform/tenants");
    revalidatePath(`/platform/tenants/${result.summary.tenant.id}`);
    destination = getSubmissionRedirect(result.outcome);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Go-live review could not be submitted."
    };
  }

  redirect(destination);
}
