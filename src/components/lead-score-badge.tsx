import { cn } from "@/lib/utils";

export function LeadScoreBadge({ score }: { score: number }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
        score >= 80
          ? "bg-emerald-100 text-emerald-800"
          : score >= 60
            ? "bg-amber-100 text-amber-800"
            : "bg-slate-100 text-slate-700",
      )}
    >
      Score {score}
    </span>
  );
}
