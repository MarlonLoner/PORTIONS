import { Bot, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

export function AiBriefCard({
  title,
  children,
  action,
  variant = "default"
}: {
  title: string;
  children: ReactNode;
  action?: string;
  variant?: "default" | "executive";
}) {
  if (variant === "executive") {
    return (
      <article className="relative overflow-hidden rounded-lg border border-navy-800 bg-navy-950 p-6 text-white shadow-[0_26px_70px_rgba(6,21,38,0.24)]">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.12),transparent_44%),linear-gradient(180deg,rgba(75,158,201,0.16),transparent_55%)]" />
        <div className="relative flex items-start gap-4">
          <div className="rounded-lg bg-white/10 p-3 text-clinical-100 ring-1 ring-white/15">
            <Bot className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-100 ring-1 ring-emerald-300/20">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                AI Analyst
              </span>
            </div>
            <div className="mt-4 text-sm leading-6 text-slate-200">{children}</div>
            {action ? (
              <p className="mt-5 rounded-lg border border-white/10 bg-white/10 px-4 py-3 text-sm font-medium leading-6 text-white">
                {action}
              </p>
            ) : null}
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="rounded-lg border border-clinical-100 bg-white p-5 shadow-soft">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-navy-950 p-2.5 text-white">
          <Bot className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-navy-950">{title}</h2>
            <Sparkles className="h-4 w-4 text-emerald-500" aria-hidden="true" />
          </div>
          <div className="mt-3 text-sm leading-6 text-slate-600">{children}</div>
          {action ? (
            <p className="mt-4 rounded-lg bg-clinical-50 px-3 py-2 text-sm font-medium text-clinical-700">
              {action}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}
