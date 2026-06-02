"use client";

import { Check, Copy, MessageCircle } from "lucide-react";
import { useState } from "react";

export function PatientWhatsAppBox({ message }: { message: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-emerald-600" aria-hidden="true" />
          <p className="text-sm font-semibold text-emerald-950">AI WhatsApp Message Suggestion</p>
        </div>
        <button
          type="button"
          className="focus-ring inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white"
          onClick={async () => {
            await navigator.clipboard?.writeText(message);
            setCopied(true);
          }}
        >
          {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div className="mt-4 rounded-lg bg-white px-4 py-3 text-sm leading-6 text-emerald-950 shadow-sm">
        {message}
      </div>
    </div>
  );
}
