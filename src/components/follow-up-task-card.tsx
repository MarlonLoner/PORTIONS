"use client";

import clsx from "clsx";
import { CheckCircle2, Clock3, DollarSign, MessageSquareText, Wand2 } from "lucide-react";
import { useState } from "react";
import { RiskBadge } from "@/components/risk-badge";
import { StatusBadge } from "@/components/status-badge";
import { chronicActionCopy, estimateMonthlyPatientValue } from "@/lib/chronic";
import { daysFromNow, enumLabel, formatCurrency, formatDate } from "@/lib/format";

export function FollowUpTaskCard({
  task
}: {
  task: {
    id: string;
    customerName: string;
    reason: string;
    type: string;
    status: string;
    dueDate: Date;
    suggestedAction: string;
    suggestedMessage: string;
    branch: { name: string };
    patient?: {
      name: string;
      conditionCategory: string;
      packageType: string;
      status: string;
      riskScore: string;
      nextRefillDate: Date;
      refillEvents?: Array<{ amount: number | string | { toString(): string } }>;
    } | null;
  };
}) {
  const [state, setState] = useState(task.status);
  const [showMessage, setShowMessage] = useState(false);
  const dueDistance = daysFromNow(task.dueDate);
  const overdue = dueDistance < 0 || task.type === "OVERDUE";
  const highRisk = task.patient?.riskScore === "HIGH";
  const estimatedValue = task.patient ? estimateMonthlyPatientValue(task.patient) : 0;
  const operationalSuggestion = task.patient ? chronicActionCopy(task.patient) : pharmacySuggestion(task.type, task.customerName);

  return (
    <article
      className={clsx(
        "rounded-lg border bg-white p-4 shadow-soft transition hover:-translate-y-0.5",
        overdue || highRisk ? "border-rose-200 hover:border-rose-300" : "border-slate-200 hover:border-clinical-200"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-navy-950">{task.customerName}</p>
            {task.patient ? <RiskBadge risk={task.patient.riskScore} /> : null}
          </div>
          <p className="mt-1 text-xs text-slate-500">{task.branch.name} - {enumLabel(task.type)}</p>
        </div>
        <StatusBadge status={state} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Metric label="Due date" value={formatDate(task.dueDate)} emphasis={overdue ? `${Math.abs(dueDistance)}d overdue` : dueDistance === 0 ? "Due today" : `${dueDistance}d`} intent={overdue ? "risk" : "normal"} />
        <Metric label="Estimated value" value={estimatedValue ? formatCurrency(estimatedValue) : "Not linked"} emphasis={estimatedValue ? "monthly" : "manual follow-up"} intent={estimatedValue ? "value" : "normal"} />
      </div>

      <p className="mt-4 text-sm font-medium text-slate-800">{task.reason}</p>
      <p className={overdue || highRisk ? "mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm leading-6 text-rose-800" : "mt-3 rounded-lg bg-clinical-50 px-3 py-2 text-sm leading-6 text-clinical-800"}>
        {operationalSuggestion}
      </p>
      <p className="mt-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-600">
        {task.suggestedAction}
      </p>
      {showMessage ? (
        <div className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm leading-6 text-emerald-900">
          {task.suggestedMessage}
        </div>
      ) : null}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <button
          type="button"
          className="focus-ring inline-flex items-center justify-center gap-1.5 rounded-lg bg-navy-950 px-3 py-2 text-xs font-semibold text-white"
          onClick={() => setState("DONE")}
        >
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
          Done
        </button>
        <button
          type="button"
          className="focus-ring inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
          onClick={() => setState("SNOOZED")}
        >
          <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
          Snooze
        </button>
        <button
          type="button"
          className="focus-ring inline-flex items-center justify-center gap-1.5 rounded-lg border border-clinical-200 bg-clinical-50 px-3 py-2 text-xs font-semibold text-clinical-800"
          onClick={() => setShowMessage((value) => !value)}
        >
          {showMessage ? <MessageSquareText className="h-3.5 w-3.5" aria-hidden="true" /> : <Wand2 className="h-3.5 w-3.5" aria-hidden="true" />}
          Message
        </button>
      </div>
    </article>
  );
}

function Metric({
  label,
  value,
  emphasis,
  intent
}: {
  label: string;
  value: string;
  emphasis: string;
  intent: "normal" | "risk" | "value";
}) {
  return (
    <div className={intent === "risk" ? "rounded-lg border border-rose-100 bg-rose-50 p-3" : "rounded-lg border border-slate-100 bg-slate-50 p-3"}>
      <div className="flex items-center gap-1.5">
        {intent === "value" ? <DollarSign className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" /> : null}
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</p>
      </div>
      <p className={intent === "risk" ? "mt-1 font-semibold text-rose-700" : "mt-1 font-semibold text-navy-950"}>{value}</p>
      <p className="mt-1 text-xs text-slate-500">{emphasis}</p>
    </div>
  );
}

function pharmacySuggestion(type: string, customerName: string) {
  const firstName = customerName.split(" ")[0];

  if (type === "PAYMENT_PENDING") {
    return `${firstName}'s order is commercially ready but unpaid. Send a payment reminder and confirm dispatch once paid.`;
  }

  if (type === "DELIVERY_CONFIRMATION") {
    return `Confirm delivery address and time window before the pack leaves the branch.`;
  }

  if (type === "PRESCRIPTION_RENEWAL_NEEDED") {
    return `Ask for the updated prescription and route to pharmacist review before preparing the next chronic pack.`;
  }

  if (type === "LOST_PATIENT_REVIVAL") {
    return `${firstName} may be drifting out of the chronic book. Check medication continuity and offer a recovery refill path.`;
  }

  return `Contact ${firstName} and turn this follow-up into a confirmed refill or clear next action.`;
}
