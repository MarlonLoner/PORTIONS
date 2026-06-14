import { redirect } from "next/navigation";
import { ShieldCheck, UserPlus } from "lucide-react";
import Link from "next/link";
import { SetupForm } from "@/components/setup-form";
import { hasActiveAdministrativeUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const initialized = await hasActiveAdministrativeUser();
  if (initialized) redirect("/login");

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <section className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.02fr_0.98fr]">
        <div className="rounded-lg border border-navy-800 bg-navy-950 p-6 text-white shadow-[0_28px_80px_rgba(6,21,38,0.22)]">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-clinical-100 ring-1 ring-white/15">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            First-run secure setup
          </span>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">Initialize PORTIONS</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-200">
            Create the first secure administrator account and unlock user management.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {["Verify setup key", "Create administrator", "Assign Head Office access", "Continue to User Administration"].map((step, index) => (
              <div key={step} className="rounded-lg border border-white/10 bg-white/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-clinical-100">Step {index + 1}</p>
                <p className="mt-2 text-sm font-semibold text-white">{step}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 rounded-lg bg-white p-3 text-sm font-semibold leading-6 text-navy-950">
            This page becomes unavailable after the first administrator account is created.
          </p>
        </div>

        <div>
          <div className="mb-4 flex items-center gap-2 text-clinical-700">
            <UserPlus className="h-5 w-5" aria-hidden="true" />
            <p className="text-xs font-semibold uppercase tracking-[0.14em]">Owner bootstrap</p>
          </div>
          <SetupForm />
          <Link href="/login" className="mt-4 inline-flex rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">Back to login</Link>
        </div>
      </section>
    </main>
  );
}
