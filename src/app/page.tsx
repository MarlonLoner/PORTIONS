import {
  ArrowRight,
  BarChart3,
  Bot,
  Building2,
  CheckCircle2,
  PackageSearch,
  Pill,
  ShieldCheck,
  ShoppingBag,
  Sparkles
} from "lucide-react";
import Link from "next/link";

const controls = [
  {
    title: "Chronic Revenue",
    detail: "Track due, overdue, VIP, high-risk, and lost chronic patients before recurring value disappears.",
    icon: Pill
  },
  {
    title: "Order Pipeline",
    detail: "Move WhatsApp, website, app, walk-in, and diaspora orders from inquiry to payment and dispatch.",
    icon: ShoppingBag
  },
  {
    title: "Branch Command",
    detail: "See which branches are winning, which need attention, and what managers should fix first.",
    icon: Building2
  },
  {
    title: "Stock Intelligence",
    detail: "Connect low stock, near-expiry pressure, and branch transfers to patient demand and revenue risk.",
    icon: PackageSearch
  },
  {
    title: "AI Brief",
    detail: "Start each day with executive priorities across revenue, care, orders, stock, branches, and staff.",
    icon: Bot
  },
  {
    title: "Reports & Accountability",
    detail: "Turn daily operations into boardroom-ready evidence, manager notes, and follow-up actions.",
    icon: BarChart3
  }
];

const problems = [
  "Chronic patients miss refills",
  "Online orders get stuck",
  "Branches operate in silos",
  "Stock risk hides until it costs money",
  "Owners rely on WhatsApp updates and manual reports"
];

const pilotSteps = [
  "Setup branches",
  "Import chronic patients",
  "Track orders",
  "Monitor stock",
  "Review first 7 days",
  "Present executive report"
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-navy-950">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-navy-950 text-white">
              <Pill className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-lg font-bold tracking-[0.18em]">PORTIONS</p>
              <p className="text-xs text-slate-500">Pharmacy Command OS</p>
            </div>
          </Link>
          <nav className="hidden items-center gap-2 md:flex">
            <Link href="/demo" className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-navy-950">
              Demo
            </Link>
            <Link href="/enter" className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-navy-950">
              Enter Command OS
            </Link>
            <Link href="#pilot" className="rounded-lg bg-navy-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-800">
              Request Pilot
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden bg-navy-950 text-white">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(118deg,rgba(255,255,255,0.13),transparent_35%),linear-gradient(180deg,rgba(75,158,201,0.22),transparent_58%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-clinical-100 ring-1 ring-white/15">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Premium pharmacy operating system
            </span>
            <p className="mt-6 text-lg font-bold tracking-[0.2em]">PORTIONS</p>
            <p className="mt-2 text-sm font-semibold uppercase tracking-[0.14em] text-clinical-100">Pharmacy Command OS</p>
            <h1 className="mt-6 max-w-5xl text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
              Control chronic revenue, branch performance, online orders, stock risk, and daily execution from one system.
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-slate-200">
              Built for multi-branch pharmacies that need executive visibility, patient retention, and operational discipline without waiting for manual reports.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Cta href="/demo" label="View Demo" primary />
              <Cta href="/enter" label="Enter Command OS" />
              <Cta href="#pilot" label="Request Pilot" />
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/10 p-5 shadow-[0_28px_80px_rgba(0,0,0,0.22)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clinical-100">Owner morning</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">One view before the calls begin.</h2>
              </div>
              <ShieldCheck className="h-6 w-6 text-emerald-200" aria-hidden="true" />
            </div>
            <div className="mt-6 grid gap-3">
              {["Revenue pulse", "Patient risk", "Branch pressure", "Stock exposure", "Today’s actions"].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-lg bg-white p-4 text-navy-950">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                  <span className="text-sm font-semibold">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-4 py-12 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <SectionIntro eyebrow="The problem" title="Pharmacy operations leak quietly." helper="Owners do not need more chat messages. They need a command system that turns daily friction into visible action." />
        <div className="grid gap-3 sm:grid-cols-2">
          {problems.map((problem) => (
            <div key={problem} className="rounded-lg border border-slate-200 bg-white p-4 shadow-soft">
              <p className="text-sm font-semibold leading-6 text-navy-950">{problem}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <SectionIntro eyebrow="What PORTIONS controls" title="Six layers of executive pharmacy control." helper="Built for the parts of the pharmacy business that create recurring value, patient trust, and branch accountability." />
        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {controls.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
                <div className="rounded-lg bg-navy-950 p-2.5 text-white ring-1 ring-navy-900">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-navy-950">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.detail}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-soft lg:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clinical-700">Owner morning story</p>
          <h2 className="mt-3 max-w-4xl text-3xl font-semibold tracking-tight text-navy-950">
            The owner opens PORTIONS and sees what happened, what is leaking, and what the team must do today.
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
            Instead of asking every branch for updates, the owner sees chronic patients due, overdue follow-ups, quoted orders awaiting payment, stock alerts, branch pressure, and the AI Brief’s recommended priorities.
          </p>
        </div>
      </section>

      <section id="pilot" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-navy-800 bg-navy-950 p-6 text-white shadow-[0_28px_80px_rgba(6,21,38,0.22)] lg:p-8">
          <div className="grid gap-7 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clinical-100">Pilot CTA</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight">Start with a 30-day pharmacy command pilot.</h2>
              <p className="mt-4 text-sm leading-7 text-slate-200">
                Prove the value story with a focused rollout: branch setup, chronic patient import, order tracking, stock visibility, and an executive report after the first week.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="mailto:pilot@portions.health?subject=PORTIONS%20Pilot%20Request" className="focus-ring inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-navy-950 transition hover:bg-clinical-50">
                  Request Pilot
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link href="/demo" className="focus-ring inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-white/15 transition hover:bg-white/15">
                  View Demo
                </Link>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {pilotSteps.map((step) => (
                <div key={step} className="rounded-lg bg-white p-4 text-navy-950">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                    <p className="text-sm font-semibold">{step}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function Cta({ href, label, primary = false }: { href: string; label: string; primary?: boolean }) {
  return (
    <Link href={href} className={primary ? "focus-ring inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-navy-950 transition hover:bg-clinical-50" : "focus-ring inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-white/15 transition hover:bg-white/15"}>
      {label}
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </Link>
  );
}

function SectionIntro({ eyebrow, title, helper }: { eyebrow: string; title: string; helper: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clinical-700">{eyebrow}</p>
      <h2 className="mt-2 text-3xl font-semibold tracking-tight text-navy-950">{title}</h2>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">{helper}</p>
    </div>
  );
}
