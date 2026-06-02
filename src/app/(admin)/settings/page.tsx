import { Bell, Building2, Download, Palette, Pill, UsersRound } from "lucide-react";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { enumLabel } from "@/lib/format";
import { getSettingsData } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getSettingsData();

  return (
    <>
      <PageHeader
        eyebrow="Configuration"
        title="Settings"
        description="Basic operating configuration for pharmacy identity, branches, package types, staff members, notifications, imports, and brand settings."
      />

      <section className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <div className="flex items-center gap-2">
            <Pill className="h-5 w-5 text-clinical-700" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-navy-950">Pharmacy Name</h2>
          </div>
          <label className="mt-5 block">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Display name</span>
            <input defaultValue={settings.pharmacyName} className="focus-ring mt-1 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800" />
          </label>
        </article>

        <SettingsPanel icon={<Building2 className="h-5 w-5" />} title="Branches">
          <div className="grid gap-3 sm:grid-cols-2">
            {settings.branches.map((branch) => (
              <div key={branch.id} className="rounded-lg bg-slate-50 p-3">
                <p className="font-semibold text-slate-800">{branch.name}</p>
                <p className="mt-1 text-sm text-slate-500">{branch.area}</p>
                <p className="mt-1 text-xs text-slate-500">{branch.staffMembers.length} staff members</p>
              </div>
            ))}
          </div>
        </SettingsPanel>
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <SettingsPanel icon={<Pill className="h-5 w-5" />} title="Package Types">
          <TagList items={settings.packageTypes.map(enumLabel)} />
        </SettingsPanel>

        <SettingsPanel icon={<UsersRound className="h-5 w-5" />} title="Staff Members">
          <div className="space-y-3">
            {settings.staff.map((member) => (
              <div key={member.id} className="rounded-lg bg-slate-50 p-3">
                <p className="font-semibold text-slate-800">{member.name}</p>
                <p className="mt-1 text-sm text-slate-500">{member.role} - {member.branch?.name ?? "No branch"}</p>
              </div>
            ))}
          </div>
        </SettingsPanel>

        <SettingsPanel icon={<Bell className="h-5 w-5" />} title="Notification Channels">
          <TagList items={settings.notificationChannels} />
        </SettingsPanel>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <SettingsPanel icon={<Download className="h-5 w-5" />} title="Import Settings">
          <TagList items={settings.importSettings} />
        </SettingsPanel>

        <SettingsPanel icon={<Palette className="h-5 w-5" />} title="Branding Settings">
          <TagList items={settings.branding} />
        </SettingsPanel>
      </section>
    </>
  );
}

function SettingsPanel({
  icon,
  title,
  children
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
      <div className="flex items-center gap-2 text-clinical-700">
        {icon}
        <h2 className="text-lg font-semibold text-navy-950">{title}</h2>
      </div>
      <div className="mt-5">{children}</div>
    </article>
  );
}

function TagList({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span key={item} className="rounded-full bg-clinical-50 px-3 py-1.5 text-sm font-medium text-clinical-800 ring-1 ring-clinical-100">
          {item}
        </span>
      ))}
    </div>
  );
}
