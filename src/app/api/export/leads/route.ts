import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getLeadCategoryLabel, getPriorityLevel, getLeadStatusLabel } from "@/lib/lead-insights";

export async function GET() {
  const leads = await prisma.lead.findMany({
    include: {
      notes: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
    orderBy: [{ stage: "asc" }, { score: "desc" }],
  });

  const rows = [
    [
      "Business Name",
      "Category",
      "Address",
      "City",
      "Phone",
      "Website",
      "Lead Score",
      "Priority Level",
      "Status",
      "Last Contacted Date",
      "Next Follow-Up Date",
      "Notes",
    ],
    ...leads.map((lead) => [
      lead.businessName,
      getLeadCategoryLabel(lead.category),
      [lead.addressLine1, lead.state, lead.postalCode].filter(Boolean).join(", "),
      lead.city ?? "",
      lead.phone ?? "",
      lead.website ?? "",
      String(lead.score),
      getPriorityLevel(lead.score, lead.isPriority),
      getLeadStatusLabel(lead.stage),
      lead.lastContactedAt?.toISOString() ?? "",
      lead.nextFollowUpAt?.toISOString() ?? "",
      lead.notes.map((note) => note.body).join(" || "),
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
