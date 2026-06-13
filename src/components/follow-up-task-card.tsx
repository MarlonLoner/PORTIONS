"use client";

import clsx from "clsx";
import { CheckCircle2, Clock3, Loader2, MessageSquareText, Play, RotateCcw, Wand2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { RiskBadge } from "@/components/risk-badge";
import { StatusBadge } from "@/components/status-badge";
import { chronicActionCopy, estimateMonthlyPatientValue } from "@/lib/chronic";
import { daysFromNow, enumLabel, formatCurrency, formatDate } from "@/lib/format";

type StaffOption = { id: string; name: string; role?: string | null; branchId?: string | null; branchName?: string | null };
type TaskWorkload = { id: string; branchId: string; assignedStaffId: string | null; status: string; dueDate: string };

type FollowUpTaskRecord = {
  id: string;
  customerName: string;
  reason: string;
  type: string;
  status: string;
  dueDate: Date | string;
  snoozedUntil?: Date | string | null;
  completedAt?: Date | string | null;
  outcomeType?: string | null;
  outcomeNotes?: string | null;
  valueAmount?: number | string | { toString(): string } | null;
  suggestedAction: string;
  suggestedMessage: string;
  branchId: string;
  branch: { name: string };
  assignedStaffId?: string | null;
  assignedStaff?: { name: string } | null;
  activities?: Array<{ id: string; activityType: string; description: string; createdAt: Date | string }>;
  patient?: {
    name: string;
    phone?: string;
    conditionCategory: string;
    packageType: string;
    status: string;
    riskScore: string;
    nextRefillDate: Date | string;
    assignedStaffId?: string | null;
    assignedStaff?: { name: string } | null;
    refillEvents?: Array<{ amount: number | string | { toString(): string } }>;
  } | null;
};

const outcomes = ["PATIENT_CONTACTED", "REFILL_CONFIRMED", "DELIVERY_BOOKED", "COLLECTION_CONFIRMED", "PAYMENT_PENDING", "NO_RESPONSE", "CALLBACK_REQUESTED", "PATIENT_LOST", "OTHER"];

export function FollowUpTaskCard({ task, staff, allTasks }: { task: FollowUpTaskRecord; staff: StaffOption[]; allTasks: TaskWorkload[] }) {
  const router = useRouter();
  const [record, setRecord] = useState(task);
  const [showMessage, setShowMessage] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [completion, setCompletion] = useState({
    outcomeType: task.outcomeType ?? "REFILL_CONFIRMED",
    outcomeNotes: task.outcomeNotes ?? "",
    valueAmount: String(task.valueAmount ?? (task.patient ? estimateMonthlyPatientValue(task.patient) : 0))
  });

  const dueDate = new Date(record.dueDate);
  const dueDistance = daysFromNow(dueDate);
  const overdue = dueDistance < 0 || record.type === "OVERDUE";
  const highRisk = record.patient?.riskScore === "HIGH";
  const estimatedValue = record.patient ? estimateMonthlyPatientValue(record.patient) : Number(record.valueAmount ?? 0);
  const operationalSuggestion = record.patient ? chronicActionCopy(record.patient) : pharmacySuggestion(record.type, record.customerName);
  const branchName = record.branch?.name ?? "Unassigned branch";
  const compatibleStaff = record.branchId ? staff.filter((member) => member.branchId === record.branchId) : [];
  const recommended = useMemo(() => recommendStaff(record, compatibleStaff, allTasks), [record, compatibleStaff, allTasks]);

  async function update(payload: Record<string, string | null>, success: string) {
    const normalizedPayload = normalizePayload(payload);
    setBusy(success);
    setError("");
    setFeedback("");
    const previous = record;
    const optimisticStaff = normalizedPayload.assignedStaffId ? staff.find((member) => member.id === normalizedPayload.assignedStaffId) : null;
    setRecord((current) => ({
      ...current,
      ...normalizedPayload,
      assignedStaffId: "assignedStaffId" in normalizedPayload ? normalizedPayload.assignedStaffId : current.assignedStaffId,
      assignedStaff: "assignedStaffId" in normalizedPayload ? (optimisticStaff ? { name: optimisticStaff.name } : null) : current.assignedStaff
    }));

    try {
      const response = await fetch(`/api/follow-ups/${record.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(normalizedPayload)
      });
      const result = await response.json().catch(() => ({ error: "Follow-up could not be updated." }));

      if (!response.ok) {
        setRecord(previous);
        setError(result.error ?? "Follow-up could not be updated.");
        return false;
      }

      setRecord(result);
      setFeedback(success);
      router.refresh();
      return true;
    } catch {
      setRecord(previous);
      setError("Follow-up assignment could not be saved. Please try again.");
      return false;
    } finally {
      setBusy("");
    }
  }

  function snooze(days: number) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    date.setHours(9, 0, 0, 0);
    return update({ status: "SNOOZED", snoozedUntil: date.toISOString() }, `Snoozed for ${days} day${days > 1 ? "s" : ""}.`);
  }

  function assignRecommended(staffMember: StaffOption) {
    if (!isValidRecommendedStaff(staffMember, record)) {
      setError("Recommended staff member is no longer available for this branch.");
      return;
    }
    update({ assignedStaffId: staffMember.id }, `Assigned recommended owner: ${staffMember.name}.`);
  }

  return (
    <article className={clsx("rounded-lg border bg-white p-4 shadow-soft transition hover:-translate-y-0.5", overdue || highRisk ? "border-rose-200 hover:border-rose-300" : "border-slate-200 hover:border-clinical-200")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/follow-ups/${record.id}`} className="text-sm font-semibold text-navy-950 hover:text-clinical-800">{record.customerName}</Link>
            {record.patient ? <RiskBadge risk={record.patient.riskScore} /> : null}
          </div>
          <p className="mt-1 text-xs text-slate-500">{branchName} - {enumLabel(record.type)}</p>
        </div>
        <StatusBadge status={record.status} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Metric label="Due date" value={formatDate(dueDate)} emphasis={overdue ? `${Math.abs(dueDistance)}d overdue` : dueDistance === 0 ? "Due today" : `${dueDistance}d`} intent={overdue ? "risk" : "normal"} />
        <Metric label="Value" value={estimatedValue ? formatCurrency(estimatedValue) : "Not linked"} emphasis={record.status === "DONE" ? "recorded" : "potential"} intent={estimatedValue ? "value" : "normal"} />
      </div>

      <div className="mt-4 rounded-lg bg-clinical-50 p-3 ring-1 ring-clinical-100">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-clinical-700">Assignment</p>
        <p className="mt-1 text-sm font-semibold text-navy-950">Recommended: {recommended?.name ?? "No branch staff configured"}</p>
        <p className="mt-1 text-xs leading-5 text-slate-600">{recommended ? recommendationReason(record, recommended, allTasks) : "No staff members are configured for this branch."}</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
          <select value={record.assignedStaffId ?? ""} onChange={(event) => update({ assignedStaffId: event.target.value || null }, event.target.value ? "Assignment updated." : "Assignment cleared.")} className="focus-ring h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-navy-950">
            <option value="">Unassigned</option>
            {compatibleStaff.map((member) => <option key={member.id} value={member.id}>{member.name}{member.role ? ` - ${member.role}` : ""}</option>)}
          </select>
          {recommended ? <button type="button" disabled={Boolean(busy) || record.assignedStaffId === recommended.id || !isValidRecommendedStaff(recommended, record)} onClick={() => assignRecommended(recommended)} className="focus-ring rounded-lg bg-navy-950 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Assign recommended</button> : null}
        </div>
        {recommended && !isValidRecommendedStaff(recommended, record) ? <p className="mt-2 text-xs font-semibold text-rose-700">Recommended staff member is no longer available for this branch.</p> : null}
      </div>

      <p className={overdue || highRisk ? "mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm leading-6 text-rose-800" : "mt-3 rounded-lg bg-clinical-50 px-3 py-2 text-sm leading-6 text-clinical-800"}>{operationalSuggestion}</p>
      <p className="mt-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-600">{record.suggestedAction}</p>

      {record.status === "DONE" ? (
        <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm leading-6 text-emerald-900 ring-1 ring-emerald-100">Outcome: {record.outcomeType ? enumLabel(record.outcomeType) : "Completed"}{record.outcomeNotes ? ` - ${record.outcomeNotes}` : ""}</p>
      ) : (
        <div className="mt-3 rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Completion outcome</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <select value={completion.outcomeType} onChange={(event) => setCompletion((current) => ({ ...current, outcomeType: event.target.value }))} className="focus-ring h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-navy-950">
              {outcomes.map((outcome) => <option key={outcome} value={outcome}>{enumLabel(outcome)}</option>)}
            </select>
            <input value={completion.valueAmount} onChange={(event) => setCompletion((current) => ({ ...current, valueAmount: event.target.value }))} type="number" min="0" className="focus-ring h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-navy-950" />
          </div>
          <textarea value={completion.outcomeNotes} onChange={(event) => setCompletion((current) => ({ ...current, outcomeNotes: event.target.value }))} rows={2} placeholder="Outcome notes" className="focus-ring mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-navy-950" />
        </div>
      )}

      {showMessage ? <div className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm leading-6 text-emerald-900">{record.suggestedMessage}</div> : null}

      <div className="mt-4 grid grid-cols-2 gap-2 xl:grid-cols-4">
        <ActionButton busy={busy === "Started."} icon={<Play className="h-3.5 w-3.5" />} label="Start" disabled={record.status === "IN_PROGRESS" || record.status === "DONE"} onClick={() => update({ status: "IN_PROGRESS" }, "Started.")} />
        <ActionButton busy={busy === "Snoozed for 1 day."} icon={<Clock3 className="h-3.5 w-3.5" />} label="Tomorrow" disabled={record.status === "DONE"} onClick={() => snooze(1)} />
        <ActionButton busy={busy === "Completed."} icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="Complete" disabled={record.status === "DONE"} onClick={() => update({ status: "DONE", ...completion }, "Completed.")} />
        <ActionButton busy={false} icon={showMessage ? <MessageSquareText className="h-3.5 w-3.5" /> : <Wand2 className="h-3.5 w-3.5" />} label="Message" onClick={() => setShowMessage((value) => !value)} />
        <ActionButton busy={busy === "Snoozed for 3 days."} icon={<Clock3 className="h-3.5 w-3.5" />} label="Snooze 3d" disabled={record.status === "DONE"} onClick={() => snooze(3)} />
        <ActionButton busy={busy === "Reopened."} icon={<RotateCcw className="h-3.5 w-3.5" />} label="Reopen" disabled={record.status !== "DONE"} onClick={() => update({ status: "PENDING" }, "Reopened.")} />
      </div>
      {record.activities?.[0] ? <p className="mt-3 text-xs leading-5 text-slate-500">Latest: {record.activities[0].description}</p> : null}
      {feedback ? <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">{feedback}</p> : null}
      {error ? <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 ring-1 ring-rose-100">{error}</p> : null}
    </article>
  );
}

function normalizePayload(payload: Record<string, string | null>) {
  if (!("assignedStaffId" in payload)) return payload;
  const assignedStaffId = payload.assignedStaffId;
  return {
    ...payload,
    assignedStaffId: assignedStaffId && assignedStaffId !== "none" ? assignedStaffId : null
  };
}

function isValidRecommendedStaff(staff: StaffOption | null, task: FollowUpTaskRecord) {
  return Boolean(staff?.id && staff.branchId === task.branchId);
}

function recommendStaff(task: FollowUpTaskRecord, staff: StaffOption[], allTasks: TaskWorkload[]) {
  if (task.patient?.assignedStaffId) {
    const patientOwner = staff.find((member) => member.id === task.patient?.assignedStaffId);
    if (patientOwner) return patientOwner;
  }
  return [...staff].sort((a, b) => roleScore(a) - roleScore(b) || workload(a.id, allTasks) - workload(b.id, allTasks) || a.name.localeCompare(b.name))[0] ?? null;
}

function roleScore(staff: StaffOption) {
  const role = (staff.role ?? "").toLowerCase();
  if (role.includes("support") || role.includes("patient") || role.includes("care")) return 0;
  if (role.includes("pharmacist")) return 1;
  if (role.includes("manager")) return 2;
  return 4;
}

function workload(staffId: string, tasks: TaskWorkload[]) {
  return tasks.filter((task) => task.assignedStaffId === staffId && task.status !== "DONE" && task.status !== "CANCELLED").length;
}

function recommendationReason(task: FollowUpTaskRecord, staff: StaffOption, tasks: TaskWorkload[]) {
  if (task.patient?.assignedStaffId === staff.id) return "This staff member is already assigned to the patient profile.";
  return `${task.branch?.name ?? "This branch"} ${staff.role ?? "staff member"} with ${workload(staff.id, tasks)} active follow-ups.`;
}

function ActionButton({ label, icon, busy, disabled = false, onClick }: { label: string; icon: ReactNode; busy: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button type="button" disabled={busy || disabled} onClick={onClick} className="focus-ring inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50">
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : icon}
      {label}
    </button>
  );
}

function Metric({ label, value, emphasis, intent }: { label: string; value: string; emphasis: string; intent: "normal" | "risk" | "value" }) {
  return (
    <div className={intent === "risk" ? "rounded-lg border border-rose-100 bg-rose-50 p-3" : "rounded-lg border border-slate-100 bg-slate-50 p-3"}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</p>
      <p className={intent === "risk" ? "mt-1 font-semibold text-rose-700" : "mt-1 font-semibold text-navy-950"}>{value}</p>
      <p className="mt-1 text-xs text-slate-500">{emphasis}</p>
    </div>
  );
}

function pharmacySuggestion(type: string, customerName: string) {
  const firstName = customerName.split(" ")[0];
  if (type === "PAYMENT_PENDING") return `${firstName}'s order is commercially ready but unpaid. Send a payment reminder and confirm dispatch once paid.`;
  if (type === "DELIVERY_CONFIRMATION") return "Confirm delivery address and time window before the pack leaves the branch.";
  if (type === "PRESCRIPTION_RENEWAL_NEEDED") return "Ask for the updated prescription and route to pharmacist review before preparing the next chronic pack.";
  if (type === "LOST_PATIENT_REVIVAL") return `${firstName} may be drifting out of the chronic book. Check medication continuity and offer a recovery refill path.`;
  return `Contact ${firstName} and turn this follow-up into a confirmed refill or clear next action.`;
}
