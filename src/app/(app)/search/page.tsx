import { importLeadAction } from "@/app/actions";
import { LeadScoreBadge } from "@/components/lead-score-badge";
import { leadCategoryOptions } from "@/lib/constants";
import { searchCommercialProspects } from "@/lib/google-places";
import { getGoogleBusinessProfileLink, getLeadCategoryLabel } from "@/lib/lead-insights";

type SearchProps = {
  searchParams?: Promise<{
    city?: string;
    category?: string;
    radius?: string;
    minRating?: string;
    keyword?: string;
  }>;
};

const radiusOptions = [
  { value: "city_limits", label: "City limits" },
  { value: "5", label: "5 miles" },
  { value: "10", label: "10 miles" },
  { value: "25", label: "25 miles" },
  { value: "50", label: "50 miles" },
];

export default async function SearchPage({ searchParams }: SearchProps) {
  const params = (await searchParams) ?? {};
  const city = params.city ?? "";
  const category = params.category || "RESTAURANT";
  const radius = params.radius || "city_limits";
  const minRating = params.minRating ?? "4.0";
  const keyword = params.keyword ?? "";
  const parsedMinRating = Number(minRating);

  const results =
    city.trim().length > 1
      ? await searchCommercialProspects({
          query: keyword,
          category,
          location: city,
          radius,
          minRating: Number.isFinite(parsedMinRating) ? parsedMinRating : undefined,
        })
      : [];

  return (
    <div className="space-y-6">
      <section className="surface-card p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">Restaurant prospect search</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">Find high-fit commercial kitchen leads</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Search by city, business category, radius, minimum rating, and keyword. Restaurant results are prioritized when they suggest commercial kitchens, bars, patios, dumpsters, seafood handling, breweries, or heavy customer volume.
        </p>
        <form className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_0.9fr_0.8fr_0.7fr_1fr_auto]">
          <input
            type="text"
            name="city"
            defaultValue={city}
            placeholder="City, State"
            className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
          />
          <select
            name="category"
            defaultValue={category}
            className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
          >
            {leadCategoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            name="radius"
            defaultValue={radius}
            className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
          >
            {radiusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <input
            type="number"
            step="0.1"
            min="0"
            max="5"
            name="minRating"
            defaultValue={minRating}
            placeholder="Min rating"
            className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
          />
          <input
            type="text"
            name="keyword"
            defaultValue={keyword}
            placeholder="Keyword filter: seafood, patio, brewery"
            className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
          />
          <button
            type="submit"
            className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Search
          </button>
        </form>
      </section>

      <section className="space-y-4">
        {results.length === 0 && city ? (
          <div className="surface-card p-6 text-sm text-slate-600">
            No prospects matched this search. Try lowering the minimum rating, widening the radius, or using a broader keyword like `restaurant`, `bar`, or `seafood`.
          </div>
        ) : null}

        {results.map((result) => (
          <article key={`${result.slug}-${result.googlePlaceId ?? "demo"}`} className="surface-card p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-semibold text-slate-950">{result.businessName}</h2>
                  <LeadScoreBadge score={result.score} />
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 text-sm text-slate-700">
                  <p><span className="font-semibold text-slate-950">Category:</span> {getLeadCategoryLabel(result.category)}</p>
                  <p><span className="font-semibold text-slate-950">Rating:</span> {result.rating?.toFixed(1) ?? "N/A"}</p>
                  <p><span className="font-semibold text-slate-950">Review count:</span> {result.reviewCount ?? 0}</p>
                  <p><span className="font-semibold text-slate-950">Phone:</span> {result.phone ?? "Unknown"}</p>
                  <p className="sm:col-span-2"><span className="font-semibold text-slate-950">Address:</span> {[result.addressLine1, result.city, result.state].filter(Boolean).join(", ")}</p>
                </div>

                <p className="text-sm leading-6 text-slate-600">
                  {result.description ?? "Google Places result ready for import."}
                </p>

                <p className="text-sm text-slate-600">
                  <span className="font-semibold text-slate-950">Suggested pest control angle:</span>{" "}
                  {result.outreachAngle}
                </p>

                <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-950">
                  <p className="font-semibold">Lead score summary</p>
                  <p className="mt-2">{result.scoreSummary}</p>
                  {result.matchedSignals?.length ? (
                    <p className="mt-2">
                      <span className="font-semibold">Priority signals:</span>{" "}
                      {result.matchedSignals.join(", ")}
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-3 text-sm">
                  {result.website ? (
                    <a
                      href={result.website}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-900 transition hover:border-amber-300"
                    >
                      Open website
                    </a>
                  ) : null}
                  <a
                    href={getGoogleBusinessProfileLink(result)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-900 transition hover:border-amber-300"
                  >
                    Open Google Maps
                  </a>
                </div>
              </div>

              <form action={importLeadAction} className="min-w-[260px] space-y-3 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                <input type="hidden" name="businessName" value={result.businessName} />
                <input type="hidden" name="category" value={result.category} />
                <input type="hidden" name="slug" value={result.slug} />
                <input type="hidden" name="googlePlaceId" value={result.googlePlaceId ?? ""} />
                <input type="hidden" name="addressLine1" value={result.addressLine1 ?? ""} />
                <input type="hidden" name="city" value={result.city ?? ""} />
                <input type="hidden" name="state" value={result.state ?? ""} />
                <input type="hidden" name="postalCode" value={result.postalCode ?? ""} />
                <input type="hidden" name="website" value={result.website ?? ""} />
                <input type="hidden" name="phone" value={result.phone ?? ""} />
                <input type="hidden" name="description" value={result.description ?? ""} />
                <input type="hidden" name="googleMapsUrl" value={result.googleMapsUrl ?? ""} />
                <input type="hidden" name="rating" value={result.rating ?? ""} />
                <input type="hidden" name="reviewCount" value={result.reviewCount ?? ""} />
                <input type="hidden" name="latitude" value={result.latitude ?? ""} />
                <input type="hidden" name="longitude" value={result.longitude ?? ""} />
                <input type="hidden" name="estimatedOpportunity" value={result.estimatedOpportunity ?? ""} />
                <input type="hidden" name="outreachAngle" value={result.outreachAngle ?? ""} />
                {(result.openingHours ?? []).map((line) => (
                  <input key={line} type="hidden" name="openingHours" value={line} />
                ))}
                <p className="text-sm font-semibold text-slate-900">Bring into CRM</p>
                <p className="text-sm text-slate-600">
                  Save this lead with its score, Google listing, and suggested pest control angle.
                </p>
                <button
                  type="submit"
                  className="w-full rounded-2xl bg-amber-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
                >
                  Add lead
                </button>
              </form>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
