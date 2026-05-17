import {
  type Contact,
  type Lead,
  type LeadCategory,
  type Note,
  type Outreach,
  type Prisma,
  type Reminder,
  type User,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { searchDemoPlaces } from "@/lib/demo-places";
import { getSuggestedOpportunity, getSuggestedOutreachAngle } from "@/lib/lead-insights";
import { calculateLeadScore } from "@/lib/scoring";
import { slugify } from "@/lib/utils";

export type ProspectSearchResult = {
  businessName: string;
  category: LeadCategory;
  slug: string;
  googlePlaceId?: string;
  googleMapsUrl?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  website?: string;
  phone?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  rating?: number;
  reviewCount?: number;
  openingHours?: string[];
  matchedSignals?: string[];
  keyword?: string;
  score: number;
  scoreSummary: string;
  outreachAngle: string;
  estimatedOpportunity: string;
};

export type SavedProspectLead = Lead & {
  contacts: Contact[];
  notes: (Note & { user: User | null })[];
  outreachHistory: (Outreach & { user: User | null })[];
  reminders: Reminder[];
};

type ProspectSearchInput = {
  city: string;
  category: LeadCategory;
  radius: string;
  keyword?: string;
  minRating?: number;
};

type CityCenter = {
  latitude: number;
  longitude: number;
  formattedAddress: string;
};

const googleCategoryQueries: Record<LeadCategory, string> = {
  RESTAURANT: "restaurants",
  APARTMENTS: "apartments",
  MULTIFAMILY: "multifamily housing",
  HOA: "homeowners association",
  RETIREMENT: "retirement community",
  FOOD_MANUFACTURER: "food manufacturing",
  COMMERCIAL_KITCHEN: "commercial kitchen",
  BREWERY: "brewery",
  GROCERY: "grocery store",
  PROPERTY_MANAGEMENT: "property management company",
};

function parseCityParts(formattedAddress?: string) {
  const addressBits = formattedAddress?.split(",").map((item) => item.trim()) ?? [];
  const city = addressBits.at(-3) ?? undefined;
  const stateZip = addressBits.at(-2)?.split(" ") ?? [];

  return {
    addressLine1: addressBits[0],
    city,
    state: stateZip[0] ?? undefined,
    postalCode: stateZip[1] ?? undefined,
  };
}

function parseRadius(radius: string) {
  if (!radius || radius === "city_limits") {
    return undefined;
  }

  const parsed = Number(radius);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function getRestaurantSignals(input: {
  businessName?: string;
  description?: string;
  keyword?: string;
  reviewCount?: number;
}) {
  const haystack = [
    input.businessName,
    input.description,
    input.keyword,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const signals: string[] = [];

  if (/(kitchen|commercial kitchen|commissary)/i.test(haystack)) {
    signals.push("Commercial kitchen");
  }

  if (/(bar|cocktail|pub|tavern|lounge)/i.test(haystack)) {
    signals.push("Bar service");
  }

  if (/(patio|outdoor dining|rooftop)/i.test(haystack)) {
    signals.push("Patio seating");
  }

  if (/(dumpster|trash|waste|alley)/i.test(haystack)) {
    signals.push("Dumpster exposure");
  }

  if (/(seafood|oyster|fish|crab|shrimp|sushi)/i.test(haystack)) {
    signals.push("Seafood handling");
  }

  if (/(brewery|taproom|brewpub)/i.test(haystack)) {
    signals.push("Brewery overlap");
  }

  if ((input.reviewCount ?? 0) >= 150) {
    signals.push("High customer volume");
  }

  return signals;
}

function getRestaurantPriorityBoost(input: {
  category: LeadCategory;
  businessName?: string;
  description?: string;
  keyword?: string;
  reviewCount?: number;
}) {
  if (input.category !== "RESTAURANT") {
    return { scoreBoost: 0, signals: [] as string[] };
  }

  const signals = getRestaurantSignals(input);
  return {
    scoreBoost: Math.min(18, signals.length * 3),
    signals,
  };
}

async function resolveLeadSlug(baseSlug: string) {
  let slug = baseSlug;
  let suffix = 1;

  while (await prisma.lead.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

async function geocodeCity(city: string, apiKey: string): Promise<CityCenter | null> {
  const response = await fetch(
    "https://maps.googleapis.com/maps/api/geocode/json?" +
      new URLSearchParams({
        address: city,
        key: apiKey,
      }),
    { cache: "no-store" },
  );

  if (!response.ok) {
    throw new Error("City geocoding failed");
  }

  const payload = (await response.json()) as {
    results?: Array<{
      formatted_address?: string;
      geometry?: { location?: { lat?: number; lng?: number } };
    }>;
  };

  const result = payload.results?.[0];

  if (
    result?.geometry?.location?.lat === undefined ||
    result.geometry.location.lng === undefined
  ) {
    return null;
  }

  return {
    latitude: result.geometry.location.lat,
    longitude: result.geometry.location.lng,
    formattedAddress: result.formatted_address ?? city,
  };
}

async function fetchPlaceDetails(placeId: string, apiKey: string) {
  const response = await fetch(
    "https://maps.googleapis.com/maps/api/place/details/json?" +
      new URLSearchParams({
        place_id: placeId,
        fields:
          "name,formatted_address,formatted_phone_number,website,url,geometry,rating,user_ratings_total,current_opening_hours,types,place_id",
        key: apiKey,
      }),
    { cache: "no-store" },
  );

  if (!response.ok) {
    throw new Error("Place details lookup failed");
  }

  const payload = (await response.json()) as {
    result?: {
      name?: string;
      formatted_address?: string;
      formatted_phone_number?: string;
      website?: string;
      url?: string;
      place_id?: string;
      rating?: number;
      user_ratings_total?: number;
      types?: string[];
      geometry?: { location?: { lat?: number; lng?: number } };
      current_opening_hours?: { weekday_text?: string[] };
    };
  };

  return payload.result;
}

async function upsertProspectLead(result: ProspectSearchResult) {
  const restaurantBoost = getRestaurantPriorityBoost({
    category: result.category,
    businessName: result.businessName,
    description: result.description,
    keyword: result.keyword,
    reviewCount: result.reviewCount,
  });
  const baseScore = calculateLeadScore({
    category: result.category,
    website: result.website,
    phone: result.phone,
    description: result.description,
    city: result.city,
    state: result.state,
    rating: result.rating,
    reviewCount: result.reviewCount,
    latitude: result.latitude,
    longitude: result.longitude,
  });
  const score = {
    score: Math.min(100, baseScore.score + restaurantBoost.scoreBoost),
    scoreSummary: [baseScore.scoreSummary, ...restaurantBoost.signals].filter(Boolean).join(" | "),
  };

  const existingLead = result.googlePlaceId
    ? await prisma.lead.findUnique({ where: { googlePlaceId: result.googlePlaceId } })
    : await prisma.lead.findFirst({
        where: {
          businessName: result.businessName,
          city: result.city,
          state: result.state,
        },
      });

  const data: Prisma.LeadUncheckedCreateInput = {
    businessName: result.businessName,
    slug: existingLead?.slug ?? (await resolveLeadSlug(result.slug)),
    category: result.category,
    googlePlaceId: result.googlePlaceId,
    googleMapsUrl: result.googleMapsUrl,
    addressLine1: result.addressLine1,
    city: result.city,
    state: result.state,
    postalCode: result.postalCode,
    website: result.website,
    phone: result.phone,
    description: result.description,
    latitude: result.latitude,
    longitude: result.longitude,
    rating: result.rating,
    reviewCount: result.reviewCount,
    openingHours: result.openingHours ?? [],
    score: score.score,
    scoreSummary: score.scoreSummary,
    estimatedOpportunity: result.estimatedOpportunity,
    outreachAngle: result.outreachAngle,
    isPriority: score.score >= 80,
  };

  if (existingLead) {
    return prisma.lead.update({
      where: { id: existingLead.id },
      data,
      include: {
        contacts: {
          orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        },
        notes: {
          include: { user: true },
          orderBy: { createdAt: "desc" },
          take: 8,
        },
        outreachHistory: {
          include: { user: true },
          orderBy: { happenedAt: "desc" },
          take: 8,
        },
        reminders: {
          where: { status: "OPEN" },
          orderBy: { dueAt: "asc" },
          take: 3,
        },
      },
    });
  }

  return prisma.lead.create({
    data,
    include: {
      contacts: {
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
      },
      notes: {
        include: { user: true },
        orderBy: { createdAt: "desc" },
        take: 8,
      },
      outreachHistory: {
        include: { user: true },
        orderBy: { happenedAt: "desc" },
        take: 8,
      },
      reminders: {
        where: { status: "OPEN" },
        orderBy: { dueAt: "asc" },
        take: 6,
      },
    },
  });
}

function buildQuery(input: ProspectSearchInput) {
  const base = googleCategoryQueries[input.category];
  const keyword = input.keyword?.trim();

  return keyword ? `${keyword} ${base}` : base;
}

export async function searchCommercialProspects({
  query,
  category,
  location,
  radius,
  minRating,
}: {
  query: string;
  category?: string;
  location?: string;
  radius?: string;
  minRating?: number;
}): Promise<ProspectSearchResult[]> {
  const normalizedCategory = (category ?? "RESTAURANT") as LeadCategory;
  const keyword = query.trim();
  const city = location?.trim() || "United States";

  const savedLeads = await searchAndSaveProspects({
    city,
    category: normalizedCategory,
    radius: radius ?? "city_limits",
    keyword,
    minRating,
  });

  return savedLeads
    .map((lead) => {
      const matchedSignals = getRestaurantSignals({
        businessName: lead.businessName,
        description: lead.description ?? undefined,
        keyword,
        reviewCount: lead.reviewCount ?? undefined,
      });

      return {
        businessName: lead.businessName,
        category: lead.category,
        slug: lead.slug,
        googlePlaceId: lead.googlePlaceId ?? undefined,
        googleMapsUrl: lead.googleMapsUrl ?? undefined,
        addressLine1: lead.addressLine1 ?? undefined,
        city: lead.city ?? undefined,
        state: lead.state ?? undefined,
        postalCode: lead.postalCode ?? undefined,
        website: lead.website ?? undefined,
        phone: lead.phone ?? undefined,
        description: lead.description ?? undefined,
        latitude: lead.latitude ?? undefined,
        longitude: lead.longitude ?? undefined,
        rating: lead.rating ?? undefined,
        reviewCount: lead.reviewCount ?? undefined,
        openingHours: lead.openingHours,
        matchedSignals,
        keyword,
        score: lead.score,
        scoreSummary: lead.scoreSummary ?? "Lead score ready",
        outreachAngle:
          lead.outreachAngle ??
          getSuggestedOutreachAngle({
            category: lead.category,
            keyword,
            rating: lead.rating,
            reviewCount: lead.reviewCount,
            city: lead.city,
          }),
        estimatedOpportunity:
          lead.estimatedOpportunity ??
          getSuggestedOpportunity({
            category: lead.category,
            employeeCount: lead.employeeCount,
            unitCount: lead.unitCount,
          }),
      };
    })
    .filter((lead) => (lead.rating ?? 0) >= (minRating ?? 0))
    .sort((a, b) => {
      const signalDelta = (b.matchedSignals?.length ?? 0) - (a.matchedSignals?.length ?? 0);
      if (signalDelta !== 0) {
        return signalDelta;
      }

      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return (b.reviewCount ?? 0) - (a.reviewCount ?? 0);
    });
}

export async function searchAndSaveProspects(input: ProspectSearchInput): Promise<SavedProspectLead[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    return Promise.all(
      searchDemoPlaces(input.keyword ?? "", input.category, input.city).map(async (place, index) => {
        const cityCenter = cityToFallbackCenter(input.city);
        const latitude = cityCenter.latitude + index * 0.015;
        const longitude = cityCenter.longitude - index * 0.012;

        const score = calculateLeadScore({
          category: place.category,
          website: place.website,
          phone: place.phone,
          description: place.description,
          city: place.city,
          employeeCount: place.employeeCount,
          unitCount: place.unitCount,
          state: place.state,
          rating: 4.2,
          reviewCount: 30 + index * 4,
          latitude,
          longitude,
        });

        const result: ProspectSearchResult = {
          businessName: place.businessName,
          category: place.category as LeadCategory,
          slug: slugify(place.businessName),
          googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            `${place.businessName} ${place.addressLine1} ${place.city} ${place.state}`,
          )}`,
          addressLine1: place.addressLine1,
          city: place.city,
          state: place.state,
          website: place.website,
          phone: place.phone,
          description: place.description,
          latitude,
          longitude,
          rating: 4.2,
          reviewCount: 30 + index * 4,
          openingHours: ["Mon-Fri: 8:00 AM-5:00 PM"],
          matchedSignals: getRestaurantSignals({
            businessName: place.businessName,
            description: place.description,
            keyword: input.keyword,
            reviewCount: 30 + index * 4,
          }),
          keyword: input.keyword,
          score: score.score,
          scoreSummary: score.scoreSummary,
          outreachAngle: getSuggestedOutreachAngle({
            category: place.category,
            keyword: input.keyword,
            rating: 4.2,
            reviewCount: 30 + index * 4,
            city: place.city,
          }),
          estimatedOpportunity: getSuggestedOpportunity({
            category: place.category,
            employeeCount: place.employeeCount,
            unitCount: place.unitCount,
          }),
        };

        return upsertProspectLead(result);
      }),
    );
  }

  const cityCenter = await geocodeCity(input.city, apiKey);

  if (!cityCenter) {
    return [];
  }

  const radius = parseRadius(input.radius);
  const query = `${buildQuery(input)} in ${cityCenter.formattedAddress}`;
  const params = new URLSearchParams({
    query,
    key: apiKey,
  });

  if (radius) {
    params.set("location", `${cityCenter.latitude},${cityCenter.longitude}`);
    params.set("radius", String(Math.round(radius * 1609.34)));
  }

  const searchResponse = await fetch(
    `https://maps.googleapis.com/maps/api/place/textsearch/json?${params.toString()}`,
    { cache: "no-store" },
  );

  if (!searchResponse.ok) {
    throw new Error("Google Places search failed");
  }

  const searchPayload = (await searchResponse.json()) as {
    results?: Array<{
      name: string;
      place_id?: string;
      formatted_address?: string;
      geometry?: { location?: { lat?: number; lng?: number } };
      types?: string[];
    }>;
  };

  const detailedResults = await Promise.all(
    (searchPayload.results ?? []).slice(0, 12).map(async (place) => {
      const details = place.place_id ? await fetchPlaceDetails(place.place_id, apiKey) : undefined;
      const address = parseCityParts(details?.formatted_address ?? place.formatted_address);
      const rating = details?.rating;
      const reviewCount = details?.user_ratings_total;
      const estimatedOpportunity = getSuggestedOpportunity({
        category: input.category,
      });
      const scoring = calculateLeadScore({
        category: input.category,
        website: details?.website,
        phone: details?.formatted_phone_number,
        description: details?.types?.join(" "),
        city: address.city,
        state: address.state,
        rating,
        reviewCount,
        latitude: details?.geometry?.location?.lat ?? place.geometry?.location?.lat,
        longitude: details?.geometry?.location?.lng ?? place.geometry?.location?.lng,
      });

      const result: ProspectSearchResult = {
        businessName: details?.name ?? place.name,
        category: input.category,
        slug: slugify(details?.name ?? place.name),
        googlePlaceId: details?.place_id ?? place.place_id,
        googleMapsUrl: details?.url,
        addressLine1: address.addressLine1,
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
        website: details?.website,
        phone: details?.formatted_phone_number,
        description: details?.types?.join(", "),
        latitude: details?.geometry?.location?.lat ?? place.geometry?.location?.lat,
        longitude: details?.geometry?.location?.lng ?? place.geometry?.location?.lng,
        rating,
        reviewCount,
        openingHours: details?.current_opening_hours?.weekday_text ?? [],
        matchedSignals: getRestaurantSignals({
          businessName: details?.name ?? place.name,
          description: details?.types?.join(", "),
          keyword: input.keyword,
          reviewCount,
        }),
        keyword: input.keyword,
        score: scoring.score,
        scoreSummary: scoring.scoreSummary,
        outreachAngle: getSuggestedOutreachAngle({
          category: input.category,
          keyword: input.keyword,
          rating,
          reviewCount,
          city: address.city,
        }),
        estimatedOpportunity,
      };

      if (input.minRating && (rating ?? 0) < input.minRating) {
        return null;
      }

      return upsertProspectLead(result);
    }),
  );

  return detailedResults.filter((lead): lead is SavedProspectLead => Boolean(lead));
}

function cityToFallbackCenter(city: string) {
  const normalized = city.toLowerCase();

  if (normalized.includes("bellingham")) {
    return { latitude: 48.7519, longitude: -122.4787 };
  }

  if (normalized.includes("seattle")) {
    return { latitude: 47.6062, longitude: -122.3321 };
  }

  if (normalized.includes("portland")) {
    return { latitude: 45.5152, longitude: -122.6784 };
  }

  return { latitude: 39.8283, longitude: -98.5795 };
}
