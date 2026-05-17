import * as cheerio from "cheerio";
import { prisma } from "@/lib/db";

const TARGET_ROLES = [
  "Owner",
  "General Manager",
  "Property Manager",
  "Facilities Manager",
  "Operations Manager",
  "HOA Board Contact",
  "Executive Director",
  "Maintenance Director",
  "Food Safety Manager",
] as const;

const ROLE_PATTERNS = [
  { pattern: /owner/i, label: "Owner" },
  { pattern: /general manager/i, label: "General Manager" },
  { pattern: /property manager/i, label: "Property Manager" },
  { pattern: /facilities manager/i, label: "Facilities Manager" },
  { pattern: /operations manager/i, label: "Operations Manager" },
  { pattern: /hoa board|board president|board contact/i, label: "HOA Board Contact" },
  { pattern: /executive director/i, label: "Executive Director" },
  { pattern: /maintenance director|maintenance manager/i, label: "Maintenance Director" },
  { pattern: /food safety manager|quality assurance manager/i, label: "Food Safety Manager" },
] as const;

const SOCIAL_HOSTS = ["linkedin.com", "facebook.com"];

type Candidate = {
  name: string;
  title: string;
  email?: string;
  phone?: string;
  linkedinUrl?: string;
  facebookUrl?: string;
  sourceUrl: string;
  confidenceScore: number;
  discoveryNotes: string;
};

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function extractRole(text: string) {
  return ROLE_PATTERNS.find((role) => role.pattern.test(text))?.label;
}

function extractName(text: string) {
  const match =
    text.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z'.-]+){1,2})\s*(?:[-,|•–]\s*)?(Owner|General Manager|Property Manager|Facilities Manager|Operations Manager|HOA Board Contact|Board President|Board Contact|Executive Director|Maintenance Director|Food Safety Manager)/i) ??
    text.match(/(Owner|General Manager|Property Manager|Facilities Manager|Operations Manager|HOA Board Contact|Board President|Board Contact|Executive Director|Maintenance Director|Food Safety Manager)\s*(?:[-,|•–]\s*)?([A-Z][a-z]+(?:\s+[A-Z][a-z'.-]+){1,2})/i);

  if (!match) {
    return null;
  }

  const maybeName = match[1]?.match(/^[A-Z]/) ? match[1] : match[2];
  return maybeName ? normalizeWhitespace(maybeName) : null;
}

function deriveConfidence(input: {
  hasName: boolean;
  hasRole: boolean;
  hasEmail: boolean;
  hasPhone: boolean;
  hasLinkedin: boolean;
  hasFacebook: boolean;
  sourceUrl: string;
}) {
  let score = 35;

  if (input.hasName) score += 20;
  if (input.hasRole) score += 20;
  if (input.hasEmail) score += 10;
  if (input.hasPhone) score += 8;
  if (input.hasLinkedin) score += 4;
  if (input.hasFacebook) score += 3;
  if (/contact|about|team|leadership|management/i.test(input.sourceUrl)) score += 6;

  return Math.min(100, score);
}

function isAllowedForFetch(url: URL) {
  return !SOCIAL_HOSTS.some((host) => url.hostname.includes(host));
}

function toAbsoluteUrl(baseUrl: string, href?: string) {
  if (!href) {
    return undefined;
  }

  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return undefined;
  }
}

async function fetchHtml(url: string) {
  const parsed = new URL(url);

  if (!isAllowedForFetch(parsed)) {
    return null;
  }

  const response = await fetch(url, {
    headers: {
      "User-Agent": "SquatchFinderContactDiscovery/1.0",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) {
    return null;
  }

  return response.text();
}

function collectCandidateUrls(website: string, extraUrls: string[]) {
  const urls = new Set<string>(extraUrls.filter(Boolean));

  if (website) {
    urls.add(website);

    const root = new URL(website);
    ["/contact", "/contact-us", "/about", "/about-us", "/team", "/leadership", "/management", "/staff"].forEach(
      (path) => urls.add(new URL(path, root).toString()),
    );
  }

  return [...urls];
}

function parseCandidatesFromHtml(html: string, sourceUrl: string): Candidate[] {
  const $ = cheerio.load(html);
  const candidates: Candidate[] = [];

  $("a[href]").each((_, anchor) => {
    const href = $(anchor).attr("href") ?? "";
    const text = normalizeWhitespace($(anchor).text());
    const container = normalizeWhitespace($(anchor).closest("section, article, div, li, p, tr").text());
    const mergedText = normalizeWhitespace(`${text} ${container}`);
    const role = extractRole(mergedText);
    const name = extractName(mergedText);

    if (!role || !name) {
      return;
    }

    const hrefUrl = toAbsoluteUrl(sourceUrl, href);
    const nearestContainer = $(anchor).closest("section, article, div, li, p, tr");
    const mailtoLink = nearestContainer.find('a[href^="mailto:"]').attr("href");
    const telLink = nearestContainer.find('a[href^="tel:"]').attr("href");
    const linkedInLink = nearestContainer
      .find('a[href*="linkedin.com"]')
      .map((_, el) => $(el).attr("href"))
      .get()
      .find(Boolean);
    const facebookLink = nearestContainer
      .find('a[href*="facebook.com"]')
      .map((_, el) => $(el).attr("href"))
      .get()
      .find(Boolean);

    const email = mailtoLink?.replace(/^mailto:/i, "");
    const phone = telLink?.replace(/^tel:/i, "");
    const linkedinUrl = href.includes("linkedin.com")
      ? hrefUrl
      : toAbsoluteUrl(sourceUrl, linkedInLink);
    const facebookUrl = href.includes("facebook.com")
      ? hrefUrl
      : toAbsoluteUrl(sourceUrl, facebookLink);

    const confidenceScore = deriveConfidence({
      hasName: Boolean(name),
      hasRole: Boolean(role),
      hasEmail: Boolean(email),
      hasPhone: Boolean(phone),
      hasLinkedin: Boolean(linkedinUrl),
      hasFacebook: Boolean(facebookUrl),
      sourceUrl,
    });

    candidates.push({
      name,
      title: role,
      email,
      phone,
      linkedinUrl,
      facebookUrl,
      sourceUrl,
      confidenceScore,
      discoveryNotes: `Discovered from public page content on ${new URL(sourceUrl).hostname}.`,
    });
  });

  $("[class], [id]").each((_, element) => {
    const text = normalizeWhitespace($(element).text());
    const role = extractRole(text);
    const name = extractName(text);

    if (!role || !name) {
      return;
    }

    const nearest = $(element);
    const email =
      nearest.find('a[href^="mailto:"]').attr("href")?.replace(/^mailto:/i, "") ??
      text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
    const phone =
      nearest.find('a[href^="tel:"]').attr("href")?.replace(/^tel:/i, "") ??
      text.match(/(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/)?.[0];
    const linkedinUrl = toAbsoluteUrl(sourceUrl, nearest.find('a[href*="linkedin.com"]').attr("href"));
    const facebookUrl = toAbsoluteUrl(sourceUrl, nearest.find('a[href*="facebook.com"]').attr("href"));

    const confidenceScore = deriveConfidence({
      hasName: Boolean(name),
      hasRole: Boolean(role),
      hasEmail: Boolean(email),
      hasPhone: Boolean(phone),
      hasLinkedin: Boolean(linkedinUrl),
      hasFacebook: Boolean(facebookUrl),
      sourceUrl,
    });

    candidates.push({
      name,
      title: role,
      email,
      phone,
      linkedinUrl,
      facebookUrl,
      sourceUrl,
      confidenceScore,
      discoveryNotes: `Matched a public ${role.toLowerCase()} block on ${new URL(sourceUrl).pathname || "/"}.`,
    });
  });

  const deduped = new Map<string, Candidate>();

  for (const candidate of candidates) {
    const key = `${candidate.name.toLowerCase()}|${candidate.title.toLowerCase()}`;
    const existing = deduped.get(key);

    if (!existing || candidate.confidenceScore > existing.confidenceScore) {
      deduped.set(key, candidate);
    }
  }

  return [...deduped.values()].filter((candidate) => TARGET_ROLES.includes(candidate.title as (typeof TARGET_ROLES)[number]));
}

export async function discoverPublicBusinessContacts(input: {
  leadId: string;
  extraSourceUrls?: string[];
}) {
  const lead = await prisma.lead.findUnique({
    where: { id: input.leadId },
  });

  if (!lead) {
    throw new Error("Lead not found");
  }

  const urls = collectCandidateUrls(lead.website ?? "", input.extraSourceUrls ?? []).filter(Boolean);
  const discoveredCandidates: Candidate[] = [];

  for (const url of urls) {
    try {
      const html = await fetchHtml(url);
      if (!html) {
        continue;
      }

      discoveredCandidates.push(...parseCandidatesFromHtml(html, url));
    } catch {
      continue;
    }
  }

  const savedContacts = [];

  for (const candidate of discoveredCandidates) {
    const existing = await prisma.contact.findFirst({
      where: {
        leadId: input.leadId,
        name: candidate.name,
        title: candidate.title,
      },
    });

    const payload = {
      leadId: input.leadId,
      name: candidate.name,
      title: candidate.title,
      businessAssociation: lead.businessName,
      linkedinUrl: candidate.linkedinUrl,
      facebookUrl: candidate.facebookUrl,
      email: candidate.email,
      phone: candidate.phone,
      sourceUrl: candidate.sourceUrl,
      confidenceScore: candidate.confidenceScore,
      discoveryNotes: candidate.discoveryNotes,
      preferredChannel: candidate.email ? "Email" : candidate.phone ? "Call" : undefined,
    };

    if (existing) {
      savedContacts.push(
        await prisma.contact.update({
          where: { id: existing.id },
          data: payload,
        }),
      );
    } else {
      savedContacts.push(
        await prisma.contact.create({
          data: payload,
        }),
      );
    }
  }

  return {
    lead,
    discoveredCount: discoveredCandidates.length,
    savedCount: savedContacts.length,
    contacts: savedContacts,
  };
}
