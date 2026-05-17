import { priorityCategoryWeights } from "@/lib/constants";

type ScoreInput = {
  category: string;
  website?: string | null;
  phone?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  employeeCount?: number | null;
  unitCount?: number | null;
  isPriority?: boolean | null;
  description?: string | null;
  state?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

type ScoreBreakdown = {
  score: number;
  scoreSummary: string;
  priorityLabel: "High Priority" | "Medium Priority" | "Low Priority" | "Archive";
};

const SERVICE_AREA_CENTER_LAT = Number(process.env.SERVICE_AREA_CENTER_LAT ?? "");
const SERVICE_AREA_CENTER_LNG = Number(process.env.SERVICE_AREA_CENTER_LNG ?? "");
const SERVICE_AREA_RADIUS_MILES = Number(process.env.SERVICE_AREA_RADIUS_MILES ?? "");
const SERVICE_AREA_STATES = (process.env.SERVICE_AREA_STATES ?? "")
  .split(",")
  .map((value) => value.trim().toUpperCase())
  .filter(Boolean);

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function milesBetween(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
) {
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

export function getLeadPriorityLabel(score: number): ScoreBreakdown["priorityLabel"] {
  if (score >= 80) {
    return "High Priority";
  }

  if (score >= 60) {
    return "Medium Priority";
  }

  if (score >= 40) {
    return "Low Priority";
  }

  return "Archive";
}

function addReason(reasons: string[], reason: string) {
  if (!reasons.includes(reason)) {
    reasons.push(reason);
  }
}

export function calculateLeadScore(input: ScoreInput): ScoreBreakdown {
  let score = priorityCategoryWeights[input.category] ?? 12;
  const reasons: string[] = [];
  const normalizedDescription = input.description?.toLowerCase() ?? "";

  if (input.website) {
    score += 4;
    addReason(reasons, "Website found");
  }

  if (input.phone) {
    score += 4;
    addReason(reasons, "Direct phone available");
  }

  const businessTypeBoosts: Record<string, number> = {
    RESTAURANT: 14,
    FOOD_MANUFACTURER: 16,
    COMMERCIAL_KITCHEN: 16,
    GROCERY: 14,
    BREWERY: 13,
    RETIREMENT: 11,
    APARTMENTS: 10,
    MULTIFAMILY: 10,
    PROPERTY_MANAGEMENT: 9,
    HOA: 7,
  };
  score += businessTypeBoosts[input.category] ?? 6;
  addReason(reasons, "Business type fit");

  const foodHandlingRiskPattern =
    /kitchen|commercial kitchen|food|seafood|fish|oyster|sushi|prep|produce|brew|brewery|taproom|bar|cocktail/;
  if (foodHandlingRiskPattern.test(normalizedDescription)) {
    score += 12;
    addReason(reasons, "Food handling risk");
  }

  if ((input.employeeCount ?? 0) >= 75) {
    score += 10;
    addReason(reasons, "Large building footprint");
  } else if ((input.employeeCount ?? 0) >= 30) {
    score += 6;
    addReason(reasons, "Mid-size building");
  }

  if ((input.unitCount ?? 0) >= 150) {
    score += 12;
    addReason(reasons, "High unit count");
  } else if ((input.unitCount ?? 0) >= 50) {
    score += 7;
    addReason(reasons, "Moderate housing density");
  }

  if ((input.reviewCount ?? 0) >= 250) {
    score += 12;
    addReason(reasons, "Very high customer traffic");
  } else if ((input.reviewCount ?? 0) >= 100) {
    score += 8;
    addReason(reasons, "High review volume");
  } else if ((input.reviewCount ?? 0) >= 30) {
    score += 4;
    addReason(reasons, "Established local traffic");
  }

  if ((input.rating ?? 0) >= 4.5) {
    score += 4;
    addReason(reasons, "Strong customer reputation");
  } else if ((input.rating ?? 0) < 3.8 && (input.reviewCount ?? 0) >= 25) {
    score += 2;
    addReason(reasons, "Service reputation may be exposed");
  }

  if (/(kitchen|bar|patio)/.test(normalizedDescription)) {
    score += 8;
    addReason(reasons, "Kitchen/bar/patio exposure");
  }

  if (
    /(dumpster|trash|waste|alley|resident|shared wall|dock|warehouse|grocery|food|brew|kitchen|patio)/.test(
      normalizedDescription,
    )
  ) {
    score += 10;
    addReason(reasons, "Recurring pest need likely");
  }

  if (
    input.category === "FOOD_MANUFACTURER" ||
    input.category === "COMMERCIAL_KITCHEN" ||
    input.category === "GROCERY" ||
    input.category === "BREWERY" ||
    /(audit|inspection|health|compliance|haccp|food safety|sanitation)/.test(normalizedDescription)
  ) {
    score += 10;
    addReason(reasons, "Compliance documentation likely");
  }

  const hasServiceCenter =
    Number.isFinite(SERVICE_AREA_CENTER_LAT) &&
    Number.isFinite(SERVICE_AREA_CENTER_LNG) &&
    Number.isFinite(SERVICE_AREA_RADIUS_MILES);

  if (
    hasServiceCenter &&
    input.latitude !== null &&
    input.latitude !== undefined &&
    input.longitude !== null &&
    input.longitude !== undefined
  ) {
    const distance = milesBetween(
      { latitude: SERVICE_AREA_CENTER_LAT, longitude: SERVICE_AREA_CENTER_LNG },
      { latitude: input.latitude, longitude: input.longitude },
    );

    if (distance <= SERVICE_AREA_RADIUS_MILES) {
      score += 10;
      addReason(reasons, "Inside target service area");
    } else if (distance <= SERVICE_AREA_RADIUS_MILES * 1.5) {
      score += 4;
      addReason(reasons, "Near target service area");
    } else {
      score -= 6;
      addReason(reasons, "Outside core service area");
    }
  } else if (SERVICE_AREA_STATES.length > 0 && input.state) {
    if (SERVICE_AREA_STATES.includes(input.state.toUpperCase())) {
      score += 8;
      addReason(reasons, "Inside target service state");
    } else {
      score -= 4;
      addReason(reasons, "Outside target service state");
    }
  } else if (input.state) {
    score += 2;
    addReason(reasons, "Geography identified");
  }

  if (input.isPriority) {
    score += 6;
    addReason(reasons, "Marked as priority");
  }

  const boundedScore = Math.max(0, Math.min(100, score));

  return {
    score: boundedScore,
    scoreSummary: reasons.slice(0, 5).join(" | ") || "Baseline category score",
    priorityLabel: getLeadPriorityLabel(boundedScore),
  };
}
