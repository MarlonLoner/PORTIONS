import {
  Bell,
  Bot,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Database,
  FileSpreadsheet,
  PackageSearch,
  Pill,
  RadioTower,
  ShieldCheck,
  SlidersHorizontal,
  UsersRound
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { getSettingsData } from "@/lib/data";
import {
  getAiOnboardingAdvisor,
  getOnboardingOverview,
  getOnboardingReadinessScore,
  getOnboardingSteps,
  getPilotLaunchChecklist,
  getSuccessMetrics,
  type OnboardingStepStatus
} from "@/lib/onboarding";

export const dynamic = "force-dynamic";

const statusClasses: Record<OnboardingStepStatus, string> = {
  "Not Started": "bg-slate-100 text-slate-600 ring-slate-200",
  "In Progress": "bg-amber-50 text-amber-700 ring-amber-200",
  Ready: "bg-emerald-50 text-emerald-700 ring-emerald-200"
};

const orderSources = [
  ["WhatsApp", "Manual pilot mapping"],
  ["Website", "Ready for order import"],
  ["App", "Future integration"],
  ["Walk-in", "Branch order visibility"],
  ["Diaspora", "High-value order tracking"],
  ["Phone call", "Manual capture"]
];

const channels = [
  ["WhatsApp", "Manual now, API later"],
  ["SMS", "Manual fallback"],
  ["Email", "Report delivery"],
  ["Phone Call", "High-risk recovery"],
  ["In-app tasks", "Connected workflow"]
];

export default async function OnboardingPage() {
  const settings = await getSettingsData();
  const overview = getOnboardingOverview(settings);
  const readinessScore = getOnboardingReadinessScore(settings);
  const steps = getOnboardingSteps(settings);
  const checklist = getPilotLaunchChecklist(settings);
  const metrics = getSuccessMetrics();
  const advisor = getAiOnboardingAdvisor(settings);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-lg border border-navy-800 bg-navy-950 p-5 text-white shadow-[0_28px_80px_rgba(6,21,38,0.22)] sm:p-6 xl:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.12),transparent_36%),linear-gradient(180deg,rgba(75,158,201,0.18),transparent_58%)]" />
        <div className="relative grid gap-7 xl:grid-cols-[1.05fr_0.95fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-clinical-100 ring-1 ring-white/15">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              30-Day Pilot Setup
            </span>
            <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">Pilot Onboarding</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-200">
              Configure the pharmacy profile, branches, staff, imports, operating rules, and success metrics before launching a 30-day PORTIONS pilot.
            </p>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clinical-100">Readiness score</p>
            <p className="mt-3 text-5xl font-semibold tracking-tight">{readinessScore}%</p>
            <div className="mt-5 h-2 rounded-full bg-white/10">
              <div className="h-2 rounded-full bg-emerald-300" style={{ width: `${readinessScore}%` }} />
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-200">{overview.suggestedNextAction}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <SetupMetric label="Pharmacy name" value={overview.pharmacyName} />
        <SetupMetric label="Pilot status" value={overview.pilotStatus} />
        <SetupMetric label="Branches" value={String(overview.branchesToConfigure)} />
        <SetupMetric label="Staff" value={String(overview.staffToAssign)} />
        <SetupMetric label="Imports needed" value={overview.importsNeeded} />
        <SetupMetric label="Next action" value={overview.suggestedNextAction} />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clinical-700">Wizard flow</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-navy-950">Eight Steps To Pilot Launch</h2>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">Demo-state wizard</span>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-4">
          {steps.map((step, index) => (
            <article key={step.title} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy-950 text-sm font-semibold text-white">{index + 1}</span>
                <StatusBadge status={step.status} />
              </div>
              <h3 className="mt-4 font-semibold text-navy-950">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{step.why}</p>
              <div className="mt-4 rounded-lg bg-white p-3 ring-1 ring-slate-200">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Required information</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{step.required.join(", ")}</p>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{step.example}</p>
              <Link href={stepHref(step.title)} className="focus-ring mt-3 inline-flex rounded-lg bg-white px-3 py-2 text-sm font-semibold leading-6 text-clinical-800 ring-1 ring-clinical-100">
                {step.action}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <Panel title="Pharmacy Profile Step" eyebrow="Profile" icon={<Pill className="h-5 w-5" />}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Pharmacy name" value={settings.pharmacyName} />
            <Field label="Country" value="Zimbabwe" />
            <Field label="Currency" value="USD" />
            <Field label="Owner/CEO contact" value="Owner to confirm" />
            <Field label="Operating model" value="Multi-branch pharmacy" />
            <Field label="Main pilot objective" value="Protect chronic revenue and create branch visibility" />
          </div>
        </Panel>

        <Panel title="Branch Setup Step" eyebrow="Branches" icon={<Building2 className="h-5 w-5" />}>
          <div className="grid gap-3 sm:grid-cols-2">
            {settings.branches.map((branch) => (
              <article key={branch.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <h3 className="font-semibold text-navy-950">{branch.name}</h3>
                <p className="mt-1 text-sm text-slate-500">{branch.area}</p>
                <p className="mt-3 text-sm text-slate-700">Manager: {branch.managerName ?? "To confirm"}</p>
                <p className="mt-2 text-sm text-slate-700">Services: Chronic care, orders, stock, reports</p>
                <p className="mt-2 text-sm font-semibold text-clinical-800">Data readiness: {branch.patients.length > 0 && branch.stockItems.length > 0 ? "Ready" : "In progress"}</p>
              </article>
            ))}
          </div>
        </Panel>
      </section>

      <Panel title="Staff Roles Step" eyebrow="Role matrix" icon={<UsersRound className="h-5 w-5" />}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[
            ["Owner", "Executive visibility, investment decisions, branch accountability", "Owner", "Review AI Brief and executive report"],
            ["General Manager", "Daily operating rhythm, staff accountability, branch coaching", "Manager", "Run morning huddle and close blockers"],
            ["Pharmacist", "Prescription review, clinical checks, quote blockers", "Pharmacist", "Clear pharmacist review queue"],
            ["Support Agent", "Patient follow-ups, payment reminders, delivery confirmations", "Support", "Work follow-up queue"],
            ["Stock Controller", "Low stock, near expiry, branch transfers, reorder pressure", "Stock Controller", "Review stock intelligence"],
            ["Branch Manager", "Local revenue, staff response, orders, chronic patients", "Manager", "Act on branch coach summary"]
          ].map(([role, responsibilities, access, actions]) => (
            <article key={role} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <h3 className="font-semibold text-navy-950">{role}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{responsibilities}</p>
              <Field label="Access level" value={access} compact />
              <Field label="Daily action" value={actions} compact />
            </article>
          ))}
        </div>
      </Panel>

      <section className="grid gap-5 xl:grid-cols-2">
        <Panel title="Chronic Patient Import Step" eyebrow="Recurring revenue" icon={<FileSpreadsheet className="h-5 w-5" />}>
          <RequirementGrid items={["Patient name", "Phone number", "Branch", "Condition category", "Medication list", "Refill cycle", "Next refill date", "Package type"]} />
          <Checklist items={["Validate phone numbers", "Confirm branch ownership", "Map condition categories", "Assign follow-up staff"]} />
        </Panel>

        <Panel title="Stock Import Step" eyebrow="Stock risk setup" icon={<PackageSearch className="h-5 w-5" />}>
          <RequirementGrid items={["Product name", "Category", "Branch", "Stock level", "Reorder level", "Expiry date", "Unit cost"]} />
          <p className="mt-4 rounded-lg bg-clinical-50 p-4 text-sm leading-6 text-clinical-900">
            Stock setup connects low-stock alerts and near-expiry value to chronic demand, branch pressure, and transfer opportunities.
          </p>
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Panel title="Order Sources Step" eyebrow="Revenue pipeline" icon={<RadioTower className="h-5 w-5" />}>
          <StatusList items={orderSources} />
        </Panel>

        <Panel title="Notification Channels Step" eyebrow="Communication" icon={<Bell className="h-5 w-5" />}>
          <StatusList items={channels} />
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel title="Success Metrics Step" eyebrow="Pilot evidence" icon={<SlidersHorizontal className="h-5 w-5" />}>
          <div className="grid gap-3 sm:grid-cols-2">
            {metrics.map((metric) => (
              <div key={metric} className="rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                <p className="mt-3 text-sm font-semibold leading-6 text-navy-950">{metric}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Pilot Launch Checklist" eyebrow="Launch control" icon={<ClipboardCheck className="h-5 w-5" />}>
          <div className="space-y-3">
            {checklist.map((item) => (
              <div key={item.item} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className={item.done ? "h-4 w-4 text-emerald-600" : "h-4 w-4 text-slate-400"} aria-hidden="true" />
                  <p className="text-sm font-semibold text-slate-800">{item.item}</p>
                </div>
                <span className={item.done ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100" : "rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200"}>
                  {item.done ? "Done" : "Pending"}
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <section className="rounded-lg border border-navy-800 bg-navy-950 p-5 text-white shadow-[0_28px_80px_rgba(6,21,38,0.22)]">
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-white/10 p-3 text-clinical-100 ring-1 ring-white/15">
            <Bot className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clinical-100">AI Onboarding Advisor</p>
            <p className="mt-3 text-base leading-7 text-slate-100">{advisor}</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function SetupMetric({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-soft">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</p>
      <p className="mt-2 line-clamp-2 text-lg font-semibold leading-6 text-navy-950">{value}</p>
    </article>
  );
}

function Panel({ title, eyebrow, icon, children }: { title: string; eyebrow: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
      <div className="flex items-center gap-2 text-clinical-700">
        {icon}
        <p className="text-xs font-semibold uppercase tracking-[0.12em]">{eyebrow}</p>
      </div>
      <h2 className="mt-2 text-xl font-semibold tracking-tight text-navy-950">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Field({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return (
    <div className={compact ? "mt-3 rounded-lg bg-white px-3 py-2 ring-1 ring-slate-200" : "rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200"}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold leading-5 text-navy-950">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: OnboardingStepStatus }) {
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ring-1 ${statusClasses[status]}`}>{status}</span>;
}

function RequirementGrid({ items }: { items: string[] }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {items.map((item) => (
        <span key={item} className="rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">
          {item}
        </span>
      ))}
    </div>
  );
}

function Checklist({ items }: { items: string[] }) {
  return (
    <div className="mt-4 space-y-2">
      {items.map((item) => (
        <div key={item} className="flex items-center gap-2 text-sm text-slate-700">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
          {item}
        </div>
      ))}
    </div>
  );
}

function StatusList({ items }: { items: string[][] }) {
  return (
    <div className="grid gap-3">
      {items.map(([name, status]) => (
        <div key={name} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-sm font-semibold text-navy-950">{name}</p>
          <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">{status}</span>
        </div>
      ))}
    </div>
  );
}

function stepHref(title: string) {
  const map: Record<string, string> = {
    "Pharmacy Profile": "/settings",
    "Branch Setup": "/branches/new",
    "Staff Roles": "/admin/staff/new",
    "Chronic Patient Import": "/patients/new",
    "Stock Import": "/stock/new",
    "Order Sources": "/orders/new",
    "Notification Channels": "/admin/operating-units",
    "Success Metrics": "/reports"
  };
  return map[title] ?? "/onboarding";
}
