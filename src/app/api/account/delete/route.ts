import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/admin/audit";
import { readTeam } from "@/lib/business/shared";
import { anonymizeAccountInTransaction } from "@/lib/security/accountDeletion";
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
    select: { logoUrl: true, coverUrl: true, team: true },
  });
  const unusableHash = await hashPassword(randomBytes(32).toString("base64url"));

  const { removedListings } = await prisma.$transaction((tx) =>
    anonymizeAccountInTransaction(tx, {
      userId: user.id,
      provider: user.provider,
      unusablePasswordHash: unusableHash,
    }),
  );
  await revokeUserSessions(user.id, "account-deleted");

  await Promise.all(
    images.filter((img) => isManagedStorageKey(img.storageKey)).map((img) => deleteStoredObject(img.storageKey, img.url)),
  );
  if (avatarUrl) await deleteStoredObject(storageKeyFromUrl(avatarUrl), avatarUrl);
  for (const url of [business?.logoUrl, business?.coverUrl]) {
    if (isOwnBusinessImage(user.id, url)) await deleteStoredObject(storageKeyFromUrl(url!), url!);
  }
  for (const { photo } of readTeam(business?.team)) {
    if (isOwnBusinessImage(user.id, photo, ["team"])) await deleteStoredObject(storageKeyFromUrl(photo!), photo!);
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
