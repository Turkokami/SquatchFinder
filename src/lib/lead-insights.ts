import { leadCategoryOptions, pipelineStages } from "@/lib/constants";
import { getLeadPriorityLabel } from "@/lib/scoring";

export function getLeadCategoryLabel(category: string) {
  return (
    leadCategoryOptions.find((option) => option.value === category)?.label ??
    category.replaceAll("_", " ")
  );
}

export function getLeadStatusLabel(status: string) {
  return (
    pipelineStages.find((option) => option.value === status)?.label ??
    status.replaceAll("_", " ")
  );
}

export function getPriorityLevel(score: number, isPriority?: boolean | null) {
  if (isPriority) {
    return "High Priority";
  }

  return getLeadPriorityLabel(score);
}

export function getEstimatedUrgency(score: number, isPriority?: boolean | null) {
  if (isPriority || score >= 85) {
    return "Immediate";
  }

  if (score >= 70) {
    return "High";
  }

  if (score >= 50) {
    return "Medium";
  }

  return "Low";
}

export function getGoogleBusinessProfileLink(input: {
  googlePlaceId?: string | null;
  googleMapsUrl?: string | null;
  businessName: string;
  city?: string | null;
  state?: string | null;
}) {
  if (input.googleMapsUrl) {
    return input.googleMapsUrl;
  }

  if (input.googlePlaceId) {
    return `https://www.google.com/maps/place/?q=place_id:${input.googlePlaceId}`;
  }

  const query = [input.businessName, input.city, input.state].filter(Boolean).join(" ");
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

export function getSuggestedOpportunity(input: {
  category: string;
  unitCount?: number | null;
  employeeCount?: number | null;
}) {
  const byCategory: Record<string, string> = {
    RESTAURANT: "Kitchen sanitation, drain treatments, and recurring roach prevention.",
    APARTMENTS: "Common-area rodent control, trash enclosure service, and unit-turn protection.",
    MULTIFAMILY: "Shared-wall pest monitoring, resident complaint response, and exterior exclusion.",
    HOA: "Clubhouse, pool area, and perimeter pest prevention for common spaces.",
    RETIREMENT: "Sensitive-environment monitoring, dining hall fly control, and resident-safe treatments.",
    FOOD_MANUFACTURER: "Audit-ready monitoring, dock protection, and stored-product pest prevention.",
    COMMERCIAL_KITCHEN: "High-frequency kitchen service, drain remediation, and fly management.",
    BREWERY: "Drain fly, grain storage, and loading-door exclusion programs.",
    GROCERY: "Receiving dock, produce prep, and overnight rodent monitoring coverage.",
    PROPERTY_MANAGEMENT: "Portfolio-wide service agreements across multiple managed properties.",
  };

  const base = byCategory[input.category] ?? "Recurring inspection, exclusion, and preventive treatment program.";

  if ((input.unitCount ?? 0) >= 100) {
    return `${base} Strong fit for a multi-building service agreement.`;
  }

  if ((input.employeeCount ?? 0) >= 50) {
    return `${base} Good candidate for a monthly commercial program.`;
  }

  return base;
}

export function getSuggestedOutreachAngle(input: {
  category: string;
  keyword?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  city?: string | null;
}) {
  const categoryAngles: Record<string, string> = {
    RESTAURANT: "Lead with kitchen compliance, drain fly prevention, and after-hours service coverage.",
    APARTMENTS: "Lead with resident satisfaction, trash-area rodent control, and quick-turn unit support.",
    MULTIFAMILY: "Lead with property-wide monitoring and faster resident issue response.",
    HOA: "Lead with common-area prevention and budget-friendly recurring service.",
    RETIREMENT: "Lead with discreet service, resident safety, and dining hall protection.",
    FOOD_MANUFACTURER: "Lead with audit readiness, dock exclusion, and stored-product protection.",
    COMMERCIAL_KITCHEN: "Lead with sanitation support, drain remediation, and frequent service reliability.",
    BREWERY: "Lead with drain fly control, grain storage protection, and dock exclusion.",
    GROCERY: "Lead with receiving-area protection, produce prep coverage, and overnight monitoring.",
    PROPERTY_MANAGEMENT: "Lead with portfolio-wide consistency and single-vendor reporting across sites.",
  };

  const base =
    categoryAngles[input.category] ??
    "Lead with recurring prevention, fast response, and a cleaner commercial environment.";

  const keywordAngle = input.keyword
    ? ` Mention their interest in ${input.keyword} as a way to personalize the first touch.`
    : "";
  const reputationAngle =
    (input.rating ?? 0) >= 4.5 && (input.reviewCount ?? 0) >= 50
      ? " Position Sasquatch as a partner that protects a hard-earned local reputation."
      : "";
  const localAngle = input.city
    ? ` Reference service coverage in ${input.city} to make the outreach feel local.`
    : "";

  return `${base}${keywordAngle}${reputationAngle}${localAngle}`.trim();
}
