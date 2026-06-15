import Link from "next/link";
import { PlatformAccessForm } from "@/components/platform-access-form";

export default function PlatformLoginPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12">
      <section className="mx-auto max-w-xl rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-clinical-700">PORTIONS Platform</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-navy-950">Platform Control Plane</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Sign in with a platform account. Pharmacy tenant users cannot access this area.
        </p>
        <PlatformAccessForm mode="login" />
        <Link href="/" className="mt-5 inline-flex text-sm font-semibold text-slate-500 hover:text-navy-950">
          Back to PORTIONS
        </Link>
      </section>
    </main>
  );
}
