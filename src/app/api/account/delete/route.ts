import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/admin/audit";
import { hashPassword, verifyPasswordHash } from "@/lib/security/password";
import { LIMITS, clientIp } from "@/lib/security/rateLimit";
import { throttle } from "@/lib/security/throttle";
import {
  STEP_UP_WINDOW_MS,
  clearSession,
  requireMutatingRequest,
  requireUser,
  revokeUserSessions,
  sessionIsFresh,
} from "@/lib/security/session";
import { readJson } from "@/lib/security/parseBody";
import { accountDeleteSchema } from "@/lib/security/schemas";
import { deleteStoredObject, isManagedStorageKey, isOwnBusinessImage, storageKeyFromUrl } from "@/lib/storage/media";

const DELETED_MESSAGE_BODY = "Bu mesaj, hesabını silen bir kullanıcıya aitti.";

export async function POST(req: Request) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const auth = await requireUser("member", { allowUnverified: true });
  if ("error" in auth) return auth.error;
  const user = auth.user;

  const limited = await throttle([{ key: `acct-del:${user.id}`, limit: LIMITS.login.limit, windowMs: LIMITS.login.windowMs }], req);
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: "auth.err.rateLimit" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
    );
  }

  const parsed = await readJson(req, accountDeleteSchema);
  if (!parsed.ok) return parsed.response;
  if (user.role === "admin") {
    return NextResponse.json({ ok: false, error: "account.delete.err.admin" }, { status: 400 });
  }
  if (user.passwordHash && !(await verifyPasswordHash(parsed.data.password, user.passwordHash))) {
    return NextResponse.json({ ok: false, error: "dash.pw.current" }, { status: 400 });
  }
  if (!user.passwordHash && !sessionIsFresh(auth.session, STEP_UP_WINDOW_MS)) {
    return NextResponse.json({ ok: false, error: "auth.err.reauth" }, { status: 403 });
  }

  const images = await prisma.listingImage.findMany({
    where: { listing: { sellerId: user.id } },
    select: { storageKey: true, url: true },
  });
  const avatarUrl = user.profile.avatar;
  const business = await prisma.businessAccount.findUnique({
    where: { userId: user.id },
    select: { logoUrl: true, coverUrl: true },
  });
  const now = new Date();
  const unusableHash = await hashPassword(randomBytes(32).toString("base64url"));

  const removedListings = await prisma.$transaction(async (tx) => {
    const listings = await tx.listing.updateMany({
      where: { sellerId: user.id, deletedAt: null },
      data: { status: "removed", deletedAt: now },
    });
    await tx.listingImage.deleteMany({ where: { listing: { sellerId: user.id } } });
    await tx.message.updateMany({
      where: { senderId: user.id },
      data: { body: DELETED_MESSAGE_BODY, deletedAt: now },
    });
    await tx.conversation.updateMany({
      where: { OR: [{ buyerId: user.id }, { sellerId: user.id }] },
      data: { lastMessage: null },
    });
    await tx.favorite.deleteMany({ where: { userId: user.id } });
    await tx.savedSearch.deleteMany({ where: { userId: user.id } });
    await tx.userBlock.deleteMany({ where: { OR: [{ blockerId: user.id }, { blockedId: user.id }] } });
    await tx.qrToken.deleteMany({ where: { userId: user.id } });
    await tx.verificationOtp.deleteMany({ where: { userId: user.id } });
    await tx.conversationRead.deleteMany({ where: { userId: user.id } });
    await tx.sellerReview.deleteMany({ where: { OR: [{ authorId: user.id }, { sellerId: user.id }] } });
    await tx.businessAccount.deleteMany({ where: { userId: user.id } });
    await tx.profile.update({
      where: { userId: user.id },
      data: {
        displayName: "Silinmiş kullanıcı",
        fullName: null,
        avatarUrl: null,
        phone: null,
        phoneVerifiedAt: null,
        birthDate: null,
        nationalId: null,
        address: null,
        city: null,
        verified: false,
        businessName: null,
        businessVerifiedAt: null,
        profileComplete: false,
        notifPriceDrop: false,
        notifSavedSearch: false,
        notifNearby: false,
        twoFactorEnabled: false,
        recoveryEmail: null,
        recoveryEmailVerifiedAt: null,
        marketingEmail: false,
        marketingSms: false,
        marketingPush: false,
        marketingUpdatedAt: now,
      },
    });
    await tx.user.update({
      where: { id: user.id },
      data: {
        email: `deleted-${user.id}@deleted.invalid`,
        username: `silinmis_${user.id.replace(/-/g, "").slice(0, 16)}`,
        // users_email_provider_hash requires a hash for email accounts; a random one can never match.
        passwordHash: user.provider === "email" ? unusableHash : null,
        providerSub: null,
        emailVerifiedAt: null,
        bannedAt: now,
        bannedReason: "account_deleted",
      },
    });
    return listings.count;
  });
  await revokeUserSessions(user.id, "account-deleted");

  await Promise.all(
    images.filter((img) => isManagedStorageKey(img.storageKey)).map((img) => deleteStoredObject(img.storageKey, img.url)),
  );
  if (avatarUrl) await deleteStoredObject(storageKeyFromUrl(avatarUrl), avatarUrl);
  for (const url of [business?.logoUrl, business?.coverUrl]) {
    if (isOwnBusinessImage(user.id, url)) await deleteStoredObject(storageKeyFromUrl(url!), url!);
  }

  await writeAudit({
    actorId: user.id,
    action: "account.delete",
    entityType: "user",
    entityId: user.id,
    ip: clientIp(req),
    userAgent: req.headers.get("user-agent"),
    payload: { removedListings },
  }).catch(() => undefined);

  return clearSession(NextResponse.json({ ok: true, removedListings }));
}
