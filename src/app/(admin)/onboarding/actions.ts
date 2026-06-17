"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { submitTenantForReview } from "@/lib/onboarding";

function toMessagePath(type: "success" | "error", message: string) {
  return `/onboarding?${type}=${encodeURIComponent(message)}`;
}

export async function submitGoLiveReviewAction() {
  try {
    await submitTenantForReview();
    revalidatePath("/dashboard");
    revalidatePath("/onboarding");
    redirect(toMessagePath("success", "Go-live review submitted. Platform review is now pending."));
  } catch (error) {
    redirect(toMessagePath("error", error instanceof Error ? error.message : "Go-live review could not be submitted."));
  }
}
