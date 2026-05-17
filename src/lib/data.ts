import { LeadCategory, LeadStage, Prisma, ReminderStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

export async function getAppOverview() {
  try {
    const [leadCount, reminders, recentLeads, wonLeads, stageCounts] = await Promise.all([
      prisma.lead.count(),
      prisma.reminder.findMany({
        where: { status: ReminderStatus.OPEN },
        orderBy: { dueAt: "asc" },
        include: { lead: true },
        take: 6,
      }),
      prisma.lead.findMany({
        orderBy: { updatedAt: "desc" },
        take: 6,
      }),
      prisma.lead.count({ where: { stage: LeadStage.WON } }),
      prisma.lead.groupBy({
        by: ["stage"],
        _count: { stage: true },
      }),
    ]);

    const conversionRate = leadCount > 0 ? Math.round((wonLeads / leadCount) * 100) : 0;

    return {
      isConnected: true,
      leadCount,
      reminders,
      recentLeads,
      conversionRate,
      stageCounts,
    };
  } catch {
    return {
      isConnected: false,
      leadCount: 0,
      reminders: [],
      recentLeads: [],
      conversionRate: 0,
      stageCounts: [],
    };
  }
}

export async function getLeads(filters?: { search?: string; category?: string; stage?: string }) {
  const where: Prisma.LeadWhereInput = {
    ...(filters?.search
      ? {
          OR: [
            { businessName: { contains: filters.search, mode: "insensitive" as const } },
            { city: { contains: filters.search, mode: "insensitive" as const } },
            { state: { contains: filters.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(filters?.category ? { category: filters.category as LeadCategory } : {}),
    ...(filters?.stage ? { stage: filters.stage as LeadStage } : {}),
  };

  try {
    return await prisma.lead.findMany({
      where,
      include: {
        contacts: true,
        reminders: {
          where: { status: ReminderStatus.OPEN },
          orderBy: { dueAt: "asc" },
          take: 1,
        },
      },
      orderBy: [{ score: "desc" }, { updatedAt: "desc" }],
    });
  } catch {
    return [];
  }
}

export async function getLeadById(id: string) {
  try {
    return await prisma.lead.findUnique({
      where: { id },
      include: {
        owner: true,
        contacts: { orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }] },
        notes: { include: { user: true }, orderBy: { createdAt: "desc" } },
        outreachHistory: { include: { user: true }, orderBy: { happenedAt: "desc" } },
        reminders: { include: { owner: true }, orderBy: { dueAt: "asc" } },
      },
    });
  } catch {
    return null;
  }
}

export async function getPipelineBoard() {
  try {
    return await prisma.lead.findMany({
      orderBy: [{ score: "desc" }, { updatedAt: "desc" }],
      include: {
        contacts: true,
      },
    });
  } catch {
    return [];
  }
}

export async function getCurrentUser() {
  try {
    return prisma.user.findFirst({
      orderBy: { createdAt: "asc" },
    });
  } catch {
    return null;
  }
}

export async function getMapLeads() {
  try {
    return await prisma.lead.findMany({
      where: {
        latitude: { not: null },
        longitude: { not: null },
      },
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
          where: { status: ReminderStatus.OPEN },
          orderBy: { dueAt: "asc" },
          take: 6,
        },
      },
      orderBy: [{ score: "desc" }, { updatedAt: "desc" }],
    });
  } catch {
    return [];
  }
}
