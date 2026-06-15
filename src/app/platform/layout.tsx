import type { ReactNode } from "react";
import { PlatformShell } from "@/components/platform-shell";
import { getCurrentPlatformUser } from "@/lib/platform-auth";

export default async function PlatformLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentPlatformUser();
  if (!user) return children;
  return <PlatformShell user={user}>{children}</PlatformShell>;
}
