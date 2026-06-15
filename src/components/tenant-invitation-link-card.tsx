"use client";

import { Check, Clipboard } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export function TenantInvitationLinkCard({ token }: { token: string }) {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const invitationUrl = useMemo(() => {
    if (!origin) return `/tenant-invite/${token}`;
    return `${origin}/tenant-invite/${token}`;
  }, [origin, token]);

  async function copy() {
    await navigator.clipboard.writeText(invitationUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
      <p className="text-sm font-semibold text-emerald-950">Owner invitation link generated</p>
      <p className="mt-1 text-sm leading-6 text-emerald-800">
        Copy this link now. PORTIONS will not show the raw invitation token again after this page is refreshed.
      </p>
      <div className="mt-3 break-all rounded-lg bg-white p-3 text-xs font-medium text-slate-700 ring-1 ring-emerald-100">{invitationUrl}</div>
      <button
        type="button"
        onClick={copy}
        className="focus-ring mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
      >
        {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Clipboard className="h-4 w-4" aria-hidden="true" />}
        {copied ? "Copied" : "Copy Invitation Link"}
      </button>
    </div>
  );
}
