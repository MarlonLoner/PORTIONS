"use client";

import Link from "next/link";

export default function NewUserError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-rose-200 bg-rose-50 p-6 shadow-soft">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-700">User administration</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-navy-950">User setup could not be loaded.</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-rose-800">
          PORTIONS could not load the user creation options. Error reference: {error.digest ?? "not available"}.
        </p>
      </section>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={reset} className="focus-ring rounded-lg bg-navy-950 px-4 py-2.5 text-sm font-semibold text-white">Retry</button>
        <Link href="/admin/users" className="focus-ring rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">Back to User Administration</Link>
        <Link href="/admin/operating-units" className="focus-ring rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">Open Operating Units</Link>
      </div>
    </div>
  );
}
