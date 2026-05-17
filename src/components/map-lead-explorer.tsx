"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Map, { Marker, NavigationControl, Popup, type ViewStateChangeEvent } from "react-map-gl/mapbox";
import {
  CalendarPlus,
  ExternalLink,
  Filter,
  Mail,
  MapPin,
  Phone,
  Plus,
  Save,
  ShieldCheck,
  Target,
  UserPlus,
  X,
} from "lucide-react";
import type {
  Contact,
  Lead,
  Note,
  Outreach,
  Reminder,
  User,
} from "@/generated/prisma/client";
import {
  addContactAction,
  addNoteAction,
  addOutreachAction,
  addReminderAction,
  updateLeadSocialProfilesAction,
  updateLeadStageAction,
} from "@/app/actions";
import { mapPrimaryCategoryOptions, pipelineStages } from "@/lib/constants";
import {
  getGoogleBusinessProfileLink,
  getLeadCategoryLabel,
  getLeadStatusLabel,
  getPriorityLevel,
  getSuggestedOpportunity,
} from "@/lib/lead-insights";
import { formatDateTime } from "@/lib/utils";
import { LeadScoreBadge } from "@/components/lead-score-badge";

type MapLead = Lead & {
  contacts: Contact[];
  notes: (Note & { user: User | null })[];
  outreachHistory: (Outreach & { user: User | null })[];
  reminders: Reminder[];
};

type ExplorerProps = {
  leads: MapLead[];
  initialCenter?: {
    latitude: number;
    longitude: number;
    zoom?: number;
  } | null;
};

const DEFAULT_CENTER = {
  longitude: -98.5795,
  latitude: 39.8283,
  zoom: 3.2,
};

const radiusOptions = [10, 25, 50, 100, 250, 500, 0];

function milesBetween(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusMiles = 3958.8;
  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const haversine =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * earthRadiusMiles * Math.asin(Math.sqrt(haversine));
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

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
      className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
        enabled
          ? "border border-slate-200 bg-white text-slate-900 hover:border-amber-300"
          : "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
      }`}
    >
      <ExternalLink className="h-4 w-4" />
      {label}
    </a>
  );
}

export function MapLeadExplorer({ leads, initialCenter }: ExplorerProps) {
  const initialSelectedLead = leads[0] ?? null;
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(initialSelectedLead?.id ?? null);
  const [drawerOpen, setDrawerOpen] = useState(Boolean(initialSelectedLead));
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    mapPrimaryCategoryOptions.map((option) => option.value),
  );
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [minScore, setMinScore] = useState<number>(0);
  const [cityFilter, setCityFilter] = useState<string>("");
  const [radiusMiles, setRadiusMiles] = useState<number>(50);
  const [viewState, setViewState] = useState(() => {
    if (initialCenter?.latitude && initialCenter?.longitude) {
      return {
        latitude: initialCenter.latitude,
        longitude: initialCenter.longitude,
        zoom: initialCenter.zoom ?? 9,
      };
    }

    if (!initialSelectedLead?.latitude || !initialSelectedLead?.longitude) {
      return DEFAULT_CENTER;
    }

    return {
      latitude: initialSelectedLead.latitude,
      longitude: initialSelectedLead.longitude,
      zoom: 5.2,
    };
  });

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (lead.latitude === null || lead.longitude === null) {
        return false;
      }

      const matchesCategory = selectedCategories.includes(lead.category);
      const matchesStatus = !selectedStatus || lead.stage === selectedStatus;
      const matchesScore = lead.score >= minScore;
      const matchesCity =
        !cityFilter || lead.city?.toLowerCase().includes(cityFilter.toLowerCase());
      const matchesRadius =
        radiusMiles === 0 ||
        milesBetween(
          { latitude: viewState.latitude, longitude: viewState.longitude },
          { latitude: lead.latitude, longitude: lead.longitude },
        ) <= radiusMiles;

      return matchesCategory && matchesStatus && matchesScore && matchesCity && matchesRadius;
    });
  }, [
    cityFilter,
    leads,
    minScore,
    radiusMiles,
    selectedCategories,
    selectedStatus,
    viewState.latitude,
    viewState.longitude,
  ]);

  const selectedLead =
    filteredLeads.find((lead) => lead.id === selectedLeadId) ??
    filteredLeads[0] ??
    null;

  const primaryContact = selectedLead?.contacts.find((contact) => contact.isPrimary) ?? selectedLead?.contacts[0];
  const emailTarget = primaryContact?.email ?? selectedLead?.email ?? "";
  const contactProfileUrl =
    selectedLead?.decisionMakerLinkedinUrl ??
    selectedLead?.decisionMakerFacebookUrl ??
    primaryContact?.linkedinUrl ??
    primaryContact?.facebookUrl ??
    "";

  return (
    <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
      <aside className="surface-card p-5">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-amber-600" />
          <h2 className="text-lg font-semibold text-slate-950">Map filters</h2>
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Filter by category, score, pipeline status, city, and distance from the current map center.
        </p>

        <div className="mt-5 space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Categories</p>
            <div className="mt-3 space-y-2">
              {mapPrimaryCategoryOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
                >
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(option.value)}
                    onChange={(event) => {
                      setSelectedCategories((current) =>
                        event.target.checked
                          ? [...current, option.value]
                          : current.filter((value) => value !== option.value),
                      );
                    }}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Lead score {minScore}+
            </label>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={minScore}
              onChange={(event) => setMinScore(Number(event.target.value))}
              className="mt-3 w-full accent-amber-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Status
            </label>
            <select
              value={selectedStatus}
              onChange={(event) => setSelectedStatus(event.target.value)}
              className="mt-3 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
            >
              <option value="">Any status</option>
              {pipelineStages.map((stage) => (
                <option key={stage.value} value={stage.value}>
                  {stage.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              City
            </label>
            <input
              type="text"
              value={cityFilter}
              onChange={(event) => setCityFilter(event.target.value)}
              placeholder="Filter by city"
              className="mt-3 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Radius from map center
            </label>
            <select
              value={radiusMiles}
              onChange={(event) => setRadiusMiles(Number(event.target.value))}
              className="mt-3 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
            >
              {radiusOptions.map((option) => (
                <option key={option} value={option}>
                  {option === 0 ? "Nationwide" : `${option} miles`}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
          Showing <strong>{filteredLeads.length}</strong> prospects. Pan the map to shift the radius center.
        </div>
      </aside>

      <section className="surface-card relative overflow-hidden p-0">
        {!process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ? (
          <div className="flex h-[720px] items-center justify-center bg-slate-100 p-8 text-center">
            <div className="max-w-md">
              <MapPin className="mx-auto h-8 w-8 text-amber-600" />
              <h2 className="mt-4 text-2xl font-semibold text-slate-950">Map token needed</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Add `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` to your environment to enable the live map. The drawer wiring is already in place.
              </p>
            </div>
          </div>
        ) : (
          <Map
            {...viewState}
            onMove={(event: ViewStateChangeEvent) => setViewState(event.viewState)}
            mapStyle="mapbox://styles/mapbox/light-v11"
            mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}
            style={{ width: "100%", height: 780 }}
          >
            <NavigationControl position="top-right" />

            {filteredLeads.map((lead) => {
              const priority = getPriorityLevel(lead.score, lead.isPriority);

              return (
                <Marker
                  key={lead.id}
                  latitude={lead.latitude ?? 0}
                  longitude={lead.longitude ?? 0}
                  anchor="bottom"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedLeadId(lead.id);
                      setDrawerOpen(true);
                    }}
                    className={`flex h-10 w-10 items-center justify-center rounded-full border-2 border-white text-sm font-bold text-white shadow-lg ${
                      priority === "High Priority"
                        ? "bg-rose-500"
                        : priority === "Medium Priority"
                          ? "bg-amber-500"
                          : priority === "Low Priority"
                            ? "bg-sky-500"
                            : "bg-slate-500"
                    }`}
                    aria-label={`Open ${lead.businessName}`}
                  >
                    {lead.score}
                  </button>
                </Marker>
              );
            })}

            {selectedLead?.latitude && selectedLead?.longitude ? (
              <Popup
                latitude={selectedLead.latitude}
                longitude={selectedLead.longitude}
                anchor="top"
                closeOnClick={false}
                onClose={() => setSelectedLeadId(null)}
                offset={18}
                maxWidth="340px"
              >
                <div className="space-y-3 p-1 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{selectedLead.businessName}</p>
                      <p className="mt-1 text-slate-600">{getLeadCategoryLabel(selectedLead.category)}</p>
                    </div>
                    <LeadScoreBadge score={selectedLead.score} />
                  </div>
                  <p className="text-slate-600">
                    {[selectedLead.addressLine1, selectedLead.city, selectedLead.state]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                  <p className="text-slate-600">Phone: {selectedLead.phone ?? "Unknown"}</p>
                  <p className="text-slate-600">
                    Rating: {selectedLead.rating?.toFixed(1) ?? "N/A"} ({selectedLead.reviewCount ?? 0} reviews)
                  </p>
                  <button
                    type="button"
                    onClick={() => setDrawerOpen(true)}
                    className="inline-flex items-center gap-2 font-medium text-amber-700 hover:text-amber-800"
                  >
                    Open profile drawer
                    <ExternalLink className="h-4 w-4" />
                  </button>
                </div>
              </Popup>
            ) : null}
          </Map>
        )}

        <div
          className={`absolute inset-y-0 right-0 z-20 w-full max-w-[480px] border-l border-slate-200 bg-slate-50/95 shadow-2xl shadow-slate-900/15 backdrop-blur transition-transform duration-300 ${
            drawerOpen && selectedLead ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {selectedLead ? (
            <div className="flex h-full flex-col">
              <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Business profile
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                    {selectedLead.businessName}
                  </h2>
                  <p className="mt-2 text-sm text-slate-600">
                    {getLeadCategoryLabel(selectedLead.category)} | {getLeadStatusLabel(selectedLead.stage)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
                  aria-label="Close drawer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    disabled
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"
                  >
                    <Save className="h-4 w-4" />
                    Saved lead
                  </button>
                  <form action={updateLeadStageAction}>
                    <input type="hidden" name="leadId" value={selectedLead.id} />
                    <input type="hidden" name="stage" value="RESEARCHING" />
                    <button
                      type="submit"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      <Target className="h-4 w-4" />
                      Move to pipeline
                    </button>
                  </form>
                  <a
                    href={selectedLead.phone ? `tel:${selectedLead.phone}` : undefined}
                    className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                      selectedLead.phone
                        ? "border border-slate-200 bg-white text-slate-900 hover:border-amber-300"
                        : "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
                    }`}
                  >
                    <Phone className="h-4 w-4" />
                    Call
                  </a>
                  <a
                    href={emailTarget ? `mailto:${emailTarget}` : undefined}
                    className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                      emailTarget
                        ? "border border-slate-200 bg-white text-slate-900 hover:border-amber-300"
                        : "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
                    }`}
                  >
                    <Mail className="h-4 w-4" />
                    Email
                  </a>
                  <ActionLink href={selectedLead.website} label="Open website" />
                  <ActionLink href={getGoogleBusinessProfileLink(selectedLead)} label="Open Google Maps" />
                  <ActionLink href={selectedLead.facebookBusinessPageUrl} label="Open Facebook page" />
                  <ActionLink href={selectedLead.linkedinCompanyPageUrl} label="Open LinkedIn company page" />
                  <ActionLink href={contactProfileUrl} label="Open contact profile" />
                </div>

                <Section title="Business details">
                  <div className="space-y-3 text-sm text-slate-700">
                    <p>
                      <span className="font-semibold text-slate-950">Address:</span>{" "}
                      {[selectedLead.addressLine1, selectedLead.city, selectedLead.state]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-950">Phone:</span>{" "}
                      {selectedLead.phone ?? "Unknown"}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-950">Website:</span>{" "}
                      {selectedLead.website ? (
                        <a
                          href={selectedLead.website}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-amber-700 hover:text-amber-800"
                        >
                          {selectedLead.website}
                        </a>
                      ) : (
                        "Unknown"
                      )}
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <p>
                        <span className="font-semibold text-slate-950">Rating:</span>{" "}
                        {selectedLead.rating?.toFixed(1) ?? "N/A"}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-950">Reviews:</span>{" "}
                        {selectedLead.reviewCount ?? 0}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-950">Lead score:</span>{" "}
                        {selectedLead.score}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-950">Priority:</span>{" "}
                        {getPriorityLevel(selectedLead.score, selectedLead.isPriority)}
                      </p>
                    </div>
                  </div>
                </Section>

                <Section title="Pest control opportunity notes">
                  <div className="space-y-3 text-sm text-slate-700">
                    <p>
                      {selectedLead.estimatedOpportunity ??
                        getSuggestedOpportunity({
                          category: selectedLead.category,
                          unitCount: selectedLead.unitCount,
                          employeeCount: selectedLead.employeeCount,
                        })}
                    </p>
                    <div className="rounded-2xl bg-amber-50 p-3 text-amber-900">
                      {selectedLead.outreachAngle ??
                        "Lead with local recurring service coverage and reputation protection."}
                    </div>
                  </div>
                </Section>

                <Section title="Social outreach">
                  <div className="space-y-4 text-sm text-slate-700">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p>
                        <span className="font-semibold text-slate-950">Contact role:</span>{" "}
                        {selectedLead.socialContactRole ?? primaryContact?.title ?? "Not saved"}
                      </p>
                      <p className="mt-2">
                        <span className="font-semibold text-slate-950">Outreach status:</span>{" "}
                        {selectedLead.socialOutreachStatus ?? "Not started"}
                      </p>
                      <p className="mt-2">
                        <span className="font-semibold text-slate-950">Last message:</span>{" "}
                        {formatDateTime(selectedLead.socialLastMessageAt)}
                      </p>
                      <p className="mt-2">
                        <span className="font-semibold text-slate-950">Follow-up date:</span>{" "}
                        {formatDateTime(selectedLead.socialFollowUpAt)}
                      </p>
                      <p className="mt-2 break-all">
                        <span className="font-semibold text-slate-950">Source URL:</span>{" "}
                        {selectedLead.socialSourceUrl ? (
                          <a
                            href={selectedLead.socialSourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium text-amber-700 hover:text-amber-800"
                          >
                            {selectedLead.socialSourceUrl}
                          </a>
                        ) : (
                          "Not saved"
                        )}
                      </p>
                    </div>

                    <form action={updateLeadSocialProfilesAction} className="grid gap-3">
                      <input type="hidden" name="leadId" value={selectedLead.id} />
                      <input
                        name="facebookBusinessPageUrl"
                        defaultValue={selectedLead.facebookBusinessPageUrl ?? ""}
                        placeholder="Facebook business page"
                        className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                      />
                      <input
                        name="linkedinCompanyPageUrl"
                        defaultValue={selectedLead.linkedinCompanyPageUrl ?? ""}
                        placeholder="LinkedIn company page"
                        className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                      />
                      <input
                        name="decisionMakerLinkedinUrl"
                        defaultValue={selectedLead.decisionMakerLinkedinUrl ?? primaryContact?.linkedinUrl ?? ""}
                        placeholder="Decision-maker LinkedIn profile"
                        className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                      />
                      <input
                        name="decisionMakerFacebookUrl"
                        defaultValue={selectedLead.decisionMakerFacebookUrl ?? primaryContact?.facebookUrl ?? ""}
                        placeholder="Business-related Facebook profile"
                        className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                      />
                      <div className="grid gap-3 sm:grid-cols-2">
                        <input
                          name="socialContactRole"
                          defaultValue={selectedLead.socialContactRole ?? primaryContact?.title ?? ""}
                          placeholder="Contact role"
                          className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                        />
                        <input
                          name="socialOutreachStatus"
                          defaultValue={selectedLead.socialOutreachStatus ?? ""}
                          placeholder="Outreach status"
                          className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                        />
                      </div>
                      <input
                        name="socialSourceUrl"
                        defaultValue={selectedLead.socialSourceUrl ?? primaryContact?.sourceUrl ?? ""}
                        placeholder="Public source URL"
                        className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                      />
                      <button
                        type="submit"
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:border-amber-300"
                      >
                        Save social fields
                      </button>
                    </form>

                    <div className="grid gap-3">
                      <form action={addOutreachAction} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                        <input type="hidden" name="leadId" value={selectedLead.id} />
                        <input type="hidden" name="type" value="FACEBOOK" />
                        <input type="hidden" name="subject" value="Facebook message" />
                        <input type="hidden" name="socialOutreachStatus" value="Facebook message sent manually" />
                        <textarea
                          name="summary"
                          rows={3}
                          placeholder="Log the Facebook message you sent manually..."
                          className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                        />
                        <input
                          name="outcome"
                          placeholder="Outcome or next step"
                          className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                        />
                        <button
                          type="submit"
                          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:border-amber-300"
                        >
                          <Mail className="h-4 w-4" />
                          Log Facebook message
                        </button>
                      </form>

                      <form action={addOutreachAction} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                        <input type="hidden" name="leadId" value={selectedLead.id} />
                        <input type="hidden" name="type" value="LINKEDIN" />
                        <input type="hidden" name="subject" value="LinkedIn message" />
                        <input type="hidden" name="socialOutreachStatus" value="LinkedIn message sent manually" />
                        <textarea
                          name="summary"
                          rows={3}
                          placeholder="Log the LinkedIn message you sent manually..."
                          className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                        />
                        <input
                          name="outcome"
                          placeholder="Outcome or next step"
                          className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                        />
                        <button
                          type="submit"
                          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:border-amber-300"
                        >
                          <Mail className="h-4 w-4" />
                          Log LinkedIn message
                        </button>
                      </form>
                    </div>

                    <form action={addReminderAction} className="grid gap-3 sm:grid-cols-[1fr_220px]">
                      <input type="hidden" name="leadId" value={selectedLead.id} />
                      <input type="hidden" name="title" value="Social follow-up" />
                      <input type="hidden" name="followUpKind" value="SOCIAL" />
                      <input
                        name="dueAt"
                        type="datetime-local"
                        className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                      />
                      <button
                        type="submit"
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:border-amber-300"
                      >
                        <CalendarPlus className="h-4 w-4" />
                        Schedule social follow-up
                      </button>
                    </form>

                    <p className="text-xs leading-5 text-slate-500">
                      Social actions here only open public profiles and log manually completed outreach. No message is sent unless a rep sends it themselves outside the app.
                    </p>
                  </div>
                </Section>

                <Section title="Contacts">
                  <div className="space-y-3">
                    {selectedLead.contacts.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                        No contacts added yet.
                      </div>
                    ) : (
                      selectedLead.contacts.map((contact) => (
                        <div key={contact.id} className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                          <p className="font-medium text-slate-950">{contact.name}</p>
                          <p className="mt-1">{contact.title ?? "No title"}</p>
                          <p className="mt-2 text-slate-500">
                            {contact.email ?? "No email"} | {contact.phone ?? "No phone"}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                  <form action={addContactAction} className="mt-4 grid gap-3">
                    <input type="hidden" name="leadId" value={selectedLead.id} />
                    <input type="hidden" name="businessAssociation" value={selectedLead.businessName} />
                    <input
                      name="name"
                      placeholder="Contact name"
                      className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        name="title"
                        placeholder="Title"
                        className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                      />
                      <input
                        name="phone"
                        placeholder="Phone"
                        className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                      />
                    </div>
                    <input
                      name="email"
                      placeholder="Email"
                      className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                    />
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:border-amber-300"
                    >
                      <UserPlus className="h-4 w-4" />
                      Add contact
                    </button>
                  </form>
                </Section>

                <Section title="Outreach history">
                  <div className="space-y-3">
                    {selectedLead.outreachHistory.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                        No outreach logged yet.
                      </div>
                    ) : (
                      selectedLead.outreachHistory.map((item) => (
                        <div key={item.id} className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-medium text-slate-950">
                              {item.type}
                              {item.subject ? ` | ${item.subject}` : ""}
                            </p>
                            <p className="text-xs text-slate-500">{formatDateTime(item.happenedAt)}</p>
                          </div>
                          <p className="mt-2">{item.summary}</p>
                          {item.outcome ? <p className="mt-2 text-emerald-700">{item.outcome}</p> : null}
                        </div>
                      ))
                    )}
                  </div>
                </Section>

                <Section title="Follow-up tasks">
                  <div className="space-y-3">
                    {selectedLead.reminders.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                        No follow-up tasks yet.
                      </div>
                    ) : (
                      selectedLead.reminders.map((reminder) => (
                        <div key={reminder.id} className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                          <p className="font-medium text-slate-950">{reminder.title}</p>
                          <p className="mt-2 text-slate-500">Due {formatDateTime(reminder.dueAt)}</p>
                          {reminder.notes ? <p className="mt-2">{reminder.notes}</p> : null}
                        </div>
                      ))
                    )}
                  </div>
                  <form action={addReminderAction} className="mt-4 grid gap-3">
                    <input type="hidden" name="leadId" value={selectedLead.id} />
                    <input
                      name="title"
                      placeholder="Follow-up task"
                      className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                    />
                    <input
                      name="dueAt"
                      type="datetime-local"
                      className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                    />
                    <textarea
                      name="notes"
                      rows={3}
                      placeholder="Task notes"
                      className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                    />
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:border-amber-300"
                    >
                      <CalendarPlus className="h-4 w-4" />
                      Schedule follow-up
                    </button>
                  </form>
                </Section>

                <Section title="Notes">
                  <div className="space-y-3">
                    {selectedLead.notes.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                        No notes yet.
                      </div>
                    ) : (
                      selectedLead.notes.map((note) => (
                        <div key={note.id} className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                          <p>{note.body}</p>
                          <p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-400">
                            {note.user?.name ?? "Team"} | {formatDateTime(note.createdAt)}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                  <form action={addNoteAction} className="mt-4 grid gap-3">
                    <input type="hidden" name="leadId" value={selectedLead.id} />
                    <textarea
                      name="body"
                      rows={4}
                      placeholder="Add a map-view note..."
                      className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                    />
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:border-amber-300"
                    >
                      <Plus className="h-4 w-4" />
                      Add note
                    </button>
                  </form>
                </Section>

                <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    <span className="font-semibold">Saved to CRM</span>
                  </div>
                  <p className="mt-2">
                    This prospect is already stored as a lead and ready for pipeline work.
                  </p>
                </div>

                <Link
                  href={`/leads/${selectedLead.id}`}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Open full lead page
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center p-8 text-sm text-slate-500">
              Select a pin to open the business profile drawer.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
