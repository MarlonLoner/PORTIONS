import type { ReactNode } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import type { CurrentPlatformUser } from "@/lib/platform-auth";

const links = [
  { href: "/platform", label: "Overview" },
  { href: "/platform/tenants", label: "Tenants" },
  { href: "/platform/tenants/new", label: "New Tenant" },
  { href: "/platform/support", label: "Support Access" },
  { href: "/platform/audit", label: "Audit" },
  { href: "/platform/system-health", label: "System Health" }
];

export function PlatformShell({ user, children }: { user: CurrentPlatformUser; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-navy-950 text-white">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-bold tracking-[0.16em] text-navy-950">PORTIONS</p>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Platform Control Plane</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-navy-950">
                {link.label}
              </Link>
            ))}
            <form action="/api/platform/logout" method="post">
              <button className="rounded-lg bg-navy-950 px-3 py-2 text-xs font-semibold text-white">Sign Out</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto flex max-w-[1500px] flex-col gap-7 px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
          Signed in as <span className="font-semibold text-navy-950">{user.name}</span> / {user.role.replace(/_/g, " ")}
        </div>
        {children}
      </main>
    </div>
  );
}
