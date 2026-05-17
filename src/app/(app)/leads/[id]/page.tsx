import { notFound } from "next/navigation";
import {
  addContactAction,
  addNoteAction,
  addOutreachAction,
  addReminderAction,
  discoverContactsAction,
  refreshLeadScoreAction,
  toggleReminderAction,
  updateLeadSocialProfilesAction,
  updateLeadStageAction,
} from "@/app/actions";
import { LeadScoreBadge } from "@/components/lead-score-badge";
import { outreachTypeOptions, pipelineStages } from "@/lib/constants";
import { getLeadById } from "@/lib/data";
import {
  getEstimatedUrgency,
  getGoogleBusinessProfileLink,
  getLeadCategoryLabel,
  getPriorityLevel,
} from "@/lib/lead-insights";
import { currencyBandLabel, formatDate, formatDateTime, relativeTime } from "@/lib/utils";

type LeadDetailProps = {
  params: Promise<{ id: string }>;
};

function ActionLink({
  href,
  label,
}: {
  href?: string | null;
  label: string;
}) {
  const enabled = Boolean(href);

  return (
    <a
      href={enabled ? href ?? undefined : undefined}
      target={enabled ? "_blank" : undefined}
      rel={enabled ? "noreferrer" : undefined}
      className={`inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold transition ${
        enabled
          ? "border border-slate-200 bg-white text-slate-900 hover:border-amber-300"
          : "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
      }`}
    >
      {label}
    </a>
  );
}

export default async function LeadDetailPage({ params }: LeadDetailProps) {
  const { id } = await params;
  const lead = await getLeadById(id);

  if (!lead) {
    notFound();
  }

  const primaryContact = lead.contacts.find((contact) => contact.isPrimary) ?? lead.contacts[0] ?? null;
  const contactProfileUrl =
    lead.decisionMakerLinkedinUrl ??
    lead.decisionMakerFacebookUrl ??
    primaryContact?.linkedinUrl ??
    primaryContact?.facebookUrl ??
    null;
  const emailTarget = primaryContact?.email ?? lead.email ?? "";
  const googleProfileLink = getGoogleBusinessProfileLink(lead);
  const priorityRating = getPriorityLevel(lead.score, lead.isPriority);
  const estimatedUrgency = getEstimatedUrgency(lead.score, lead.isPriority);

  return (
    <div className="space-y-6">
      <section className="surface-card p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-semibold text-slate-950">{lead.businessName}</h1>
              <LeadScoreBadge score={lead.score} />
            </div>
            <p className="mt-2 text-sm text-slate-600">
              {getLeadCategoryLabel(lead.category)} | {[lead.addressLine1, lead.city, lead.state].filter(Boolean).join(", ")}
            </p>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              {lead.description ?? "No business description captured yet."}
            </p>
            <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-600">
              <span>Phone: {lead.phone ?? "Unknown"}</span>
              <span>Website: {lead.website ?? "Unknown"}</span>
              <span>Updated {relativeTime(lead.updatedAt)}</span>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <a
                href={lead.phone ? `tel:${lead.phone}` : undefined}
                className={`inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  lead.phone
                    ? "border border-slate-200 bg-white text-slate-900 hover:border-amber-300"
                    : "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
                }`}
              >
                Call
              </a>
              <a
                href={emailTarget ? `mailto:${emailTarget}` : undefined}
                className={`inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  emailTarget
                    ? "border border-slate-200 bg-white text-slate-900 hover:border-amber-300"
                    : "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
                }`}
              >
                Email
              </a>
              <a
                href="#notes"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:border-amber-300"
              >
                Add note
              </a>
              <a
                href="#follow-up-tasks"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:border-amber-300"
              >
                Schedule follow-up
              </a>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <form action={updateLeadStageAction}>
                <input type="hidden" name="leadId" value={lead.id} />
                <input type="hidden" name="stage" value="CONTACTED" />
                <button
                  type="submit"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:border-amber-300"
                >
                  Mark as contacted
                </button>
              </form>
              <form action={updateLeadStageAction}>
                <input type="hidden" name="leadId" value={lead.id} />
                <input type="hidden" name="stage" value="PROPOSAL_SENT" />
                <button
                  type="submit"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:border-amber-300"
                >
                  Move to proposal
                </button>
              </form>
              <form action={updateLeadStageAction}>
                <input type="hidden" name="leadId" value={lead.id} />
                <input type="hidden" name="stage" value="WON" />
                <button
                  type="submit"
                  className="w-full rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 transition hover:border-emerald-300"
                >
                  Mark as won
                </button>
              </form>
              <form action={updateLeadStageAction}>
                <input type="hidden" name="leadId" value={lead.id} />
                <input type="hidden" name="stage" value="LOST" />
                <button
                  type="submit"
                  className="w-full rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800 transition hover:border-rose-300"
                >
                  Mark as lost
                </button>
              </form>
            </div>
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 lg:w-[320px]">
            <p className="text-sm font-semibold text-slate-900">Status dropdown</p>
            <form action={updateLeadStageAction} className="mt-4 space-y-3">
              <input type="hidden" name="leadId" value={lead.id} />
              <select
                name="stage"
                defaultValue={lead.stage}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
              >
                {pipelineStages.map((stage) => (
                  <option key={stage.value} value={stage.value}>
                    {stage.label}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Update stage
              </button>
            </form>
            <form action={refreshLeadScoreAction} className="mt-3">
              <input type="hidden" name="leadId" value={lead.id} />
              <button
                type="submit"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-amber-300 hover:text-slate-950"
              >
                Recalculate score
              </button>
            </form>
            <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
              {lead.scoreSummary ?? "Score summary not available yet."}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <div className="surface-card p-6">
            <h2 className="text-xl font-semibold text-slate-950">Business profile</h2>
            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Business name</dt>
                <dd className="mt-1 text-sm text-slate-700">{lead.businessName}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Category</dt>
                <dd className="mt-1 text-sm text-slate-700">{getLeadCategoryLabel(lead.category)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Address</dt>
                <dd className="mt-1 text-sm text-slate-700">
                  {[lead.addressLine1, lead.city, lead.state, lead.postalCode].filter(Boolean).join(", ") || "Unknown"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Phone</dt>
                <dd className="mt-1 text-sm text-slate-700">{lead.phone ?? "Unknown"}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Website</dt>
                <dd className="mt-1 text-sm text-slate-700 break-all">
                  {lead.website ? (
                    <a href={lead.website} target="_blank" rel="noreferrer" className="font-medium text-amber-700 hover:text-amber-800">
                      {lead.website}
                    </a>
                  ) : (
                    "Unknown"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Google profile link</dt>
                <dd className="mt-1 text-sm text-slate-700">
                  <a href={googleProfileLink} target="_blank" rel="noreferrer" className="font-medium text-amber-700 hover:text-amber-800">
                    Open Google profile
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Current pest control opportunity</dt>
                <dd className="mt-1 text-sm text-slate-700">
                  {lead.outreachAngle ?? lead.scoreSummary ?? "Opportunity notes not captured yet."}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Estimated urgency</dt>
                <dd className="mt-1 text-sm text-slate-700">{estimatedUrgency}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Lead score</dt>
                <dd className="mt-1 text-sm text-slate-700">{lead.score}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Priority rating</dt>
                <dd className="mt-1 text-sm text-slate-700">{priorityRating}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Estimated value</dt>
                <dd className="mt-1 text-sm text-slate-700">{currencyBandLabel(lead.estimatedOpportunity)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Revenue band</dt>
                <dd className="mt-1 text-sm text-slate-700">{currencyBandLabel(lead.annualRevenueBand)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Employees</dt>
                <dd className="mt-1 text-sm text-slate-700">{lead.employeeCount ?? "Unknown"}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Units</dt>
                <dd className="mt-1 text-sm text-slate-700">{lead.unitCount ?? "Unknown"}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Last contact</dt>
                <dd className="mt-1 text-sm text-slate-700">{formatDate(lead.lastContactedAt)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Next follow-up</dt>
                <dd className="mt-1 text-sm text-slate-700">{formatDate(lead.nextFollowUpAt)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Status</dt>
                <dd className="mt-1 text-sm text-slate-700">
                  {pipelineStages.find((stage) => stage.value === lead.stage)?.label ?? lead.stage}
                </dd>
              </div>
            </dl>
          </div>

          <div className="surface-card p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">Social outreach</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Save only public, business-related profiles here. This page opens links and logs manual outreach only. It does not send messages automatically.
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <p className="font-semibold text-slate-950">{lead.socialOutreachStatus ?? "Not started"}</p>
                <p className="mt-1">Last message {formatDate(lead.socialLastMessageAt)}</p>
                <p className="mt-1">Follow-up {formatDate(lead.socialFollowUpAt)}</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <ActionLink href={lead.facebookBusinessPageUrl} label="Open Facebook page" />
              <ActionLink href={lead.linkedinCompanyPageUrl} label="Open LinkedIn company page" />
              <ActionLink href={contactProfileUrl} label="Open contact profile" />
              <ActionLink href={getGoogleBusinessProfileLink(lead)} label="Open Google profile" />
            </div>

            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Contact role</dt>
                <dd className="mt-1 text-sm text-slate-700">
                  {lead.socialContactRole ?? primaryContact?.title ?? "Not saved yet"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Source URL</dt>
                <dd className="mt-1 text-sm text-slate-700 break-all">
                  {lead.socialSourceUrl ? (
                    <a
                      href={lead.socialSourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-amber-700 hover:text-amber-800"
                    >
                      {lead.socialSourceUrl}
                    </a>
                  ) : (
                    "Not saved yet"
                  )}
                </dd>
              </div>
            </dl>

            <form action={updateLeadSocialProfilesAction} className="mt-5 grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="leadId" value={lead.id} />
              <input
                name="facebookBusinessPageUrl"
                defaultValue={lead.facebookBusinessPageUrl ?? ""}
                placeholder="Facebook business page"
                className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
              />
              <input
                name="linkedinCompanyPageUrl"
                defaultValue={lead.linkedinCompanyPageUrl ?? ""}
                placeholder="LinkedIn company page"
                className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
              />
              <input
                name="decisionMakerLinkedinUrl"
                defaultValue={lead.decisionMakerLinkedinUrl ?? primaryContact?.linkedinUrl ?? ""}
                placeholder="Decision-maker LinkedIn profile"
                className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
              />
              <input
                name="decisionMakerFacebookUrl"
                defaultValue={lead.decisionMakerFacebookUrl ?? primaryContact?.facebookUrl ?? ""}
                placeholder="Business-related Facebook profile"
                className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
              />
              <input
                name="socialContactRole"
                defaultValue={lead.socialContactRole ?? primaryContact?.title ?? ""}
                placeholder="Contact role"
                className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
              />
              <input
                name="socialOutreachStatus"
                defaultValue={lead.socialOutreachStatus ?? ""}
                placeholder="Outreach status"
                className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
              />
              <input
                name="socialLastMessageAt"
                type="datetime-local"
                defaultValue={lead.socialLastMessageAt ? lead.socialLastMessageAt.toISOString().slice(0, 16) : ""}
                className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
              />
              <input
                name="socialFollowUpAt"
                type="datetime-local"
                defaultValue={lead.socialFollowUpAt ? lead.socialFollowUpAt.toISOString().slice(0, 16) : ""}
                className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
              />
              <input
                name="socialSourceUrl"
                defaultValue={lead.socialSourceUrl ?? primaryContact?.sourceUrl ?? ""}
                placeholder="Public source URL"
                className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100 sm:col-span-2"
              />
              <button
                type="submit"
                className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 sm:col-span-2"
              >
                Save social fields
              </button>
            </form>

            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              <form action={addOutreachAction} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <input type="hidden" name="leadId" value={lead.id} />
                <input type="hidden" name="type" value="FACEBOOK" />
                <input type="hidden" name="subject" value="Facebook message" />
                <input type="hidden" name="socialOutreachStatus" value="Facebook message sent manually" />
                <p className="text-sm font-semibold text-slate-950">Log Facebook message</p>
                <textarea
                  name="summary"
                  rows={3}
                  placeholder="Log the message you sent manually on Facebook..."
                  className="mt-3 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                />
                <input
                  name="outcome"
                  placeholder="Outcome or next step"
                  className="mt-3 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                />
                <button
                  type="submit"
                  className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:border-amber-300"
                >
                  Log Facebook message
                </button>
              </form>

              <form action={addOutreachAction} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <input type="hidden" name="leadId" value={lead.id} />
                <input type="hidden" name="type" value="LINKEDIN" />
                <input type="hidden" name="subject" value="LinkedIn message" />
                <input type="hidden" name="socialOutreachStatus" value="LinkedIn message sent manually" />
                <p className="text-sm font-semibold text-slate-950">Log LinkedIn message</p>
                <textarea
                  name="summary"
                  rows={3}
                  placeholder="Log the message you sent manually on LinkedIn..."
                  className="mt-3 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                />
                <input
                  name="outcome"
                  placeholder="Outcome or next step"
                  className="mt-3 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                />
                <button
                  type="submit"
                  className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:border-amber-300"
                >
                  Log LinkedIn message
                </button>
              </form>
            </div>

            <form action={addReminderAction} className="mt-5 grid gap-3 sm:grid-cols-[1fr_220px]">
              <input type="hidden" name="leadId" value={lead.id} />
              <input type="hidden" name="title" value="Social follow-up" />
              <input type="hidden" name="followUpKind" value="SOCIAL" />
              <input
                name="dueAt"
                type="datetime-local"
                className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
              />
              <button
                type="submit"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:border-amber-300"
              >
                Schedule social follow-up
              </button>
            </form>
          </div>

          <div className="surface-card p-6">
            <h2 className="text-xl font-semibold text-slate-950">Contact discovery</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Finds business-associated contacts from public sources only. It uses the business website and any public source URLs you provide, and it does not scrape restricted pages or collect private personal information.
            </p>
            <form action={discoverContactsAction} className="mt-5 space-y-3">
              <input type="hidden" name="leadId" value={lead.id} />
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                <p>
                  <span className="font-semibold text-slate-950">Website:</span>{" "}
                  {lead.website ?? "No website saved on this lead yet."}
                </p>
              </div>
              <textarea
                name="extraSourceUrls"
                rows={4}
                placeholder="Optional public URLs, one per line: contact page, about page, directory listing, property management page"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
              />
              <button
                type="submit"
                className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Run public contact discovery
              </button>
            </form>
          </div>

          <div className="surface-card p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-950">Contacts</h2>
              <span className="text-sm text-slate-500">{lead.contacts.length}</span>
            </div>
            <div className="mt-5 space-y-3">
              {lead.contacts.map((contact) => (
                <div key={contact.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-slate-950">{contact.name}</p>
                    {contact.isPrimary ? (
                      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                        Primary
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{contact.title ?? "No title recorded"}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {contact.businessAssociation ?? lead.businessName}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    {contact.email ?? "No email"} | {contact.phone ?? "No phone"}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                    {contact.linkedinUrl ? <span>LinkedIn listed</span> : null}
                    {contact.facebookUrl ? <span>Facebook listed</span> : null}
                    {contact.confidenceScore ? <span>Confidence {contact.confidenceScore}</span> : null}
                  </div>
                  {contact.sourceUrl ? (
                    <a
                      href={contact.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex text-sm font-medium text-amber-700 hover:text-amber-800"
                    >
                      View public source
                    </a>
                  ) : null}
                  {contact.discoveryNotes ? (
                    <p className="mt-2 text-sm text-slate-600">{contact.discoveryNotes}</p>
                  ) : null}
                </div>
              ))}
            </div>
            <form action={addContactAction} className="mt-5 grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="leadId" value={lead.id} />
              <input type="hidden" name="businessAssociation" value={lead.businessName} />
              <input
                name="name"
                placeholder="Contact name"
                className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
              />
              <input
                name="title"
                placeholder="Title"
                className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
              />
              <input
                name="email"
                placeholder="Email"
                className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
              />
              <input
                name="phone"
                placeholder="Phone"
                className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
              />
              <input
                name="linkedinUrl"
                placeholder="Public LinkedIn URL"
                className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
              />
              <input
                name="facebookUrl"
                placeholder="Public Facebook URL"
                className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
              />
              <input
                name="sourceUrl"
                placeholder="Public source URL"
                className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100 sm:col-span-2"
              />
              <input
                name="confidenceScore"
                type="number"
                min="0"
                max="100"
                placeholder="Confidence score"
                className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
              />
              <input
                name="preferredChannel"
                placeholder="Preferred channel"
                className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
              />
              <textarea
                name="discoveryNotes"
                rows={3}
                placeholder="Public-source notes"
                className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100 sm:col-span-2"
              />
              <label className="flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                <input type="checkbox" name="isPrimary" />
                Make primary contact
              </label>
              <button
                type="submit"
                className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 sm:col-span-2"
              >
                Add contact
              </button>
            </form>
          </div>
        </div>

        <div className="space-y-6">
          <div className="surface-card p-6">
            <h2 className="text-xl font-semibold text-slate-950">Outreach history</h2>
            <div className="mt-5 space-y-3">
              {lead.outreachHistory.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-medium text-slate-950">
                      {item.type}
                      {item.subject ? ` | ${item.subject}` : ""}
                    </p>
                    <p className="text-sm text-slate-500">{formatDateTime(item.happenedAt)}</p>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.summary}</p>
                  {item.outcome ? <p className="mt-2 text-sm text-emerald-700">{item.outcome}</p> : null}
                  {item.nextAction ? <p className="mt-2 text-sm text-slate-500">Next action: {item.nextAction}</p> : null}
                </div>
              ))}
            </div>
            <form action={addOutreachAction} className="mt-5 grid gap-3">
              <input type="hidden" name="leadId" value={lead.id} />
              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  name="type"
                  defaultValue={outreachTypeOptions[0].value}
                  className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                >
                  {outreachTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <input
                  name="subject"
                  placeholder="Subject or reason"
                  className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                />
              </div>
              <input
                name="happenedAt"
                type="datetime-local"
                className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
              />
              <textarea
                name="summary"
                placeholder="Notes from the phone call, email, visit, voicemail, text, proposal, or follow-up reminder..."
                rows={4}
                className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
              />
              <input
                name="outcome"
                placeholder="Outcome or next step"
                className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
              />
              <input
                name="nextAction"
                placeholder="Next action"
                className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
              />
              <button
                type="submit"
                className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Log outreach
              </button>
            </form>
          </div>

          <div id="follow-up-tasks" className="surface-card p-6">
            <h2 className="text-xl font-semibold text-slate-950">Reminders</h2>
            <div className="mt-5 space-y-3">
              {lead.reminders.map((reminder) => (
                <div key={reminder.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium text-slate-950">{reminder.title}</p>
                      <p className="mt-1 text-sm text-slate-500">Due {formatDateTime(reminder.dueAt)}</p>
                    </div>
                    <form action={toggleReminderAction}>
                      <input type="hidden" name="reminderId" value={reminder.id} />
                      <input type="hidden" name="leadId" value={lead.id} />
                      <input type="hidden" name="markDone" value={String(reminder.status !== "DONE")} />
                      <button
                        type="submit"
                        className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-amber-300 hover:text-slate-950"
                      >
                        {reminder.status === "DONE" ? "Reopen" : "Mark done"}
                      </button>
                    </form>
                  </div>
                  {reminder.notes ? <p className="mt-3 text-sm text-slate-600">{reminder.notes}</p> : null}
                </div>
              ))}
            </div>
            <form action={addReminderAction} className="mt-5 grid gap-3">
              <input type="hidden" name="leadId" value={lead.id} />
              <input
                name="title"
                placeholder="Reminder title"
                className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
              />
              <input
                name="dueAt"
                type="datetime-local"
                className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
              />
              <textarea
                name="notes"
                rows={3}
                placeholder="Reminder notes"
                className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
              />
              <button
                type="submit"
                className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Create reminder
              </button>
            </form>
          </div>

          <div id="notes" className="surface-card p-6">
            <h2 className="text-xl font-semibold text-slate-950">Notes</h2>
            <div className="mt-5 space-y-3">
              {lead.notes.map((note) => (
                <div key={note.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm leading-6 text-slate-700">{note.body}</p>
                  <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-400">
                    {note.user?.name ?? "Team"} | {formatDateTime(note.createdAt)}
                  </p>
                </div>
              ))}
            </div>
            <form action={addNoteAction} className="mt-5 space-y-3">
              <input type="hidden" name="leadId" value={lead.id} />
              <textarea
                name="body"
                rows={4}
                placeholder="Write an internal note..."
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
              />
              <button
                type="submit"
                className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Save note
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
