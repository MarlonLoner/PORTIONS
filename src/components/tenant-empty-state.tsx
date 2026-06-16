import type { LucideIcon } from "lucide-react";
import { ArrowRight, ClipboardList } from "lucide-react";
import Link from "next/link";

export function TenantEmptyState({
  title,
  description,
  primaryActionLabel,
  primaryActionHref,
  secondaryActionLabel,
  secondaryActionHref,
  icon: Icon = ClipboardList
}: {
  title: string;
  description: string;
  primaryActionLabel: string;
  primaryActionHref: string;
  secondaryActionLabel?: string;
  secondaryActionHref?: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="rounded-lg border border-dashed border-clinical-200 bg-white p-6 shadow-soft">
      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-clinical-50 text-clinical-700 ring-1 ring-clinical-100">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <h3 className="mt-4 text-xl font-semibold tracking-tight text-navy-950">{title}</h3>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{description}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link href={primaryActionHref} className="focus-ring inline-flex items-center gap-2 rounded-lg bg-navy-950 px-4 py-2.5 text-sm font-semibold text-white">
          {primaryActionLabel}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        {secondaryActionLabel && secondaryActionHref ? (
          <Link href={secondaryActionHref} className="focus-ring rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700">
            {secondaryActionLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
