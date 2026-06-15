import "server-only";

export type InvitationDeliveryResult = {
  mode: "MANUAL" | "EMAIL";
  status: "CREATED" | "SENT" | "FAILED";
  providerMessageId?: string;
  error?: string;
};

export type ManualInvitationDeliveryResult = {
  mode: "MANUAL";
  status: "CREATED";
};

export function createManualInvitationDelivery(): ManualInvitationDeliveryResult {
  return {
    mode: "MANUAL",
    status: "CREATED"
  };
}

/*
 * Future email providers such as Resend or Postmark should plug in here.
 * That implementation should return mode EMAIL with SENT only after the
 * provider confirms delivery acceptance. Never pass raw tokens to audit logs.
 */
