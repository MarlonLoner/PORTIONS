"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getCompatibleAssignmentStaff, getRecommendedAssignee, type AssignmentAction } from "@/lib/action-assignment";
import { dateInputValue, enumLabel } from "@/lib/format";

const statuses = ["OPEN", "IN_PROGRESS", "BLOCKED", "COMPLETED", "CANCELLED"];
const priorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const outcomes = ["REVENUE_RECOVERED", "REVENUE_PROTECTED", "PATIENT_CONTACTED", "ORDER_RESOLVED", "STOCK_RESOLVED", "BRANCH_ESCALATED", "NO_RESPONSE", "NO_VALUE", "OTHER"];

export function ActionDetailActions({
  actionId,
  status,
  priority,
  dueDate,
  branchId,
  branchName,
  category,
  sourceType,
  assignedStaffId,
  staff,
  actions,
  outcomeType,
  outcomeNotes,
  valueAmount
}: {
  actionId: string;
  status: string;
  priority: string;
  dueDate: string | null;
  branchId: string | null;
  branchName: string | null;
  category: string;
  sourceType: string | null;
  assignedStaffId: string | null;
  staff: Array<{ id: string; name: string; role?: string | null; branchId?: string | null; branchName?: string | null }>;
  actions: AssignmentAction[];
  outcomeType: string | null;
  outcomeNotes: string | null;
  valueAmount: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    status,
    priority,
    dueDate: dueDate ? dateInputValue(dueDate) : "",
    assignedStaffId: assignedStaffId ?? "",
    outcomeType: outcomeType ?? "REVENUE_PROTECTED",
    outcomeNotes: outcomeNotes ?? "",
    valueAmount: String(valueAmount)
  });
  const actionContext: AssignmentAction = { id: actionId, category, sourceType, branchId, branchName, assignedStaffId: form.assignedStaffId || null, status: form.status, dueDate: form.dueDate };
  const compatibleStaff = getCompatibleAssignmentStaff(actionContext, staff);
  const recommendation = getRecommendedAssignee(actionContext, staff, actions);
  const selectedStaffVisible = !form.assignedStaffId || compatibleStaff.some((member) => member.id === form.assignedStaffId);

  async function submit(override?: Partial<typeof form>, successMessage = "Action updated and activity history recorded.") {
    setBusy(true);
    setMessage("");
    setError("");
    const payload = { ...form, ...override };
    const response = await fetch(`/api/operational-actions/${actionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    setBusy(false);

    if (!response.ok) {
      const result = await response.json().catch(() => ({ error: "Action could not be updated." }));
      setError(result.error ?? "Action could not be updated.");
      return;
    }

    setForm(payload);
    setMessage(successMessage);
    router.refresh();
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clinical-700">Update action</p>
      <h2 className="mt-2 text-xl font-semibold tracking-tight text-navy-950">Status, Ownership And Outcome</h2>
      <div className="mt-5 rounded-lg bg-clinical-50 p-4 ring-1 ring-clinical-100">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-clinical-700">Assignment recommendation</p>
            <p className="mt-1 text-sm font-semibold text-navy-950">Recommended: {recommendation.staff?.name ?? "No branch staff configured"}</p>
            <p className="mt-1 text-xs leading-5 text-slate-600">{recommendation.reason}</p>
          </div>
          {recommendation.staff ? (
            <button type="button" disabled={busy || form.assignedStaffId === recommendation.staff.id} onClick={() => submit({ assignedStaffId: recommendation.staff!.id }, `Assigned recommended owner: ${recommendation.staff!.name}.`)} className="focus-ring rounded-lg bg-navy-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-navy-800 disabled:opacity-50">
              Assign recommended
            </button>
          ) : (
            <Link href="/settings" className="focus-ring rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">Configure staff</Link>
          )}
        </div>
        {branchId && recommendation.branchStaffCount === 0 ? (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 ring-1 ring-amber-100">No staff members are configured for this branch.</p>
        ) : null}
        {!selectedStaffVisible ? (
          <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800 ring-1 ring-rose-100">Current assignee is outside this branch. Choose a branch staff member or clear the assignment.</p>
        ) : null}
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <Select label="Status" value={form.status} options={statuses} onChange={(value) => setForm((current) => ({ ...current, status: value }))} />
        <Select label="Priority" value={form.priority} options={priorities} onChange={(value) => setForm((current) => ({ ...current, priority: value }))} />
        <label>
          <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Due date</span>
          <input value={form.dueDate} onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))} type="date" className="focus-ring mt-2 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-navy-950" />
        </label>
        <Select label="Assigned staff" value={selectedStaffVisible ? form.assignedStaffId : ""} options={compatibleStaff.map((member) => member.id)} labels={Object.fromEntries(compatibleStaff.map((member) => [member.id, `${member.name}${member.role ? ` - ${member.role}` : ""}`]))} onChange={(value) => setForm((current) => ({ ...current, assignedStaffId: value }))} helper={branchId && compatibleStaff.length === 0 ? "No staff members are configured for this branch." : undefined} />
        <Select label="Outcome" value={form.outcomeType} options={outcomes} onChange={(value) => setForm((current) => ({ ...current, outcomeType: value }))} />
        <label>
          <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Value amount</span>
          <input value={form.valueAmount} onChange={(event) => setForm((current) => ({ ...current, valueAmount: event.target.value }))} type="number" min="0" className="focus-ring mt-2 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-navy-950" />
        </label>
      </div>
      <label className="mt-4 block">
        <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Outcome notes</span>
        <textarea value={form.outcomeNotes} onChange={(event) => setForm((current) => ({ ...current, outcomeNotes: event.target.value }))} rows={4} className="focus-ring mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-navy-950" />
      </label>
      <button type="button" disabled={busy} onClick={() => submit()} className="focus-ring mt-4 inline-flex items-center gap-2 rounded-lg bg-navy-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-800 disabled:opacity-60">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
        Save action update
      </button>
      {message ? <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-100">{message}</p> : null}
      {error ? <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 ring-1 ring-rose-100">{error}</p> : null}
    </section>
  );
}

function Select({ label, value, options, labels, helper, onChange }: { label: string; value: string; options: string[]; labels?: Record<string, string>; helper?: string; onChange: (value: string) => void }) {
  return (
    <label>
      <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="focus-ring mt-2 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-navy-950">
        <option value="">None</option>
        {options.map((option) => <option key={option} value={option}>{labels?.[option] ?? enumLabel(option)}</option>)}
      </select>
      {helper ? <span className="mt-1 block text-xs font-semibold text-amber-700">{helper}</span> : null}
    </label>
  );
}
