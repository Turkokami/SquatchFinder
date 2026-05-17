import { cn } from "@/lib/utils";
import { getLeadPriorityLabel } from "@/lib/scoring";

export function LeadScoreBadge({ score }: { score: number }) {
  const label = getLeadPriorityLabel(score);

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
        label === "High Priority"
          ? "bg-emerald-100 text-emerald-800"
          : label === "Medium Priority"
            ? "bg-amber-100 text-amber-800"
            : label === "Low Priority"
              ? "bg-slate-100 text-slate-700"
              : "bg-rose-100 text-rose-800",
      )}
    >
      {label} · {score}
    </span>
  );
}
