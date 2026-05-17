import { NextRequest, NextResponse } from "next/server";
import { searchCommercialProspects } from "@/lib/google-places";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("query") ?? "";
  const category = searchParams.get("category") ?? undefined;
  const location = searchParams.get("location") ?? undefined;
  const radius = searchParams.get("radius") ?? undefined;
  const minRatingRaw = searchParams.get("minRating");
  const minRating = minRatingRaw ? Number(minRatingRaw) : undefined;

  const results = await searchCommercialProspects({
    query,
    category,
    location,
    radius,
    minRating: Number.isFinite(minRating) ? minRating : undefined,
  });

  return NextResponse.json({ results });
}
