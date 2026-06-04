"use client";

import { ArrowLeft, ArrowRight, Building2, CheckCircle2, ClipboardList, Pill, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";
import type { ReactNode } from "react";

const urgencyOptions = ["Immediate review", "Within 30 days", "This quarter", "Exploring for later"];
const painOptions = [
  "Chronic refill follow-up is inconsistent",
  "Online orders are not converting fast enough",
  "Branch performance is hard to monitor",
  "Stock risk is affecting fulfillment",
  "Manual reporting is too slow",
  "Multiple operational issues"
];

export default function PilotPage() {
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    const response = await fetch("/api/pilot-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    setSubmitting(false);

    if (!response.ok) {
      const result = await response.json().catch(() => ({ error: "Pilot request could not be submitted." }));
      setError(result.error ?? "Pilot request could not be submitted.");
      return;
    }

    form.reset();
    setSuccess(true);
  }

  return (
    <main className="min-h-screen bg-slate-50 text-navy-950">
      <section className="relative overflow-hidden bg-navy-950 text-white">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(118deg,rgba(255,255,255,0.13),transparent_35%),linear-gradient(180deg,rgba(75,158,201,0.22),transparent_58%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8 lg:py-16">
          <div>
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-clinical-100 hover:text-white">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to PORTIONS
            </Link>
            <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-clinical-100 ring-1 ring-white/15">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              30-day command pilot
            </div>
            <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">Request a PORTIONS Pilot</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-200">
              Start with a 30-day pharmacy command pilot for chronic patients, online orders, branches, stock, and executive reporting.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {["Executive visibility", "Chronic retention", "Order revenue capture", "Branch and stock discipline"].map((item) => (
                <div key={item} className="rounded-lg bg-white/10 p-4 ring-1 ring-white/10">
                  <CheckCircle2 className="h-4 w-4 text-emerald-200" aria-hidden="true" />
                  <p className="mt-3 text-sm font-semibold">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white p-5 text-navy-950 shadow-[0_28px_80px_rgba(0,0,0,0.22)] sm:p-6">
            {success ? (
              <div className="flex min-h-[560px] flex-col justify-center text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                  <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
                </div>
                <h2 className="mt-6 text-2xl font-semibold tracking-tight">Pilot request received</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  The PORTIONS team can now review your pharmacy profile, branch count, system context, and operating pain before contacting you.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <Link href="/" className="focus-ring rounded-lg bg-navy-950 px-4 py-2.5 text-sm font-semibold text-white">
                    Back to home
                  </Link>
                  <Link href="/demo" className="focus-ring rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700">
                    View demo
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clinical-700">Pilot request form</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight">Tell us about the pharmacy group</h2>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Pharmacy name" name="pharmacyName" required />
                  <Field label="Contact person" name="contactName" required />
                  <Field label="WhatsApp number" name="whatsappNumber" required />
                  <Field label="Email" name="email" type="email" />
                  <Field label="Number of branches" name="branchCount" type="number" min="1" required />
                  <Field label="Current system" name="currentSystem" placeholder="POS, WhatsApp, spreadsheets..." required />
                </div>

                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Main operational pain</span>
                  <select name="mainPain" required className="focus-ring mt-2 h-12 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-navy-950">
                    <option value="">Select main pain</option>
                    {painOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Urgency</span>
                  <select name="urgency" required className="focus-ring mt-2 h-12 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-navy-950">
                    <option value="">Select urgency</option>
                    {urgencyOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Notes</span>
                  <textarea name="notes" rows={4} className="focus-ring mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-navy-950" placeholder="Branch context, pilot goals, current bottlenecks, or rollout timing." />
                </label>

                {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 ring-1 ring-rose-100">{error}</p> : null}

                <button type="submit" disabled={submitting} className="focus-ring inline-flex w-full items-center justify-center gap-2 rounded-lg bg-navy-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-70">
                  {submitting ? "Submitting..." : "Request Pilot"}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-4 py-10 sm:px-6 lg:grid-cols-3 lg:px-8">
        <PilotCard icon={<Building2 className="h-5 w-5" />} title="Built for multi-branch control" detail="Pilot around branch visibility, manager accountability, and network-level revenue signals." />
        <PilotCard icon={<Pill className="h-5 w-5" />} title="Chronic revenue first" detail="Start by importing chronic patients and turning refill follow-up into a measurable operating rhythm." />
        <PilotCard icon={<ClipboardList className="h-5 w-5" />} title="Executive report by week one" detail="Show owners what happened, what leaked, and what the team must do next." />
      </section>
    </main>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  min,
  required = false
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  min?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</span>
      <input name={name} type={type} min={min} required={required} placeholder={placeholder} className="focus-ring mt-2 h-12 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-navy-950 placeholder:text-slate-400" />
    </label>
  );
}

function PilotCard({ icon, title, detail }: { icon: ReactNode; title: string; detail: string }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
      <div className="rounded-lg bg-navy-950 p-2.5 text-white ring-1 ring-navy-900">{icon}</div>
      <h2 className="mt-4 text-lg font-semibold text-navy-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p>
    </article>
  );
}
