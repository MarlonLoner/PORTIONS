import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { TenantInviteAcceptForm } from "@/components/tenant-invite-accept-form";
import { getTenantInvitationPreview } from "@/lib/tenant-invitations";
import { acceptTenantInvitationAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function TenantInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const preview = await getTenantInvitationPreview(token);
  const action = acceptTenantInvitationAction.bind(null, token);
  const valid = preview.status === "VALID";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <section className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-lg border border-navy-800 bg-navy-950 p-6 text-white shadow-[0_28px_80px_rgba(6,21,38,0.22)]">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-clinical-100 ring-1 ring-white/15">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Secure Owner Handoff
          </span>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">Activate your PORTIONS owner account</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-200">
            This invitation creates the first pharmacy Owner account for a tenant and assigns administrative access to that tenant&apos;s operating units.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Signal label="Token" value="One use" />
            <Signal label="Password" value="Owner created" />
            <Signal label="Access" value="Tenant scoped" />
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clinical-700">Tenant Invitation</p>
          {valid ? (
            <>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-navy-950">{preview.invitation.tenant.name}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Welcome, {preview.invitation.name}. Create your owner password to activate PORTIONS for this pharmacy tenant.
              </p>
              <div className="mt-5 rounded-lg bg-emerald-50 p-4 text-sm leading-6 text-emerald-800 ring-1 ring-emerald-100">
                The platform team cannot view or retrieve this password after setup.
              </div>
              <TenantInviteAcceptForm action={action} />
            </>
          ) : (
            <InvitationUnavailable status={preview.status} />
          )}
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/" className="focus-ring rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">Back to PORTIONS</Link>
            <Link href="/login" className="focus-ring rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">Sign in</Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function InvitationUnavailable({ status }: { status: string }) {
  const message =
    status === "ACCEPTED"
      ? "This invitation has already been accepted. Sign in with the owner account that was created."
      : status === "EXPIRED"
        ? "This invitation has expired. Ask the PORTIONS platform team to issue a new owner invitation."
        : status === "REVOKED"
          ? "This invitation is no longer active. Ask the PORTIONS platform team for a current invitation."
          : "This invitation is invalid or could not be found.";

  return (
    <div className="mt-5 rounded-lg bg-amber-50 p-4 ring-1 ring-amber-100">
      <h2 className="text-xl font-semibold text-amber-950">Invitation unavailable</h2>
      <p className="mt-2 text-sm leading-6 text-amber-800">{message}</p>
    </div>
  );
}

function Signal({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/10 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}
