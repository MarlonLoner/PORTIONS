type Feedback = {
  tone: "success" | "error";
  message: string;
};

const onboardingSuccessMessages: Record<string, string> = {
  "review-submitted": "Go-live review submitted. Platform review is now pending.",
  "review-already-submitted": "Go-live review is already submitted. Platform review is still pending.",
  "tenant-already-active": "This pharmacy workspace is already active."
};

const platformSuccessMessages: Record<string, string> = {
  "review-started": "Platform review has started.",
  "review-already-started": "Platform review is already in progress.",
  "changes-requested": "Changes have been requested from the tenant.",
  "changes-already-requested": "This tenant is already waiting on the same requested changes.",
  blocked: "This tenant has been marked as blocked.",
  "tenant-already-blocked": "This tenant is already blocked with the same review note.",
  "go-live-already-approved": "Go-live approval is already recorded for this pharmacy workspace.",
  "go-live-approved": "Go-live has been approved and the pharmacy workspace is now active.",
  "tenant-already-active": "This pharmacy workspace is already active."
};

function getSafeSuccessFeedback(code: string | undefined, catalog: Record<string, string>): Feedback | null {
  if (!code) {
    return null;
  }

  const message = catalog[code.trim()];
  if (!message) {
    return null;
  }

  return {
    tone: "success",
    message
  };
}

export function getOnboardingPageFeedback(searchParams?: { success?: string; error?: string }) {
  return getSafeSuccessFeedback(searchParams?.success, onboardingSuccessMessages);
}

export function getPlatformTenantFeedback(searchParams?: { success?: string; error?: string }) {
  return getSafeSuccessFeedback(searchParams?.success, platformSuccessMessages);
}
