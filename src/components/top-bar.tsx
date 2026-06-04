import { CalendarDays, Search } from "lucide-react";

export function TopBar() {
  const date = new Intl.DateTimeFormat("en-ZW", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(new Date());

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-20 max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="min-w-0 lg:hidden">
          <p className="text-base font-bold tracking-[0.16em] text-navy-950">PORTIONS</p>
          <p className="text-xs text-slate-500">Pharmacy Command OS</p>
        </div>
        <div className="hidden min-w-0 flex-1 lg:block">
          <label className="relative block max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              className="focus-ring h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-800 placeholder:text-slate-400"
              placeholder="Search patients, orders, branches, stock..."
              type="search"
            />
          </label>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-emerald-700 ring-1 ring-emerald-100 sm:inline-flex">
            Demo Mode
          </span>
          <form action="/api/demo-access/logout" method="post" className="hidden sm:block lg:hidden">
            <button type="submit" className="focus-ring rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50">
              Exit Demo
            </button>
          </form>
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
            <CalendarDays className="h-4 w-4 text-clinical-700" aria-hidden="true" />
            <span className="hidden sm:inline">{date}</span>
            <span className="sm:hidden">Today</span>
          </div>
        </div>
      </div>
      <div className="border-t border-slate-100 px-4 py-3 lg:hidden">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            className="focus-ring h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm"
            placeholder="Search PORTIONS"
            type="search"
          />
        </label>
      </div>
    </header>
  );
}
