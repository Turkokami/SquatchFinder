import { getPipelineBoard } from "@/lib/data";
import { PipelineBoard } from "@/components/pipeline-board";

export default async function PipelinePage() {
  const leads = await getPipelineBoard();

  return (
    <div className="space-y-6">
      <section className="surface-card p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">Pipeline board</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">Track every prospect by stage</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Drag cards between New Lead, Researching, Contacted, Follow-Up Scheduled, Inspection Scheduled, Proposal Sent, Won, Lost, and Nurture.
        </p>
      </section>
      <PipelineBoard leads={leads} />
    </div>
  );
}
