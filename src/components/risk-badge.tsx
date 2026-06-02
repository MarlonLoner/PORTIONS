import clsx from "clsx";
import { enumLabel } from "@/lib/format";

const classes: Record<string, string> = {
  LOW: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  MEDIUM: "bg-amber-50 text-amber-700 ring-amber-200",
  HIGH: "bg-rose-50 text-rose-700 ring-rose-200"
};

export function RiskBadge({ risk }: { risk: string }) {
  return (
    <span className={clsx("inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ring-1", classes[risk])}>
      {enumLabel(risk)}
    </span>
  );
}
