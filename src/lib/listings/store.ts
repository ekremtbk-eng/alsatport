import type { ListingStatus, Prisma } from "@prisma/client";
import type { Listing } from "@/data/store";
import { prisma } from "@/lib/db";
import { isUuid } from "@/lib/ids";
import { isAllowedListingImageUrl } from "@/lib/listingMedia";
import { sanitizeMultiline, sanitizeText } from "@/lib/security/sanitize";
import { sanitizeSearchQuery } from "@/lib/security/inputGuard";
import { listingCreateBodySchema } from "@/lib/security/schemas";
import { isBannedLiveAnimalCategory, isBannedLiveAnimalSlug, isBlockedLiveAnimalListing } from "@/lib/liveAnimalPolicy";
import { categoryQueryIds, lookupCategory } from "@/data/categories";
import { postedFilterHours } from "@/lib/listingQuery";
import type { StoredUser } from "@/lib/security/userStore";
import { deleteStoredObject, isManagedStorageKey, storageKeyFromUrl } from "@/lib/storage/media";
import { resolveListingCoords, validListingCoords } from "@/lib/placeGeo";
import { publicAccountName, verifiedBusinessName } from "@/lib/publicName";
import { type ListingRef, isLiveRow, liveListingWhere, newPeriod } from "@/lib/listings/lifecycle";

export type ListingWithRelations = Prisma.ListingGetPayload<{
  include: {
    images: true;
    seller: { include: { profile: true } };
  };
}>;

const listingInclude = {
  images: { orderBy: [{ isCover: "desc" as const }, { sortOrder: "asc" as const }] },
  seller: { include: { profile: true as const } },
};

export function toClientListing(row: ListingWithRelations): Listing {
  const images = [...row.images]
    .sort((a, b) => Number(b.isCover) - Number(a.isCover) || a.sortOrder - b.sortOrder)
    .map((i) => i.url);
  const status: Listing["status"] =
    row.deletedAt || row.status === "removed" || row.status === "draft"
      ? "passive"
      : row.status === "expired" || (row.status === "active" && !isLiveRow(row))
        ? "expired"
        : row.status === "active"
          ? "active"
          : row.status === "sold"
            ? "sold"
            : row.status === "pending"
              ? "pending"
              : row.status === "rejected"
                ? "rejected"
                : "passive";
  const postedAt = (row.postedAt ?? row.createdAt).getTime();
  const phone =
    row.seller.profile?.phoneVerifiedAt && row.seller.profile.phone ? row.seller.profile.phone : "";
  const sellerSince = row.seller.createdAt.toLocaleDateString("tr-TR", {
    month: "long",
    year: "numeric",
  });
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    price: Number(row.price),
    categoryId: row.categoryId,
    city: row.city,
    district: row.district,
    neighborhood: row.neighborhood || undefined,
    lat: row.lat ?? undefined,
    lng: row.lng ?? undefined,
    images,
    description: row.description,
    sellerId: row.sellerId,
    sellerName: publicAccountName({ ...row.seller.profile, username: row.seller.username }),
    sellerBusiness: !!verifiedBusinessName(row.seller.profile),
    sellerAvatar: row.seller.profile?.avatarUrl || "",
    sellerVerified: !!row.seller.profile?.verified,
    createdAt: row.createdAt.toLocaleDateString("tr-TR"),
    views: row.views,
    featured: row.featured,
    vip: row.vip,
    status,
    specs: Array.isArray(row.specs) ? (row.specs as Listing["specs"]).filter(validSpec) : [],
    features: Array.isArray(row.features) ? (row.features as string[]) : [],
    chassis: row.chassis && typeof row.chassis === "object" ? (row.chassis as Listing["chassis"]) : undefined,
    listingNo: row.listingNo,
    postedAt,
    expiresAt: row.expiresAt?.getTime(),
    soldAt: row.soldAt?.getTime(),
    urgent: row.urgent,
    refurbished: row.refurbished,
    sellerPhone: phone || undefined,
    sellerSince,
  };
}

/** Listing payloads only carry a masked hint; the full number comes from POST /api/listings/[id]/phone. */
export function hideSellerPhone(listing: Listing): Listing {
  if (!listing.sellerPhone) return listing;
  const d = listing.sellerPhone.replace(/\D/g, "");
  return { ...listing, sellerPhone: d.length >= 6 ? `${d.slice(0, 4)} *** ** ${d.slice(-2)}` : "*** ** **" };
}

function validSpec(spec: { label?: string; value?: string } | null | undefined) {
  return !!spec?.label && !!spec.value && !/\bNaN\b/.test(spec.value);
}

function uiStatus(value: ListingStatus | "active" | "passive"): ListingStatus {
  if (value === "passive") return "passive";
  if (value === "active") return "active";
  return value;
}

export function canMutateListing(user: StoredUser, sellerId: string) {
  return user.role === "admin" || user.id === sellerId;
}

export async function findListingRecord(id: string) {
  return prisma.listing.findFirst({
    where: { id, deletedAt: null },
    include: listingInclude,
  });
}

export async function listPublicAndOwnedListings(viewerId?: string) {
  const live = liveListingWhere();
  const rows = await prisma.listing.findMany({
    where: {
      deletedAt: null,
      OR: viewerId ? [live, { sellerId: viewerId }] : [live],
    },
    include: listingInclude,
    orderBy: [{ featured: "desc" }, { vip: "desc" }, { postedAt: "desc" }],
    take: 12000,
  });
  return rows.map(toClientListing);
}

export async function queryListings(params: {
  q?: string;
  categoryId?: string;
  city?: string;
  district?: string;
  priceMin?: number;
  priceMax?: number;
  posted?: string;
  status?: "active" | "passive";
  viewerId?: string;
  mine?: boolean;
  sellerId?: string;
}) {
  const and: Prisma.ListingWhereInput[] = [{ deletedAt: null }];
  const live = liveListingWhere();
  if (params.sellerId) {
    if (!isUuid(params.sellerId)) return [];
    and.push({ sellerId: params.sellerId });
    and.push(live);
  } else if (params.mine && params.viewerId) {
    and.push({ sellerId: params.viewerId });
    if (params.status) and.push({ status: uiStatus(params.status) });
  } else if (params.viewerId) {
    and.push({
      OR: [live, { sellerId: params.viewerId }],
    });
  } else {
    and.push(live);
  }
  if (params.categoryId) {
    const ids = categoryQueryIds(params.categoryId);
    if (ids.length) {
      and.push({ categoryId: { in: ids } });
    }
  }
  if (params.city) {
    const city = sanitizeText(params.city, 40);
    if (city) and.push({ city: { equals: city, mode: "insensitive" } });
  }
  if (params.district) {
    const district = sanitizeText(params.district, 40);
    if (district) and.push({ district: { equals: district, mode: "insensitive" } });
  }
  if (params.priceMin != null && Number.isFinite(params.priceMin)) and.push({ price: { gte: params.priceMin } });
  if (params.priceMax != null && Number.isFinite(params.priceMax)) and.push({ price: { lte: params.priceMax } });
  const postedHours = postedFilterHours(params.posted);
  if (postedHours > 0) {
    const since = new Date(Date.now() - postedHours * 3_600_000);
    and.push({
      OR: [{ postedAt: { gte: since } }, { AND: [{ postedAt: null }, { createdAt: { gte: since } }] }],
    });
  }
  const q = sanitizeSearchQuery(params.q);
  if (q) {
    and.push({
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { subtitle: { contains: q, mode: "insensitive" } },
        { city: { contains: q, mode: "insensitive" } },
      ],
    });
  }

  const rows = await prisma.listing.findMany({
    where: { AND: and },
    include: listingInclude,
    orderBy: [{ featured: "desc" }, { postedAt: "desc" }],
    take: 12000,
  });
  return rows.map(toClientListing);
}

export async function suggestPublicListings(rawQuery: string, take = 8) {
  const q = sanitizeSearchQuery(rawQuery);
  if (q.length < 2) return [];
  const rows = await prisma.listing.findMany({
    where: {
      deletedAt: null,
      AND: [
        liveListingWhere(),
        {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { subtitle: { contains: q, mode: "insensitive" } },
          ],
        },
      ],
    },
    select: { id: true, title: true, categoryId: true, city: true },
    orderBy: [{ featured: "desc" }, { postedAt: "desc" }],
    take,
  });
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    categoryId: row.categoryId,
    city: row.city,
  }));
}

function parseImages(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is string => typeof x === "string" && isAllowedListingImageUrl(x.trim()))
    .slice(0, 16)
    .map((u) => u.trim().slice(0, 2000));
}

/**
 * New listing photos must come from /api/uploads (re-encoded, metadata stripped) and belong to
 * the seller; URLs already attached to the listing are kept so older listings stay editable.
 */
function ownedImages(urls: string[], sellerId: string, existing: string[] = []) {
  const prior = new Set(existing);
  return urls.filter((url) => prior.has(url) || storageKeyFromUrl(url).startsWith(`listings/${sellerId}/`));
}

export type ListingInput = {
  id?: string;
  title: string;
  subtitle?: string;
  description: string;
  categoryId: string;
  city: string;
  district?: string;
  neighborhood?: string;
  /** undefined = not sent; null = sent but rejected */
  coords?: { lat: number; lng: number } | null;
  price: number;
  images: string[];
  specs?: Listing["specs"];
  features?: string[];
  chassis?: Listing["chassis"];
  urgent?: boolean;
  refurbished?: boolean;
  listingNo?: string;
  expiresAt?: number;
  featured?: boolean;
  vip?: boolean;
  status?: Listing["status"];
};

export function parseListingInput(body: Record<string, unknown> | null): ListingInput | { error: string } {
  if (!body) return { error: "auth.err.required" };
  const checked = listingCreateBodySchema.safeParse(body);
  if (!checked.success) return { error: "auth.err.required" };
  const title = sanitizeText(String(body.title ?? ""), 120);
  const description = sanitizeMultiline(String(body.description ?? ""), 8000);
  const rawCategoryId = sanitizeText(String(body.categoryId ?? ""), 64);
  if (isBannedLiveAnimalCategory(rawCategoryId) || isBannedLiveAnimalSlug(rawCategoryId)) {
    return { error: "mod.animal.cat" };
  }
  const resolvedCat = lookupCategory(rawCategoryId);
  if (!resolvedCat || resolvedCat.filter) return { error: "auth.err.required" };
  const categoryId = resolvedCat.id;
  const city = sanitizeText(String(body.city ?? ""), 40);
  const district = sanitizeText(String(body.district ?? ""), 40);
  const neighborhood = sanitizeText(String(body.neighborhood ?? ""), 40);
  const subtitle = sanitizeText(String(body.subtitle ?? ""), 160);
  const price = typeof body.price === "number" ? body.price : Number(body.price);
  if (!title || !categoryId || !city || !Number.isFinite(price) || price < 0) {
    return { error: "auth.err.required" };
  }
  const images = parseImages(body.images);
  if (!images.length) return { error: "photo.minN" };
  const draft = {
    title,
    description,
    categoryId,
    images,
    subtitle,
  };
  if (isBlockedLiveAnimalListing(draft)) return { error: "mod.animal" };
  return {
    id: typeof body.id === "string" ? sanitizeText(body.id, 80) : undefined,
    title,
    subtitle,
    description,
    categoryId,
    city,
    district,
    neighborhood,
    coords: body.lat == null && body.lng == null ? undefined : validListingCoords(body.lat, body.lng, city),
    price,
    images,
    specs: Array.isArray(body.specs)
      ? (body.specs as Listing["specs"]).slice(0, 48).map((s) => ({
          label: sanitizeText(String(s?.label ?? ""), 80),
          value: sanitizeText(String(s?.value ?? ""), 120),
        })).filter(validSpec)
      : [],
    features: Array.isArray(body.features)
      ? body.features.map((f) => sanitizeText(String(f), 80)).filter(Boolean)
      : [],
    chassis: body.chassis && typeof body.chassis === "object" ? (body.chassis as Listing["chassis"]) : undefined,
    urgent: body.urgent === true,
    refurbished: body.refurbished === true,
    listingNo: typeof body.listingNo === "string" ? sanitizeText(body.listingNo, 20) : undefined,
    expiresAt: typeof body.expiresAt === "number" ? body.expiresAt : undefined,
    featured: body.featured === true,
    vip: body.vip === true,
    status: body.status === "passive" ? "passive" : "active",
  };
}

function imageRows(listingId: string, urls: string[]) {
  return urls.map((url, i) => ({
    listingId,
    storageKey: storageKeyFromUrl(url),
    url,
    sortOrder: i,
    isCover: i === 0,
  }));
}

function nestedImages(urls: string[]) {
  return urls.map((url, i) => ({
    storageKey: storageKeyFromUrl(url),
    url,
    sortOrder: i,
    isCover: i === 0,
  }));
}

async function ensureCategoryRow(categoryId: string) {
  const existing = await prisma.category.findUnique({ where: { id: categoryId } });
  if (existing) return existing;
  const cat = lookupCategory(categoryId);
  if (!cat) return null;
  if (cat.parentId) {
    const parent = await ensureCategoryRow(cat.parentId);
    if (!parent) return null;
  }
  try {
    return await prisma.category.create({
      data: {
        id: cat.id,
        parentId: cat.parentId ?? null,
        slug: cat.slug,
        name: cat.name,
        icon: cat.icon || null,
        aliases: cat.aliases ?? [],
        brands: cat.brands ?? [],
      },
    });
  } catch {
    return prisma.category.findUnique({ where: { id: categoryId } });
  }
}

export async function createListing(user: StoredUser, input: ListingInput) {
  input.images = ownedImages(input.images, user.id);
  if (!input.images.length) return { error: "photo.minN" as const };
  const category = await ensureCategoryRow(input.categoryId);
  if (!category) return { error: "auth.err.required" as const };
  const id = input.id && /^[0-9a-f-]{36}$/i.test(input.id) ? input.id : crypto.randomUUID();
  const listingNo =
    input.listingNo || `AP-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 8)}`;
  const period = newPeriod();
  const row = await prisma.$transaction(async (tx) => {
    const created = await tx.listing.create({
      data: {
        id,
        listingNo,
        sellerId: user.id,
        categoryId: category.id,
        title: input.title,
        subtitle: input.subtitle || "",
        description: input.description,
        price: input.price,
        city: input.city,
        district: input.district || "",
        neighborhood: input.neighborhood || "",
        lat: input.coords?.lat ?? null,
        lng: input.coords?.lng ?? null,
        status: "active",
        featured: !!input.featured,
        vip: !!input.vip,
        urgent: !!input.urgent,
        refurbished: !!input.refurbished,
        specs: (input.specs ?? []) as Prisma.InputJsonValue,
        features: (input.features ?? []) as Prisma.InputJsonValue,
        chassis: input.chassis ? (input.chassis as Prisma.InputJsonValue) : undefined,
        ...period,
        images: { create: nestedImages(input.images) },
      },
      include: listingInclude,
    });
    await tx.profile.update({
      where: { userId: user.id },
      data: { listingsPosted: { increment: 1 } },
    });
    return created;
  });
  return { listing: toClientListing(row), ref: listingRef(row) };
}

function listingRef(row: { id: string; title: string; sellerId: string; expiresAt: Date | null }): ListingRef {
  return { id: row.id, title: row.title, sellerId: row.sellerId, expiresAt: row.expiresAt };
}

export async function updateListingRecord(user: StoredUser, id: string, patch: Record<string, unknown>) {
  const existing = await prisma.listing.findFirst({
    where: { id, deletedAt: null },
    include: { images: { orderBy: { sortOrder: "asc" } } },
  });
  if (!existing) return { error: "auth.err.session" as const, status: 404 };
  if (!canMutateListing(user, existing.sellerId)) return { error: "auth.err.forbidden" as const, status: 403 };

  const imagesProvided = Array.isArray(patch.images);
  const parsed = parseListingInput({
    title: patch.title ?? existing.title,
    description: patch.description ?? existing.description,
    categoryId: patch.categoryId ?? existing.categoryId,
    city: patch.city ?? existing.city,
    district: patch.district ?? existing.district,
    neighborhood: patch.neighborhood ?? existing.neighborhood,
    lat: patch.lat,
    lng: patch.lng,
    price: patch.price ?? Number(existing.price),
    subtitle: patch.subtitle ?? existing.subtitle,
    images: imagesProvided ? patch.images : existing.images.map((i) => i.url),
    specs: patch.specs ?? existing.specs,
    features: patch.features ?? existing.features,
    chassis: patch.chassis ?? existing.chassis,
    urgent: patch.urgent ?? existing.urgent,
    refurbished: patch.refurbished ?? existing.refurbished,
    status: patch.status ?? (existing.status === "active" ? "active" : "passive"),
  });
  if ("error" in parsed) return { error: parsed.error, status: 400 };
  if (imagesProvided) {
    parsed.images = ownedImages(parsed.images, existing.sellerId, existing.images.map((i) => i.url));
    if (!parsed.images.length) return { error: "photo.minN" as const, status: 400 };
  }

  const category = await ensureCategoryRow(parsed.categoryId);
  if (!category) return { error: "auth.err.required" as const, status: 400 };

  const locationChanged =
    parsed.city !== existing.city ||
    (parsed.district || "") !== existing.district ||
    (parsed.neighborhood || "") !== existing.neighborhood;
  const coordsData =
    parsed.coords !== undefined
      ? { lat: parsed.coords?.lat ?? null, lng: parsed.coords?.lng ?? null }
      : locationChanged
        ? { lat: null, lng: null }
        : {};

  if (imagesProvided) {
    const keep = new Set(parsed.images);
    for (const img of existing.images) {
      if (!keep.has(img.url) && isManagedStorageKey(img.storageKey)) {
        await deleteStoredObject(img.storageKey, img.url);
      }
    }
  }

  // Expired, sold and moderation states only change through their own flows (renew / resale / admin).
  const nextStatus: ListingStatus =
    existing.status !== "active" && existing.status !== "passive"
      ? existing.status
      : parsed.status === "passive"
        ? "passive"
        : "active";
  const reactivated =
    existing.status === "passive" &&
    nextStatus === "active" &&
    (!existing.expiresAt || existing.expiresAt.getTime() <= Date.now());
  const contentChanged = Object.keys(patch).some((k) => k !== "status");

  const row = await prisma.$transaction(async (tx) => {
    if (imagesProvided) {
      await tx.listingImage.deleteMany({ where: { listingId: id } });
      if (parsed.images.length) {
        await tx.listingImage.createMany({ data: imageRows(id, parsed.images) });
      }
    }
    return tx.listing.update({
      where: { id },
      data: {
        title: parsed.title,
        subtitle: parsed.subtitle || "",
        description: parsed.description,
        categoryId: parsed.categoryId,
        city: parsed.city,
        district: parsed.district || "",
        neighborhood: parsed.neighborhood || "",
        ...coordsData,
        price: parsed.price,
        status: nextStatus,
        ...(reactivated ? newPeriod() : {}),
        urgent: parsed.urgent,
        refurbished: parsed.refurbished,
        specs: (parsed.specs ?? []) as Prisma.InputJsonValue,
        features: (parsed.features ?? []) as Prisma.InputJsonValue,
        chassis: parsed.chassis ? (parsed.chassis as Prisma.InputJsonValue) : undefined,
      },
      include: listingInclude,
    });
  });
  return { listing: toClientListing(row), ref: listingRef(row), contentChanged, reactivated };
}

/** Server-side safety net for a listing that was just saved without coordinates. */
export async function fillMissingListingCoords(id: string) {
  const row = await prisma.listing.findFirst({
    where: { id, deletedAt: null },
    select: { lat: true, lng: true, city: true, district: true, neighborhood: true },
  });
  if (!row || (row.lat != null && row.lng != null)) return;
  const point = await resolveListingCoords({ city: row.city, district: row.district, neighborhood: row.neighborhood });
  const coords = point ? validListingCoords(point.lat, point.lng, row.city) : null;
  if (!coords) return;
  await prisma.listing.updateMany({
    where: { id, lat: null, city: row.city, district: row.district, neighborhood: row.neighborhood },
    data: coords,
  });
}

export async function deleteListingRecord(user: StoredUser, id: string) {
  const existing = await prisma.listing.findFirst({ where: { id, deletedAt: null } });
  if (!existing) return { error: "auth.err.session" as const, status: 404 };
  if (!canMutateListing(user, existing.sellerId)) return { error: "auth.err.forbidden" as const, status: 403 };
  await prisma.listing.update({
    where: { id },
    data: { deletedAt: new Date(), status: "removed" },
  });
  return { ok: true as const };
}

/**
 * Free republish of a listing whose period ended (or that the seller paused). A live listing cannot be
 * extended early, so republishing never doubles as a free "bump to top". Moderation outcomes
 * (pending/rejected/removed), drafts and sold listings use their own flows.
 */
export async function renewListingRecord(user: StoredUser, id: string) {
  const existing = await prisma.listing.findFirst({ where: { id, deletedAt: null } });
  if (!existing) return { error: "auth.err.session" as const, status: 404 };
  if (!canMutateListing(user, existing.sellerId)) return { error: "auth.err.forbidden" as const, status: 403 };
  if (existing.status !== "active" && existing.status !== "passive" && existing.status !== "expired") {
    return { error: "auth.err.forbidden" as const, status: 403 };
  }
  if (isLiveRow(existing)) return { error: "listing.err.notRenewable" as const, status: 409 };
  const moved = await prisma.listing.updateMany({
    where: { id, status: existing.status, deletedAt: null },
    data: { status: "active", soldAt: null, ...newPeriod() },
  });
  if (!moved.count) return { error: "listing.err.notRenewable" as const, status: 409 };
  const row = await prisma.listing.findUniqueOrThrow({ where: { id }, include: listingInclude });
  return { listing: toClientListing(row), ref: listingRef(row) };
}

/** Sold listings leave every public list and are ignored by the expiry sweep. */
export async function markListingSold(user: StoredUser, id: string) {
  const existing = await prisma.listing.findFirst({ where: { id, deletedAt: null } });
  if (!existing) return { error: "auth.err.session" as const, status: 404 };
  if (!canMutateListing(user, existing.sellerId)) return { error: "auth.err.forbidden" as const, status: 403 };
  if (!["active", "passive", "expired"].includes(existing.status)) {
    return { error: "listing.err.notSellable" as const, status: 409 };
  }
  const wasLive = isLiveRow(existing);
  const moved = await prisma.listing.updateMany({
    where: { id, status: existing.status, deletedAt: null },
    data: { status: "sold", soldAt: new Date() },
  });
  if (!moved.count) return { error: "listing.err.notSellable" as const, status: 409 };
  const row = await prisma.listing.findUniqueOrThrow({ where: { id }, include: listingInclude });
  return { listing: toClientListing(row), ref: listingRef(existing), wasLive };
}

/** Puts a sold listing back on sale with a fresh 15-day period. */
export async function resaleListingRecord(user: StoredUser, id: string) {
  const existing = await prisma.listing.findFirst({ where: { id, deletedAt: null } });
  if (!existing) return { error: "auth.err.session" as const, status: 404 };
  if (!canMutateListing(user, existing.sellerId)) return { error: "auth.err.forbidden" as const, status: 403 };
  if (existing.status !== "sold") return { error: "listing.err.notSold" as const, status: 409 };
  const moved = await prisma.listing.updateMany({
    where: { id, status: "sold", deletedAt: null },
    data: { status: "active", soldAt: null, ...newPeriod() },
  });
  if (!moved.count) return { error: "listing.err.notSold" as const, status: 409 };
  const row = await prisma.listing.findUniqueOrThrow({ where: { id }, include: listingInclude });
  return { listing: toClientListing(row), ref: listingRef(row) };
}

export async function bumpListingViews(id: string) {
  await prisma.listing.updateMany({
    where: { id, deletedAt: null, ...liveListingWhere() },
    data: { views: { increment: 1 } },
  });
}
