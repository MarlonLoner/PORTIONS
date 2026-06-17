import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { PlatformOnboardingReviewForm } from "@/components/platform-onboarding-review-form";
import { requirePlatformUser } from "@/lib/platform-auth";
import { getTenantControlPlaneDetail } from "@/lib/platform";
import { getPlatformTenantFeedback } from "@/lib/onboarding-feedback";
import { getPlatformTenantOnboardingSummary } from "@/lib/onboarding";
import { TenantOwnerInvitationForm } from "@/components/tenant-owner-invitation-form";
import { isInvitationEmailConfigured } from "@/lib/invitation-delivery";
import {
  createOwnerInvitationAction,
  reviewTenantOnboardingStatefulAction,
  revokeOwnerInvitationAction,
  type PlatformOnboardingReviewState
} from "./actions";

export default async function PlatformTenantDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ success?: string; error?: string }>;
}) {
  await requirePlatformUser();
  const { id } = await params;
  const emptySearchParams: { success?: string; error?: string } = {};
  const tenant = await getTenantControlPlaneDetail(id);
  if (!tenant) notFound();
  const [onboarding, feedback] = await Promise.all([
    getPlatformTenantOnboardingSummary(id),
    searchParams ?? Promise.resolve(emptySearchParams)
  ]);
  const flash = getPlatformTenantFeedback(feedback);
  const activeOwner = tenant.appUsers.find((user) => user.role === "OWNER" && user.status === "ACTIVE");
  const latestInvitation = tenant.userInvitations[0];
  const pendingInvitation = tenant.userInvitations.find((invitation) => invitation.status === "PENDING" && invitation.expiresAt > new Date());
  const headOffice = tenant.operatingUnits.find((unit) => unit.type === "HEAD_OFFICE");
  const onlineUnit = tenant.operatingUnits.find((unit) => unit.type === "ONLINE_DEPARTMENT" && unit.isPrimaryOnlineUnit);
  const provisioningSteps = [
    { label: "Tenant created", complete: true, detail: tenant.createdAt.toLocaleDateString() },
    { label: "Head Office created", complete: Boolean(headOffice), detail: headOffice?.status ?? "Missing" },
    { label: "Online Department created", complete: Boolean(onlineUnit), detail: onlineUnit?.status ?? "Missing" },
    { label: "First Owner invited", complete: Boolean(latestInvitation), detail: latestInvitation?.status ?? "Not started" },
    { label: "First Owner activated", complete: Boolean(activeOwner), detail: activeOwner?.status ?? "Waiting" },
    { label: "First login completed", complete: Boolean(activeOwner?.lastLoginAt), detail: activeOwner?.lastLoginAt?.toLocaleDateString() ?? "Waiting" },
    { label: "Password changed", complete: Boolean(activeOwner && !activeOwner.mustChangePassword), detail: activeOwner ? "Owner controlled" : "Waiting" },
    { label: "Initial branch created", complete: tenant.branches.length > 0, detail: tenant.branches[0]?.name ?? "Not configured" },
    {
      label: "Onboarding complete",
      complete: Boolean(activeOwner?.lastLoginAt && tenant.branches.length > 0),
      detail: activeOwner?.lastLoginAt && tenant.branches.length > 0 ? "Ready" : "In progress"
    }
  ];
  const provisioningComplete = provisioningSteps.filter((step) => step.complete).length;
  const provisioningStatus = getProvisioningStatus({ activeOwner: Boolean(activeOwner), pendingInvitation: Boolean(pendingInvitation), complete: provisioningComplete === provisioningSteps.length });
  const createOwnerInvitation = createOwnerInvitationAction.bind(null, tenant.id);
  const revokeOwnerInvitation = revokeOwnerInvitationAction.bind(null, tenant.id);
  const reviewOnboarding = reviewTenantOnboardingStatefulAction.bind(null, tenant.id) as (
    state: PlatformOnboardingReviewState,
    formData: FormData
  ) => Promise<PlatformOnboardingReviewState>;
  const emailConfigured = isInvitationEmailConfigured();

  return (
    <>
      {flash ? <Flash tone={flash.tone}>{flash.message}</Flash> : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-clinical-700">Tenant profile</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-navy-950">{tenant.name}</h1>
            <p className="mt-2 text-sm text-slate-500">{tenant.slug} / {tenant.country} / {tenant.timezone} / {tenant.currency}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge>{tenant.status}</Badge>
            <Badge>{tenant.plan}</Badge>
            <Badge>{tenant.subscriptionStatus}</Badge>
            <Badge>{provisioningStatus}</Badge>
            {tenant.isDemoTenant ? <Badge>Demo tenant</Badge> : null}
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_0.95fr]">
        <Panel title="Tenant Provisioning State">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Owner handoff progress</p>
                <p className="mt-2 text-2xl font-semibold text-navy-950">{provisioningComplete} / {provisioningSteps.length}</p>
              </div>
              <Badge>{provisioningStatus}</Badge>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {provisioningSteps.map((step) => (
              <div key={step.label} className="rounded-lg border border-slate-100 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold text-navy-950">{step.label}</p>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${step.complete ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                    {step.complete ? "Complete" : "Waiting"}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-500">{step.detail}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Tenant Owner Setup">
          {activeOwner ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-semibold text-emerald-950">Active owner</p>
              <p className="mt-2 text-lg font-semibold text-navy-950">{activeOwner.name}</p>
              <p className="mt-1 text-sm text-emerald-800">{activeOwner.email} / {activeOwner.role} / {activeOwner.status}</p>
              <p className="mt-3 text-sm leading-6 text-emerald-800">
                Tenant administration has been handed to the pharmacy owner. Platform users can monitor setup state and support access, but ordinary tenant staff management belongs inside the tenant admin area.
              </p>
            </div>
          ) : (
            <TenantOwnerInvitationForm
              action={createOwnerInvitation}
              revokeAction={revokeOwnerInvitation}
              pendingInvitation={pendingInvitation}
              emailConfigured={emailConfigured}
            />
          )}
          {tenant.userInvitations.length ? (
            <div className="grid gap-3">
              {tenant.userInvitations.map((invitation) => (
                <div key={invitation.id} className="rounded-lg border border-slate-100 p-4">
                  <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                    <div>
                      <p className="font-semibold text-navy-950">{invitation.name}</p>
                      <p className="mt-1 text-sm text-slate-500">{invitation.email} / invited by {invitation.invitedByPlatformUser.name}</p>
                    </div>
                    <Badge>{invitation.status}</Badge>
                  </div>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">
                    Delivery manual handoff / Expires {invitation.expiresAt.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_0.95fr]">
        <Panel title="Onboarding & Activation">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Platform-safe activation summary</p>
                <p className="mt-2 text-2xl font-semibold text-navy-950">{onboarding.readinessScore}% readiness</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge>{onboarding.status}</Badge>
                <Badge>{onboarding.submissionPolicy.label}</Badge>
              </div>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Metric label="Current step" value={onboarding.currentStep.title} />
            <Metric label="Required complete" value={`${onboarding.completedRequiredSteps}/${onboarding.totalRequiredSteps}`} />
            <Metric label="Branch count" value={onboarding.counts.branches} />
            <Metric label="Active users" value={onboarding.counts.activeUsers} />
            <Metric label="Patients" value={onboarding.counts.patients} />
            <Metric label="Stock items" value={onboarding.counts.stockItems} />
            <Metric label="Import batches" value={onboarding.counts.totalImportBatches} />
            <Metric label="WhatsApp units" value={onboarding.counts.unitsWithWhatsapp} />
            <Metric label="Permissions health" value={onboarding.permissions.healthy ? "Healthy" : "Needs review"} />
          </div>
          <div className="grid gap-3">
            {onboarding.steps.map((step) => (
              <div key={step.key} className="rounded-lg border border-slate-100 p-4">
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                  <div>
                    <p className="font-semibold text-navy-950">{step.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{step.why}</p>
                  </div>
                  <Badge>{step.status}</Badge>
                </div>
                {step.evidence.length > 0 ? <p className="mt-2 text-sm text-slate-600">{step.evidence[0]}</p> : null}
                {step.blockers.length > 0 ? <p className="mt-2 text-sm font-medium text-rose-700">{step.blockers[0]}</p> : null}
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Activation Review Controls">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm leading-6 text-slate-700">
              This panel intentionally shows only non-sensitive setup evidence: readiness score, branch and user counts, import progress, WhatsApp status, and permissions health. Patient identities, phone numbers, medication details, and communication content stay inside the tenant workspace.
            </p>
          </div>
          <div className="grid gap-3">
            {onboarding.submissionPolicy.blockingReasons.length > 0 ? (
              onboarding.submissionPolicy.blockingReasons.map((item) => (
                <div key={item} className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  {item}
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                This tenant satisfies the current {onboarding.submissionPolicy.label.toLowerCase()} and can move through review.
              </div>
            )}
          </div>
          <PlatformOnboardingReviewForm action={reviewOnboarding} defaultNotes={onboarding.onboarding.reviewNotes ?? ""} />
          {onboarding.onboarding.submittedAt ? (
            <div className="rounded-lg border border-slate-100 p-4 text-sm text-slate-600">
              Submitted: {onboarding.onboarding.submittedAt.toLocaleString()}
              {onboarding.onboarding.reviewedAt ? ` / Reviewed: ${onboarding.onboarding.reviewedAt.toLocaleString()}` : ""}
              {onboarding.onboarding.activatedAt ? ` / Activated: ${onboarding.onboarding.activatedAt.toLocaleString()}` : ""}
            </div>
          ) : null}
        </Panel>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric label="Operating units" value={tenant._count.operatingUnits} />
        <Metric label="Branches" value={tenant._count.branches} />
        <Metric label="Users" value={tenant._count.appUsers} />
        <Metric label="Staff" value={tenant._count.staffMembers} />
        <Metric label="Patient records" value={tenant._count.patients} />
        <Metric label="Orders" value={tenant._count.orders} />
        <Metric label="Stock records" value={tenant._count.stockItems} />
        <Metric label="Import batches" value={tenant._count.importBatches} />
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <Panel title="Tenant Administrators">
          {tenant.appUsers.length ? tenant.appUsers.map((user) => (
            <div key={user.id} className="rounded-lg border border-slate-100 p-4">
              <p className="font-semibold text-navy-950">{user.name}</p>
              <p className="mt-1 text-sm text-slate-500">{user.email} / {user.role} / {user.status}</p>
            </div>
          )) : <Empty>No tenant administrators are configured yet.</Empty>}
        </Panel>

        <Panel title="Support Access History">
          {tenant.supportRequests.length ? tenant.supportRequests.map((request) => (
            <div key={request.id} className="rounded-lg border border-slate-100 p-4">
              <p className="font-semibold text-navy-950">{request.scope} / {request.status}</p>
              <p className="mt-1 text-sm text-slate-500">Requested by {request.requestedByPlatformUser.name} ({request.requestedByPlatformUser.role})</p>
            </div>
          )) : <Empty>No support access requests are active for this tenant.</Empty>}
        </Panel>
      </section>

      <Panel title="Audit Summary">
        {tenant.auditLogs.length ? tenant.auditLogs.map((log) => (
          <div key={log.id} className="rounded-lg border border-slate-100 p-4">
            <p className="font-semibold text-navy-950">{log.action} / {log.outcome}</p>
            <p className="mt-1 text-sm text-slate-500">{log.actorLabel ?? log.actorType} / {log.recordType ?? "platform"} / {log.createdAt.toLocaleString()}</p>
          </div>
        )) : <Empty>No audit records have been captured for this tenant yet.</Empty>}
      </Panel>
    </>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">{typeof children === "string" ? children.replace(/_/g, " ") : children}</span>;
}

function Metric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-navy-950">{value}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-navy-950">{title}</h2>
      <div className="mt-5 grid gap-3">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">{children}</p>;
}

function Flash({ children, tone }: { children: ReactNode; tone: "success" | "error" }) {
  return (
    <div className={`rounded-xl border p-4 text-sm font-medium ${tone === "success" ? "border-emerald-100 bg-emerald-50 text-emerald-900" : "border-rose-100 bg-rose-50 text-rose-900"}`}>
      {children}
    </div>
  );
}

function getProvisioningStatus(input: { activeOwner: boolean; pendingInvitation: boolean; complete: boolean }) {
  if (input.complete) return "COMPLETE";
  if (input.activeOwner) return "ACTIVE";
  if (input.pendingInvitation) return "WAITING_FOR_OWNER";
  return "IN_PROGRESS";
}
