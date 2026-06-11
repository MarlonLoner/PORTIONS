import {
  Bell,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Database,
  Download,
  Mail,
  MessageSquare,
  PackageCheck,
  Phone,
  Pill,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  UploadCloud,
  UsersRound,
  WandSparkles,
  XCircle
} from "lucide-react";
import type { ReactNode } from "react";
import { StatCard } from "@/components/stat-card";
import { getSettingsData } from "@/lib/data";
import {
  getAiSetupAdvisor,
  getBranchConfigurationStatus,
  getDeploymentChecklist,
  getImportReadinessScore,
  getIntegrationReadinessItems,
  getIntegrationReadinessScore,
  getNotificationChannelStatus,
  getOperatingRules,
  getPackageConfiguration,
  getSettingsOverview,
  getSetupStatus,
  getStaffConfigurationSummary
} from "@/lib/settings";

export const dynamic = "force-dynamic";

const setupClasses = {
  "Demo Mode": "bg-clinical-50 text-clinical-800 ring-clinical-200",
  "Ready for Pilot": "bg-amber-50 text-amber-700 ring-amber-200",
  "Live Configuration": "bg-emerald-50 text-emerald-700 ring-emerald-200"
};

const readinessClasses = {
  Ready: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  "Manual Import": "bg-clinical-50 text-clinical-800 ring-clinical-200",
  "Needs Mapping": "bg-amber-50 text-amber-700 ring-amber-200",
  "Future Integration": "bg-slate-100 text-slate-600 ring-slate-200"
};

const channelIcons: Record<string, ReactNode> = {
  WhatsApp: <MessageSquare className="h-4 w-4" />,
  SMS: <MessageSquare className="h-4 w-4" />,
  Email: <Mail className="h-4 w-4" />,
  "Phone Call": <Phone className="h-4 w-4" />,
  "In-app task": <ClipboardCheck className="h-4 w-4" />
};

export default async function SettingsPage() {
  const settings = await getSettingsData();
  const overview = getSettingsOverview(settings);
  const setupStatus = getSetupStatus(settings);
  const importReadinessScore = getImportReadinessScore(settings);
  const integrationReadinessScore = getIntegrationReadinessScore(settings);
  const branches = getBranchConfigurationStatus(settings);
  const staff = getStaffConfigurationSummary(settings);
  const packages = getPackageConfiguration();
  const channels = getNotificationChannelStatus(settings);
  const integrations = getIntegrationReadinessItems(settings);
  const rules = getOperatingRules();
  const checklist = getDeploymentChecklist(settings);
  const advisor = getAiSetupAdvisor(settings);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-lg border border-navy-800 bg-navy-950 p-5 text-white shadow-[0_28px_80px_rgba(6,21,38,0.22)] sm:p-6 xl:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.12),transparent_36%),linear-gradient(180deg,rgba(75,158,201,0.18),transparent_58%)]" />
        <div className="relative grid gap-7 xl:grid-cols-[1.1fr_0.9fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-clinical-100 ring-1 ring-white/15">
              <Settings className="h-3.5 w-3.5" aria-hidden="true" />
              Deployment Control
            </span>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">Settings</h1>
              <span className={`rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] ring-1 ${setupClasses[setupStatus]}`}>
                {setupStatus}
              </span>
            </div>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-200">
              Configure pharmacy profile, branches, staff, chronic packages, notification channels, imports, and operating rules.
            </p>
            <p className="mt-5 max-w-4xl text-sm leading-7 text-slate-100">
              {overview.pharmacyName} is structured for a multi-branch pharmacy rollout, with setup signals for pilot readiness, staff accountability, imports, and future integrations.
            </p>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/10 p-4">
            <div className="flex items-center gap-2">
              <WandSparkles className="h-4 w-4 text-emerald-200" aria-hidden="true" />
              <h2 className="text-lg font-semibold">Setup Status</h2>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <HeroMetric label="Branches" value={String(overview.branchCount)} />
              <HeroMetric label="Staff" value={String(overview.staffCount)} />
              <HeroMetric label="Package types" value={String(overview.activePackageTypes)} />
              <HeroMetric label="Channels" value={String(overview.notificationChannels)} />
              <HeroMetric label="Import readiness" value={`${importReadinessScore}%`} />
              <HeroMetric label="Integration readiness" value={`${integrationReadinessScore}%`} />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Setup status" value={overview.setupStatus} helper="Demo, pilot, or live rollout" icon={<ShieldCheck className="h-5 w-5" />} tone="navy" trend="Config" />
        <StatCard title="Branch count" value={String(overview.branchCount)} helper="Configured network locations" icon={<Building2 className="h-5 w-5" />} tone="white" trend="Branches" />
        <StatCard title="Staff count" value={String(overview.staffCount)} helper="Seeded team members" icon={<UsersRound className="h-5 w-5" />} tone="blue" trend="Team" />
        <StatCard title="Active packages" value={String(overview.activePackageTypes)} helper="Chronic care package options" icon={<Pill className="h-5 w-5" />} tone="emerald" trend="Care" />
        <StatCard title="Notification channels" value={String(overview.notificationChannels)} helper="Manual and connected channels" icon={<Bell className="h-5 w-5" />} tone="white" trend="Comms" />
        <StatCard title="Import readiness" value={`${overview.importReadinessScore}%`} helper="CSV and pilot data preparedness" icon={<UploadCloud className="h-5 w-5" />} tone={overview.importReadinessScore >= 70 ? "emerald" : "amber"} trend="Imports" />
        <StatCard title="Integration readiness" value={`${overview.integrationReadinessScore}%`} helper="Manual, mapped, and future channels" icon={<Database className="h-5 w-5" />} tone={overview.integrationReadinessScore >= 70 ? "emerald" : "amber"} trend="Systems" />
        <StatCard title="Checklist progress" value={`${checklist.filter((item) => item.done).length}/${checklist.length}`} helper="Deployment steps completed" icon={<ClipboardCheck className="h-5 w-5" />} tone="white" trend="Pilot" />
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <Panel title="Pharmacy Profile" eyebrow="Organization identity" icon={<Pill className="h-5 w-5" />}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Pharmacy name" value={settings.pharmacyName} />
            <Field label="Country" value="Zimbabwe" />
            <Field label="Currency" value="USD" />
            <Field label="Operating model" value="Multi-branch" />
            <Field label="Primary owner/CEO view" value="Executive dashboard and AI Brief" />
            <Field label="Default reporting time" value="08:00 daily" />
            <Field label="Support contact" value="support@portions.health" />
          </div>
        </Panel>

        <Panel title="AI Setup Advisor" eyebrow="Go-live guidance" icon={<WandSparkles className="h-5 w-5" />}>
          <p className="rounded-lg bg-navy-950 p-4 text-sm leading-7 text-white">{advisor}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <ReadinessBlock label="Import readiness" value={`${importReadinessScore}%`} />
            <ReadinessBlock label="Integration readiness" value={`${integrationReadinessScore}%`} />
          </div>
        </Panel>
      </section>

      <Panel title="Branch Configuration" eyebrow="Network rollout" icon={<Building2 className="h-5 w-5" />}>
        <div className="grid gap-4 xl:grid-cols-2">
          {branches.map((branch) => (
            <article key={branch.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-navy-950">{branch.name}</h3>
                  <p className="mt-1 text-sm text-slate-500">{branch.location}</p>
                </div>
                <BooleanBadge active={branch.active} label={branch.active ? "Active" : "Inactive"} />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Field label="Manager" value={branch.manager} compact />
                <Field label="Staff count" value={String(branch.staffCount)} compact />
                <ToggleLine label="Revenue tracking" enabled={branch.revenueTrackingEnabled} />
                <ToggleLine label="Stock tracking" enabled={branch.stockTrackingEnabled} />
                <ToggleLine label="Chronic care" enabled={branch.chronicCareEnabled} />
              </div>
              <p className="mt-4 rounded-lg bg-white p-3 text-sm leading-6 text-slate-700 ring-1 ring-slate-200">{branch.suggestedAction}</p>
            </article>
          ))}
        </div>
      </Panel>

      <Panel title="Staff Members" eyebrow="Access and responsibility" icon={<UsersRound className="h-5 w-5" />}>
        <div className="grid gap-4 xl:grid-cols-2">
          {staff.map((member) => (
            <article key={member.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-navy-950">{member.name}</h3>
                  <p className="mt-1 text-sm text-slate-500">{member.role} - {member.branch}</p>
                </div>
                <span className="rounded-full bg-clinical-50 px-2.5 py-1 text-xs font-semibold text-clinical-800 ring-1 ring-clinical-100">{member.accessLevel}</span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <ToggleLine label="Follow-up responsibility" enabled={member.followUpResponsibility} />
                <ToggleLine label="Order handling" enabled={member.orderHandlingResponsibility} />
                <ToggleLine label="Stock responsibility" enabled={member.stockResponsibility} />
                <Field label="Response score" value={`${member.responseScore}%`} compact />
              </div>
            </article>
          ))}
        </div>
      </Panel>

      <Panel title="Chronic Package Types" eyebrow="Recurring care products" icon={<PackageCheck className="h-5 w-5" />}>
        <div className="grid gap-4 xl:grid-cols-3">
          {packages.map((pkg) => (
            <article key={pkg.name} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold text-navy-950">{pkg.name}</h3>
                <StatusBadge label={pkg.status} />
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{pkg.description}</p>
              <div className="mt-4 space-y-2">
                <Field label="Monthly value" value={pkg.monthlyValue} compact />
                <Field label="Reminder cadence" value={pkg.reminderCadence} compact />
                <Field label="Delivery option" value={pkg.deliveryOption} compact />
                <Field label="Pharmacist check-in" value={pkg.pharmacistCheckIn} compact />
              </div>
            </article>
          ))}
        </div>
      </Panel>

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel title="Notification Channels" eyebrow="Patient and team communication" icon={<Bell className="h-5 w-5" />}>
          <div className="space-y-3">
            {channels.map((channel) => (
              <article key={channel.name} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-clinical-50 p-2 text-clinical-700 ring-1 ring-clinical-100">{channelIcons[channel.name]}</div>
                    <div>
                      <h3 className="font-semibold text-navy-950">{channel.name}</h3>
                      <p className="mt-1 text-sm text-slate-500">{channel.useCase}</p>
                    </div>
                  </div>
                  <StatusBadge label={channel.status} />
                </div>
                <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-700">{channel.nextStep}</p>
              </article>
            ))}
          </div>
        </Panel>

        <Panel title="Import & Integration Readiness" eyebrow="Deployment inputs" icon={<Download className="h-5 w-5" />}>
          <div className="grid gap-3">
            {integrations.map((item) => (
              <article key={item.name} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-navy-950">{item.name}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{item.whyItMatters}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ring-1 ${readinessClasses[item.status]}`}>{item.status}</span>
                </div>
                <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-700">{item.dataNeeded}</p>
              </article>
            ))}
          </div>
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <Panel title="Operating Rules" eyebrow="Default command logic" icon={<SlidersHorizontal className="h-5 w-5" />}>
          <div className="grid gap-3 sm:grid-cols-2">
            {rules.map((rule) => (
              <article key={rule.name} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{rule.name}</p>
                <p className="mt-2 text-lg font-semibold text-navy-950">{rule.value}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{rule.reason}</p>
              </article>
            ))}
          </div>
        </Panel>

        <Panel title="Deployment Checklist" eyebrow="Pilot path" icon={<ClipboardCheck className="h-5 w-5" />}>
          <div className="space-y-3">
            {checklist.map((item) => (
              <div key={item.item} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex items-center gap-3">
                  {item.done ? <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" /> : <XCircle className="h-4 w-4 text-slate-400" aria-hidden="true" />}
                  <p className="text-sm font-medium text-slate-800">{item.item}</p>
                </div>
                <span className={item.done ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100" : "rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200"}>
                  {item.done ? "Done" : "Pending"}
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </section>
    </div>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white p-4 text-navy-950">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-navy-950">{value}</p>
    </div>
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
    <div className={compact ? "rounded-lg bg-slate-50 px-3 py-2" : "rounded-lg border border-slate-200 bg-slate-50 p-4"}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</p>
      <p className={compact ? "mt-1 text-sm font-semibold text-slate-800" : "mt-2 text-sm font-semibold text-navy-950"}>{value}</p>
    </div>
  );
}

function ReadinessBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-clinical-100 bg-clinical-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-clinical-700">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-navy-950">{value}</p>
    </div>
  );
}

function BooleanBadge({ active, label }: { active: boolean; label: string }) {
  return (
    <span className={active ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100" : "rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200"}>
      {label}
    </span>
  );
}

function ToggleLine({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 ring-1 ring-slate-200">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <span className={enabled ? "h-5 w-9 rounded-full bg-emerald-500 p-0.5" : "h-5 w-9 rounded-full bg-slate-300 p-0.5"}>
        <span className={enabled ? "block h-4 w-4 translate-x-4 rounded-full bg-white" : "block h-4 w-4 rounded-full bg-white"} />
      </span>
    </div>
  );
}

function StatusBadge({ label }: { label: string }) {
  const tone =
    label === "Active" || label === "Connected" || label === "Ready"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
      : label === "Draft" || label === "Manual"
        ? "bg-amber-50 text-amber-700 ring-amber-100"
        : "bg-slate-100 text-slate-600 ring-slate-200";

  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${tone}`}>{label}</span>;
}
