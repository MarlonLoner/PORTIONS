import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";

export default function AdminLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return <AppShell>{children}</AppShell>;
}
