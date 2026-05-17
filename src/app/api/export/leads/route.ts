import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const leads = await prisma.lead.findMany({
    include: {
      contacts: {
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        take: 1,
      },
    },
    orderBy: [{ stage: "asc" }, { score: "desc" }],
  });

  const rows = [
    [
      "Business Name",
      "Category",
      "Stage",
      "Score",
      "City",
      "State",
      "Phone",
      "Website",
      "Primary Contact",
      "Primary Contact Email",
      "Next Follow Up",
    ],
    ...leads.map((lead) => [
      lead.businessName,
      lead.category,
      lead.stage,
      String(lead.score),
      lead.city ?? "",
      lead.state ?? "",
      lead.phone ?? "",
      lead.website ?? "",
      lead.contacts[0]?.name ?? "",
      lead.contacts[0]?.email ?? "",
      lead.nextFollowUpAt?.toISOString() ?? "",
    ]),
  ];

  const csv = rows
    .map((row) =>
      row
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(","),
    )
    .join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="squatch-finder-leads.csv"',
    },
  });
}
