import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import {
  LeadCategory,
  LeadStage,
  OutreachType,
  PrismaClient,
  ReminderStatus,
  UserRole,
} from "../src/generated/prisma/client";
import { calculateLeadScore } from "../src/lib/scoring";
import { slugify } from "../src/lib/utils";

const adapter = new PrismaPg({
  connectionString:
    process.env.DATABASE_URL ??
    "postgresql://postgres:postgres@localhost:5432/squatch_finder?schema=public",
});
const prisma = new PrismaClient({ adapter });

const seedLeads = [
  {
    businessName: "Cascade View Multifamily",
    category: LeadCategory.MULTIFAMILY,
    stage: LeadStage.QUALIFIED,
    city: "Seattle",
    state: "WA",
    addressLine1: "4120 Summit Ave",
    website: "https://cascadeview.example.com",
    phone: "(206) 555-0121",
    description: "176-unit multifamily complex with package room, trash chutes, and parking deck.",
    unitCount: 176,
    latitude: 47.6569,
    longitude: -122.3224,
    contacts: [
      {
        name: "Jenna Alvarez",
        title: "Regional Property Manager",
        email: "jenna@cascadeview.example.com",
        phone: "(206) 555-0157",
        isPrimary: true,
        preferredChannel: "Email",
      },
    ],
  },
  {
    businessName: "Hearthstone Kitchen Group",
    category: LeadCategory.COMMERCIAL_KITCHEN,
    stage: LeadStage.CONTACTED,
    city: "Las Vegas",
    state: "NV",
    addressLine1: "88 Fremont Plaza",
    website: "https://hearthstonekitchen.example.com",
    phone: "(702) 555-0105",
    description: "Central commercial kitchen serving meal prep brands with dry storage and walk-ins.",
    employeeCount: 64,
    latitude: 36.1704,
    longitude: -115.1409,
    contacts: [
      {
        name: "Marcus Bell",
        title: "Operations Director",
        email: "marcus@hearthstonekitchen.example.com",
        phone: "(702) 555-0116",
        isPrimary: true,
        preferredChannel: "Call",
      },
    ],
  },
  {
    businessName: "Blue Mesa Grocery",
    category: LeadCategory.GROCERY,
    stage: LeadStage.PROPOSAL_SENT,
    city: "Albuquerque",
    state: "NM",
    addressLine1: "500 Lomas Blvd",
    website: "https://bluemesagrocery.example.com",
    phone: "(505) 555-0133",
    description: "Independent grocery with produce prep area, bakery, and receiving dock.",
    employeeCount: 43,
    latitude: 35.0871,
    longitude: -106.6507,
    contacts: [
      {
        name: "Tori Nguyen",
        title: "Store Manager",
        email: "tori@bluemesagrocery.example.com",
        phone: "(505) 555-0112",
        isPrimary: true,
        preferredChannel: "Text",
      },
    ],
  },
];

async function main() {
  const passwordHash = await bcrypt.hash("sasquatch123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "owner@squatchfinder.local" },
    update: {
      name: "Sasquatch Owner",
      passwordHash,
      role: UserRole.ADMIN,
    },
    create: {
      name: "Sasquatch Owner",
      email: "owner@squatchfinder.local",
      passwordHash,
      role: UserRole.ADMIN,
    },
  });

  for (const lead of seedLeads) {
    const score = calculateLeadScore({
      category: lead.category,
      website: lead.website,
      phone: lead.phone,
      description: lead.description,
      employeeCount: lead.employeeCount,
      unitCount: lead.unitCount,
      state: lead.state,
      isPriority: true,
    });

    await prisma.lead.upsert({
      where: { slug: slugify(lead.businessName) },
      update: {
        businessName: lead.businessName,
        category: lead.category,
        stage: lead.stage,
        city: lead.city,
        state: lead.state,
        addressLine1: lead.addressLine1,
        website: lead.website,
        phone: lead.phone,
        description: lead.description,
        unitCount: lead.unitCount,
        employeeCount: lead.employeeCount,
        latitude: lead.latitude,
        longitude: lead.longitude,
        ownerId: admin.id,
        isPriority: true,
        score: score.score,
        scoreSummary: score.scoreSummary,
      },
      create: {
        businessName: lead.businessName,
        slug: slugify(lead.businessName),
        category: lead.category,
        stage: lead.stage,
        city: lead.city,
        state: lead.state,
        addressLine1: lead.addressLine1,
        website: lead.website,
        phone: lead.phone,
        description: lead.description,
        unitCount: lead.unitCount,
        employeeCount: lead.employeeCount,
        latitude: lead.latitude,
        longitude: lead.longitude,
        ownerId: admin.id,
        isPriority: true,
        score: score.score,
        scoreSummary: score.scoreSummary,
        contacts: {
          create: lead.contacts,
        },
        notes: {
          create: [
            {
              body: "Seeded lead for onboarding. Review service footprint and proposal timing.",
              userId: admin.id,
            },
          ],
        },
        outreachHistory: {
          create: [
            {
              type: OutreachType.CALL,
              summary: "Introduced Sasquatch Pest Control and confirmed the decision maker.",
              outcome: "Interested in quarterly service pricing.",
              userId: admin.id,
            },
          ],
        },
        reminders: {
          create: [
            {
              title: "Follow up on service proposal",
              dueAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
              ownerId: admin.id,
              status: ReminderStatus.OPEN,
            },
          ],
        },
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
