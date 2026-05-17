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
};

export function calculateLeadScore(input: ScoreInput) {
  let score = priorityCategoryWeights[input.category] ?? 12;
  const reasons: string[] = [];

  if (input.website) {
    score += 8;
    reasons.push("Website found");
  }

  if (input.phone) {
    score += 7;
    reasons.push("Direct phone available");
  }

  if ((input.rating ?? 0) >= 4.4) {
    score += 8;
    reasons.push("Strong customer rating");
  } else if ((input.rating ?? 0) >= 4) {
    score += 4;
    reasons.push("Solid rating");
  }

  if ((input.reviewCount ?? 0) >= 100) {
    score += 10;
    reasons.push("High review volume");
  } else if ((input.reviewCount ?? 0) >= 25) {
    score += 5;
    reasons.push("Established local presence");
  }

  if ((input.employeeCount ?? 0) >= 50) {
    score += 12;
    reasons.push("Larger staff footprint");
  } else if ((input.employeeCount ?? 0) >= 15) {
    score += 7;
    reasons.push("Mid-size staff count");
  }

  if ((input.unitCount ?? 0) >= 100) {
    score += 14;
    reasons.push("High unit count");
  } else if ((input.unitCount ?? 0) >= 30) {
    score += 8;
    reasons.push("Solid property size");
  }

  if (input.isPriority) {
    score += 10;
    reasons.push("Marked as priority");
  }

  if (
    input.description?.match(
      /kitchen|food|resident|brew|brewery|warehouse|grocery|bar|patio|dumpster|seafood|fish|oyster|sushi/i,
    )
  ) {
    score += 6;
    reasons.push("Matches high-risk pest environment");
  }

  if (input.state) {
    score += 4;
    reasons.push("Geography identified");
  }

  return {
    score: Math.min(100, score),
    scoreSummary: reasons.slice(0, 4).join(" | ") || "Baseline category score",
  };
}
