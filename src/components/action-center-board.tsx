"use client";

import { CheckCircle2, Loader2, Plus, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PrepareCommunicationButton } from "@/components/prepare-communication-button";
import { getCompatibleAssignmentStaff, getRecommendedAssignee } from "@/lib/action-assignment";
import { enumLabel, formatCurrency, formatDate, dateInputValue } from "@/lib/format";

export type ActionCenterRecord = {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  sourceType: string;
  sourceId: string | null;
  branchId: string | null;
  branchName: string | null;
  assignedStaffId: string | null;
  assignedStaffName: string | null;
  dueDate: string | null;
  completedAt: string | null;
  outcomeType: string | null;
  outcomeNotes: string | null;
  valueAmount: number;
  createdAt: string;
  urgency: string;
  suggestedNextStep: string;
  alertCount?: number;
};

export type ActionOption = {
  id: string;
  name: string;
  role?: string | null;
  branchId?: string | null;
  branchName?: string | null;
};

const categories = ["CHRONIC_PATIENT", "ORDER_RECOVERY", "STOCK_INTERVENTION", "BRANCH_ISSUE", "PILOT_TASK", "MANAGEMENT_DECISION", "GENERAL"];
const priorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const statuses = ["OPEN", "IN_PROGRESS", "BLOCKED", "COMPLETED", "CANCELLED"];
const outcomes = ["REVENUE_RECOVERED", "REVENUE_PROTECTED", "PATIENT_CONTACTED", "ORDER_RESOLVED", "STOCK_RESOLVED", "BRANCH_ESCALATED", "NO_RESPONSE", "NO_VALUE", "OTHER"];

const priorityClasses: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-700 ring-slate-200",
  MEDIUM: "bg-clinical-50 text-clinical-800 ring-clinical-200",
  HIGH: "bg-amber-50 text-amber-700 ring-amber-200",
  CRITICAL: "bg-rose-50 text-rose-700 ring-rose-200"
};

const statusClasses: Record<string, string> = {
  OPEN: "bg-white text-slate-700 ring-slate-200",
  IN_PROGRESS: "bg-clinical-50 text-clinical-800 ring-clinical-200",
  BLOCKED: "bg-amber-50 text-amber-700 ring-amber-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  CANCELLED: "bg-slate-100 text-slate-500 ring-slate-200"
};

export function ActionCenterBoard({
  initialActions,
  branches,
  staff
}: {
  initialActions: ActionCenterRecord[];
  branches: ActionOption[];
  staff: ActionOption[];
}) {
  const [actions, setActions] = useState(initialActions);
  const [showCreate, setShowCreate] = useState(initialActions.length === 0);
  const [busyId, setBusyId] = useState("");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    status: "ALL",
    priority: "ALL",
    category: "ALL",
    branchId: "ALL",
    staffId: "ALL",
    dueState: "ALL"
  });

  const filtered = useMemo(() => actions.filter((action) =>
    (filters.status === "ALL" || action.status === filters.status) &&
    (filters.priority === "ALL" || action.priority === filters.priority) &&
    (filters.category === "ALL" || action.category === filters.category) &&
    (filters.branchId === "ALL" || action.branchId === filters.branchId) &&
    (filters.staffId === "ALL" || action.assignedStaffId === filters.staffId) &&
    (filters.dueState === "ALL" || action.urgency === filters.dueState)
  ), [actions, filters]);

  async function createAction(formData: FormData) {
    setBusyId("create");
    setError("");
    setFeedback("");
    const payload = Object.fromEntries(formData.entries());
    const response = await fetch("/api/operational-actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    setBusyId("");

    if (!response.ok) {
      const result = await response.json().catch(() => ({ error: "Action could not be created." }));
      setError(result.error ?? "Action could not be created.");
      return;
    }

    const created = await response.json();
    setActions((current) => [toRecord(created), ...current]);
    setShowCreate(false);
    setFeedback("Action created and added to the accountability queue.");
  }

  async function updateAction(id: string, payload: Record<string, string | null>, message: string) {
    setBusyId(id);
    setError("");
    setFeedback("");
    const previousActions = actions;
    if ("assignedStaffId" in payload) {
      const nextStaff = payload.assignedStaffId ? staff.find((member) => member.id === payload.assignedStaffId) : null;
      setActions((current) => current.map((action) => action.id === id ? {
        ...action,
        assignedStaffId: payload.assignedStaffId,
        assignedStaffName: nextStaff?.name ?? null
      } : action));
    }
    const response = await fetch(`/api/operational-actions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    setBusyId("");

    if (!response.ok) {
      const result = await response.json().catch(() => ({ error: "Action could not be updated." }));
      setActions(previousActions);
      setError(result.error ?? "Action could not be updated.");
      return false;
    }

    const updated = await response.json();
    setActions((current) => current.map((action) => action.id === id ? toRecord(updated) : action));
    setFeedback(message);
    return true;
  }

  const grouped = {
    criticalOverdue: filtered.filter((action) => action.status !== "COMPLETED" && (action.priority === "CRITICAL" || action.urgency === "Overdue")),
    dueToday: filtered.filter((action) => action.status !== "COMPLETED" && action.urgency === "Due today"),
    inProgress: filtered.filter((action) => action.status === "IN_PROGRESS"),
    upcoming: filtered.filter((action) => action.status !== "COMPLETED" && action.urgency === "Upcoming"),
    recentlyCompleted: filtered.filter((action) => action.status === "COMPLETED")
  };

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clinical-700">Action queue controls</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-navy-950">Assigned Work And Outcomes</h2>
          </div>
          <button type="button" onClick={() => setShowCreate((value) => !value)} className="focus-ring inline-flex items-center gap-2 rounded-lg bg-navy-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-800">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Create Action
          </button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <Filter label="Status" value={filters.status} options={["ALL", ...statuses]} onChange={(value) => setFilters((current) => ({ ...current, status: value }))} />
          <Filter label="Priority" value={filters.priority} options={["ALL", ...priorities]} onChange={(value) => setFilters((current) => ({ ...current, priority: value }))} />
          <Filter label="Category" value={filters.category} options={["ALL", ...categories]} onChange={(value) => setFilters((current) => ({ ...current, category: value }))} />
          <Filter label="Branch" value={filters.branchId} options={["ALL", ...branches.map((branch) => branch.id)]} labels={branchLabelMap(branches)} onChange={(value) => setFilters((current) => ({ ...current, branchId: value }))} />
          <Filter label="Staff" value={filters.staffId} options={["ALL", ...staff.map((member) => member.id)]} labels={branchLabelMap(staff)} onChange={(value) => setFilters((current) => ({ ...current, staffId: value }))} />
          <Filter label="Due state" value={filters.dueState} options={["ALL", "Overdue", "Due today", "Upcoming", "Critical", "Completed", "Unscheduled"]} onChange={(value) => setFilters((current) => ({ ...current, dueState: value }))} />
        </div>

        {showCreate ? <CreateActionForm branches={branches} staff={staff} busy={busyId === "create"} onSubmit={createAction} /> : null}
        {feedback ? <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-100">{feedback}</p> : null}
        {error ? <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 ring-1 ring-rose-100">{error}</p> : null}
      </section>

      {actions.length === 0 ? <EmptyState onCreate={() => setShowCreate(true)} /> : null}

      <QueueSection title="Critical and overdue" eyebrow="Clear first" actions={grouped.criticalOverdue} allActions={actions} busyId={busyId} branches={branches} staff={staff} onUpdate={updateAction} />
      <QueueSection title="Due today" eyebrow="Today's execution" actions={grouped.dueToday} allActions={actions} busyId={busyId} branches={branches} staff={staff} onUpdate={updateAction} />
      <QueueSection title="In progress" eyebrow="Active work" actions={grouped.inProgress} allActions={actions} busyId={busyId} branches={branches} staff={staff} onUpdate={updateAction} />
      <QueueSection title="Upcoming" eyebrow="Next actions" actions={grouped.upcoming} allActions={actions} busyId={busyId} branches={branches} staff={staff} onUpdate={updateAction} />
      <QueueSection title="Recently completed" eyebrow="Recorded outcomes" actions={grouped.recentlyCompleted} allActions={actions} busyId={busyId} branches={branches} staff={staff} onUpdate={updateAction} />
    </div>
  );
}

function toRecord(action: any): ActionCenterRecord {
  return {
    id: action.id,
    title: action.title,
    description: action.description,
    category: action.category,
    priority: action.priority,
    status: action.status,
    sourceType: action.sourceType,
    sourceId: action.sourceId,
    branchId: action.branchId,
    branchName: action.branch?.name ?? null,
    assignedStaffId: action.assignedStaffId,
    assignedStaffName: action.assignedStaff?.name ?? null,
    dueDate: action.dueDate,
    completedAt: action.completedAt,
    outcomeType: action.outcomeType,
    outcomeNotes: action.outcomeNotes,
    valueAmount: Number(action.valueAmount),
    createdAt: action.createdAt,
    urgency: getClientUrgency(action),
    suggestedNextStep: getClientSuggestion(action),
    alertCount: action.alertCount ?? 0
  };
}

function getClientUrgency(action: { status: string; dueDate: string | null; priority: string }) {
  if (action.status === "COMPLETED") return "Completed";
  if (!action.dueDate) return action.priority === "CRITICAL" ? "Critical" : "Unscheduled";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const due = new Date(action.dueDate);
  if (due < today) return "Overdue";
  if (due < tomorrow) return "Due today";
  if (action.priority === "CRITICAL") return "Critical";
  return "Upcoming";
}

function getClientSuggestion(action: { status: string; category: string; assignedStaffId: string | null }) {
  if (action.status === "COMPLETED") return "Review the outcome and include the value in the next executive brief.";
  if (action.status === "BLOCKED") return "Escalate the blocker and confirm the next decision owner.";
  if (!action.assignedStaffId) return "Assign an owner before this action can move reliably.";
  if (action.category === "ORDER_RECOVERY") return "Send the customer update or payment reminder and move the order forward.";
  if (action.category === "CHRONIC_PATIENT") return "Contact the patient and record whether refill collection or delivery was confirmed.";
  if (action.category === "STOCK_INTERVENTION") return "Confirm transfer, reorder, or stock movement before demand reaches the branch.";
  return "Move the action forward and record the operational outcome.";
}

function branchLabelMap(options: ActionOption[]) {
  return Object.fromEntries(options.map((option) => [option.id, option.name]));
}

function staffLabelMap(options: ActionOption[]) {
  return Object.fromEntries(options.map((option) => [option.id, `${option.name}${option.role ? ` - ${option.role}` : ""}`]));
}

function CreateActionForm({ branches, staff, busy, onSubmit }: { branches: ActionOption[]; staff: ActionOption[]; busy: boolean; onSubmit: (formData: FormData) => Promise<void> }) {
  return (
    <form action={onSubmit} className="mt-5 rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Title" name="title" required />
        <Select label="Category" name="category" options={categories} required />
        <Select label="Priority" name="priority" options={priorities} required />
        <Field label="Due date" name="dueDate" type="date" />
        <Select label="Branch" name="branchId" options={branches.map((branch) => branch.id)} labels={branchLabelMap(branches)} />
        <Select label="Assigned staff" name="assignedStaffId" options={staff.map((member) => member.id)} labels={staffLabelMap(staff)} />
        <Field label="Source type" name="sourceType" defaultValue="MANUAL" />
        <Field label="Estimated value" name="valueAmount" type="number" min="0" defaultValue="0" />
      </div>
      <label className="mt-4 block">
        <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Description</span>
        <textarea name="description" required rows={3} className="focus-ring mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-navy-950" />
      </label>
      <button type="submit" disabled={busy} className="focus-ring mt-4 inline-flex items-center gap-2 rounded-lg bg-navy-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-800 disabled:opacity-60">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
        Create accountability action
      </button>
    </form>
  );
}

function QueueSection({ title, eyebrow, actions, allActions, busyId, branches, staff, onUpdate }: { title: string; eyebrow: string; actions: ActionCenterRecord[]; allActions: ActionCenterRecord[]; busyId: string; branches: ActionOption[]; staff: ActionOption[]; onUpdate: (id: string, payload: Record<string, string | null>, message: string) => Promise<boolean> }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clinical-700">{eyebrow}</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-navy-950">{title}</h2>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">{actions.length} actions</span>
      </div>
      <div className="mt-5 grid gap-4">
        {actions.length > 0 ? actions.map((action) => (
          <ActionCard key={action.id} action={action} busy={busyId === action.id} branches={branches} staff={staff} actions={allActions} onUpdate={onUpdate} />
        )) : <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-600">No actions in this lane. Create one from an operating insight, patient risk, order blocker, stock issue, or pilot task.</p>}
      </div>
    </section>
  );
}

function ActionCard({ action, busy, staff, actions, onUpdate }: { action: ActionCenterRecord; busy: boolean; branches: ActionOption[]; staff: ActionOption[]; actions: ActionCenterRecord[]; onUpdate: (id: string, payload: Record<string, string | null>, message: string) => Promise<boolean> }) {
  const [completion, setCompletion] = useState({ outcomeType: action.outcomeType ?? "REVENUE_PROTECTED", outcomeNotes: action.outcomeNotes ?? "", valueAmount: String(action.valueAmount ?? 0) });
  const compatibleStaff = getCompatibleAssignmentStaff(action, staff);
  const recommendation = getRecommendedAssignee(action, staff, actions);
  const selectedStaffVisible = !action.assignedStaffId || compatibleStaff.some((member) => member.id === action.assignedStaffId);

  return (
    <article className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href={`/action-center/${action.id}`} className="text-lg font-semibold tracking-tight text-navy-950 hover:text-clinical-800">{action.title}</Link>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">{action.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {action.alertCount ? <Badge label={`${action.alertCount} active alerts`} className="bg-rose-50 text-rose-700 ring-rose-200" /> : null}
          <Badge label={enumLabel(action.category)} className="bg-white text-slate-700 ring-slate-200" />
          <Badge label={enumLabel(action.priority)} className={priorityClasses[action.priority]} />
          <Badge label={enumLabel(action.status)} className={statusClasses[action.status]} />
        </div>
        <PrepareCommunicationButton sourceType="OPERATIONAL_ACTION" sourceId={action.id} templateType="ACTION_REMINDER" label="Prepare reminder" />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <Mini label="Branch" value={action.branchName ?? "Network"} />
        <Mini label="Assigned staff" value={action.assignedStaffName ?? "Unassigned"} />
        <Mini label="Due date" value={action.dueDate ? formatDate(action.dueDate) : "No due date"} />
        <Mini label="Source" value={action.sourceType.replace(/_/g, " ")} />
        <Mini label="Value" value={formatCurrency(action.valueAmount)} />
        <Mini label="Urgency" value={action.urgency} />
      </div>

      <p className="mt-4 rounded-lg bg-white p-3 text-sm font-semibold leading-6 text-clinical-900 ring-1 ring-clinical-100">{action.suggestedNextStep}</p>

      <div className="mt-4 rounded-lg bg-white p-3 ring-1 ring-clinical-100">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-clinical-700">Assignment recommendation</p>
            <p className="mt-1 text-sm font-semibold text-navy-950">
              Recommended: {recommendation.staff?.name ?? "No branch staff configured"}
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-600">{recommendation.reason}</p>
          </div>
          {recommendation.staff ? (
            <button type="button" disabled={busy || action.assignedStaffId === recommendation.staff.id} onClick={() => onUpdate(action.id, { assignedStaffId: recommendation.staff!.id }, `Assigned recommended owner: ${recommendation.staff!.name}.`)} className="focus-ring rounded-lg bg-navy-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-navy-800 disabled:opacity-50">
              Assign recommended
            </button>
          ) : (
            <Link href="/settings" className="focus-ring rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">Configure staff</Link>
          )}
        </div>
        {action.branchId && recommendation.branchStaffCount === 0 ? (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 ring-1 ring-amber-100">No staff members are configured for this branch.</p>
        ) : null}
        {!selectedStaffVisible ? (
          <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800 ring-1 ring-rose-100">Current assignee is outside this branch. Choose a branch staff member or clear the assignment.</p>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="grid gap-2 sm:grid-cols-2">
          <SelectSmall label="Assign" value={selectedStaffVisible ? action.assignedStaffId ?? "" : ""} options={compatibleStaff.map((member) => member.id)} labels={staffLabelMap(compatibleStaff)} helper={action.branchId && compatibleStaff.length === 0 ? "No staff members are configured for this branch." : undefined} onChange={(value) => onUpdate(action.id, { assignedStaffId: value || null }, value ? "Assignment updated." : "Assignment cleared.")} disabled={busy} />
          <SelectSmall label="Priority" value={action.priority} options={priorities} onChange={(value) => onUpdate(action.id, { priority: value }, "Priority updated.")} disabled={busy} />
          <FieldSmall label="Due date" type="date" value={action.dueDate ? dateInputValue(action.dueDate) : ""} onChange={(value) => onUpdate(action.id, { dueDate: value }, "Due date updated.")} disabled={busy} />
          <div className="flex flex-wrap items-end gap-2">
            <StatusButton label="Start" status="IN_PROGRESS" action={action} busy={busy} onUpdate={onUpdate} />
            <StatusButton label="Block" status="BLOCKED" action={action} busy={busy} onUpdate={onUpdate} />
            <StatusButton label="Cancel" status="CANCELLED" action={action} busy={busy} onUpdate={onUpdate} />
          </div>
        </div>

        <div className="rounded-lg bg-white p-3 ring-1 ring-slate-200">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Completion outcome</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-[0.8fr_0.7fr]">
            <select value={completion.outcomeType} onChange={(event) => setCompletion((current) => ({ ...current, outcomeType: event.target.value }))} className="focus-ring h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-navy-950">
              {outcomes.map((outcome) => <option key={outcome} value={outcome}>{enumLabel(outcome)}</option>)}
            </select>
            <input value={completion.valueAmount} onChange={(event) => setCompletion((current) => ({ ...current, valueAmount: event.target.value }))} type="number" min="0" className="focus-ring h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-navy-950" />
          </div>
          <textarea value={completion.outcomeNotes} onChange={(event) => setCompletion((current) => ({ ...current, outcomeNotes: event.target.value }))} rows={2} placeholder="Outcome notes" className="focus-ring mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-navy-950 placeholder:text-slate-400" />
          <button type="button" disabled={busy || action.status === "COMPLETED"} onClick={() => onUpdate(action.id, { status: "COMPLETED", ...completion }, "Action completed and outcome recorded.")} className="focus-ring mt-2 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />}
            Mark completed
          </button>
        </div>
      </div>
    </article>
  );
}

function StatusButton({ label, status, action, busy, onUpdate }: { label: string; status: string; action: ActionCenterRecord; busy: boolean; onUpdate: (id: string, payload: Record<string, string | null>, message: string) => Promise<boolean> }) {
  return (
    <button type="button" disabled={busy || action.status === status || action.status === "COMPLETED"} onClick={() => onUpdate(action.id, { status }, `Action moved to ${enumLabel(status)}.`)} className="focus-ring rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:opacity-50">
      {label}
    </button>
  );
}

function Filter({ label, value, options, labels, onChange }: { label: string; value: string; options: string[]; labels?: Record<string, string>; onChange: (value: string) => void }) {
  return (
    <label>
      <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="focus-ring mt-2 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-navy-950">
        {options.map((option) => <option key={option} value={option}>{option === "ALL" ? "All" : labels?.[option] ?? enumLabel(option)}</option>)}
      </select>
    </label>
  );
}

function Field({ label, name, type = "text", required = false, min, defaultValue }: { label: string; name: string; type?: string; required?: boolean; min?: string; defaultValue?: string }) {
  return (
    <label>
      <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</span>
      <input name={name} type={type} required={required} min={min} defaultValue={defaultValue} className="focus-ring mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy-950" />
    </label>
  );
}

function Select({ label, name, options, labels, required = false }: { label: string; name: string; options: string[]; labels?: Record<string, string>; required?: boolean }) {
  return (
    <label>
      <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</span>
      <select name={name} required={required} className="focus-ring mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy-950">
        <option value="">None</option>
        {options.map((option) => <option key={option} value={option}>{labels?.[option] ?? enumLabel(option)}</option>)}
      </select>
    </label>
  );
}

function SelectSmall({ label, value, options, labels, helper, onChange, disabled }: { label: string; value: string; options: string[]; labels?: Record<string, string>; helper?: string; onChange: (value: string) => Promise<boolean>; disabled: boolean }) {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  async function handleChange(nextValue: string) {
    const previousValue = localValue;
    setLocalValue(nextValue);
    const ok = await onChange(nextValue);
    if (!ok) setLocalValue(previousValue);
  }

  return (
    <label>
      <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</span>
      <select value={localValue} disabled={disabled} onChange={(event) => handleChange(event.target.value)} className="focus-ring mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-navy-950 disabled:opacity-60">
        <option value="">None</option>
        {options.map((option) => <option key={option} value={option}>{labels?.[option] ?? enumLabel(option)}</option>)}
      </select>
      {helper ? <span className="mt-1 block text-[11px] font-semibold text-amber-700">{helper}</span> : null}
    </label>
  );
}

function FieldSmall({ label, type, value, onChange, disabled }: { label: string; type: string; value: string; onChange: (value: string) => void; disabled: boolean }) {
  const [localValue, setLocalValue] = useState(value);
  return (
    <label>
      <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</span>
      <input value={localValue} disabled={disabled} type={type} onChange={(event) => setLocalValue(event.target.value)} onBlur={() => onChange(localValue)} className="focus-ring mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-navy-950 disabled:opacity-60" />
    </label>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white p-3 ring-1 ring-slate-200">
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</p>
      <p className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-navy-950">{value}</p>
    </div>
  );
}

function Badge({ label, className }: { label: string; className: string }) {
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ring-1 ${className}`}>{label}</span>;
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <section className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center shadow-soft">
      <SlidersHorizontal className="mx-auto h-8 w-8 text-clinical-700" aria-hidden="true" />
      <h2 className="mt-4 text-2xl font-semibold tracking-tight text-navy-950">No accountability actions yet</h2>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-600">
        Actions turn PORTIONS insights into assigned work: recover an overdue chronic patient, clear an awaiting-payment order, transfer stock, review a branch backlog, or complete a pilot task.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={onCreate} className="focus-ring rounded-lg bg-navy-950 px-4 py-2.5 text-sm font-semibold text-white">Create Action</button>
        <Link href="/patients" className="focus-ring rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700">Review Patients</Link>
        <Link href="/orders" className="focus-ring rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700">Review Orders</Link>
        <Link href="/stock" className="focus-ring rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700">Review Stock</Link>
        <Link href="/pilot-command" className="focus-ring rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700">Pilot Command</Link>
      </div>
    </section>
  );
}
