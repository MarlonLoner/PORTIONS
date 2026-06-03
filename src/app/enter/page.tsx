"use client";

import { ArrowRight, LockKeyhole, Pill, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const DEMO_CODE = "PORTIONS-DEMO";

export default function EnterPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (code.trim().toUpperCase() === DEMO_CODE) {
      setError("");
      router.push("/dashboard");
      return;
    }
    setError("That demo access code is not valid. Please check the code from your guided walkthrough.");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 text-navy-950">
      <section className="grid w-full max-w-5xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_28px_80px_rgba(6,21,38,0.16)] lg:grid-cols-[0.95fr_1.05fr]">
        <div className="relative bg-navy-950 p-6 text-white lg:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(118deg,rgba(255,255,255,0.13),transparent_35%),linear-gradient(180deg,rgba(75,158,201,0.22),transparent_58%)]" />
          <div className="relative flex h-full flex-col justify-between gap-10">
            <div>
              <Link href="/" className="inline-flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white text-navy-950">
                  <Pill className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-lg font-bold tracking-[0.18em]">PORTIONS</p>
                  <p className="text-xs text-clinical-100">Pharmacy Command OS</p>
                </div>
              </Link>
              <h1 className="mt-10 text-4xl font-semibold tracking-tight">Enter PORTIONS Command OS</h1>
              <p className="mt-4 text-sm leading-7 text-slate-200">
                Demo access is provided during guided walkthroughs.
              </p>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/10 p-4">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-emerald-200" aria-hidden="true" />
                <p className="text-sm font-semibold">Protected demo environment</p>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-300">
                The command dashboard remains behind a simple demo gate while the public landing page stays shareable.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 lg:p-8">
          <div className="mx-auto max-w-md">
            <div className="rounded-lg bg-clinical-50 p-3 text-clinical-700 ring-1 ring-clinical-100">
              <LockKeyhole className="h-5 w-5" aria-hidden="true" />
            </div>
            <h2 className="mt-6 text-2xl font-semibold tracking-tight text-navy-950">Demo access code</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Enter the code shared during the PORTIONS walkthrough to open the Command OS.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Access code</span>
                <input
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  className="focus-ring mt-2 h-12 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold tracking-wide text-navy-950 placeholder:text-slate-400"
                  placeholder="PORTIONS-DEMO"
                  type="text"
                  autoComplete="off"
                />
              </label>

              {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 ring-1 ring-rose-100">{error}</p> : null}

              <button type="submit" className="focus-ring inline-flex w-full items-center justify-center gap-2 rounded-lg bg-navy-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-navy-800">
                Enter Command OS
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </form>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/demo" className="text-sm font-semibold text-clinical-700 hover:text-clinical-800">
                View guided demo
              </Link>
              <Link href="/" className="text-sm font-semibold text-slate-500 hover:text-navy-950">
                Back to landing
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
