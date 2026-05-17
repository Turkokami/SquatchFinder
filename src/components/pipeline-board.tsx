"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { type Contact, type Lead, type Outreach, type Reminder } from "@/generated/prisma/client";
import { updateLeadStageAction } from "@/app/actions";
import { pipelineStages } from "@/lib/constants";
import { getLeadCategoryLabel } from "@/lib/lead-insights";
import { formatDate, relativeTime } from "@/lib/utils";
import { LeadScoreBadge } from "@/components/lead-score-badge";

type PipelineLead = Lead & {
  contacts: Contact[];
  outreachHistory: Outreach[];
  reminders: Reminder[];
};

export function PipelineBoard({ leads }: { leads: PipelineLead[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [activeStage, setActiveStage] = useState<string | null>(null);

  const submitStageChange = (leadId: string, stage: string) => {
    if (!formRef.current) {
      return;
    }

    const leadInput = formRef.current.elements.namedItem("leadId") as HTMLInputElement | null;
    const stageInput = formRef.current.elements.namedItem("stage") as HTMLInputElement | null;

    if (!leadInput || !stageInput) {
      return;
    }

    leadInput.value = leadId;
    stageInput.value = stage;
    formRef.current.requestSubmit();
  };

  return (
    <>
      <form ref={formRef} action={updateLeadStageAction} className="hidden">
        <input type="hidden" name="leadId" />
        <input type="hidden" name="stage" />
      </form>

      <div className="grid gap-4 xl:grid-cols-3 2xl:grid-cols-5">
        {pipelineStages.map((stage) => {
          const stageLeads = leads.filter((lead) => lead.stage === stage.value);

          return (
            <section
              key={stage.value}
              onDragOver={(event) => {
                event.preventDefault();
                setActiveStage(stage.value);
              }}
              onDragLeave={() => setActiveStage((current) => (current === stage.value ? null : current))}
              onDrop={(event) => {
                event.preventDefault();
                const leadId = event.dataTransfer.getData("text/plain") || draggedLeadId;

                if (leadId) {
                  submitStageChange(leadId, stage.value);
                }

                setDraggedLeadId(null);
                setActiveStage(null);
              }}
              className={`rounded-[24px] border bg-white p-4 shadow-sm shadow-slate-200/70 transition ${
                activeStage === stage.value ? "border-amber-400 ring-4 ring-amber-100" : "border-slate-200"
              }`}
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
                    Drop a lead here.
                  </div>
                ) : null}
                {stageLeads.map((lead) => {
                  const nextFollowUp = lead.reminders[0]?.dueAt ?? lead.nextFollowUpAt;
                  const lastActivity =
                    lead.outreachHistory[0]?.happenedAt ?? lead.lastContactedAt ?? lead.updatedAt;

                  return (
                    <Link
                      key={lead.id}
                      href={`/leads/${lead.id}`}
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.setData("text/plain", lead.id);
                        event.dataTransfer.effectAllowed = "move";
                        setDraggedLeadId(lead.id);
                      }}
                      onDragEnd={() => {
                        setDraggedLeadId(null);
                        setActiveStage(null);
                      }}
                      className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-slate-950">{lead.businessName}</p>
                          <p className="mt-1 text-sm text-slate-600">{getLeadCategoryLabel(lead.category)}</p>
                          <p className="mt-1 text-sm text-slate-500">{lead.city ?? "Unknown city"}</p>
                        </div>
                        <LeadScoreBadge score={lead.score} />
                      </div>
                      <div className="mt-3 space-y-2 text-sm text-slate-600">
                        <p>Next follow-up: {formatDate(nextFollowUp)}</p>
                        <p>Last activity: {relativeTime(lastActivity)}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
