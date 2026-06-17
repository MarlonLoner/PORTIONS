import type { ReactNode } from "react";
import { MobileNav } from "@/components/mobile-nav";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/top-bar";

export function AppShell({
  children,
  visibleHrefs,
  user,
  navBadges
}: {
  children: ReactNode;
  visibleHrefs?: string[];
  user?: { name: string; role: string; isDemo: boolean; primaryOperatingUnitName: string | null };
  navBadges?: Record<string, string>;
}) {
  return (
    <div className="min-h-screen bg-transparent">
      <Sidebar visibleHrefs={visibleHrefs} user={user} navBadges={navBadges} />
      <div className="lg:pl-72">
        <TopBar user={user} />
        <MobileNav visibleHrefs={visibleHrefs} navBadges={navBadges} />
        <main className="mx-auto flex w-full max-w-[1600px] flex-col gap-7 px-4 pb-12 pt-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
