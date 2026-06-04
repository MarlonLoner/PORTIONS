"use client";

import { CheckCircle2, ClipboardCopy, Loader2, MessageSquare, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import {
  getPilotRequestFollowUpMessage,
  getPilotRequestNextAction,
  getPilotRequestPriority,
  getPilotRequestStatusSummary,
  getPilotRequestUrgencyTone,
  isPilotRequestStatus,
  pilotRequestPriorityClasses,
  pilotRequestStatusClasses,
  pilotRequestStatusLabels,
  pilotRequestStatuses,
  type PilotRequestPriority,
  type PilotRequestStatusValue
} from "@/lib/pilot-requests";
import { formatDate } from "@/lib/format";

export type PilotRequestCrmRecord = {
  id: string;
  pharmacyName: string;
  contactName: string;
  whatsappNumber: string;
  email: string | null;
  branchCount: number;
  currentSystem: string;
  mainPain: string;
  urgency: string;
  notes: string | null;
  internalNotes: string | null;
  nextAction: string | null;
  status: PilotRequestStatusValue;
  createdAt: string;
  updatedAt: string;
};

const priorityOptions: Array<PilotRequestPriority | "ALL"> = ["ALL", "High", "Medium", "Standard"];

export function PilotRequestsCrm({ initialRequests }: { initialRequests: PilotRequestCrmRecord[] }) {
  const [requests, setRequests] = useState(initialRequests);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [urgencyFilter, setUrgencyFilter] = useState("ALL");
  const [systemFilter, setSystemFilter] = useState("ALL");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, { type: "success" | "error"; message: string }>>({});

  const urgencyOptions = useMemo(() => Array.from(new Set(requests.map((request) => request.urgency))).sort(), [requests]);
  const systemOptions = useMemo(() => Array.from(new Set(requests.map((request) => request.currentSystem))).sort(), [requests]);

  const filteredRequests = requests.filter((request) => {
    const priority = getPilotRequestPriority(request);
    return (
      (statusFilter === "ALL" || request.status === statusFilter) &&
      (priorityFilter === "ALL" || priority === priorityFilter) &&
      (urgencyFilter === "ALL" || request.urgency === urgencyFilter) &&
      (systemFilter === "ALL" || request.currentSystem === systemFilter)
    );
  });

  async function updateRequest(id: string, payload: Partial<Pick<PilotRequestCrmRecord, "internalNotes" | "nextAction" | "status">>, successMessage: string) {
    setBusyId(id);
    setFeedback((current) => ({ ...current, [id]: { type: "success", message: "" } }));

    const response = await fetch(`/api/pilot-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    setBusyId(null);

    if (!response.ok) {
      const result = await response.json().catch(() => ({ error: "Update failed." }));
      setFeedback((current) => ({ ...current, [id]: { type: "error", message: result.error ?? "Update failed." } }));
      return;
    }

    const updated = await response.json();
    setRequests((current) =>
      current.map((request) =>
        request.id === id
          ? {
              ...request,
              ...updated,
              createdAt: updated.createdAt,
              updatedAt: updated.updatedAt
            }
          : request
      )
    );
    setFeedback((current) => ({ ...current, [id]: { type: "success", message: successMessage } }));
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clinical-700">CRM review</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-navy-950">Pilot Request Pipeline</h2>
        </div>
        <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">Actions enabled</span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <FilterSelect label="Status" value={statusFilter} onChange={setStatusFilter} options={["ALL", ...pilotRequestStatuses]} optionLabel={(value) => (isPilotRequestStatus(value) ? pilotRequestStatusLabels[value] : "All statuses")} />
        <FilterSelect label="Priority" value={priorityFilter} onChange={setPriorityFilter} options={priorityOptions} optionLabel={(value) => (value === "ALL" ? "All priorities" : value)} />
        <FilterSelect label="Urgency" value={urgencyFilter} onChange={setUrgencyFilter} options={["ALL", ...urgencyOptions]} optionLabel={(value) => (value === "ALL" ? "All urgency" : value)} />
        <FilterSelect label="Current system" value={systemFilter} onChange={setSystemFilter} options={["ALL", ...systemOptions]} optionLabel={(value) => (value === "ALL" ? "All systems" : value)} />
      </div>

      <div className="mt-6 space-y-6">
        {pilotRequestStatuses.map((status) => {
          const sectionRequests = filteredRequests.filter((request) => request.status === status);

          return (
            <section key={status} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold text-navy-950">{pilotRequestStatusLabels[status]}</h3>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${pilotRequestStatusClasses[status]}`}>{sectionRequests.length}</span>
              </div>

              {sectionRequests.length > 0 ? (
                <div className="mt-4 grid gap-4">
                  {sectionRequests.map((request) => (
                    <PilotRequestCard key={request.id} request={request} busy={busyId === request.id} feedback={feedback[request.id]} onUpdate={updateRequest} />
                  ))}
                </div>
              ) : (
                <p className="mt-4 rounded-lg bg-white p-4 text-sm text-slate-500 ring-1 ring-slate-200">No requests in this stage.</p>
              )}
            </section>
          );
        })}
      </div>
    </section>
  );
}

function PilotRequestCard({
  request,
  busy,
  feedback,
  onUpdate
}: {
  request: PilotRequestCrmRecord;
  busy: boolean;
  feedback?: { type: "success" | "error"; message: string };
  onUpdate: (id: string, payload: Partial<Pick<PilotRequestCrmRecord, "internalNotes" | "nextAction" | "status">>, successMessage: string) => Promise<void>;
}) {
  const [internalNotes, setInternalNotes] = useState(request.internalNotes ?? "");
  const [nextAction, setNextAction] = useState(request.nextAction ?? getPilotRequestNextAction(request));
  const priority = getPilotRequestPriority(request);
  const message = getPilotRequestFollowUpMessage(request);

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h4 className="text-lg font-semibold text-navy-950">{request.pharmacyName}</h4>
          <p className="mt-1 text-sm text-slate-500">
            {request.contactName} - {request.whatsappNumber}
          </p>
          {request.email ? <p className="mt-1 text-sm text-slate-500">{request.email}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge className={pilotRequestStatusClasses[request.status]} label={pilotRequestStatusLabels[request.status]} />
          <Badge className={pilotRequestPriorityClasses[priority]} label={`${priority} priority`} />
          <Badge className={getPilotRequestUrgencyTone(request.urgency)} label={request.urgency} />
        </div>
      </div>

      <p className="mt-4 rounded-lg bg-clinical-50 p-3 text-sm font-medium leading-6 text-clinical-900">{getPilotRequestStatusSummary(request)}</p>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MiniMetric label="Branches" value={String(request.branchCount)} />
        <MiniMetric label="Current system" value={request.currentSystem} />
        <MiniMetric label="Created" value={formatDate(request.createdAt)} />
        <MiniMetric label="Suggested next action" value={request.nextAction ?? getPilotRequestNextAction(request)} />
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        <InfoBlock title="Main pain" value={request.mainPain} />
        <InfoBlock title="Public notes" value={request.notes ?? "No public notes provided."} />
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Internal notes</span>
          <textarea value={internalNotes} onChange={(event) => setInternalNotes(event.target.value)} rows={4} className="focus-ring mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-navy-950" />
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Next action</span>
          <textarea value={nextAction} onChange={(event) => setNextAction(event.target.value)} rows={4} className="focus-ring mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-navy-950" />
        </label>
      </div>

      <div className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50 p-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-emerald-700" aria-hidden="true" />
          <p className="text-sm font-semibold text-emerald-900">WhatsApp follow-up message</p>
        </div>
        <p className="mt-3 text-sm leading-7 text-emerald-950">{message}</p>
        <button type="button" onClick={() => navigator.clipboard?.writeText(message)} className="focus-ring mt-3 inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-100">
          <ClipboardCopy className="h-3.5 w-3.5" aria-hidden="true" />
          Copy message
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <ActionButton label="Mark Reviewed" status="REVIEWED" busy={busy} onClick={() => onUpdate(request.id, { status: "REVIEWED" }, "Marked reviewed.")} />
        <ActionButton label="Mark Contacted" status="CONTACTED" busy={busy} onClick={() => onUpdate(request.id, { status: "CONTACTED" }, "Marked contacted.")} />
        <ActionButton label="Mark Qualified" status="QUALIFIED" busy={busy} onClick={() => onUpdate(request.id, { status: "QUALIFIED" }, "Marked qualified.")} />
        <ActionButton label="Mark Closed" status="CLOSED" busy={busy} onClick={() => onUpdate(request.id, { status: "CLOSED" }, "Marked closed.")} />
        <button type="button" disabled={busy} onClick={() => onUpdate(request.id, { internalNotes, nextAction }, "Notes and next action saved.")} className="focus-ring inline-flex items-center gap-2 rounded-lg bg-navy-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-60">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />}
          Save notes
        </button>
      </div>

      {feedback?.message ? (
        <p className={feedback.type === "success" ? "mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 ring-1 ring-emerald-100" : "mt-4 flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 ring-1 ring-rose-100"}>
          {feedback.type === "success" ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <XCircle className="h-4 w-4" aria-hidden="true" />}
          {feedback.message}
        </p>
      ) : null}
    </article>
  );
}

function FilterSelect({ label, value, onChange, options, optionLabel }: { label: string; value: string; onChange: (value: string) => void; options: readonly string[]; optionLabel: (value: string) => string }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="focus-ring mt-2 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-navy-950">
        {options.map((option) => (
          <option key={option} value={option}>
            {optionLabel(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

function ActionButton({ label, status, busy, onClick }: { label: string; status: PilotRequestStatusValue; busy: boolean; onClick: () => void }) {
  return (
    <button type="button" disabled={busy} onClick={onClick} className="focus-ring inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60">
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
      {label}
      <span className={`rounded-full px-1.5 py-0.5 text-[10px] ring-1 ${pilotRequestStatusClasses[status]}`}>{pilotRequestStatusLabels[status]}</span>
    </button>
  );
}

function Badge({ label, className }: { label: string; className: string }) {
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ring-1 ${className}`}>{label}</span>;
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</p>
      <p className="mt-2 line-clamp-2 text-sm font-semibold leading-5 text-navy-950">{value}</p>
    </div>
  );
}

function InfoBlock({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-700">{value}</p>
    </div>
  );
}
