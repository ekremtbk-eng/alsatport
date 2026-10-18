import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/admin/audit";
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
import {
  collectAccountBlobDeleteTargets,
  countActiveBlobReferences,
  enqueueAccountBlobDeletes,
  markPendingBlobDeleteDone,
} from "@/lib/storage/blobDeleteQueue";
import { tryDeleteStoredObject } from "@/lib/storage/media";

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
  const blobTargets = collectAccountBlobDeleteTargets({
    userId: user.id,
    listingImages: images,
    avatarUrl,
    business,
  });

  let removedListings: number;
  try {
    ({ removedListings } = await prisma.$transaction(async (tx) => {
      // Fail closed: every managed own key must land in the queue before anonymization commits.
      await enqueueAccountBlobDeletes(tx, user.id, blobTargets);
      return anonymizeAccountInTransaction(tx, {
        userId: user.id,
        provider: user.provider,
        unusablePasswordHash: unusableHash,
      });
    }));
  } catch {
    // Do not report success when enqueue or anonymization failed (txn rolled back).
    return NextResponse.json({ ok: false, error: "account.delete.err.failed" }, { status: 500 });
  }

  await revokeUserSessions(user.id, "account-deleted");

  // Opportunistic physical delete after commit. Queue rows remain `pending` on failure / timeout
  // so a future worker can retry. Never mark `done` without a confirmed delete. Skip when another
  // active DB reference still points at the key (defense in depth; path layout makes this rare).
  for (const target of blobTargets) {
    const refs = await countActiveBlobReferences(prisma, target.storageKey).catch(() => Number.POSITIVE_INFINITY);
    if (refs > 0) continue;
    const { deleted } = await tryDeleteStoredObject(target.storageKey, target.url);
    if (!deleted) continue;
    await markPendingBlobDeleteDone(prisma, target.storageKey).catch(() => undefined);
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
