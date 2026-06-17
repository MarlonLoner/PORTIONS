import type { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { canViewPage, getCurrentAccessUser } from "@/lib/auth";
import { evaluateTenantOnboarding } from "@/lib/onboarding";
import { TenantOnboardingStatus } from "@prisma/client";

const shellHrefs = [
  "/dashboard",
  "/demo",
  "/demo-script",
  "/patients",
  "/follow-ups",
  "/action-center",
  "/notifications",
  "/communications",
  "/events",
  "/orders",
  "/branches",
  "/stock",
  "/ai-brief",
  "/reports",
  "/pilot-requests",
  "/pilot-command",
  "/executive-pack",
  "/onboarding",
  "/imports",
  "/imports/batches",
  "/admin/users",
  "/admin/operating-units",
  "/account",
  "/settings"
];

export default async function AdminLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  const user = await getCurrentAccessUser();
  if (!user) redirect("/login");
  const pathname = (await headers()).get("x-pathname") ?? "";
  if (!user.isDemo && user.mustChangePassword && pathname !== "/account/change-password") {
    redirect("/account/change-password");
  }
  if (pathname && !canViewPage(user, pathname)) redirect("/access-denied");
  const visibleHrefs = shellHrefs.filter((href) => canViewPage(user, href));
  const onboardingSummary =
    user.tenantId && canViewPage(user, "/onboarding")
      ? await evaluateTenantOnboarding(user.tenantId)
      : null;
  const navBadges =
    onboardingSummary && onboardingSummary.status !== TenantOnboardingStatus.ACTIVE
      ? { "/onboarding": `${onboardingSummary.readinessScore}%` }
      : undefined;

  return (
    <AppShell
      visibleHrefs={visibleHrefs}
      navBadges={navBadges}
      user={{
        name: user.name,
        role: user.role,
        isDemo: user.isDemo,
        primaryOperatingUnitName: user.primaryOperatingUnitName
      }}
    >
      {children}
    </AppShell>
  );
}
