"use client";

import { CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { dateInputValue, enumLabel } from "@/lib/format";

const outcomes = [
  "NO_RESPONSE",
  "RESPONSE_RECEIVED",
  "REFILL_CONFIRMED",
  "DELIVERY_CONFIRMED",
  "COLLECTION_CONFIRMED",
  "PAYMENT_PROMISED",
  "PAYMENT_RECEIVED",
  "EVENT_ATTENDANCE_CONFIRMED",
  "LEAD_CAPTURED",
  "ISSUE_RESOLVED",
  "CALLBACK_REQUIRED",
  "OTHER"
];

export function CommunicationDetailActions({
  communication,
  staff,
  recommendedSender,
  recommendationReason,
  whatsappUrl
}: {
  communication: {
    id: string;
    status: string;
    message: string;
    recipientPhone: string | null;
    assignedStaffId: string | null;
    branchId: string | null;
    outcomeType: string | null;
    outcomeNotes: string | null;
    responseText: string | null;
    followUpRequired: boolean;
    followUpDate: string | null;
    followUpTaskId: string | null;
    orderId: string | null;
  };
  staff: Array<{ id: string; name: string; role: string; branchId: string | null }>;
  recommendedSender: { id: string; name: string } | null;
  recommendationReason: string;
  whatsappUrl: string;
}) {
  const router = useRouter();
  const compatibleStaff = communication.branchId ? staff.filter((member) => member.branchId === communication.branchId) : staff;
  const [busy, setBusy] = useState("");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    message: communication.message,
    recipientPhone: communication.recipientPhone ?? "",
    assignedStaffId: communication.assignedStaffId ?? "",
    responseText: communication.responseText ?? "",
    outcomeType: communication.outcomeType ?? "RESPONSE_RECEIVED",
    outcomeNotes: communication.outcomeNotes ?? "",
    followUpRequired: communication.followUpRequired,
    followUpDate: communication.followUpDate ? dateInputValue(communication.followUpDate) : ""
  });

  async function submit(payload: Record<string, unknown>, successMessage: string, openWhatsapp = false) {
    setBusy(String(payload.action ?? "save"));
    setFeedback("");
    setError("");
    const response = await fetch(`/api/communications/${communication.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({ error: "Communication update failed." }));
    setBusy("");
    if (!response.ok) {
      setError(result.error ?? "Communication update failed.");
      return;
    }
    setFeedback(successMessage);
    if (openWhatsapp && result.whatsappUrl) window.open(result.whatsappUrl, "_blank", "noopener,noreferrer");
    router.refresh();
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clinical-700">Delivery controls</p>
      <h2 className="mt-2 text-xl font-semibold tracking-tight text-navy-950">Message, Sender, Response And Outcome</h2>

      <div className="mt-5 rounded-lg bg-clinical-50 p-4 ring-1 ring-clinical-100">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-clinical-700">Recommended sender</p>
            <p className="mt-1 text-sm font-semibold text-navy-950">{recommendedSender ? `Recommended: ${recommendedSender.name}` : "No compatible sender configured"}</p>
            <p className="mt-1 text-xs leading-5 text-slate-600">{recommendationReason}</p>
          </div>
          {recommendedSender ? (
            <button
              type="button"
              disabled={Boolean(busy) || form.assignedStaffId === recommendedSender.id}
              onClick={() => {
                setForm((current) => ({ ...current, assignedStaffId: recommendedSender.id }));
                submit({ assignedStaffId: recommendedSender.id }, `Assigned recommended sender: ${recommendedSender.name}.`);
              }}
              className="focus-ring rounded-lg bg-navy-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-navy-800 disabled:opacity-50"
            >
              Assign recommended
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <label>
          <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Recipient phone</span>
          <input value={form.recipientPhone} onChange={(event) => setForm((current) => ({ ...current, recipientPhone: event.target.value }))} className="focus-ring mt-2 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-navy-950" />
        </label>
        <label>
          <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Assigned sender</span>
          <select value={form.assignedStaffId} onChange={(event) => setForm((current) => ({ ...current, assignedStaffId: event.target.value }))} className="focus-ring mt-2 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-navy-950">
            <option value="">Unassigned</option>
            {compatibleStaff.map((member) => <option key={member.id} value={member.id}>{member.name} - {member.role}</option>)}
          </select>
        </label>
      </div>

      <label className="mt-4 block">
        <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Message</span>
        <textarea value={form.message} onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))} rows={5} className="focus-ring mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm leading-6 text-navy-950" />
      </label>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" disabled={Boolean(busy)} onClick={() => submit({ message: form.message, recipientPhone: form.recipientPhone, assignedStaffId: form.assignedStaffId }, "Communication details saved.")} className="focus-ring inline-flex items-center gap-2 rounded-lg bg-navy-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
          Save changes
        </button>
        <button type="button" disabled={Boolean(busy) || !whatsappUrl} onClick={() => submit({ action: "open_whatsapp" }, "WhatsApp opened. Confirm sent manually after delivery.", true)} className="focus-ring inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 disabled:opacity-60">
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
          Open WhatsApp
        </button>
        <Button busy={busy === "mark_sent"} label="Mark sent" onClick={() => submit({ action: "mark_sent" }, "Manual delivery marked sent.")} />
        <Button busy={busy === "mark_failed"} label="Mark failed" onClick={() => submit({ action: "mark_failed", outcomeNotes: form.outcomeNotes }, "Communication marked failed.")} />
      </div>

      <div className="mt-6 rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
        <p className="font-semibold text-navy-950">Record response or outcome</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label>
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Outcome</span>
            <select value={form.outcomeType} onChange={(event) => setForm((current) => ({ ...current, outcomeType: event.target.value }))} className="focus-ring mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy-950">
              {outcomes.map((outcome) => <option key={outcome} value={outcome}>{enumLabel(outcome)}</option>)}
            </select>
          </label>
          <label>
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Follow-up date</span>
            <input type="date" value={form.followUpDate} onChange={(event) => setForm((current) => ({ ...current, followUpDate: event.target.value }))} className="focus-ring mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy-950" />
          </label>
        </div>
        <label className="mt-4 block">
          <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Response text</span>
          <textarea value={form.responseText} onChange={(event) => setForm((current) => ({ ...current, responseText: event.target.value }))} rows={3} className="focus-ring mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-navy-950" />
        </label>
        <label className="mt-4 block">
          <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Outcome notes</span>
          <textarea value={form.outcomeNotes} onChange={(event) => setForm((current) => ({ ...current, outcomeNotes: event.target.value }))} rows={3} className="focus-ring mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-navy-950" />
        </label>
        <label className="mt-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <input type="checkbox" checked={form.followUpRequired} onChange={(event) => setForm((current) => ({ ...current, followUpRequired: event.target.checked }))} className="h-4 w-4 rounded border-slate-300 text-navy-950" />
          Follow-up required
        </label>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button busy={busy === "record_response"} label="Record response" onClick={() => submit({ action: "record_response", responseText: form.responseText, outcomeType: form.outcomeType, outcomeNotes: form.outcomeNotes, followUpRequired: form.followUpRequired, followUpDate: form.followUpDate }, "Response and outcome recorded.")} />
          <Button busy={busy === "complete"} label="Complete communication" onClick={() => submit({ action: "complete" }, "Communication completed.")} />
          <Button busy={busy === "cancel"} label="Cancel" onClick={() => submit({ action: "cancel" }, "Communication cancelled.")} />
          {communication.followUpTaskId ? <Button busy={busy === "complete_follow_up"} label="Complete linked follow-up" onClick={() => submit({ action: "complete_follow_up" }, "Linked follow-up task completed.")} /> : null}
          {communication.orderId && form.outcomeType === "PAYMENT_RECEIVED" ? <Button busy={busy === "order_payment_received"} label="Mark linked order paid" onClick={() => submit({ action: "order_payment_received" }, "Linked order marked paid.")} /> : null}
        </div>
      </div>
      {feedback ? <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-100">{feedback}</p> : null}
      {error ? <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 ring-1 ring-rose-100">{error}</p> : null}
    </section>
  );
}

function Button({ label, busy, onClick }: { label: string; busy: boolean; onClick: () => void }) {
  return (
    <button type="button" disabled={busy} onClick={onClick} className="focus-ring inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:opacity-60">
      {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
      {label}
    </button>
  );
}
