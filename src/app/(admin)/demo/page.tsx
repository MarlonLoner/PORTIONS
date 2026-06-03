import {
  ArrowRight,
  BarChart3,
  Bot,
  Building2,
  CheckCircle2,
  ClipboardList,
  DollarSign,
  ExternalLink,
  PackageSearch,
  Pill,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Target,
  UsersRound
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { getDemoData } from "@/lib/data";
import {
  getDemoHeroMetrics,
  getDemoLeakageStory,
  getDemoTimeline,
  getDemoUseCases,
  getDemoValuePillars,
  getInvestmentFraming,
  getPilotRolloutPlan
} from "@/lib/demo";
import { formatCurrency } from "@/lib/format";

export const dynamic = "force-dynamic";

const problemPoints = [
  "Chronic patients forget refills.",
  "Staff forget follow-ups.",
  "Online orders get stuck.",
  "Branches operate in silos.",
  "Stock runs out where demand exists.",
  "Owners rely on WhatsApp updates and manual reports.",
  "Money leaks silently."
];

const pillarIcons = [Pill, ShoppingBag, Building2, PackageSearch, Bot, BarChart3];

export default async function DemoPage() {
  const data = await getDemoData();
  const heroMetrics = getDemoHeroMetrics(data);
  const leakage = getDemoLeakageStory(data);
  const pillars = getDemoValuePillars();
  const timeline = getDemoTimeline();
  const useCases = getDemoUseCases();
  const rollout = getPilotRolloutPlan();
  const investment = getInvestmentFraming();

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-lg border border-navy-800 bg-navy-950 p-5 text-white shadow-[0_32px_90px_rgba(6,21,38,0.26)] sm:p-7 xl:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(118deg,rgba(255,255,255,0.13),transparent_35%),linear-gradient(180deg,rgba(75,158,201,0.22),transparent_58%)]" />
        <div className="relative grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-clinical-100 ring-1 ring-white/15">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Boardroom Walkthrough
            </span>
            <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">PORTIONS Demo</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-200">
              A guided command-system walkthrough for pharmacy owners who want control over chronic revenue, branch performance, online orders, stock risk, and daily execution.
            </p>
            <p className="mt-5 max-w-4xl text-xl leading-8 text-white">
              The owner wakes up, opens PORTIONS, and sees revenue, patient risk, branch pressure, stock exposure, and today&apos;s actions before calling anyone.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="#walkthrough" className="focus-ring inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-navy-950 transition hover:bg-clinical-50">
                Start guided walkthrough
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link href="/ai-brief" className="focus-ring inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-white/15 transition hover:bg-white/15">
                View AI Brief
                <Bot className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link href="/dashboard" className="focus-ring inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-white/15 transition hover:bg-white/15">
                Open Dashboard
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {heroMetrics.map((metric) => (
              <HeroMetric key={metric.label} label={metric.label} value={metric.value} />
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel eyebrow="The big problem" title="Pharmacy Convenience Is Broken" dark>
          <p className="text-base leading-7 text-slate-200">
            The modern pharmacy owner is trying to run chronic care, online sales, stock movement, staff discipline, and branch performance through fragmented conversations.
          </p>
          <p className="mt-4 text-lg font-semibold leading-8 text-white">
            PORTIONS exists because the money is not lost in one dramatic event. It leaks through small operational misses every day.
          </p>
        </Panel>

        <div className="grid gap-3 sm:grid-cols-2">
          {problemPoints.map((point) => (
            <div key={point} className="rounded-lg border border-slate-200 bg-white p-4 shadow-soft">
              <div className="flex items-start gap-3">
                <Target className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
                <p className="text-sm font-semibold leading-6 text-navy-950">{point}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeader eyebrow="Value pillars" title="The $20,000+ Command-System Story" helper="Six operating layers that turn pharmacy complexity into visible executive control." />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {pillars.map((pillar, index) => {
            const Icon = pillarIcons[index];
            return (
              <article key={pillar.title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-navy-950 p-2.5 text-white">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-navy-950">{pillar.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{pillar.controls}</p>
                  </div>
                </div>
                <div className="mt-4 rounded-lg bg-clinical-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-clinical-700">Why it matters</p>
                  <p className="mt-2 text-sm leading-6 text-clinical-950">{pillar.why}</p>
                </div>
                <p className="mt-4 text-sm font-semibold leading-6 text-emerald-700">{pillar.outcome}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section id="walkthrough" className="space-y-4 scroll-mt-24">
        <SectionHeader eyebrow="Guided walkthrough" title="From Morning Clarity To Daily Execution" helper="A step-by-step journey through the command system." />
        <div className="grid gap-4 xl:grid-cols-3">
          {timeline.map((item) => (
            <Link key={item.step} href={item.href} className="group rounded-lg border border-slate-200 bg-white p-5 shadow-soft transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_55px_rgba(6,21,38,0.12)]">
              <div className="flex items-start justify-between gap-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-950 text-sm font-semibold text-white">{item.step}</span>
                <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1 group-hover:text-clinical-700" aria-hidden="true" />
              </div>
              <h3 className="mt-4 font-semibold text-navy-950">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.detail}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <Panel eyebrow="Revenue leakage story" title="Where The Money Is Hiding">
          <div className="grid gap-3 sm:grid-cols-2">
            <LeakMetric label="Awaiting payment value" value={formatCurrency(leakage.awaitingPaymentValue)} />
            <LeakMetric label="Overdue/open follow-ups" value={String(leakage.overdueFollowUps)} />
            <LeakMetric label="High-risk patients" value={String(leakage.highRiskPatients)} />
            <LeakMetric label="Stock risk signal" value={formatCurrency(leakage.stockRisk)} />
          </div>
          <p className="mt-4 rounded-lg bg-navy-950 p-4 text-sm leading-7 text-white">{leakage.narrative}</p>
        </Panel>

        <Panel eyebrow="Branch signal" title="The First Branch To Call">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">Branch needing attention</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-navy-950">{leakage.branchNeedingAttention}</p>
            <p className="mt-4 text-sm leading-6 text-slate-700">
              The point is not another report. The point is knowing where to call, what to ask, and which revenue or patient-care blocker must be cleared first.
            </p>
          </div>
        </Panel>
      </section>

      <section className="space-y-4">
        <SectionHeader eyebrow="Demo use cases" title="Who PORTIONS Helps In The Pharmacy Group" helper="Each operator sees a different layer of the same command system." />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {useCases.map((item) => (
            <article key={item.title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
              <UsersRound className="h-5 w-5 text-clinical-700" aria-hidden="true" />
              <h3 className="mt-4 font-semibold text-navy-950">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <Panel eyebrow="Pilot rollout plan" title="30 Days To A Command Rhythm">
          <div className="grid gap-3">
            {rollout.map((item) => (
              <article key={item.week} className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-clinical-700">{item.week}</p>
                <h3 className="mt-2 font-semibold text-navy-950">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.detail}</p>
              </article>
            ))}
          </div>
        </Panel>

        <Panel eyebrow="Deployment checklist" title="Pilot Readiness Summary">
          <div className="space-y-3">
            {["Import patients", "Confirm branches", "Import stock", "Configure packages", "Train staff", "Review first 7 days", "Launch pilot"].map((item, index) => (
              <div key={item} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3">
                <CheckCircle2 className={index < 4 ? "h-4 w-4 text-emerald-600" : "h-4 w-4 text-slate-400"} aria-hidden="true" />
                <p className="text-sm font-semibold text-slate-800">{item}</p>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <section className="rounded-lg border border-navy-800 bg-navy-950 p-5 text-white shadow-[0_28px_80px_rgba(6,21,38,0.22)] sm:p-6">
        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clinical-100">Investment framing</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">Not a cheap SaaS tool. A pharmacy command system.</h2>
            <p className="mt-4 text-sm leading-7 text-slate-200">{investment.explanation}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <InvestmentMetric label="Pilot setup" value={investment.pilotSetup} />
            <InvestmentMetric label="Enterprise rollout" value={investment.enterpriseRollout} emphasis />
            <InvestmentMetric label="Monthly optimization/support" value={investment.monthlySupport} />
            <InvestmentMetric label="Best for" value={investment.bestFor} />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 text-center shadow-soft">
        <ShieldCheck className="mx-auto h-8 w-8 text-emerald-600" aria-hidden="true" />
        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-navy-950">PORTIONS turns pharmacy operations into a command system.</h2>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <CtaLink href="/ai-brief" label="Open AI Brief" />
          <CtaLink href="/patients" label="View Chronic Revenue Engine" />
          <CtaLink href="/orders" label="View Order Pipeline" />
          <CtaLink href="/branches" label="View Branch Command" />
        </div>
      </section>
    </div>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white p-4 text-navy-950">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function SectionHeader({ eyebrow, title, helper }: { eyebrow: string; title: string; helper: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clinical-700">{eyebrow}</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-navy-950">{title}</h2>
      </div>
      <p className="max-w-xl text-sm leading-6 text-slate-500">{helper}</p>
    </div>
  );
}

function Panel({ eyebrow, title, children, dark = false }: { eyebrow: string; title: string; children: ReactNode; dark?: boolean }) {
  return (
    <section className={dark ? "rounded-lg border border-navy-800 bg-navy-950 p-5 text-white shadow-soft" : "rounded-lg border border-slate-200 bg-white p-5 shadow-soft"}>
      <p className={dark ? "text-xs font-semibold uppercase tracking-[0.14em] text-clinical-100" : "text-xs font-semibold uppercase tracking-[0.14em] text-clinical-700"}>{eyebrow}</p>
      <h2 className={dark ? "mt-2 text-2xl font-semibold tracking-tight text-white" : "mt-2 text-2xl font-semibold tracking-tight text-navy-950"}>{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function LeakMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-navy-950">{value}</p>
    </div>
  );
}

function InvestmentMetric({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className={emphasis ? "rounded-lg bg-white p-4 text-navy-950" : "rounded-lg bg-white/10 p-4 text-white ring-1 ring-white/10"}>
      <p className={emphasis ? "text-xs font-semibold uppercase tracking-[0.1em] text-slate-500" : "text-xs font-semibold uppercase tracking-[0.1em] text-clinical-100"}>{label}</p>
      <p className="mt-2 text-xl font-semibold leading-7">{value}</p>
    </div>
  );
}

function CtaLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="focus-ring inline-flex items-center gap-2 rounded-lg bg-navy-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-800">
      {label}
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </Link>
  );
}
