import type { ListingStatus, Prisma } from "@prisma/client";
import type { Listing } from "@/data/store";
import { prisma } from "@/lib/db";
import { isUuid } from "@/lib/ids";
import { isBlockedLiveAnimalListing } from "@/lib/liveAnimalPolicy";
import { isAllowedListingImageUrl } from "@/lib/listingMedia";
import { sanitizeMultiline, sanitizeText } from "@/lib/security/sanitize";
import { sanitizeSearchQuery } from "@/lib/security/inputGuard";
import { listingCreateBodySchema } from "@/lib/security/schemas";
import { categoryQueryIds, findCategory } from "@/data/categories";
import type { StoredUser } from "@/lib/security/userStore";
import { deleteStoredObject, isManagedStorageKey, storageKeyFromUrl } from "@/lib/storage/media";

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
    row.deletedAt || row.status === "removed" || row.status === "expired" || row.status === "draft"
      ? "passive"
      : row.status === "active"
        ? "active"
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
    images,
    description: row.description,
    sellerId: row.sellerId,
    sellerName: row.seller.profile?.displayName || row.seller.username,
    sellerAvatar: row.seller.profile?.avatarUrl || "",
    sellerVerified: !!row.seller.profile?.verified,
    createdAt: row.createdAt.toLocaleDateString("tr-TR"),
    views: row.views,
    featured: row.featured,
    vip: row.vip,
    status,
    specs: Array.isArray(row.specs) ? (row.specs as Listing["specs"]) : [],
    features: Array.isArray(row.features) ? (row.features as string[]) : [],
    chassis: row.chassis && typeof row.chassis === "object" ? (row.chassis as Listing["chassis"]) : undefined,
    listingNo: row.listingNo,
    postedAt,
    expiresAt: row.expiresAt?.getTime(),
    urgent: row.urgent,
    refurbished: row.refurbished,
    sellerPhone: phone || undefined,
    sellerSince,
  };
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
  const rows = await prisma.listing.findMany({
    where: {
      deletedAt: null,
      OR: viewerId
        ? [{ status: "active" }, { sellerId: viewerId }]
        : [{ status: "active" }],
    },
    include: listingInclude,
    orderBy: [{ featured: "desc" }, { vip: "desc" }, { postedAt: "desc" }],
    take: 2000,
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
  status?: "active" | "passive";
  viewerId?: string;
  mine?: boolean;
  sellerId?: string;
}) {
  const and: Prisma.ListingWhereInput[] = [{ deletedAt: null }];
  if (params.sellerId) {
    if (!isUuid(params.sellerId)) return [];
    and.push({ sellerId: params.sellerId });
    and.push({ status: "active" });
  } else if (params.mine && params.viewerId) {
    and.push({ sellerId: params.viewerId });
    if (params.status) and.push({ status: uiStatus(params.status) });
  } else if (params.viewerId) {
    and.push({
      OR: [{ status: "active" }, { sellerId: params.viewerId }],
    });
  } else {
    and.push({ status: "active" });
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
    take: 2000,
  });
  return rows.map(toClientListing);
}

function parseImages(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is string => typeof x === "string" && isAllowedListingImageUrl(x.trim()))
    .slice(0, 16)
    .map((u) => u.trim().slice(0, 2000));
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
  const categoryId = sanitizeText(String(body.categoryId ?? ""), 64);
  const city = sanitizeText(String(body.city ?? ""), 40);
  const district = sanitizeText(String(body.district ?? ""), 40);
  const neighborhood = sanitizeText(String(body.neighborhood ?? ""), 40);
  const subtitle = sanitizeText(String(body.subtitle ?? ""), 160);
  const price = typeof body.price === "number" ? body.price : Number(body.price);
  if (!title || !categoryId || !city || !Number.isFinite(price) || price < 0) {
    return { error: "auth.err.required" };
  }
  const images = parseImages(body.images);
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
    price,
    images,
    specs: Array.isArray(body.specs) ? (body.specs as Listing["specs"]) : [],
    features: Array.isArray(body.features) ? body.features.map((f) => String(f).slice(0, 80)) : [],
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
  const cat = findCategory(categoryId);
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
  const category = await ensureCategoryRow(input.categoryId);
  if (!category) return { error: "auth.err.required" as const };
  const id = input.id && /^[0-9a-f-]{36}$/i.test(input.id) ? input.id : crypto.randomUUID();
  const listingNo =
    input.listingNo || `AP-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 8)}`;
  const row = await prisma.$transaction(async (tx) => {
    const created = await tx.listing.create({
      data: {
        id,
        listingNo,
        sellerId: user.id,
        categoryId: input.categoryId,
        title: input.title,
        subtitle: input.subtitle || "",
        description: input.description,
        price: input.price,
        city: input.city,
        district: input.district || "",
        neighborhood: input.neighborhood || "",
        status: "pending",
        featured: !!input.featured,
        vip: !!input.vip,
        urgent: !!input.urgent,
        refurbished: !!input.refurbished,
        specs: (input.specs ?? []) as Prisma.InputJsonValue,
        features: (input.features ?? []) as Prisma.InputJsonValue,
        chassis: input.chassis ? (input.chassis as Prisma.InputJsonValue) : undefined,
        postedAt: new Date(),
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
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
  return { listing: toClientListing(row) };
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

  if (patch.categoryId) {
    const category = await prisma.category.findUnique({ where: { id: parsed.categoryId } });
    if (!category) return { error: "auth.err.required" as const, status: 400 };
  }

  if (imagesProvided) {
    const keep = new Set(parsed.images);
    for (const img of existing.images) {
      if (!keep.has(img.url) && isManagedStorageKey(img.storageKey)) {
        await deleteStoredObject(img.storageKey, img.url);
      }
    }
  }

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
        price: parsed.price,
        status:
          existing.status === "pending" || existing.status === "rejected" || existing.status === "removed"
            ? existing.status
            : parsed.status === "passive"
              ? "passive"
              : "active",
        urgent: parsed.urgent,
        refurbished: parsed.refurbished,
        specs: (parsed.specs ?? []) as Prisma.InputJsonValue,
        features: (parsed.features ?? []) as Prisma.InputJsonValue,
        chassis: parsed.chassis ? (parsed.chassis as Prisma.InputJsonValue) : undefined,
      },
      include: listingInclude,
    });
  });
  return { listing: toClientListing(row) };
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

export async function renewListingRecord(user: StoredUser, id: string, expiresAt: number) {
  const existing = await prisma.listing.findFirst({ where: { id, deletedAt: null } });
  if (!existing) return { error: "auth.err.session" as const, status: 404 };
  if (!canMutateListing(user, existing.sellerId)) return { error: "auth.err.forbidden" as const, status: 403 };
  const row = await prisma.listing.update({
    where: { id },
    data: { status: "active", expiresAt: new Date(expiresAt), postedAt: new Date() },
    include: listingInclude,
  });
  return { listing: toClientListing(row) };
}

export async function bumpListingViews(id: string) {
  await prisma.listing.updateMany({
    where: { id, deletedAt: null, status: "active" },
    data: { views: { increment: 1 } },
  });
}
