import Link from "next/link";
import { type Contact, type Lead } from "@/generated/prisma/client";
import { pipelineStages } from "@/lib/constants";
import { LeadScoreBadge } from "@/components/lead-score-badge";

type PipelineLead = Lead & { contacts: Contact[] };

export function PipelineBoard({ leads }: { leads: PipelineLead[] }) {
  return (
    <div className="grid gap-4 xl:grid-cols-4 2xl:grid-cols-8">
      {pipelineStages.map((stage) => {
        const stageLeads = leads.filter((lead) => lead.stage === stage.value);

        return (
          <section
            key={stage.value}
            className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/70"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">{stage.label}</h3>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                {stageLeads.length}
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {stageLeads.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                  No leads in this stage.
                </div>
              ) : null}
              {stageLeads.map((lead) => (
                <Link
                  key={lead.id}
                  href={`/leads/${lead.id}`}
                  className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-950">{lead.businessName}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        {[lead.city, lead.state].filter(Boolean).join(", ")}
                      </p>
                    </div>
                    <LeadScoreBadge score={lead.score} />
                  </div>
                  <p className="mt-3 text-sm text-slate-600">{lead.scoreSummary ?? "Lead score ready"}</p>
                  <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-400">
                    {lead.contacts[0]?.name ?? "No primary contact"}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
