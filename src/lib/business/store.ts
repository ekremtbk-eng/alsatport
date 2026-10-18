import "server-only";
import { Prisma, type BusinessAccount } from "@prisma/client";
import { districtsOf } from "@/data/turkey";
import { type Country, cityWhereForCountry } from "@/data/locations";
import { prisma } from "@/lib/db";
import { liveListingWhere } from "@/lib/listings/lifecycle";
import { publicLiveWithImageWhere } from "@/lib/listings/categoryCounts";
import { DEMO_SELLER_EMAIL_SUFFIX } from "@/lib/seoIndexing";
import { cleanFirmExtras, readFirmExtras, type FirmExtrasInput, type PublicFirm } from "@/lib/business/firmProfile";
import { hideSellerPhone, listingInclude, toClientListing } from "@/lib/listings/store";
import { sanitizeMultiline, sanitizeText } from "@/lib/security/sanitize";
import {
  collectBusinessReplaceBlobDeleteTargets,
  countActiveBlobReferences,
  enqueueBusinessReplaceBlobDeletes,
  markPendingBlobDeleteDone,
} from "@/lib/storage/blobDeleteQueue";
import { isOwnBusinessImage, tryDeleteStoredObject } from "@/lib/storage/media";
import type { Listing } from "@/data/store";
import {
  BUSINESS_DESC_MIN,
  isBusinessCategory,
  isKnownCity,
  isKnownDistrict,
  isValidTaxNumber,
  normalizeBusinessPhone,
  normalizeWebsite,
  readTeam,
  slugifyBusinessName,
  TEAM_LIMITS,
  type AdminBusiness,
  type BusinessStatusId,
  type CompanyType,
  type OwnerBusiness,
  type OwnerStats,
  type PublicStore,
  type TeamMember,
} from "@/lib/business/shared";

type Fail = { error: string; status: number };
const fail = (error: string, status = 400): Fail => ({ error, status });

export async function findOwnBusiness(userId: string) {
  return prisma.businessAccount.findUnique({ where: { userId } });
}

export function toOwnerView(row: BusinessAccount, stats?: OwnerStats): OwnerBusiness {
  return {
    slug: row.slug,
    status: row.status,
    name: row.name,
    contactName: row.contactName,
    companyType: row.companyType,
    taxOffice: row.taxOffice,
    taxNumber: row.taxNumber,
    categoryId: row.categoryId,
    city: row.city,
    district: row.district,
    description: row.description,
    website: row.website ?? "",
    email: row.email,
    phone: row.phone,
    logoUrl: row.logoUrl ?? "",
    coverUrl: row.coverUrl ?? "",
    rejectReason: row.rejectReason ?? "",
    submittedAt: row.submittedAt.getTime(),
    reviewedAt: row.reviewedAt?.getTime(),
    approvedAt: row.approvedAt?.getTime(),
    ...(stats ? { stats } : {}),
    extras: readFirmExtras(row),
    showContactName: row.showContactName,
    showPhone: row.showPhone,
    showEmail: row.showEmail,
    team: readTeam(row.team),
  };
}

/** Real counters only: listing rows, the stored view counter and favourites on the owner's listings. */
export async function ownerStats(userId: string): Promise<OwnerStats> {
  const now = new Date();
  const [active, expired, sold, views, favorites] = await Promise.all([
    prisma.listing.count({ where: { sellerId: userId, deletedAt: null, ...liveListingWhere(now) } }),
    prisma.listing.count({
      where: {
        sellerId: userId,
        deletedAt: null,
        OR: [{ status: "expired" }, { status: "active", expiresAt: { lte: now } }],
      },
    }),
    prisma.listing.count({ where: { sellerId: userId, deletedAt: null, status: "sold" } }),
    prisma.listing.aggregate({ where: { sellerId: userId, deletedAt: null }, _sum: { views: true } }),
    prisma.favorite.count({ where: { listing: { sellerId: userId, deletedAt: null } } }),
  ]);
  return { active, expired, sold, views: views._sum.views ?? 0, favorites };
}

async function uniqueSlug(name: string, ownId?: string) {
  const base = slugifyBusinessName(name);
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    const hit = await prisma.businessAccount.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!hit || hit.id === ownId) return candidate;
  }
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

type ApplyInput = {
  name: string;
  contactName: string;
  companyType: CompanyType;
  taxOffice: string;
  taxNumber: string;
  categoryId: string;
  city: string;
  district: string;
  description: string;
  website: string;
  email: string;
  phone: string;
  logoUrl: string;
  coverUrl: string;
};

type CleanProfile = Partial<{
  categoryId: string;
  city: string;
  district: string;
  description: string;
  website: string | null;
  email: string;
  phone: string;
  logoUrl: string;
  coverUrl: string;
}>;

/** Shared checks for every field the owner may set; returns the stored (normalised) values. */
function cleanProfileFields(userId: string, input: Partial<ApplyInput>, current?: BusinessAccount): CleanProfile | Fail {
  const out: CleanProfile = {};
  if (input.categoryId !== undefined) {
    if (!isBusinessCategory(input.categoryId)) return fail("biz.err.category");
    out.categoryId = input.categoryId;
  }
  const city = input.city !== undefined ? sanitizeText(input.city, 40) : current?.city;
  if (input.city !== undefined) {
    if (!city || !isKnownCity(city)) return fail("biz.err.city");
    out.city = city;
  }
  if (input.district !== undefined || input.city !== undefined) {
    const district = sanitizeText(input.district ?? (input.city !== undefined ? "" : current?.district ?? ""), 40);
    if (!city || !isKnownDistrict(city, district)) return fail("biz.err.district");
    out.district = district;
  }
  if (input.description !== undefined) {
    const description = sanitizeMultiline(input.description, 2000);
    if (description.length < BUSINESS_DESC_MIN) return fail("biz.err.description");
    out.description = description;
  }
  if (input.website !== undefined) {
    const website = normalizeWebsite(input.website);
    if (website === null) return fail("biz.err.website");
    out.website = website || null;
  }
  if (input.email !== undefined) out.email = input.email;
  if (input.phone !== undefined) {
    const phone = normalizeBusinessPhone(input.phone);
    if (!phone) return fail("biz.err.phone");
    out.phone = phone;
  }
  for (const key of ["logoUrl", "coverUrl"] as const) {
    const url = input[key];
    if (url === undefined) continue;
    if (url === (current?.[key] ?? "")) continue;
    if (!isOwnBusinessImage(userId, url)) return fail("biz.err.image");
    out[key] = url;
  }
  return out;
}

/** After a committed business rewrite: refcount-gate then opportunistic Blob delete. */
async function purgeReplacedBusinessImagesAfterCommit(
  userId: string,
  before: BusinessAccount | null,
  after: BusinessAccount,
) {
  const targets = collectBusinessReplaceBlobDeleteTargets({ userId, before, after });
  for (const target of targets) {
    const refs = await countActiveBlobReferences(prisma, target.storageKey).catch(() => Number.POSITIVE_INFINITY);
    if (refs > 0) continue;
    const { deleted } = await tryDeleteStoredObject(target.storageKey, target.url);
    if (!deleted) continue;
    await markPendingBlobDeleteDone(prisma, target.storageKey).catch(() => undefined);
  }
}

type TeamInput = { name: string; role?: string; photo?: string }[];

/** Names and roles are the owner's own entries; photos must be the owner's uploads of kind "team". */
function cleanTeam(userId: string, input: TeamInput): TeamMember[] | Fail {
  if (input.length > TEAM_LIMITS.members) return fail("biz.err.team");
  const out: TeamMember[] = [];
  for (const m of input) {
    const name = sanitizeText(m.name, TEAM_LIMITS.name);
    const role = sanitizeText(m.role ?? "", TEAM_LIMITS.role);
    if (name.length < 2) return fail("biz.err.team");
    const photo = m.photo?.trim() || "";
    if (photo && !isOwnBusinessImage(userId, photo, ["team"])) return fail("biz.err.image");
    out.push({ name, role, ...(photo ? { photo } : {}) });
  }
  return out;
}

/** New application, or a resubmission while pending / after rejection or revocation. Never auto-approves. */
export async function submitApplication(userId: string, input: ApplyInput): Promise<{ row: BusinessAccount } | Fail> {
  const existing = await findOwnBusiness(userId);
  if (existing?.status === "approved") return fail("biz.err.alreadyApproved", 409);
  const name = sanitizeText(input.name, 120);
  const contactName = sanitizeText(input.contactName, 80);
  const taxOffice = sanitizeText(input.taxOffice, 60);
  const taxNumber = input.taxNumber.replace(/\D/g, "");
  if (name.length < 2 || contactName.length < 3 || taxOffice.length < 2) return fail("biz.err.required");
  if (!isValidTaxNumber(taxNumber, sanitizeText(input.city ?? existing?.city ?? "", 40))) return fail("biz.err.taxNumber");
  if (!input.logoUrl || !input.coverUrl) return fail("biz.err.imagesRequired");
  const fields = cleanProfileFields(userId, input, existing ?? undefined);
  if ("error" in fields) return fields;
  const logoUrl = fields.logoUrl ?? existing?.logoUrl;
  const coverUrl = fields.coverUrl ?? existing?.coverUrl;
  if (!logoUrl || !coverUrl) return fail("biz.err.imagesRequired");

  const data = {
    status: "pending" as const,
    name,
    contactName,
    companyType: input.companyType,
    taxOffice,
    taxNumber,
    categoryId: fields.categoryId!,
    city: fields.city!,
    district: fields.district ?? "",
    description: fields.description!,
    website: fields.website ?? null,
    email: fields.email!,
    phone: fields.phone!,
    logoUrl,
    coverUrl,
    rejectReason: null,
    submittedAt: new Date(),
    reviewedAt: null,
    reviewedById: null,
  };
  // A store that was approved once keeps its public URL; otherwise the slug follows the latest name.
  const slug = existing?.approvedAt ? existing.slug : await uniqueSlug(name, existing?.id);
  const removedTargets = collectBusinessReplaceBlobDeleteTargets({
    userId,
    before: existing,
    after: { logoUrl, coverUrl, team: existing?.team },
  });
  let row: BusinessAccount;
  try {
    row = await prisma.$transaction(async (tx) => {
      await enqueueBusinessReplaceBlobDeletes(tx, userId, removedTargets);
      if (existing) {
        return tx.businessAccount.update({ where: { id: existing.id }, data: { ...data, slug } });
      }
      return tx.businessAccount.create({ data: { ...data, slug, userId } });
    });
  } catch {
    return fail("biz.err.updateFailed", 500);
  }
  await purgeReplacedBusinessImagesAfterCommit(userId, existing, row);
  return { row };
}

/** Approved owners only; the account is always the caller's own (no id is accepted from the client). */
export async function updateStoreProfile(
  userId: string,
  patch: Partial<ApplyInput> &
    FirmExtrasInput & { showContactName?: boolean; showPhone?: boolean; showEmail?: boolean; team?: TeamInput },
): Promise<{ row: BusinessAccount } | Fail> {
  const existing = await findOwnBusiness(userId);
  if (!existing) return fail("biz.err.none", 404);
  if (existing.status !== "approved") return fail("biz.err.notApproved", 409);
  const { hours, serviceDistricts, priceList, announcements, faq, showContactName, showPhone, showEmail, team, ...profile } = patch;
  const fields = cleanProfileFields(userId, profile, existing);
  if ("error" in fields) return fields;
  const cleanedTeam = team === undefined ? undefined : cleanTeam(userId, team);
  if (cleanedTeam && "error" in cleanedTeam) return cleanedTeam;
  const city = fields.city ?? existing.city;
  const current = readFirmExtras(existing);
  const extras = cleanFirmExtras(
    {
      hours,
      // A new city invalidates districts of the old one; keep only those that still exist.
      serviceDistricts:
        serviceDistricts ?? (fields.city !== undefined ? current.serviceDistricts.filter((d) => districtsOf(city).includes(d)) : undefined),
      priceList,
      announcements,
      faq,
    },
    city,
    current.announcements,
  );
  if ("error" in extras) return fail(extras.error);
  const data: Prisma.BusinessAccountUpdateInput = { ...fields };
  if (extras.hours !== undefined) data.workingHours = extras.hours ?? Prisma.DbNull;
  if (extras.serviceDistricts) data.serviceDistricts = extras.serviceDistricts;
  if (extras.priceList) data.priceList = extras.priceList;
  if (extras.announcements) data.announcements = extras.announcements;
  if (extras.faq) data.faq = extras.faq;
  if (showContactName !== undefined) data.showContactName = showContactName;
  if (showPhone !== undefined) data.showPhone = showPhone;
  if (showEmail !== undefined) data.showEmail = showEmail;
  if (cleanedTeam) data.team = cleanedTeam;
  if (!Object.keys(data).length) return { row: existing };

  const nextLogo = typeof data.logoUrl === "string" ? data.logoUrl : existing.logoUrl;
  const nextCover = typeof data.coverUrl === "string" ? data.coverUrl : existing.coverUrl;
  const nextTeam = cleanedTeam ?? existing.team;
  const removedTargets = collectBusinessReplaceBlobDeleteTargets({
    userId,
    before: existing,
    after: { logoUrl: nextLogo, coverUrl: nextCover, team: nextTeam },
  });

  let row: BusinessAccount;
  try {
    row = await prisma.$transaction(async (tx) => {
      await enqueueBusinessReplaceBlobDeletes(tx, userId, removedTargets);
      return tx.businessAccount.update({ where: { id: existing.id }, data });
    });
  } catch {
    return fail("biz.err.updateFailed", 500);
  }
  await purgeReplacedBusinessImagesAfterCommit(userId, existing, row);
  return { row };
}

const adminInclude = { user: { select: { username: true, email: true } } } as const;
type AdminRow = Prisma.BusinessAccountGetPayload<{ include: typeof adminInclude }>;

function toAdminView(row: AdminRow): AdminBusiness {
  return {
    ...toOwnerView(row),
    id: row.id,
    userId: row.userId,
    username: row.user.username,
    accountEmail: row.user.email,
    revokedAt: row.revokedAt?.getTime(),
  };
}

export async function adminListBusinesses(status: BusinessStatusId | "all") {
  const rows = await prisma.businessAccount.findMany({
    where: status === "all" ? {} : { status },
    include: adminInclude,
    orderBy: { submittedAt: "desc" },
    take: 200,
  });
  return rows.map(toAdminView);
}

export async function adminCountPending() {
  return prisma.businessAccount.count({ where: { status: "pending" } });
}

/**
 * The only path that grants or removes the verified-business status. Approval mirrors the firm name
 * into the profile so listings show it; revocation clears both.
 */
export async function adminBusinessAction(
  adminId: string,
  id: string,
  action: "approve" | "reject" | "revoke",
  rawReason: string,
): Promise<{ row: BusinessAccount; previous: BusinessStatusId } | Fail> {
  const row = await prisma.businessAccount.findUnique({ where: { id } });
  if (!row) return fail("biz.err.none", 404);
  if (row.userId === adminId) return fail("auth.err.forbidden", 403);
  const reason = sanitizeText(rawReason, 500);
  const now = new Date();
  const reviewed = { reviewedAt: now, reviewedById: adminId };

  if (action === "approve") {
    if (row.status !== "pending") return fail("biz.err.state", 409);
    const owner = await prisma.user.findUnique({ where: { id: row.userId }, select: { bannedAt: true } });
    if (!owner || owner.bannedAt) return fail("biz.err.state", 409);
    const [updated] = await prisma.$transaction([
      prisma.businessAccount.update({
        where: { id },
        data: { ...reviewed, status: "approved", approvedAt: now, revokedAt: null, rejectReason: null },
      }),
      prisma.profile.updateMany({ where: { userId: row.userId }, data: { businessName: row.name, businessVerifiedAt: now } }),
    ]);
    return { row: updated, previous: row.status };
  }

  if (action === "reject") {
    if (row.status !== "pending") return fail("biz.err.state", 409);
    if (reason.length < 3) return fail("biz.err.reason");
    const updated = await prisma.businessAccount.update({
      where: { id },
      data: { ...reviewed, status: "rejected", rejectReason: reason },
    });
    return { row: updated, previous: row.status };
  }

  if (row.status !== "approved") return fail("biz.err.state", 409);
  const [updated] = await prisma.$transaction([
    prisma.businessAccount.update({
      where: { id },
      data: { ...reviewed, status: "revoked", revokedAt: now, rejectReason: reason || null },
    }),
    prisma.profile.updateMany({ where: { userId: row.userId }, data: { businessName: null, businessVerifiedAt: null } }),
  ]);
  return { row: updated, previous: row.status };
}

/** Keeps the store in sync when an admin clears the legacy "verified business name" on the user. */
export async function revokeStoreForUser(adminId: string, userId: string) {
  await prisma.businessAccount.updateMany({
    where: { userId, status: "approved" },
    data: { status: "revoked", revokedAt: new Date(), reviewedAt: new Date(), reviewedById: adminId },
  });
}

const publicStoreWhere = (slug: string): Prisma.BusinessAccountWhereInput => ({
  slug,
  status: "approved",
  user: { bannedAt: null },
});

async function storeCounts(userIds: string[]) {
  if (!userIds.length) return { active: new Map<string, number>(), sold: new Map<string, number>() };
  const [active, sold] = await Promise.all([
    prisma.listing.groupBy({
      by: ["sellerId"],
      where: { sellerId: { in: userIds }, deletedAt: null, ...publicLiveWithImageWhere() },
      _count: { _all: true },
    }),
    prisma.listing.groupBy({
      by: ["sellerId"],
      where: { sellerId: { in: userIds }, deletedAt: null, status: "sold" },
      _count: { _all: true },
    }),
  ]);
  return {
    active: new Map(active.map((r) => [r.sellerId, r._count._all])),
    sold: new Map(sold.map((r) => [r.sellerId, r._count._all])),
  };
}

function toPublicStore(
  row: BusinessAccount & { user: { createdAt: Date } },
  counts: { active: Map<string, number>; sold: Map<string, number> },
): PublicStore {
  return {
    slug: row.slug,
    name: row.name,
    categoryId: row.categoryId,
    city: row.city,
    district: row.district,
    description: row.description,
    ...(row.website ? { website: row.website } : {}),
    ...(row.logoUrl ? { logoUrl: row.logoUrl } : {}),
    ...(row.coverUrl ? { coverUrl: row.coverUrl } : {}),
    approvedAt: (row.approvedAt ?? row.updatedAt).getTime(),
    memberSince: row.user.createdAt.getTime(),
    activeCount: counts.active.get(row.userId) ?? 0,
    soldCount: counts.sold.get(row.userId) ?? 0,
  };
}

export async function findPublicStore(slug: string): Promise<{
  store: PublicStore;
  sellerId: string;
  active: Listing[];
  sold: Listing[];
  updatedAt: Date;
} | null> {
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return null;
  const row = await prisma.businessAccount.findFirst({
    where: publicStoreWhere(slug),
    include: { user: { select: { createdAt: true } } },
  });
  if (!row) return null;
  const [counts, activeRows, soldRows] = await Promise.all([
    storeCounts([row.userId]),
    prisma.listing.findMany({
      where: { sellerId: row.userId, deletedAt: null, ...publicLiveWithImageWhere() },
      include: listingInclude,
      orderBy: [{ featured: "desc" }, { postedAt: "desc" }],
      take: 300,
    }),
    prisma.listing.findMany({
      where: { sellerId: row.userId, deletedAt: null, status: "sold" },
      include: listingInclude,
      orderBy: { soldAt: "desc" },
      take: 60,
    }),
  ]);
  const { hours, serviceDistricts } = readFirmExtras(row);
  return {
    store: {
      ...toPublicStore(row, counts),
      hours,
      serviceDistricts,
      team: readTeam(row.team),
      ...(row.showContactName ? { contactName: row.contactName } : {}),
      reveal: { phone: row.showPhone, email: row.showEmail },
    },
    sellerId: row.userId,
    active: activeRows.map((r) => hideSellerPhone(toClientListing(r))),
    sold: soldRows.map((r) => hideSellerPhone(toClientListing(r))),
    updatedAt: row.updatedAt,
  };
}

/**
 * Private contact details of a public store, limited to what the owner allows; callers must already require
 * a signed-in member. Fields the owner hid are never selected into the response.
 */
export async function findStoreContact(slug: string) {
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return null;
  const row = await prisma.businessAccount.findFirst({
    where: publicStoreWhere(slug),
    select: { email: true, phone: true, showPhone: true, showEmail: true },
  });
  if (!row) return null;
  return { phone: row.showPhone ? row.phone : "", email: row.showEmail ? row.email : "" };
}

/** Owner-entered service profile shown on the seller's service pages; null unless the store is public. */
export async function findPublicFirmBySeller(sellerId: string): Promise<PublicFirm | null> {
  if (!/^[0-9a-f-]{36}$/i.test(sellerId)) return null;
  const row = await prisma.businessAccount.findFirst({
    where: { userId: sellerId, status: "approved", user: { bannedAt: null } },
  });
  if (!row) return null;
  return {
    slug: row.slug,
    name: row.name,
    description: row.description,
    ...(row.website ? { website: row.website } : {}),
    ...readFirmExtras(row),
  };
}

export async function listPublicStores(filters: { categoryId?: string; city?: string; district?: string; country?: Country }) {
  const where: Prisma.BusinessAccountWhereInput = { status: "approved", user: { bannedAt: null } };
  if (filters.categoryId) where.categoryId = filters.categoryId;
  const countryCity = cityWhereForCountry(filters.country);
  if (countryCity && !filters.city) where.city = countryCity;
  if (filters.city) where.city = filters.city;
  if (filters.city && filters.district) where.district = filters.district;
  const rows = await prisma.businessAccount.findMany({
    where,
    include: { user: { select: { createdAt: true } } },
    orderBy: [{ approvedAt: "desc" }],
    take: 300,
  });
  const counts = await storeCounts(rows.map((r) => r.userId));
  return rows.map((r) => toPublicStore(r, counts));
}

/** Admin-approved businesses whose owner is not banned; seeded demo accounts never count. */
export function verifiedBusinessWhere(): Prisma.BusinessAccountWhereInput {
  return {
    status: "approved",
    user: { bannedAt: null, NOT: { email: { endsWith: DEMO_SELLER_EMAIL_SUFFIX, mode: "insensitive" } } },
  };
}

const VERIFIED_COUNT_TTL_MS = 5 * 60_000;
let verifiedCount: { n: number; at: number } | null = null;

export async function countVerifiedBusinesses(): Promise<number> {
  if (verifiedCount && Date.now() - verifiedCount.at < VERIFIED_COUNT_TTL_MS) return verifiedCount.n;
  const n = await prisma.businessAccount.count({ where: verifiedBusinessWhere() });
  verifiedCount = { n, at: Date.now() };
  return n;
}

export async function storeSitemapRows() {
  return prisma.businessAccount.findMany({
    where: { status: "approved", user: { bannedAt: null } },
    select: { slug: true, updatedAt: true },
    take: 5000,
  });
}
