"use client";

import { Check, Clipboard, ExternalLink } from "lucide-react";
import { useState } from "react";

export function TenantInvitationLinkCard({
  invitationUrl,
  expiresAt,
  deliveryMode,
  deliveryStatus,
  recipientEmail,
  providerMessageId,
  deliveryError,
  onDone
}: {
  invitationUrl: string;
  expiresAt: string;
  deliveryMode: "MANUAL" | "EMAIL";
  deliveryStatus: "CREATED" | "SENT" | "FAILED" | "NOT_CONFIGURED";
  recipientEmail: string;
  providerMessageId?: string;
  deliveryError?: string;
  onDone?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(invitationUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  }

  const emailSent = deliveryMode === "EMAIL" && deliveryStatus === "SENT";
  const emailFailed = deliveryMode === "EMAIL" && deliveryStatus !== "SENT";

  return (
    <div className={`rounded-xl border p-4 ${emailFailed ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}>
      <p className={`text-sm font-semibold ${emailFailed ? "text-amber-950" : "text-emerald-950"}`}>
        {emailSent ? "Invitation email sent" : emailFailed ? "Invitation created, but email delivery failed" : "Owner invitation created"}
      </p>
      <p className={`mt-1 text-sm leading-6 ${emailFailed ? "text-amber-800" : "text-emerald-800"}`}>
        {emailSent
          ? `The invitation email was accepted by the provider for ${recipientEmail}.`
          : emailFailed
            ? `${deliveryError ?? "Email delivery failed."} Copy the secure link below and send it manually.`
            : "Copy this secure link now. It will not be available after you leave or refresh this page."}
      </p>
      {emailSent ? (
        <div className="mt-3 grid gap-2 rounded-lg bg-white/70 p-3 text-xs font-semibold text-emerald-900 ring-1 ring-emerald-100">
          <p>Recipient: {recipientEmail}</p>
          <p>Sent: {new Date().toLocaleString()}</p>
          <p>Expires: {new Date(expiresAt).toLocaleString()}</p>
          <p>Provider state: SENT{providerMessageId ? ` / ${providerMessageId}` : ""}</p>
        </div>
      ) : (
        <>
          <p className={`mt-2 rounded-lg bg-white/70 px-3 py-2 text-xs font-semibold ring-1 ${emailFailed ? "text-amber-900 ring-amber-100" : "text-emerald-900 ring-emerald-100"}`}>
            For security, this link is shown only once. Copy it before leaving or refreshing this page.
          </p>
          <div className={`mt-3 break-all rounded-lg bg-white p-3 text-xs font-medium text-slate-700 ring-1 ${emailFailed ? "ring-amber-100" : "ring-emerald-100"}`}>{invitationUrl}</div>
        </>
      )}
      <p className={`mt-2 text-xs font-semibold uppercase tracking-[0.1em] ${emailFailed ? "text-amber-700" : "text-emerald-700"}`}>
        Delivery: {deliveryMode === "EMAIL" ? deliveryStatus : "Manual handoff"} / Expires {new Date(expiresAt).toLocaleString()}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {!emailSent ? (
          <>
            <button
              type="button"
              onClick={copy}
              className="focus-ring inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
            >
              {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Clipboard className="h-4 w-4" aria-hidden="true" />}
              {copied ? "Copied" : "Copy Invitation Link"}
            </button>
            <a
              href={invitationUrl}
              target="_blank"
              rel="noreferrer"
              className="focus-ring inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-100 hover:bg-emerald-50"
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              Open Invitation Link
            </a>
          </>
        ) : null}
        {onDone ? (
          <button
            type="button"
            onClick={onDone}
            className="focus-ring rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
          >
            Done
          </button>
        ) : null}
      </div>
    </div>
  );
}
