import { MapLeadExplorer } from "@/components/map-lead-explorer";
import { leadCategoryOptions } from "@/lib/constants";
import { getMapLeads } from "@/lib/data";
import { searchAndSaveProspects } from "@/lib/google-places";

type MapPageProps = {
  searchParams?: Promise<{
    city?: string;
    category?: string;
    radius?: string;
    keyword?: string;
  }>;
};

export default async function MapPage({ searchParams }: MapPageProps) {
  const params = (await searchParams) ?? {};
  const city = params.city ?? "";
  const category = (params.category ?? "RESTAURANT") as (typeof leadCategoryOptions)[number]["value"];
  const radius = params.radius ?? "city_limits";
  const keyword = params.keyword ?? "";

  const hasSearch = city.trim().length > 0;
  const leads = hasSearch
    ? await searchAndSaveProspects({
        city,
        category,
        radius,
        keyword,
      })
    : await getMapLeads();

  const initialCenter =
    hasSearch && leads[0]?.latitude && leads[0]?.longitude
      ? {
          latitude: leads[0].latitude,
          longitude: leads[0].longitude,
          zoom: radius === "city_limits" ? 10 : 9,
        }
      : null;

  return (
    <div className="space-y-6">
      <section className="surface-card p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
          Live map view
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">
          Prospect map for commercial pest control leads
        </h1>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600">
          Search a city, business category, radius, and keyword, then map Google Places prospects and save the returned businesses into the CRM automatically.
        </p>
        <form className="mt-6 grid gap-4 lg:grid-cols-[1fr_0.9fr_0.7fr_1fr_auto]">
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
            <option value="city_limits">City limits</option>
            <option value="5">5 miles</option>
            <option value="10">10 miles</option>
            <option value="25">25 miles</option>
            <option value="50">50 miles</option>
          </select>
          <input
            type="text"
            name="keyword"
            defaultValue={keyword}
            placeholder="Keyword like patio, pizza, senior, dock"
            className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
          />
          <button
            type="submit"
            className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Search map
          </button>
        </form>
        {hasSearch ? (
          <div className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Showing saved Google Places results for <strong>{city}</strong> in{" "}
            <strong>
              {leadCategoryOptions.find((option) => option.value === category)?.label ?? category}
            </strong>
            {keyword ? (
              <>
                {" "}
                using keyword <strong>{keyword}</strong>
              </>
            ) : null}
            .
          </div>
        ) : null}
      </section>

      <MapLeadExplorer leads={leads} initialCenter={initialCenter} />
    </div>
  );
}
