"use client";

import { Loader2, MessageSquareText } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function PrepareCommunicationButton({
  sourceType,
  sourceId,
  templateType = "GENERAL",
  label = "Prepare message",
  className = "focus-ring inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
}: {
  sourceType: string;
  sourceId: string;
  templateType?: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function prepare() {
    setBusy(true);
    setError("");
    const response = await fetch("/api/communications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceType, sourceId, templateType })
    });
    const result = await response.json().catch(() => ({ error: "Communication could not be prepared." }));
    setBusy(false);
    if (!response.ok) {
      setError(result.error ?? "Communication could not be prepared.");
      return;
    }
    router.push(`/communications/${result.id}`);
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button type="button" disabled={busy} onClick={prepare} className={`${className} disabled:opacity-60`}>
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <MessageSquareText className="h-3.5 w-3.5" aria-hidden="true" />}
        {label}
      </button>
      {error ? <span className="text-xs font-semibold text-rose-700">{error}</span> : null}
    </span>
  );
}
