import {
  AlertTriangle,
  ArrowUpRight,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Database,
  ShieldCheck,
  Sparkles,
  Target,
  UsersRound
} from "lucide-react";
import { TenantOnboardingStatus, TenantOnboardingStepStatus } from "@prisma/client";
import Link from "next/link";
import type { ReactNode } from "react";
import { TenantOnboardingSubmitForm } from "@/components/tenant-onboarding-submit-form";
import { formatDateTime } from "@/lib/format";
import { getOnboardingPageFeedback } from "@/lib/onboarding-feedback";
import { getTenantOnboardingSummary } from "@/lib/onboarding";
import { submitGoLiveReviewAction, type SubmitGoLiveReviewState } from "./actions";

export const dynamic = "force-dynamic";

const onboardingStatusClasses: Record<TenantOnboardingStatus, string> = {
  NOT_STARTED: "bg-slate-100 text-slate-700 ring-slate-200",
  IN_PROGRESS: "bg-clinical-50 text-clinical-800 ring-clinical-200",
  WAITING_FOR_TENANT: "bg-sky-50 text-sky-700 ring-sky-200",
  READY_FOR_REVIEW: "bg-amber-50 text-amber-700 ring-amber-200",
  UNDER_REVIEW: "bg-navy-950 text-white ring-navy-900",
  CHANGES_REQUESTED: "bg-rose-50 text-rose-700 ring-rose-200",
  APPROVED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  ACTIVE: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  BLOCKED: "bg-rose-50 text-rose-700 ring-rose-200"
};

const stepStatusClasses: Record<TenantOnboardingStepStatus, string> = {
  NOT_STARTED: "bg-slate-100 text-slate-700 ring-slate-200",
  IN_PROGRESS: "bg-clinical-50 text-clinical-800 ring-clinical-200",
  COMPLETE: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  BLOCKED: "bg-rose-50 text-rose-700 ring-rose-200",
  SKIPPED: "bg-slate-100 text-slate-500 ring-slate-200"
};

const nonSubmittableStatuses = new Set<TenantOnboardingStatus>([
  TenantOnboardingStatus.READY_FOR_REVIEW,
  TenantOnboardingStatus.UNDER_REVIEW,
  TenantOnboardingStatus.APPROVED,
  TenantOnboardingStatus.ACTIVE,
  TenantOnboardingStatus.BLOCKED
]);

type OnboardingSummary = Awaited<ReturnType<typeof getTenantOnboardingSummary>>;

export default async function OnboardingPage({
  searchParams
}: {
  searchParams?: Promise<{ success?: string; error?: string }>;
}) {
  const emptySearchParams: { success?: string; error?: string } = {};
  const [summary, params] = await Promise.all([
    getTenantOnboardingSummary(),
    searchParams ?? Promise.resolve(emptySearchParams)
  ]);
  const feedback = getOnboardingPageFeedback(params);
  const goLiveState = getGoLiveState(summary);

  const openSteps = summary.steps.filter((step) => step.key !== "GO_LIVE_REVIEW" && step.status !== TenantOnboardingStepStatus.COMPLETE);
  const completedSteps = summary.steps.filter((step) => step.key !== "GO_LIVE_REVIEW" && step.status === TenantOnboardingStepStatus.COMPLETE);
  const showSubmit =
    summary.submissionPolicy.canSubmit &&
    !nonSubmittableStatuses.has(summary.status);
  const submitAction = submitGoLiveReviewAction as (
    state: SubmitGoLiveReviewState,
    formData: FormData
  ) => Promise<SubmitGoLiveReviewState>;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-lg border border-navy-800 bg-navy-950 p-5 text-white shadow-[0_28px_80px_rgba(6,21,38,0.22)] sm:p-6 xl:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.12),transparent_36%),linear-gradient(180deg,rgba(75,158,201,0.18),transparent_58%)]" />
        <div className="relative grid gap-7 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="flex min-h-[320px] flex-col justify-between gap-8">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-clinical-100 ring-1 ring-white/15">
                  <ClipboardCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  Tenant Launch Workspace
                </span>
                <StatusPill className={onboardingStatusClasses[summary.status]}>
                  {summary.status.replace(/_/g, " ")}
                </StatusPill>
                <StatusPill className="bg-emerald-400/10 text-emerald-100 ring-emerald-300/20">
                  {summary.submissionPolicy.label}
                </StatusPill>
              </div>
              <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">Guided Onboarding</h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-200">
                Move the pharmacy from first owner login to operational readiness, with real evidence behind every activation step and a clean platform review gate at the end.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <HeroLink href={summary.nextRecommendedAction.href} label={summary.nextRecommendedAction.label} />
                <HeroLink href="/dashboard" label="Back to dashboard" subtle />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <CommandSignal label="Current step" value={summary.currentStep.title} helper={summary.currentStep.why} />
              <CommandSignal label="Required complete" value={`${summary.completedRequiredSteps} / ${summary.totalRequiredSteps}`} helper="Evidence-backed launch requirements" />
              <CommandSignal
                label="Open blockers"
                value={String(summary.blockers.length)}
                helper={summary.blockers[0] ?? "No critical blockers right now."}
                tone={summary.blockers.length > 0 ? "risk" : "success"}
              />
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/10 p-4 backdrop-blur">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-clinical-100">Activation readiness</p>
            <div className="mt-4 rounded-lg bg-white p-5 text-navy-950">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Readiness score</p>
                  <p className="mt-3 text-5xl font-semibold tracking-tight">{summary.readinessScore}%</p>
                </div>
                <div className="rounded-lg bg-navy-950 p-3 text-white">
                  <Target className="h-5 w-5" aria-hidden="true" />
                </div>
              </div>
              <div className="mt-5 h-2 rounded-full bg-slate-100">
                <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${Math.max(summary.readinessScore, 8)}%` }} />
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <PulseMetric label="Branches live" value={String(summary.counts.branches)} />
                <PulseMetric label="Active users" value={String(summary.counts.activeUsers)} />
                <PulseMetric label="Patients live" value={String(summary.counts.patients)} />
                <PulseMetric label="Stock live" value={String(summary.counts.stockItems)} />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <ExecutiveFlag label="Permissions health" value={summary.permissions.healthy ? "Healthy" : "Needs review"} intent={summary.permissions.healthy ? "success" : "risk"} />
              <ExecutiveFlag label="Import evidence" value={`${summary.counts.importedBatches} imported`} intent={summary.counts.importedBatches > 0 ? "normal" : "warn"} />
            </div>
          </div>
        </div>
      </section>

      {feedback ? <Banner tone={feedback.tone}>{feedback.message}</Banner> : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Tenant" value={summary.tenant.name} helper={`${summary.tenant.country} / ${summary.tenant.currency} / ${summary.tenant.timezone}`} />
        <MetricCard label="Current step" value={summary.currentStep.title} helper={summary.currentStep.actionLinks[0]?.label ?? "Open onboarding actions"} />
        <MetricCard label="Import batches" value={String(summary.counts.totalImportBatches)} helper={`${summary.counts.importedBatches} approved and executed`} />
        <MetricCard label="WhatsApp units" value={String(summary.counts.unitsWithWhatsapp)} helper="Configured sender points" />
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
        <Panel title="Launch policy" eyebrow="Activation logic" icon={<ShieldCheck className="h-5 w-5" />}>
          <p className="text-sm leading-7 text-slate-700">{summary.submissionPolicy.explanation}</p>
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Submission minimum</p>
            <div className="mt-3 space-y-2">
              {summary.submissionPolicy.minimumRequirementLabels.map((item) => (
                <ListRow key={item} tone="normal">
                  {item}
                </ListRow>
              ))}
            </div>
          </div>
          <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Current blockers</p>
            <div className="mt-3 space-y-2">
              {summary.submissionPolicy.blockingReasons.length > 0 ? (
                summary.submissionPolicy.blockingReasons.map((item) => (
                  <ListRow key={item} tone="risk">
                    {item}
                  </ListRow>
                ))
              ) : (
                <ListRow tone="success">This tenant can move to go-live review under the current policy.</ListRow>
              )}
            </div>
          </div>
          {summary.submissionPolicy.remainingOptionalTasks.length > 0 ? (
            <div className="mt-4 rounded-lg border border-clinical-100 bg-clinical-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-clinical-700">Remaining rollout tasks</p>
              <div className="mt-3 space-y-2">
                {summary.submissionPolicy.remainingOptionalTasks.map((item) => (
                  <ListRow key={item} tone="normal">
                    {item}
                  </ListRow>
                ))}
              </div>
            </div>
          ) : null}
        </Panel>

        <Panel title="AI onboarding guidance" eyebrow="Operational interpretation" icon={<Bot className="h-5 w-5" />}>
          <div className="rounded-lg border border-navy-800 bg-navy-950 p-5 text-white shadow-[0_16px_40px_rgba(6,21,38,0.18)]">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-white/10 p-3 text-clinical-100 ring-1 ring-white/15">
                <Sparkles className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="space-y-3">
                {summary.summaryLines.map((line) => (
                  <p key={line} className="text-sm leading-7 text-slate-100">
                    {line}
                  </p>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <InfoTile icon={<UsersRound className="h-4 w-4" />} label="Team activation" value={`${summary.counts.activeUsers} active / ${summary.counts.invitedNonOwnerUsers} invited`} />
            <InfoTile icon={<Database className="h-4 w-4" />} label="Data readiness" value={`${summary.counts.patients} patients / ${summary.counts.stockItems} stock`} />
            <InfoTile icon={<ShieldCheck className="h-4 w-4" />} label="Permission cleanup" value={summary.permissions.healthy ? "Clear" : "Required"} />
            <InfoTile icon={<Clock3 className="h-4 w-4" />} label="Review state" value={summary.onboarding.reviewedAt ? formatDateTime(summary.onboarding.reviewedAt) : "Not reviewed"} />
          </div>
        </Panel>
      </section>

      <Panel title="Activation steps" eyebrow="Evidence-backed progress" icon={<ClipboardCheck className="h-5 w-5" />}>
        <div className="grid gap-4 xl:grid-cols-2">
          {summary.steps.map((step) => {
            const isCurrent = step.key === summary.currentStepKey;
            return (
              <article
                key={step.key}
                className={`rounded-lg border p-4 shadow-soft transition ${
                  isCurrent ? "border-clinical-300 bg-clinical-50" : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-navy-950">{step.title}</h3>
                      {step.required ? (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-600">Required</span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{step.why}</p>
                  </div>
                  <StatusPill className={stepStatusClasses[step.status]}>
                    {step.status.replace(/_/g, " ")}
                  </StatusPill>
                </div>

                {step.evidence.length > 0 ? (
                  <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Completion evidence</p>
                    <div className="mt-3 space-y-2">
                      {step.evidence.map((item) => (
                        <ListRow key={item} tone="success">
                          {item}
                        </ListRow>
                      ))}
                    </div>
                  </div>
                ) : null}

                {step.blockers.length > 0 ? (
                  <div className="mt-4 rounded-lg border border-rose-100 bg-rose-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-rose-700">Blockers</p>
                    <div className="mt-3 space-y-2">
                      {step.blockers.map((item) => (
                        <ListRow key={item} tone="risk">
                          {item}
                        </ListRow>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  {step.actionLinks.map((link) => (
                    <Link
                      key={`${step.key}-${link.href}-${link.label}`}
                      href={link.href}
                      className={`focus-ring inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${
                        isCurrent ? "bg-navy-950 text-white" : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {link.label}
                      <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </Panel>

      <section id="go-live-review" className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <Panel title="Go-live review" eyebrow="Final gate" icon={<CheckCircle2 className="h-5 w-5" />}>
          <div className={`rounded-lg border p-4 ${goLiveState.panelClass}`}>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Submission state</p>
            <p className="mt-2 text-lg font-semibold text-navy-950">{goLiveState.title}</p>
            <p className="mt-3 text-sm leading-6 text-slate-700">{goLiveState.description}</p>
          </div>
          <div className="mt-4 space-y-3">
            <ListRow tone={summary.submissionPolicy.canSubmit ? "success" : "risk"}>
              Readiness score: {summary.readinessScore}%
            </ListRow>
            <ListRow tone={summary.completedRequiredSteps === summary.totalRequiredSteps ? "success" : "normal"}>
              Required steps complete: {summary.completedRequiredSteps} of {summary.totalRequiredSteps}
            </ListRow>
            <ListRow tone={summary.permissions.healthy ? "success" : "risk"}>
              Permissions health: {summary.permissions.healthy ? "Clean" : "Needs review"}
            </ListRow>
            <ListRow tone={summary.counts.importedBatches > 0 ? "success" : "normal"}>
              Imported data batches: {summary.counts.importedBatches}
            </ListRow>
            {summary.onboarding.submittedAt ? (
              <ListRow tone="normal">Submitted: {formatDateTime(summary.onboarding.submittedAt)}</ListRow>
            ) : null}
            {(summary.status === TenantOnboardingStatus.READY_FOR_REVIEW || summary.status === TenantOnboardingStatus.UNDER_REVIEW) ? (
              <ListRow tone="normal">Platform review pending</ListRow>
            ) : null}
            {summary.onboarding.reviewedAt ? (
              <ListRow tone="normal">Latest platform review touch: {formatDateTime(summary.onboarding.reviewedAt)}</ListRow>
            ) : null}
            {summary.onboarding.activatedAt ? (
              <ListRow tone="success">Activated: {formatDateTime(summary.onboarding.activatedAt)}</ListRow>
            ) : null}
          </div>

          {summary.onboarding.reviewNotes ? (
            <div className="mt-4 rounded-lg border border-amber-100 bg-amber-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">Review notes</p>
              <p className="mt-2 text-sm leading-6 text-amber-900">{summary.onboarding.reviewNotes}</p>
            </div>
          ) : null}

          {showSubmit ? (
            <TenantOnboardingSubmitForm action={submitAction} />
          ) : null}
        </Panel>

        <Panel title="What still matters after launch" eyebrow="Operating discipline" icon={<AlertTriangle className="h-5 w-5" />}>
          {openSteps.length > 0 ? (
            <div className="space-y-3">
              {openSteps.map((step) => (
                <div key={step.key} className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-navy-950">{step.title}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{step.blockers[0] ?? step.why}</p>
                    </div>
                    <StatusPill className={stepStatusClasses[step.status]}>
                      {step.status.replace(/_/g, " ")}
                    </StatusPill>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
              All current onboarding requirements are evidenced. Use this workspace as the permanent launch history for future audits, rollout reviews, and branch expansion checks.
            </div>
          )}

          {completedSteps.length > 0 ? (
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Completed activation proof</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {completedSteps.map((step) => (
                  <ListRow key={step.key} tone="success">
                    {step.title}
                  </ListRow>
                ))}
              </div>
            </div>
          ) : null}
        </Panel>
      </section>
    </div>
  );
}

function getGoLiveState(summary: OnboardingSummary) {
  if (summary.status === TenantOnboardingStatus.ACTIVE) {
    return {
      title: "Pharmacy workspace activated",
      description: "Go-live has been approved and activation is complete. This page now serves as the launch history for future audits, rollout reviews, and branch expansion work.",
      panelClass: "border-emerald-200 bg-emerald-50"
    };
  }

  if (summary.status === TenantOnboardingStatus.APPROVED) {
    return {
      title: "Go-live approved",
      description: "Platform approval has been recorded. PORTIONS is finalizing the activation trail for this pharmacy workspace.",
      panelClass: "border-emerald-200 bg-emerald-50"
    };
  }

  if (summary.status === TenantOnboardingStatus.READY_FOR_REVIEW) {
    return {
      title: "Submitted for go-live review",
      description: "The tenant met the current launch minimum and has already been submitted. Platform review is pending, so there is nothing else to resubmit right now.",
      panelClass: "border-amber-200 bg-amber-50"
    };
  }

  if (summary.status === TenantOnboardingStatus.UNDER_REVIEW) {
    return {
      title: "Platform review in progress",
      description: "A platform reviewer is actively working this launch. Keep the workspace current, but do not submit again unless new changes are requested.",
      panelClass: "border-navy-200 bg-slate-50"
    };
  }

  if (summary.status === TenantOnboardingStatus.CHANGES_REQUESTED) {
    return {
      title: "Changes requested before go-live",
      description: "Platform review returned this tenant for updates. Resolve the review notes below, confirm the launch evidence again, then resubmit for review.",
      panelClass: "border-amber-200 bg-amber-50"
    };
  }

  if (summary.status === TenantOnboardingStatus.BLOCKED) {
    return {
      title: "Go-live blocked",
      description: "Platform review has blocked activation for now. Review the notes carefully and clear the issue before expecting approval.",
      panelClass: "border-rose-200 bg-rose-50"
    };
  }

  if (summary.submissionPolicy.canSubmit) {
    return {
      title: "Ready for go-live submission",
      description: "The current launch minimum is complete. Submit now when the owner is ready for platform review.",
      panelClass: "border-slate-200 bg-slate-50"
    };
  }

  return {
    title: "Not ready for go-live submission",
    description: "This tenant still has open blockers. Clear the remaining onboarding requirements before submitting for platform review.",
    panelClass: "border-slate-200 bg-slate-50"
  };
}

function Banner({ children, tone }: { children: ReactNode; tone: "success" | "error" }) {
  return (
    <div
      className={`rounded-lg border p-4 text-sm font-medium ${
        tone === "success"
          ? "border-emerald-100 bg-emerald-50 text-emerald-900"
          : "border-rose-100 bg-rose-50 text-rose-900"
      }`}
    >
      {children}
    </div>
  );
}

function StatusPill({ children, className }: { children: ReactNode; className: string }) {
  return <span className={`inline-flex rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] ring-1 ${className}`}>{children}</span>;
}

function HeroLink({ href, label, subtle = false }: { href: string; label: string; subtle?: boolean }) {
  return (
    <Link
      href={href}
      className={`focus-ring inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold ${
        subtle ? "bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/15" : "bg-white text-navy-950 hover:bg-clinical-50"
      }`}
    >
      {label}
      <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
    </Link>
  );
}

function CommandSignal({
  label,
  value,
  helper,
  tone = "default"
}: {
  label: string;
  value: string;
  helper: string;
  tone?: "default" | "risk" | "success";
}) {
  const toneClass =
    tone === "risk"
      ? "border-rose-300/20 bg-rose-300/10"
      : tone === "success"
        ? "border-emerald-300/20 bg-emerald-300/10"
        : "border-white/10 bg-white/10";

  return (
    <div className={`rounded-lg border p-4 ${toneClass}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-200">{helper}</p>
    </div>
  );
}

function PulseMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-navy-950">{value}</p>
    </div>
  );
}

function ExecutiveFlag({
  label,
  value,
  intent
}: {
  label: string;
  value: string;
  intent: "normal" | "warn" | "risk" | "success";
}) {
  const classes =
    intent === "risk"
      ? "border-rose-200 bg-rose-50 text-rose-800"
      : intent === "warn"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : intent === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-slate-200 bg-white text-slate-800";

  return (
    <div className={`rounded-lg border p-3 ${classes}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em]">{label}</p>
      <p className="mt-2 text-sm font-semibold">{value}</p>
    </div>
  );
}

function MetricCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-soft">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-navy-950">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{helper}</p>
    </article>
  );
}

function Panel({ title, eyebrow, icon, children }: { title: string; eyebrow: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
      <div className="flex items-center gap-2 text-clinical-700">
        {icon}
        <p className="text-xs font-semibold uppercase tracking-[0.12em]">{eyebrow}</p>
      </div>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-navy-950">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function InfoTile({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 text-clinical-700">
        {icon}
        <p className="text-xs font-semibold uppercase tracking-[0.1em]">{label}</p>
      </div>
      <p className="mt-3 text-sm font-semibold text-navy-950">{value}</p>
    </div>
  );
}

function ListRow({ children, tone }: { children: ReactNode; tone: "normal" | "success" | "risk" }) {
  const iconTone =
    tone === "risk"
      ? "text-rose-600"
      : tone === "success"
        ? "text-emerald-600"
        : "text-clinical-700";

  return (
    <div className="flex items-start gap-3 rounded-lg bg-white/70 p-2">
      <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${iconTone}`} aria-hidden="true" />
      <p className="text-sm leading-6 text-slate-700">{children}</p>
    </div>
  );
}
