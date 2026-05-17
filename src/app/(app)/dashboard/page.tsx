import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Clock3,
  Percent,
  Target,
} from "lucide-react";
import { getAppOverview } from "@/lib/data";
import { formatDateTime, relativeTime } from "@/lib/utils";
import { StatCard } from "@/components/stat-card";
import { LeadScoreBadge } from "@/components/lead-score-badge";

export default async function DashboardPage() {
  const overview = await getAppOverview();
  const openReminders = overview.reminders.filter((reminder) => reminder.status === "OPEN");

  return (
    <div className="space-y-6">
      {!overview.isConnected ? (
        <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          Database connection is not ready yet. Set your Postgres `DATABASE_URL`, run `npm run db:push`, then `npm run db:seed`.
        </div>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-4">
        <StatCard
          eyebrow="Active leads"
          value={overview.leadCount}
          description="All commercial prospects currently in Squatch Finder."
          icon={<Building2 className="h-5 w-5" />}
        />
        <StatCard
          eyebrow="Open reminders"
          value={openReminders.length}
          description="Follow-ups your team should handle next."
          icon={<Clock3 className="h-5 w-5" />}
        />
        <StatCard
          eyebrow="Win rate"
          value={`${overview.conversionRate}%`}
          description="Share of leads already converted to won business."
          icon={<Percent className="h-5 w-5" />}
        />
        <StatCard
          eyebrow="Qualified stages"
          value={overview.stageCounts.length}
          description="Pipeline stages with active inventory today."
          icon={<Target className="h-5 w-5" />}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="surface-card p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
                Recent leads
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">Fresh activity</h2>
            </div>
            <Link
              href="/search"
              className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Find new leads
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-6 space-y-3">
            {overview.recentLeads.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
                Seed the database to load demo prospects and start working the pipeline.
              </div>
            ) : null}
            {overview.recentLeads.map((lead) => (
              <Link
                key={lead.id}
                href={`/leads/${lead.id}`}
                className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-amber-300 hover:bg-white sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="font-semibold text-slate-950">{lead.businessName}</h3>
                    <LeadScoreBadge score={lead.score} />
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {lead.category.replaceAll("_", " ")} • {[lead.city, lead.state].filter(Boolean).join(", ")}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">{lead.scoreSummary ?? "Score summary pending"}</p>
                </div>
                <div className="text-sm text-slate-500">{relativeTime(lead.updatedAt)}</div>
              </Link>
            ))}
          </div>
        </div>

        <div className="surface-card p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
                Follow-up queue
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">What needs attention</h2>
            </div>
            <AlertCircle className="h-5 w-5 text-amber-500" />
          </div>
          <div className="mt-6 space-y-3">
            {openReminders.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
                No reminders are due yet.
              </div>
            ) : null}
            {openReminders.map((reminder) => (
              <Link
                key={reminder.id}
                href={`/leads/${reminder.leadId}`}
                className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-amber-300 hover:bg-white"
              >
                <p className="font-medium text-slate-950">{reminder.title}</p>
                <p className="mt-1 text-sm text-slate-600">{reminder.lead.businessName}</p>
                <p className="mt-3 text-sm text-slate-500">Due {formatDateTime(reminder.dueAt)}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
