"use client";

import { Copy, MessageCircle } from "lucide-react";
import { useMemo, useState } from "react";

const templates = {
  refill: {
    label: "Refill reminder",
    message: "Hi Memory, this is PORTIONS. Your chronic refill is due soon. Would you like us to prepare your medicines for collection or delivery today?"
  },
  overdue: {
    label: "Overdue refill",
    message: "Hi Memory, we noticed your refill is overdue. Your treatment routine matters, so we can reserve your medicines and arrange a quick collection or delivery."
  },
  payment: {
    label: "Payment reminder",
    message: "Hi Memory, your PORTIONS order is ready and payment is still pending. Please confirm once paid so the pharmacy team can dispatch immediately."
  },
  delivery: {
    label: "Delivery confirmation",
    message: "Hi Memory, your PORTIONS order is packed. Please confirm your delivery address and preferred time window for today."
  },
  prescription: {
    label: "Prescription renewal",
    message: "Hi Memory, your prescription renewal is due. Please send a current script or let us know if you need pharmacist guidance before your next refill."
  },
  revival: {
    label: "Lost patient revival",
    message: "Hi Memory, we have not seen your refill for a while and wanted to check in. Are you still taking the same medication, or can PORTIONS help restart your care plan?"
  }
};

export function WhatsAppMessageBox() {
  const [type, setType] = useState<keyof typeof templates>("refill");
  const selected = useMemo(() => templates[type], [type]);
  const [copied, setCopied] = useState(false);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
      <div className="flex items-center gap-2">
        <MessageCircle className="h-5 w-5 text-emerald-600" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-navy-950">Message Generator</h2>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {Object.entries(templates).map(([key, template]) => (
          <button
            key={key}
            type="button"
            className={type === key ? "focus-ring rounded-lg bg-navy-950 px-3 py-2 text-sm font-semibold text-white" : "focus-ring rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-clinical-50"}
            onClick={() => {
              setType(key as keyof typeof templates);
              setCopied(false);
            }}
          >
            {template.label}
          </button>
        ))}
      </div>
      <div className="mt-5 rounded-lg border border-emerald-100 bg-emerald-50 p-4">
        <p className="text-sm leading-6 text-emerald-950">{selected.message}</p>
      </div>
      <button
        type="button"
        className="focus-ring mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
        onClick={async () => {
          await navigator.clipboard?.writeText(selected.message);
          setCopied(true);
        }}
      >
        <Copy className="h-4 w-4" aria-hidden="true" />
        {copied ? "Copied" : "Copy message"}
      </button>
    </section>
  );
}
