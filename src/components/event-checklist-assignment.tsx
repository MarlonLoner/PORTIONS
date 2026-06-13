"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type StaffOption = {
  id: string;
  name: string;
  role: string | null;
  branchId: string | null;
};

type AssignmentItem = {
  id: string;
  eventId: string;
  assignedStaffId: string | null;
  assignedStaffName: string | null;
  linkedActionId: string | null;
};

export function EventChecklistAssignment({
  item,
  staff,
  recommended,
  recommendationReason,
  branchName
}: {
  item: AssignmentItem;
  staff: StaffOption[];
  recommended: StaffOption | null;
  recommendationReason: string;
  branchName: string | null;
}) {
  const router = useRouter();
  const [selectedStaffId, setSelectedStaffId] = useState(item.assignedStaffId ?? "");
  const [assignedName, setAssignedName] = useState(item.assignedStaffName ?? "Unassigned");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const staffById = useMemo(() => new Map(staff.map((member) => [member.id, member])), [staff]);
  const noCompatibleStaff = staff.length === 0;

  useEffect(() => {
    setSelectedStaffId(item.assignedStaffId ?? "");
    setAssignedName(item.assignedStaffName ?? "Unassigned");
  }, [item.assignedStaffId, item.assignedStaffName]);

  async function updateChecklistAssignment(nextStaffId: string | null) {
    const normalizedStaffId = normalizeStaffId(nextStaffId);
    const previousStaffId = selectedStaffId;
    const previousName = assignedName;
    const optimisticStaff = normalizedStaffId ? staffById.get(normalizedStaffId) : null;

    setSelectedStaffId(normalizedStaffId ?? "");
    setAssignedName(optimisticStaff?.name ?? "Unassigned");
    setBusy(true);
    setError("");
    setFeedback("");

    try {
      const response = await fetch(`/api/events/checklist-items/${item.id}/assignment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: item.eventId, assignedStaffId: normalizedStaffId })
      });
      const result = await response.json().catch(() => ({ error: "Checklist assignment could not be updated." }));

      if (!response.ok) {
        setSelectedStaffId(previousStaffId);
        setAssignedName(previousName);
        setError(result.error ?? "Checklist assignment could not be updated.");
        return false;
      }

      setSelectedStaffId(result.assignedStaffId ?? "");
      setAssignedName(result.assignedStaff?.name ?? "Unassigned");
      setFeedback(result.assignedStaff?.name ? `Assigned to ${result.assignedStaff.name}` : "Assignment cleared.");
      router.refresh();
      return true;
    } catch {
      setSelectedStaffId(previousStaffId);
      setAssignedName(previousName);
      setError("Checklist assignment could not be updated. Please try again.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 rounded-lg bg-white p-3 ring-1 ring-slate-200">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Recommended owner</p>
      <p className="mt-1 text-sm font-semibold text-navy-950">{recommended?.name ?? "No compatible staff configured"}</p>
      <p className="mt-1 text-xs leading-5 text-slate-600">{recommendationReason}</p>
      <p className="mt-2 text-xs font-semibold text-slate-500">Current owner: {assignedName}</p>

      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <select
          value={selectedStaffId}
          disabled={busy || noCompatibleStaff}
          onChange={(event) => updateChecklistAssignment(event.target.value)}
          className="focus-ring h-9 min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-navy-950 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <option value="">Unassigned</option>
          {staff.map((member) => <option key={member.id} value={member.id}>{member.name}{member.role ? ` - ${member.role}` : ""}</option>)}
        </select>
        <button
          type="button"
          disabled={busy || !recommended || selectedStaffId === recommended.id}
          onClick={() => updateChecklistAssignment(recommended?.id ?? null)}
          className="focus-ring rounded-lg bg-navy-950 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Saving..." : "Assign recommended"}
        </button>
        {item.linkedActionId ? (
          <Link href={`/action-center/${item.linkedActionId}`} className="focus-ring rounded-lg bg-clinical-50 px-3 py-2 text-xs font-semibold text-clinical-800 ring-1 ring-clinical-100">Open linked action</Link>
        ) : null}
      </div>

      {noCompatibleStaff ? (
        <p className="mt-2 text-xs font-semibold text-amber-700">
          No staff members are configured for this branch. <Link href="/settings" className="underline">Open settings</Link>
        </p>
      ) : null}
      {feedback ? <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">{feedback}</p> : null}
      {error ? <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 ring-1 ring-rose-100">{error}</p> : null}
      {branchName ? <p className="mt-2 text-[11px] leading-5 text-slate-500">Only {branchName} staff are available for this branch-scoped event.</p> : null}
    </div>
  );
}

function normalizeStaffId(value: string | null | undefined) {
  const cleaned = (value ?? "").trim();
  if (!cleaned || cleaned.toLowerCase() === "none" || cleaned.toLowerCase() === "unassigned") return null;
  return cleaned;
}
