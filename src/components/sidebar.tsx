"use client";

import clsx from "clsx";
import {
  BarChart3,
  Bot,
  Building2,
  ClipboardList,
  ClipboardCheck,
  Database,
  FileText,
  FileSpreadsheet,
  Flag,
  Presentation,
  LayoutDashboard,
  PackageSearch,
  Pill,
  Settings,
  ShoppingBag,
  UsersRound
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/demo", label: "Demo", icon: Presentation },
  { href: "/patients", label: "Chronic Patients", icon: UsersRound },
  { href: "/follow-ups", label: "Follow-Up Queue", icon: ClipboardList },
  { href: "/orders", label: "Orders", icon: ShoppingBag },
  { href: "/branches", label: "Branches", icon: Building2 },
  { href: "/stock", label: "Stock Intelligence", icon: PackageSearch },
  { href: "/ai-brief", label: "AI Brief", icon: Bot },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/pilot-requests", label: "Pilot Requests", icon: ClipboardList },
  { href: "/pilot-command", label: "Pilot Command", icon: Flag },
  { href: "/executive-pack", label: "Executive Pack", icon: FileText },
  { href: "/onboarding", label: "Onboarding", icon: ClipboardCheck },
  { href: "/imports", label: "Imports", icon: FileSpreadsheet },
  { href: "/imports/batches", label: "Import Batches", icon: Database },
  { href: "/settings", label: "Settings", icon: Settings }
];

function isActivePath(pathname: string, href: string) {
  if (href === "/imports") return pathname === "/imports" || pathname === "/imports/upload";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-slate-200 bg-navy-950 text-white lg:flex lg:flex-col">
      <div className="flex h-20 items-center gap-3 px-6">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white text-navy-950">
          <Pill className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <p className="text-lg font-bold tracking-[0.18em]">PORTIONS</p>
          <p className="text-xs text-clinical-200">Pharmacy Command OS</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-4 py-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActivePath(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                active
                  ? "bg-white text-navy-950 shadow-sm"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-5">
        <div className="rounded-lg bg-white/10 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold">Admin-ready structure</p>
            <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-emerald-100 ring-1 ring-emerald-300/20">
              Demo Mode
            </span>
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-300">
            Routes live inside the admin shell so authentication can wrap this surface later.
          </p>
          <form action="/api/demo-access/logout" method="post" className="mt-4">
            <button type="submit" className="focus-ring w-full rounded-lg bg-white px-3 py-2 text-xs font-semibold text-navy-950 transition hover:bg-clinical-50">
              Exit Demo
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
