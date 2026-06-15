"use client";

import { Check, Clipboard, ExternalLink } from "lucide-react";
import { useState } from "react";

export function TenantInvitationLinkCard({
  invitationUrl,
  expiresAt,
  onDone
}: {
  invitationUrl: string;
  expiresAt: string;
  onDone?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(invitationUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
      <p className="text-sm font-semibold text-emerald-950">Owner invitation created</p>
      <p className="mt-1 text-sm leading-6 text-emerald-800">
        Email delivery is not configured yet. Copy this secure invitation link and send it manually to the pharmacy Owner.
      </p>
      <p className="mt-2 rounded-lg bg-white/70 px-3 py-2 text-xs font-semibold text-emerald-900 ring-1 ring-emerald-100">
        For security, this link is shown only once. Copy it before leaving or refreshing this page.
      </p>
      <div className="mt-3 break-all rounded-lg bg-white p-3 text-xs font-medium text-slate-700 ring-1 ring-emerald-100">{invitationUrl}</div>
      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.1em] text-emerald-700">Delivery: Manual handoff / Expires {new Date(expiresAt).toLocaleString()}</p>
      <div className="mt-3 flex flex-wrap gap-2">
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
