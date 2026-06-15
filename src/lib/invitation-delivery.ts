import "server-only";

export type InvitationDeliveryMode = "MANUAL" | "EMAIL";
export type InvitationDeliveryStatus = "CREATED" | "SENT" | "FAILED" | "NOT_CONFIGURED";

export type InvitationDeliveryRequest = {
  recipientName: string;
  recipientEmail: string;
  tenantName: string;
  invitationUrl: string;
  expiresAt: Date;
};

export type InvitationDeliveryResult = {
  ok: boolean;
  mode: InvitationDeliveryMode;
  status: InvitationDeliveryStatus;
  providerMessageId?: string;
  error?: string;
};

export function createManualInvitationDelivery(): InvitationDeliveryResult {
  return {
    ok: true,
    mode: "MANUAL",
    status: "CREATED"
  };
}

export function isInvitationEmailConfigured() {
  return getInvitationEmailProvider() === "resend" && Boolean(process.env.RESEND_API_KEY && process.env.INVITATION_EMAIL_FROM);
}

export async function sendInvitationEmail(request: InvitationDeliveryRequest): Promise<InvitationDeliveryResult> {
  if (!isInvitationEmailConfigured()) {
    return {
      ok: false,
      mode: "EMAIL",
      status: "NOT_CONFIGURED",
      error: "Email delivery is not configured. Use Copy secure link."
    };
  }

  if (getInvitationEmailProvider() !== "resend") {
    return {
      ok: false,
      mode: "EMAIL",
      status: "NOT_CONFIGURED",
      error: "Configured invitation email provider is not supported yet."
    };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: process.env.INVITATION_EMAIL_FROM,
        to: request.recipientEmail,
        subject: `Set up PORTIONS access for ${request.tenantName}`,
        html: buildInvitationEmailHtml(request),
        text: buildInvitationEmailText(request)
      })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        mode: "EMAIL",
        status: "FAILED",
        error: typeof payload?.message === "string" ? payload.message : "Email provider rejected the invitation email."
      };
    }
    return {
      ok: true,
      mode: "EMAIL",
      status: "SENT",
      providerMessageId: typeof payload?.id === "string" ? payload.id : undefined
    };
  } catch {
    return {
      ok: false,
      mode: "EMAIL",
      status: "FAILED",
      error: "Email provider could not be reached."
    };
  }
}

function getInvitationEmailProvider() {
  return (process.env.INVITATION_EMAIL_PROVIDER ?? "").trim().toLowerCase();
}

function buildInvitationEmailHtml(request: InvitationDeliveryRequest) {
  const expiry = request.expiresAt.toLocaleString("en-ZW", { timeZone: "Africa/Harare" });
  return `
    <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6; max-width: 640px;">
      <p style="font-size: 12px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: #0369a1;">PORTIONS Pharmacy Command OS</p>
      <h1 style="font-size: 28px; margin: 8px 0 12px;">Set up pharmacy access</h1>
      <p>Hi ${escapeHtml(request.recipientName)},</p>
      <p>You have been invited to activate the first Owner account for <strong>${escapeHtml(request.tenantName)}</strong>.</p>
      <p>
        <a href="${request.invitationUrl}" style="display: inline-block; background: #071527; color: #ffffff; padding: 12px 18px; border-radius: 8px; text-decoration: none; font-weight: 700;">
          Set up pharmacy access
        </a>
      </p>
      <p>This link is single-use and expires on <strong>${expiry}</strong>.</p>
      <p>If the button does not work, paste this URL into your browser:</p>
      <p style="word-break: break-all; font-size: 13px; background: #f8fafc; padding: 12px; border-radius: 8px;">${request.invitationUrl}</p>
      <p style="font-size: 13px; color: #475569;">Security note: PORTIONS will never send you a password. You will create your own password during setup.</p>
      <p style="font-size: 13px; color: #475569;">Need help? Contact the PORTIONS support team.</p>
    </div>
  `;
}

function buildInvitationEmailText(request: InvitationDeliveryRequest) {
  const expiry = request.expiresAt.toLocaleString("en-ZW", { timeZone: "Africa/Harare" });
  return [
    "PORTIONS Pharmacy Command OS",
    "",
    `Hi ${request.recipientName},`,
    "",
    `You have been invited to activate the first Owner account for ${request.tenantName}.`,
    `Set up pharmacy access: ${request.invitationUrl}`,
    "",
    `This link is single-use and expires on ${expiry}.`,
    "PORTIONS will never send you a password. You will create your own password during setup.",
    "",
    "Need help? Contact the PORTIONS support team."
  ].join("\n");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
