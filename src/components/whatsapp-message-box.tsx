"use client";

import { Copy, MessageCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { generateBriefMessage } from "@/lib/ai-brief";

const templates = {
  refill: {
    label: "Refill reminder",
    message: generateBriefMessage("refill")
  },
  overdue: {
    label: "Overdue refill",
    message: generateBriefMessage("overdue")
  },
  payment: {
    label: "Payment reminder",
    message: generateBriefMessage("payment")
  },
  delivery: {
    label: "Delivery confirmation",
    message: generateBriefMessage("delivery")
  },
  prescription: {
    label: "Prescription renewal",
    message: generateBriefMessage("prescription")
  },
  revival: {
    label: "Lost patient revival",
    message: generateBriefMessage("revival")
  },
  branch: {
    label: "Branch manager instruction",
    message: generateBriefMessage("branch")
  },
  transfer: {
    label: "Stock transfer instruction",
    message: generateBriefMessage("transfer")
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
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
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
