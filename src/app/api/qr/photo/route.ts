import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAllowedListingImageUrl } from "@/lib/listingMedia";
import { parseSearch, readJson } from "@/lib/security/parseBody";
import { QR_PHOTO_TTL_MS, createPhotoToken, findLiveToken } from "@/lib/security/qr";
import { LIMITS } from "@/lib/security/rateLimit";
import { throttle } from "@/lib/security/throttle";
import { qrPhotoAddSchema, qrPhotoStartSchema, qrTokenSchema } from "@/lib/security/schemas";
import { requireMutatingRequest, requireUser } from "@/lib/security/session";
import { isManagedStorageKey, storageKeyFromUrl } from "@/lib/storage/media";

const MAX_IMAGES = 16;

async function ownedListing(listingId: string, userId: string) {
  return prisma.listing.findFirst({
    where: { id: listingId, sellerId: userId, deletedAt: null },
    select: { id: true, title: true, categoryId: true, _count: { select: { images: true } } },
  });
}

function limited(retryAfter: number) {
  return NextResponse.json(
    { ok: false, error: "auth.err.rateLimit" },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );
}

/** Desktop: owner opens a short-lived pairing token for one of their own listings. */
export async function POST(req: Request) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const auth = await requireUser("seller");
  if ("error" in auth) return auth.error;
  const rl = await throttle([{ key: `qrphoto:${auth.user.id}`, limit: 20, windowMs: 15 * 60 * 1000 }], req);
  if (!rl.ok) return limited(rl.retryAfter);
  const parsed = await readJson(req, qrPhotoStartSchema);
  if (!parsed.ok) return parsed.response;
  const listing = await ownedListing(parsed.data.listingId, auth.user.id);
  if (!listing) return NextResponse.json({ ok: false, error: "auth.err.forbidden" }, { status: 403 });
  const token = await createPhotoToken(auth.user.id, listing.id);
  return NextResponse.json({ ok: true, token, ttl: QR_PHOTO_TTL_MS, images: listing._count.images, max: MAX_IMAGES });
}

/** Both sides: pairing details, restricted to the listing owner who created the token. */
export async function GET(req: Request) {
  const auth = await requireUser("seller");
  if ("error" in auth) return auth.error;
  const q = parseSearch(new URL(req.url), qrTokenSchema);
  if (!q) return NextResponse.json({ ok: false, error: "qr.err.invalid" }, { status: 400 });
  const row = await findLiveToken(q.t, "photo");
  if (!row || !row.listingId) return NextResponse.json({ ok: false, error: "qr.err.expired" }, { status: 410 });
  if (row.userId !== auth.user.id) return NextResponse.json({ ok: false, error: "qr.err.owner" }, { status: 403 });
  const listing = await ownedListing(row.listingId, auth.user.id);
  if (!listing) return NextResponse.json({ ok: false, error: "qr.err.expired" }, { status: 410 });
  return NextResponse.json({
    ok: true,
    listingId: listing.id,
    title: listing.title,
    categoryId: listing.categoryId,
    images: listing._count.images,
    uploads: row.uploads,
    max: MAX_IMAGES,
    expiresIn: Math.max(0, row.expiresAt.getTime() - Date.now()),
  });
}

/** Phone: attaches an image already uploaded (and moderated) through /api/uploads. */
export async function PUT(req: Request) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const auth = await requireUser("seller");
  if ("error" in auth) return auth.error;
  const rl = await throttle([{ key: `qrphoto-add:${auth.user.id}`, limit: LIMITS.upload.limit, windowMs: LIMITS.upload.windowMs }], req);
  if (!rl.ok) return limited(rl.retryAfter);
  const parsed = await readJson(req, qrPhotoAddSchema);
  if (!parsed.ok) return parsed.response;
  const row = await findLiveToken(parsed.data.t, "photo");
  if (!row || !row.listingId) return NextResponse.json({ ok: false, error: "qr.err.expired" }, { status: 410 });
  if (row.userId !== auth.user.id) return NextResponse.json({ ok: false, error: "qr.err.owner" }, { status: 403 });

  const url = parsed.data.url.trim();
  const storageKey = storageKeyFromUrl(url);
  if (!isAllowedListingImageUrl(url) || !isManagedStorageKey(storageKey) || !storageKey.startsWith(`listings/${auth.user.id}/`)) {
    return NextResponse.json({ ok: false, error: "auth.err.forbidden" }, { status: 403 });
  }
  const listingId = row.listingId;
  const result = await prisma.$transaction(async (tx) => {
    const listing = await tx.listing.findFirst({
      where: { id: listingId, sellerId: auth.user.id, deletedAt: null },
      select: { images: { select: { sortOrder: true, url: true } } },
    });
    if (!listing) return { error: "qr.err.expired", status: 410 } as const;
    if (listing.images.some((i) => i.url === url)) return { images: listing.images.length } as const;
    if (listing.images.length >= MAX_IMAGES) return { error: "qr.err.full", status: 400 } as const;
    const nextOrder = listing.images.reduce((m, i) => Math.max(m, i.sortOrder), -1) + 1;
    await tx.listingImage.create({
      data: { listingId, storageKey, url, sortOrder: nextOrder, isCover: listing.images.length === 0 },
    });
    await tx.qrToken.update({ where: { id: row.id }, data: { uploads: { increment: 1 } } });
    await tx.listing.update({ where: { id: listingId }, data: { updatedAt: new Date() } });
    return { images: listing.images.length + 1 } as const;
  });
  if ("error" in result) return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, images: result.images, max: MAX_IMAGES });
}
