import { KeyRound } from "lucide-react";
import { ChangePasswordForm } from "@/components/change-password-form";
import { requireAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ChangePasswordPage() {
  const user = await requireAuthenticatedUser();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="rounded-lg border border-navy-800 bg-navy-950 p-6 text-white shadow-[0_28px_80px_rgba(6,21,38,0.22)]">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-clinical-100 ring-1 ring-white/15">
          <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
          First sign-in security
        </span>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight">Change Password</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-200">
          {user.mustChangePassword ? "Your account was created with a temporary password. Set a new password before continuing into PORTIONS." : "Update your password securely."}
        </p>
      </section>
      <ChangePasswordForm />
    </div>
  );
}
