"use client";

import clsx from "clsx";
import {
  BarChart3,
  Bot,
  Building2,
  ClipboardList,
  LayoutDashboard,
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
  { href: "/patients", label: "Patients", icon: UsersRound },
  { href: "/follow-ups", label: "Follow-Ups", icon: ClipboardList },
  { href: "/orders", label: "Orders", icon: ShoppingBag },
  { href: "/branches", label: "Branches", icon: Building2 },
  { href: "/stock", label: "Stock", icon: PackageSearch },
  { href: "/ai-brief", label: "AI Brief", icon: Bot },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings }
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-slate-200 bg-white px-4 py-2 lg:hidden">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);

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
