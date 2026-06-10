import { ArrowRight, CheckCircle2, ClipboardCheck, HelpCircle, Presentation, Route, ShieldCheck, Target } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { getClosingFramework, getDemoChecklist, getDemoScriptSteps, getObjectionResponses } from "@/lib/demo-script";

export const dynamic = "force-dynamic";

export default function DemoScriptPage() {
  const steps = getDemoScriptSteps();
  const objections = getObjectionResponses();
  const checklist = getDemoChecklist();
  const close = getClosingFramework();

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-lg border border-navy-800 bg-navy-950 p-5 text-white shadow-[0_28px_80px_rgba(6,21,38,0.22)] sm:p-6 xl:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.12),transparent_36%),linear-gradient(180deg,rgba(75,158,201,0.18),transparent_58%)]" />
        <div className="relative grid gap-7 xl:grid-cols-[1fr_0.9fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-clinical-100 ring-1 ring-white/15">
              <Presentation className="h-3.5 w-3.5" aria-hidden="true" />
              Guided Sales Presentation
            </span>
            <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">Demo Script Mode</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-200">
              A guided boardroom walkthrough for presenting PORTIONS as a pharmacy command system.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <HeroMetric label="Target audience" value="Owner, GM, branch operator, investor" />
            <HeroMetric label="Demo duration" value="15-20 minutes" />
            <HeroMetric label="Core promise" value="Control revenue, orders, branches, stock, execution" />
            <HeroMetric label="Close objective" value="Secure a 30-day pilot" />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
        <SectionHeader eyebrow="Talk track timeline" title="The Strongest Sequence" icon={<Route className="h-5 w-5" />} />
        <div className="mt-5 space-y-4">
          {steps.map((step, index) => (
            <article key={step.title} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clinical-700">Step {index + 1}</p>
                  <h2 className="mt-1 text-xl font-semibold tracking-tight text-navy-950">{step.title}</h2>
                </div>
                <Link href={step.href} className="focus-ring inline-flex items-center gap-2 rounded-lg bg-navy-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-navy-800">
                  Open {step.pageLabel}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
              <div className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
                <TalkBlock label="What to say" value={step.say} />
                <TalkBlock label="What to point at" value={step.pointAt} />
                <TalkBlock label="Buyer question" value={step.buyerQuestion} />
                <TalkBlock label="Transition line" value={step.transition} />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
        <Panel title="Demo Navigation Cards" eyebrow="Route launcher" icon={<Presentation className="h-5 w-5" />}>
          <div className="grid gap-3 sm:grid-cols-2">
            {steps.map((step) => (
              <Link key={step.href + step.title} href={step.href} className="focus-ring flex items-center justify-between gap-3 rounded-lg bg-slate-50 p-3 text-sm font-semibold text-navy-950 ring-1 ring-slate-200 transition hover:bg-clinical-50">
                {step.pageLabel}
                <ArrowRight className="h-4 w-4 text-clinical-700" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </Panel>

        <Panel title="Closing Framework" eyebrow="Pilot close" icon={<Target className="h-5 w-5" />}>
          <div className="space-y-2">
            {close.map((item) => (
              <p key={item} className="flex items-start gap-2 rounded-lg bg-clinical-50 p-3 text-sm font-semibold leading-6 text-clinical-900">
                <CheckCircle2 className="mt-1 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
                {item}
              </p>
            ))}
          </div>
        </Panel>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
        <SectionHeader eyebrow="Objection handling" title="Answer Without Losing The Room" icon={<HelpCircle className="h-5 w-5" />} />
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {objections.map((item) => (
            <article key={item.objection} className="rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
              <p className="text-sm font-semibold text-navy-950">{item.objection}</p>
              <p className="mt-3 text-sm leading-7 text-slate-700">{item.response}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Panel title="Before Demo Checklist" eyebrow="Preparation" icon={<ClipboardCheck className="h-5 w-5" />}>
          <Checklist items={checklist.before} />
        </Panel>
        <Panel title="After Demo Checklist" eyebrow="Follow-through" icon={<ShieldCheck className="h-5 w-5" />}>
          <Checklist items={checklist.after} />
        </Panel>
      </section>
    </div>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-lg bg-white p-4 text-navy-950">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold leading-6">{value}</p>
    </article>
  );
}

function SectionHeader({ eyebrow, title, icon }: { eyebrow: string; title: string; icon: ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-clinical-700">
      {icon}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em]">{eyebrow}</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-navy-950">{title}</h2>
      </div>
    </div>
  );
}

function Panel({ title, eyebrow, icon, children }: { title: string; eyebrow: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
      <SectionHeader eyebrow={eyebrow} title={title} icon={icon} />
      <div className="mt-5">{children}</div>
    </section>
  );
}

function TalkBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white p-4 ring-1 ring-slate-200">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm leading-6 text-slate-700">{value}</p>
    </div>
  );
}

function Checklist({ items }: { items: string[] }) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <p key={item} className="flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-sm font-semibold leading-6 text-slate-700 ring-1 ring-slate-200">
          <CheckCircle2 className="mt-1 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
          {item}
        </p>
      ))}
    </div>
  );
}
