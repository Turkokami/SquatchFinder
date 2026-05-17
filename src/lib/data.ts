import { subDays } from "date-fns";
import { LeadCategory, LeadStage, Prisma, ReminderStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

function parseOpportunityValue(value?: string | null) {
  if (!value) {
    return 0;
  }

  const cleaned = value.replaceAll(",", "");
  const matches = [...cleaned.matchAll(/\$?(\d+(?:\.\d+)?)/g)].map((match) => Number(match[1]));

  if (matches.length === 0) {
    return 0;
  }

  if (matches.length === 1) {
    return matches[0];
  }

  return (matches[0] + matches[matches.length - 1]) / 2;
}

export async function getAppOverview() {
  try {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    const newLeadWindow = subDays(today, 7);

    const [
      leads,
      reminders,
      recentLeads,
      totalLeadCount,
      newLeadsThisWeek,
      highPriorityLeads,
      followUpsDueToday,
      proposalsSent,
      wonAccounts,
      lostAccounts,
      categoryCounts,
      statusCounts,
      cityCounts,
    ] = await Promise.all([
      prisma.lead.findMany({
        include: {
          outreachHistory: {
            orderBy: { happenedAt: "desc" },
            take: 1,
          },
        },
      }),
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
      prisma.lead.count(),
      prisma.lead.count({
        where: {
          createdAt: { gte: newLeadWindow },
        },
      }),
      prisma.lead.count({
        where: {
          score: { gte: 80 },
        },
      }),
      prisma.reminder.count({
        where: {
          status: ReminderStatus.OPEN,
          dueAt: {
            gte: startOfToday,
            lt: endOfToday,
          },
        },
      }),
      prisma.lead.count({ where: { stage: LeadStage.PROPOSAL_SENT } }),
      prisma.lead.count({ where: { stage: LeadStage.WON } }),
      prisma.lead.count({ where: { stage: LeadStage.LOST } }),
      prisma.lead.groupBy({
        by: ["category"],
        _count: { category: true },
      }),
      prisma.lead.groupBy({
        by: ["stage"],
        _count: { stage: true },
      }),
      prisma.lead.groupBy({
        by: ["city"],
        where: { city: { not: null } },
        _count: { city: true },
        orderBy: { _count: { city: "desc" } },
        take: 8,
      }),
    ]);

    const monthlyRecurringRevenuePotential = leads
      .filter((lead) => lead.stage !== LeadStage.WON && lead.stage !== LeadStage.LOST)
      .reduce((total, lead) => total + parseOpportunityValue(lead.estimatedOpportunity), 0);

    const conversionRate = totalLeadCount > 0 ? Math.round((wonAccounts / totalLeadCount) * 100) : 0;

    return {
      isConnected: true,
      leadCount: totalLeadCount,
      newLeadsThisWeek,
      highPriorityLeads,
      followUpsDueToday,
      proposalsSent,
      wonAccounts,
      lostAccounts,
      monthlyRecurringRevenuePotential,
      reminders,
      recentLeads,
      conversionRate,
      categoryCounts,
      statusCounts,
      cityCounts,
    };
  } catch {
    return {
      isConnected: false,
      leadCount: 0,
      newLeadsThisWeek: 0,
      highPriorityLeads: 0,
      followUpsDueToday: 0,
      proposalsSent: 0,
      wonAccounts: 0,
      lostAccounts: 0,
      monthlyRecurringRevenuePotential: 0,
      reminders: [],
      recentLeads: [],
      conversionRate: 0,
      categoryCounts: [],
      statusCounts: [],
      cityCounts: [],
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
        outreachHistory: {
          orderBy: { happenedAt: "desc" },
          take: 1,
        },
        reminders: {
          where: { status: ReminderStatus.OPEN },
          orderBy: { dueAt: "asc" },
          take: 1,
        },
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
