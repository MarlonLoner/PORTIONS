"use client";

import { Bot, FileDown, Flag } from "lucide-react";
import Link from "next/link";

export function ExecutivePackActions() {
  return (
    <div className="no-print flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => window.print()}
        className="focus-ring inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-navy-950 ring-1 ring-white transition hover:bg-clinical-50"
      >
        <FileDown className="h-3.5 w-3.5" aria-hidden="true" />
        Print / Save as PDF
      </button>
      <Link href="/pilot-command" className="focus-ring inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-white ring-1 ring-white/15 transition hover:bg-white/15">
        <Flag className="h-3.5 w-3.5" aria-hidden="true" />
        Open Pilot Command Center
      </Link>
      <Link href="/ai-brief" className="focus-ring inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-white ring-1 ring-white/15 transition hover:bg-white/15">
        <Bot className="h-3.5 w-3.5" aria-hidden="true" />
        Open AI Brief
      </Link>
    </div>
  );
}
