import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getCurrentUser, hasActiveAdministrativeUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const currentUser = await getCurrentUser();
  if (currentUser) redirect("/dashboard");
  const initialized = await hasActiveAdministrativeUser();

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <section className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-lg border border-navy-800 bg-navy-950 p-6 text-white shadow-[0_28px_80px_rgba(6,21,38,0.22)]">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-clinical-100 ring-1 ring-white/15">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Secure Command Access
          </span>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">Sign in to PORTIONS</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-200">
            Role-based access for pharmacy owners, branch managers, online orders, pharmacists, stock controllers, finance, and event teams.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Signal label="Branch scoped" value="Unit access" />
            <Signal label="Secure sessions" value="HTTP-only" />
            <Signal label="Demo preserved" value="Separate gate" />
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clinical-700">PORTIONS Account</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-navy-950">Email and password</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Use your assigned PORTIONS account. New to PORTIONS? Explore the demo first, then return here when your pharmacy login is ready.</p>
          {!initialized ? (
            <div className="mt-5 rounded-lg bg-amber-50 p-4 ring-1 ring-amber-100">
              <p className="text-sm font-semibold text-amber-900">PORTIONS has not been initialized yet.</p>
              <Link href="/setup" className="focus-ring mt-3 inline-flex rounded-lg bg-navy-950 px-3 py-2 text-xs font-semibold text-white">Initialize system</Link>
            </div>
          ) : null}
          <Suspense fallback={<div className="mt-6 h-48 rounded-lg bg-slate-50 ring-1 ring-slate-200" />}>
            <LoginForm />
          </Suspense>
          <p className="mt-5 text-sm leading-6 text-slate-500">New to PORTIONS? Explore the demo, then come back when your pharmacy team is ready for account access.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/enter" className="focus-ring rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">Try the demo</Link>
            <Link href="/" className="focus-ring rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">Back to PORTIONS homepage</Link>
          </div>
        </div>
      </section>
    </main>
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
