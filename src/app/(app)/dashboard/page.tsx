import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CalendarClock,
  CircleDollarSign,
  ClipboardCheck,
  Percent,
  Trophy,
  XCircle,
} from "lucide-react";
import { getAppOverview } from "@/lib/data";
import { getLeadCategoryLabel, getLeadStatusLabel } from "@/lib/lead-insights";
import { formatDateTime, relativeTime } from "@/lib/utils";
import { StatCard } from "@/components/stat-card";
import { LeadScoreBadge } from "@/components/lead-score-badge";

function MiniBarChart({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ label: string; value: number }>;
}) {
  const max = Math.max(...rows.map((row) => row.value), 1);

  return (
    <section className="surface-card p-6">
      <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
      <div className="mt-5 space-y-4">
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
            No data yet.
          </div>
        ) : null}
        {rows.map((row) => (
          <div key={row.label} className="space-y-2">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium text-slate-700">{row.label}</span>
              <span className="text-slate-500">{row.value}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-amber-400"
                style={{ width: `${Math.max(8, (row.value / max) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default async function DashboardPage() {
  const overview = await getAppOverview();
  const openReminders = overview.reminders.filter((reminder) => reminder.status === "OPEN");

  const categoryRows = overview.categoryCounts.map((row) => ({
    label: getLeadCategoryLabel(row.category),
    value: row._count.category,
  }));

  const statusRows = overview.statusCounts.map((row) => ({
    label: getLeadStatusLabel(row.stage),
    value: row._count.stage,
  }));

  const cityRows = overview.cityCounts
    .filter((row) => row.city)
    .map((row) => ({
      label: row.city ?? "Unknown",
      value: row._count.city,
    }));

  const conversionRows = [
    { label: "Won", value: overview.wonAccounts },
    { label: "Lost", value: overview.lostAccounts },
    {
      label: "Open pipeline",
      value: Math.max(overview.leadCount - overview.wonAccounts - overview.lostAccounts, 0),
    },
  ];

  return (
    <div className="space-y-6">
      {!overview.isConnected ? (
        <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          Database connection is not ready yet. Set your Postgres `DATABASE_URL`, run `npm run db:push`, then `npm run db:seed`.
        </div>
      ) : null}

      <section className="surface-card flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">CRM dashboard</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">Sales pipeline overview</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Watch lead volume, proposal momentum, follow-up pressure, and recurring revenue potential in one place.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/search"
            className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Find new leads
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="/api/export/leads"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-amber-300"
          >
            Export CSV
          </a>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        <StatCard
          eyebrow="Total leads"
          value={overview.leadCount}
          description="All commercial pest control prospects in the CRM."
          icon={<Building2 className="h-5 w-5" />}
        />
        <StatCard
          eyebrow="New leads this week"
          value={overview.newLeadsThisWeek}
          description="Fresh accounts added in the last 7 days."
          icon={<ArrowRight className="h-5 w-5" />}
        />
        <StatCard
          eyebrow="High priority leads"
          value={overview.highPriorityLeads}
          description="Leads scored at 80 or above."
          icon={<ClipboardCheck className="h-5 w-5" />}
        />
        <StatCard
          eyebrow="Follow-ups due today"
          value={overview.followUpsDueToday}
          description="Open tasks due before the day ends."
          icon={<CalendarClock className="h-5 w-5" />}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        <StatCard
          eyebrow="Proposals sent"
          value={overview.proposalsSent}
          description="Accounts currently at proposal stage."
          icon={<Percent className="h-5 w-5" />}
        />
        <StatCard
          eyebrow="Won accounts"
          value={overview.wonAccounts}
          description="Closed-won commercial customers."
          icon={<Trophy className="h-5 w-5" />}
        />
        <StatCard
          eyebrow="Lost accounts"
          value={overview.lostAccounts}
          description="Closed-lost pipeline opportunities."
          icon={<XCircle className="h-5 w-5" />}
        />
        <StatCard
          eyebrow="Monthly recurring revenue potential"
          value={`$${Math.round(overview.monthlyRecurringRevenuePotential).toLocaleString()}`}
          description="Estimated open recurring revenue in the current pipeline."
          icon={<CircleDollarSign className="h-5 w-5" />}
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
                    {getLeadCategoryLabel(lead.category)} | {[lead.city, lead.state].filter(Boolean).join(", ")}
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

      <section className="grid gap-6 xl:grid-cols-2">
        <MiniBarChart title="Leads by category" rows={categoryRows} />
        <MiniBarChart title="Leads by status" rows={statusRows} />
        <MiniBarChart title="Leads by city" rows={cityRows} />
        <MiniBarChart title={`Conversion rate (${overview.conversionRate}%)`} rows={conversionRows} />
      </section>
    </div>
  );
}
