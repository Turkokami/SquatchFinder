"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { LeadCategory, LeadStage, OutreachType, ReminderStatus } from "@/generated/prisma/client";
import { auth } from "@/auth";
import { discoverPublicBusinessContacts } from "@/lib/contact-discovery";
import { prisma } from "@/lib/db";
import { calculateLeadScore } from "@/lib/scoring";
import { slugify } from "@/lib/utils";

async function requireSessionUserId() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Authentication required");
  }

  return session.user.id;
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

function parseOptionalInt(value: FormDataEntryValue | null) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseOptionalDate(value: FormDataEntryValue | null) {
  if (!value) return undefined;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export async function importLeadAction(formData: FormData) {
  await requireSessionUserId();

  const businessName = String(formData.get("businessName") ?? "");
  const category = String(formData.get("category") ?? "RESTAURANT") as LeadCategory;
  const scoreInput = {
    category,
    website: String(formData.get("website") ?? "") || undefined,
    phone: String(formData.get("phone") ?? "") || undefined,
    description: String(formData.get("description") ?? "") || undefined,
    city: String(formData.get("city") ?? "") || undefined,
    state: String(formData.get("state") ?? "") || undefined,
    rating: Number(formData.get("rating") ?? "") || undefined,
    reviewCount: parseOptionalInt(formData.get("reviewCount")),
    unitCount: parseOptionalInt(formData.get("unitCount")),
    employeeCount: parseOptionalInt(formData.get("employeeCount")),
    latitude: Number(formData.get("latitude") ?? "") || undefined,
    longitude: Number(formData.get("longitude") ?? "") || undefined,
  };
  const score = calculateLeadScore(scoreInput);
  const googlePlaceId = String(formData.get("googlePlaceId") ?? "") || undefined;

  const existingLead = googlePlaceId
    ? await prisma.lead.findUnique({ where: { googlePlaceId } })
    : await prisma.lead.findFirst({ where: { businessName } });

  if (existingLead) {
    redirect(`/leads/${existingLead.id}`);
  }

  const baseSlug = slugify(businessName);
  const lead = await prisma.lead.create({
    data: {
      businessName,
      slug: await resolveLeadSlug(baseSlug),
      category,
      score: score.score,
      scoreSummary: score.scoreSummary,
      googlePlaceId,
      googleMapsUrl: String(formData.get("googleMapsUrl") ?? "") || undefined,
      addressLine1: String(formData.get("addressLine1") ?? "") || undefined,
      city: String(formData.get("city") ?? "") || undefined,
      state: String(formData.get("state") ?? "") || undefined,
      postalCode: String(formData.get("postalCode") ?? "") || undefined,
      website: String(formData.get("website") ?? "") || undefined,
      phone: String(formData.get("phone") ?? "") || undefined,
      description: String(formData.get("description") ?? "") || undefined,
      rating: Number(formData.get("rating") ?? "") || undefined,
      reviewCount: parseOptionalInt(formData.get("reviewCount")),
      openingHours: formData
        .getAll("openingHours")
        .map((entry) => String(entry))
        .filter(Boolean),
      latitude: Number(formData.get("latitude") ?? "") || undefined,
      longitude: Number(formData.get("longitude") ?? "") || undefined,
      unitCount: parseOptionalInt(formData.get("unitCount")),
      employeeCount: parseOptionalInt(formData.get("employeeCount")),
      estimatedOpportunity:
        String(formData.get("estimatedOpportunity") ?? "") || "$1,500-$4,000 monthly",
      outreachAngle: String(formData.get("outreachAngle") ?? "") || undefined,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/search");
  revalidatePath("/pipeline");
  redirect(`/leads/${lead.id}`);
}

export async function updateLeadStageAction(formData: FormData) {
  await requireSessionUserId();

  const leadId = String(formData.get("leadId"));
  const stage = String(formData.get("stage")) as LeadStage;

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      stage,
      lastContactedAt:
        stage === LeadStage.CONTACTED || stage === LeadStage.PROPOSAL_SENT
          ? new Date()
          : undefined,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/pipeline");
  revalidatePath(`/leads/${leadId}`);
}

export async function addNoteAction(formData: FormData) {
  const userId = await requireSessionUserId();
  const leadId = String(formData.get("leadId"));
  const body = String(formData.get("body") ?? "").trim();

  if (!body) {
    return;
  }

  await prisma.note.create({
    data: {
      leadId,
      userId,
      body,
    },
  });

  revalidatePath(`/leads/${leadId}`);
}

export async function addContactAction(formData: FormData) {
  await requireSessionUserId();
  const leadId = String(formData.get("leadId"));
  const name = String(formData.get("name") ?? "").trim();

  if (!name) {
    return;
  }

  await prisma.contact.create({
    data: {
      leadId,
      name,
      title: String(formData.get("title") ?? "") || undefined,
      businessAssociation: String(formData.get("businessAssociation") ?? "") || undefined,
      linkedinUrl: String(formData.get("linkedinUrl") ?? "") || undefined,
      facebookUrl: String(formData.get("facebookUrl") ?? "") || undefined,
      email: String(formData.get("email") ?? "") || undefined,
      phone: String(formData.get("phone") ?? "") || undefined,
      sourceUrl: String(formData.get("sourceUrl") ?? "") || undefined,
      confidenceScore: parseOptionalInt(formData.get("confidenceScore")),
      discoveryNotes: String(formData.get("discoveryNotes") ?? "") || undefined,
      preferredChannel: String(formData.get("preferredChannel") ?? "") || undefined,
      isPrimary: String(formData.get("isPrimary") ?? "") === "on",
    },
  });

  revalidatePath(`/leads/${leadId}`);
}

export async function updateLeadSocialProfilesAction(formData: FormData) {
  await requireSessionUserId();

  const leadId = String(formData.get("leadId") ?? "");

  if (!leadId) {
    return;
  }

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      facebookBusinessPageUrl: String(formData.get("facebookBusinessPageUrl") ?? "") || undefined,
      linkedinCompanyPageUrl: String(formData.get("linkedinCompanyPageUrl") ?? "") || undefined,
      decisionMakerLinkedinUrl: String(formData.get("decisionMakerLinkedinUrl") ?? "") || undefined,
      decisionMakerFacebookUrl: String(formData.get("decisionMakerFacebookUrl") ?? "") || undefined,
      socialSourceUrl: String(formData.get("socialSourceUrl") ?? "") || undefined,
      socialContactRole: String(formData.get("socialContactRole") ?? "") || undefined,
      socialOutreachStatus: String(formData.get("socialOutreachStatus") ?? "") || undefined,
      socialLastMessageAt: parseOptionalDate(formData.get("socialLastMessageAt")),
      socialFollowUpAt: parseOptionalDate(formData.get("socialFollowUpAt")),
    },
  });

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/map");
}

export async function discoverContactsAction(formData: FormData) {
  await requireSessionUserId();

  const leadId = String(formData.get("leadId") ?? "");
  const extraSourceUrls = String(formData.get("extraSourceUrls") ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  await discoverPublicBusinessContacts({
    leadId,
    extraSourceUrls,
  });

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/map");
}

export async function addOutreachAction(formData: FormData) {
  const userId = await requireSessionUserId();
  const leadId = String(formData.get("leadId"));
  const summary = String(formData.get("summary") ?? "").trim();
  const outreachType = (String(formData.get("type")) as OutreachType) || OutreachType.PHONE_CALL;
  const socialStatus =
    String(formData.get("socialOutreachStatus") ?? "") ||
    String(formData.get("outcome") ?? "") ||
    undefined;
  const socialFollowUpAt = parseOptionalDate(formData.get("socialFollowUpAt"));
  const happenedAt = parseOptionalDate(formData.get("happenedAt")) ?? new Date();
  const nextAction = String(formData.get("nextAction") ?? "").trim() || undefined;

  if (!summary) {
    return;
  }

  await prisma.outreach.create({
    data: {
      leadId,
      userId,
      type: outreachType,
      subject: String(formData.get("subject") ?? "") || undefined,
      summary,
      outcome: String(formData.get("outcome") ?? "") || undefined,
      nextAction,
      happenedAt,
    },
  });

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      lastContactedAt: happenedAt,
      outreachStatus: String(formData.get("outcome") ?? "") || "Outreach logged",
      ...(outreachType === OutreachType.LINKEDIN || outreachType === OutreachType.FACEBOOK
        ? {
            socialOutreachStatus: socialStatus ?? "Social outreach logged",
            socialLastMessageAt: happenedAt,
            socialFollowUpAt,
            nextFollowUpAt: socialFollowUpAt ?? undefined,
          }
        : {}),
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/map");
  revalidatePath(`/leads/${leadId}`);
}

export async function addReminderAction(formData: FormData) {
  const userId = await requireSessionUserId();
  const leadId = String(formData.get("leadId"));
  const title = String(formData.get("title") ?? "").trim();
  const dueAt = String(formData.get("dueAt") ?? "");
  const followUpKind = String(formData.get("followUpKind") ?? "");

  if (!title || !dueAt) {
    return;
  }

  await prisma.reminder.create({
    data: {
      leadId,
      ownerId: userId,
      title,
      dueAt: new Date(dueAt),
      notes: String(formData.get("notes") ?? "") || undefined,
    },
  });

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      nextFollowUpAt: new Date(dueAt),
      ...(followUpKind === "SOCIAL" ? { socialFollowUpAt: new Date(dueAt) } : {}),
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/map");
  revalidatePath(`/leads/${leadId}`);
}

export async function toggleReminderAction(formData: FormData) {
  await requireSessionUserId();
  const reminderId = String(formData.get("reminderId"));
  const leadId = String(formData.get("leadId"));
  const markDone = String(formData.get("markDone")) === "true";

  await prisma.reminder.update({
    where: { id: reminderId },
    data: {
      status: markDone ? ReminderStatus.DONE : ReminderStatus.OPEN,
      completedAt: markDone ? new Date() : null,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath(`/leads/${leadId}`);
}

export async function refreshLeadScoreAction(formData: FormData) {
  await requireSessionUserId();
  const leadId = String(formData.get("leadId"));
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });

  if (!lead) {
    return;
  }

  const score = calculateLeadScore({
    category: lead.category,
    website: lead.website,
    phone: lead.phone,
    rating: lead.rating,
    reviewCount: lead.reviewCount,
    employeeCount: lead.employeeCount,
    unitCount: lead.unitCount,
    isPriority: lead.isPriority,
    description: lead.description,
    city: lead.city,
    state: lead.state,
    latitude: lead.latitude,
    longitude: lead.longitude,
  });

  await prisma.lead.update({
    where: { id: leadId },
    data: score,
  });

  revalidatePath("/dashboard");
  revalidatePath("/pipeline");
  revalidatePath(`/leads/${leadId}`);
}
