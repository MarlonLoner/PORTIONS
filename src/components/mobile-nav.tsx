"use client";

import clsx from "clsx";
import {
  BarChart3,
  BellRing,
  Bot,
  Building2,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  Database,
  KeyRound,
  FileText,
  FileSpreadsheet,
  Flag,
  LayoutDashboard,
  MessageSquareText,
  PackageSearch,
  Presentation,
  Settings,
  ShoppingBag,
  UsersRound
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/demo", label: "Demo", icon: Presentation },
  { href: "/demo-script", label: "Script", icon: Presentation },
  { href: "/patients", label: "Patients", icon: UsersRound },
  { href: "/follow-ups", label: "Follow-Ups", icon: ClipboardList },
  { href: "/action-center", label: "Actions", icon: ClipboardCheck },
  { href: "/notifications", label: "Alerts", icon: BellRing },
  { href: "/communications", label: "Comms", icon: MessageSquareText },
  { href: "/events", label: "Events", icon: CalendarDays },
  { href: "/orders", label: "Orders", icon: ShoppingBag },
  { href: "/branches", label: "Branches", icon: Building2 },
  { href: "/stock", label: "Stock", icon: PackageSearch },
  { href: "/ai-brief", label: "AI Brief", icon: Bot },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/pilot-requests", label: "Pilots", icon: ClipboardList },
  { href: "/pilot-command", label: "Command", icon: Flag },
  { href: "/executive-pack", label: "Pack", icon: FileText },
  { href: "/onboarding", label: "Onboard", icon: ClipboardCheck },
  { href: "/imports", label: "Imports", icon: FileSpreadsheet },
  { href: "/imports/batches", label: "Batches", icon: Database },
  { href: "/admin/users", label: "Users", icon: KeyRound },
  { href: "/admin/operating-units", label: "Units", icon: Building2 },
  { href: "/account", label: "Account", icon: UsersRound },
  { href: "/settings", label: "Settings", icon: Settings }
];

function isActivePath(pathname: string, href: string) {
  if (href === "/imports") return pathname === "/imports" || pathname === "/imports/upload";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileNav({ visibleHrefs }: { visibleHrefs?: string[] }) {
  const pathname = usePathname();
  const items = visibleHrefs ? navItems.filter((item) => visibleHrefs.includes(item.href)) : navItems;

  return (
    <nav className="border-b border-slate-200 bg-white px-4 py-2 lg:hidden">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActivePath(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold",
                active ? "bg-navy-950 text-white" : "bg-slate-100 text-slate-600"
              )}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
