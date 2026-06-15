import Link from "next/link";
import { hasPlatformOwner } from "@/lib/platform-auth";
import { PlatformAccessForm } from "@/components/platform-access-form";

export const dynamic = "force-dynamic";

export default async function PlatformSetupPage() {
  const complete = await hasPlatformOwner();
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12">
      <section className="mx-auto max-w-xl rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-clinical-700">PORTIONS Platform</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-navy-950">Platform Owner Setup</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Create the first PORTIONS platform owner. This is separate from pharmacy tenant accounts and is permanently disabled after a platform owner exists.
        </p>
        {complete ? (
          <div className="mt-8 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            Platform setup is complete. Use the platform login screen for control-plane access.
            <div className="mt-4">
              <Link className="font-semibold text-navy-950 underline" href="/platform/login">Open platform login</Link>
            </div>
          </div>
        ) : (
          <PlatformAccessForm mode="setup" />
        )}
      </section>
    </main>
  );
}
