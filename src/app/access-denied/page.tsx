import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default function AccessDeniedPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <section className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-3xl items-center">
        <div className="w-full rounded-lg border border-slate-200 bg-white p-6 text-center shadow-soft">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-rose-50 text-rose-700 ring-1 ring-rose-100">
            <ShieldAlert className="h-6 w-6" aria-hidden="true" />
          </div>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-navy-950">Access denied</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-600">
            Your PORTIONS account does not have permission for this command area. Ask a system administrator or pharmacy owner to update your operating-unit access.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/dashboard" className="focus-ring rounded-lg bg-navy-950 px-4 py-2.5 text-sm font-semibold text-white">Back to Dashboard</Link>
            <Link href="/account" className="focus-ring rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700">View Account</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
