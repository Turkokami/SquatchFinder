import { ReactNode } from "react";

export function StatCard({
  eyebrow,
  value,
  description,
  icon,
}: {
  eyebrow: string;
  value: string | number;
  description: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{eyebrow}</p>
        <div className="rounded-2xl bg-amber-100 p-2 text-amber-700">{icon}</div>
      </div>
      <p className="mt-5 text-3xl font-semibold text-slate-950">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}
