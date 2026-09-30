import "server-only";
import type { NotifPrefs, SavedSearch } from "@/lib/notify";
import { DEFAULT_NOTIF_PREFS } from "@/lib/notify";
import { prisma } from "@/lib/db";
import { isUuid } from "@/lib/ids";
import { sanitizeText } from "@/lib/security/sanitize";

function parseSeenIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string").slice(0, 400);
}

function toClient(row: {
  id: string;
  query: string;
  city: string | null;
  filter: string | null;
  seenIds: unknown;
  createdAt: Date;
}): SavedSearch {
  return {
    id: row.id,
    query: row.query,
    city: row.city || undefined,
    filter: row.filter || undefined,
    createdAt: row.createdAt.getTime(),
    seenIds: parseSeenIds(row.seenIds),
  };
}

export function prefsFromProfile(p: {
  notifPriceDrop: boolean;
  notifSavedSearch: boolean;
  notifNearby: boolean;
}): NotifPrefs {
  return {
    priceDrop: p.notifPriceDrop,
    savedSearch: p.notifSavedSearch,
    nearby: p.notifNearby,
  };
}

export async function loadUserAlertSettings(userId: string) {
  const [profile, searches] = await Promise.all([
    prisma.profile.findUnique({
      where: { userId },
      select: { notifPriceDrop: true, notifSavedSearch: true, notifNearby: true },
    }),
    prisma.savedSearch.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
  ]);
  return {
    notifPrefs: profile ? prefsFromProfile(profile) : DEFAULT_NOTIF_PREFS,
    savedSearches: searches.map(toClient),
  };
}

export async function updateNotifPrefs(userId: string, patch: Partial<NotifPrefs>) {
  const data: {
    notifPriceDrop?: boolean;
    notifSavedSearch?: boolean;
    notifNearby?: boolean;
  } = {};
  if (typeof patch.priceDrop === "boolean") data.notifPriceDrop = patch.priceDrop;
  if (typeof patch.savedSearch === "boolean") data.notifSavedSearch = patch.savedSearch;
  if (typeof patch.nearby === "boolean") data.notifNearby = patch.nearby;
  if (!Object.keys(data).length) {
    return loadUserAlertSettings(userId);
  }
  await prisma.profile.updateMany({ where: { userId }, data });
  return loadUserAlertSettings(userId);
}

export async function createSavedSearch(
  userId: string,
  input: { query?: string; city?: string; filter?: string; seenIds?: string[] },
) {
  const query = sanitizeText(input.query, 120);
  const city = sanitizeText(input.city, 40) || null;
  const filterRaw = sanitizeText(input.filter, 20);
  const filter = filterRaw === "urgent" || filterRaw === "h48" ? filterRaw : null;
  if (!query && !city && !filter) return { error: "auth.err.required" as const, status: 400 };

  const existing = await prisma.savedSearch.findMany({ where: { userId }, take: 50 });
  const dup = existing.find(
    (s) =>
      s.query === query &&
      (s.city || "") === (city || "") &&
      (s.filter || "") === (filter || ""),
  );
  if (dup) return { ok: true as const, search: toClient(dup), duplicate: true };

  if (existing.length >= 30) return { error: "auth.err.rateLimit" as const, status: 429 };

  const row = await prisma.savedSearch.create({
    data: {
      userId,
      query,
      city,
      filter,
      seenIds: parseSeenIds(input.seenIds),
    },
  });
  return { ok: true as const, search: toClient(row), duplicate: false };
}

export async function deleteSavedSearch(userId: string, id: string) {
  if (!isUuid(id)) return { error: "auth.err.required" as const, status: 400 };
  await prisma.savedSearch.deleteMany({ where: { id, userId } });
  return { ok: true as const };
}
