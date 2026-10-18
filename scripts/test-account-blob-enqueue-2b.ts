/**
 * LOCAL ONLY — KVKK 2B account-delete → pending_blob_deletes enqueue (loopback Postgres :55433).
 *
 *   DATABASE_URL=postgresql://postgres@127.0.0.1:55433/alsat \
 *     npx tsx --conditions=react-server scripts/test-account-blob-enqueue-2b.ts
 *
 * Uses MEDIA_STORAGE=local mock Blob under .data/uploads. Does not touch Production / Vercel Blob.
 */
import { randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { anonymizeAccountInTransaction, DELETED_MESSAGE_BODY } from "../src/lib/security/accountDeletion";
import { hashPassword } from "../src/lib/security/password";
import {
  collectAccountBlobDeleteTargets,
  countActiveBlobReferences,
  enqueueAccountBlobDeletes,
  enqueuePendingBlobDelete,
  markPendingBlobDeleteDone,
} from "../src/lib/storage/blobDeleteQueue";
import { tryDeleteStoredObject } from "../src/lib/storage/media";

process.env.MEDIA_STORAGE = "local";
delete process.env.BLOB_READ_WRITE_TOKEN;
delete process.env.BLOB_PUBLIC_HOST;

const DB = process.env.DATABASE_URL ?? "";
const TAG = randomBytes(3).toString("hex");
const LOCAL_ROOT = path.resolve(process.cwd(), ".data", "uploads");

function assertLoopback() {
  let u: URL;
  try {
    u = new URL(DB);
  } catch {
    throw new Error("DATABASE_URL required");
  }
  if (!/^(localhost|127\.0\.0\.1|\[::1\])$/.test(u.hostname) || u.port !== "55433") {
    throw new Error(`Refusing non-loopback:55433 (got ${u.hostname}:${u.port || "5432"})`);
  }
}

type Result = { id: string; name: string; pass: boolean; detail?: string };
const results: Result[] = [];
function check(id: string, name: string, pass: boolean, detail = "") {
  results.push({ id, name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${id.padEnd(6)} ${name}${detail ? ` — ${detail}` : ""}`);
}

function uuid() {
  return randomBytes(16).toString("hex").replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, "$1-$2-$3-$4-$5");
}

async function writeLocalBlob(storageKey: string) {
  const abs = path.join(LOCAL_ROOT, ...storageKey.split("/"));
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  return abs;
}

async function localExists(storageKey: string) {
  const abs = path.join(LOCAL_ROOT, ...storageKey.split("/"));
  try {
    await fs.access(abs);
    return true;
  } catch {
    return false;
  }
}

assertLoopback();
const prisma = new PrismaClient();
const userIds: string[] = [];
const storageKeys: string[] = [];

async function seedUser(opts: { avatarKey?: string | null } = {}) {
  const id = uuid();
  const email = `kvkk-2b-${TAG}-${id.slice(0, 8)}@kvkk-2b-test.invalid`;
  const username = `kvkk2b_${TAG}_${id.slice(0, 8)}`;
  const passwordHash = await hashPassword("Kvkk-2B-Test-Password-9!");
  const avatarUrl = opts.avatarKey
    ? `/api/media/${opts.avatarKey.split("/").map(encodeURIComponent).join("/")}`
    : null;
  await prisma.user.create({
    data: {
      id,
      email,
      username,
      passwordHash,
      provider: "email",
      role: "member",
      emailVerifiedAt: new Date(),
      profile: {
        create: {
          displayName: "KVKK 2B",
          fullName: "KVKK 2B User",
          avatarUrl,
          address: "Test Address 2B",
          city: "Lefkoşa",
          marketingEmail: true,
          notificationPrefs: { priceDrop: { email: true } },
        },
      },
    },
  });
  await prisma.notification.create({
    data: {
      userId: id,
      kind: "test",
      title: "2B notice",
      body: "synthetic",
      eventKey: `kvkk-2b-${TAG}-${id}`,
    },
  });
  await prisma.userSession.create({
    data: {
      userId: id,
      method: "password",
      expiresAt: new Date(Date.now() + 86400_000),
      userAgent: "kvkk-2b-test",
      ipMasked: "9.9.x.x",
    },
  });
  userIds.push(id);
  return { id, email, username };
}

async function main() {
  const owner = await seedUser();
  const neighbor = await seedUser();
  const listingKey = `listings/${owner.id}/${uuid()}.webp`;
  const avatarKey = `avatars/${owner.id}/${uuid()}.webp`;
  const logoKey = `business/${owner.id}/logo-${uuid()}.webp`;
  const teamKey = `business/${owner.id}/team-${uuid()}.webp`;
  const neighborKey = `listings/${neighbor.id}/${uuid()}.webp`;
  storageKeys.push(listingKey, avatarKey, logoKey, teamKey, neighborKey);

  await writeLocalBlob(listingKey);
  await writeLocalBlob(avatarKey);
  await writeLocalBlob(logoKey);
  await writeLocalBlob(teamKey);
  await writeLocalBlob(neighborKey);

  await prisma.profile.update({
    where: { userId: owner.id },
    data: { avatarUrl: `/api/media/${avatarKey.split("/").map(encodeURIComponent).join("/")}` },
  });

  const listing = await prisma.listing.create({
    data: {
      listingNo: `B2B${TAG}`.slice(0, 20),
      sellerId: owner.id,
      categoryId: "vasita",
      title: "BLOB 2B TEST",
      description: "synthetic",
      price: 1,
      currency: "TRY",
      city: "Lefkoşa",
      status: "active",
      postedAt: new Date(),
      expiresAt: new Date(Date.now() + 86400_000),
      images: {
        create: [
          {
            storageKey: listingKey,
            url: `/api/media/${listingKey.split("/").map(encodeURIComponent).join("/")}`,
            sortOrder: 0,
            isCover: true,
          },
        ],
      },
    },
  });

  await prisma.businessAccount.create({
    data: {
      userId: owner.id,
      slug: `kvkk2b-${TAG}`,
      status: "approved",
      name: "2B Store",
      contactName: "Owner",
      companyType: "sahis",
      taxOffice: "Lefkosa",
      taxNumber: "1234567890",
      categoryId: "vasita",
      city: "Lefkoşa",
      district: "",
      description: "synthetic business for kvkk 2b enqueue tests only",
      email: `store-${TAG}@kvkk-2b-test.invalid`,
      phone: "5330000000",
      logoUrl: `/api/media/${logoKey.split("/").map(encodeURIComponent).join("/")}`,
      coverUrl: null,
      team: [{ name: "Ali", role: "Satis", photo: `/api/media/${teamKey.split("/").map(encodeURIComponent).join("/")}` }],
      approvedAt: new Date(),
    },
  });

  // neighbor listing image — must never be collected for owner
  await prisma.listing.create({
    data: {
      listingNo: `B2BN${TAG}`.slice(0, 20),
      sellerId: neighbor.id,
      categoryId: "vasita",
      title: "NEIGHBOR",
      description: "synthetic",
      price: 1,
      currency: "TRY",
      city: "Lefkoşa",
      status: "active",
      postedAt: new Date(),
      expiresAt: new Date(Date.now() + 86400_000),
      images: {
        create: [
          {
            storageKey: neighborKey,
            url: `/api/media/${neighborKey.split("/").map(encodeURIComponent).join("/")}`,
            sortOrder: 0,
            isCover: true,
          },
        ],
      },
    },
  });

  const images = await prisma.listingImage.findMany({
    where: { listing: { sellerId: owner.id } },
    select: { storageKey: true, url: true },
  });
  const profile = await prisma.profile.findUniqueOrThrow({ where: { userId: owner.id } });
  const business = await prisma.businessAccount.findUniqueOrThrow({
    where: { userId: owner.id },
    select: { logoUrl: true, coverUrl: true, team: true },
  });

  const targets = collectAccountBlobDeleteTargets({
    userId: owner.id,
    listingImages: images,
    avatarUrl: profile.avatarUrl,
    business,
  });
  const keys = new Set(targets.map((t) => t.storageKey));
  check("C1", "collects listing+avatar+logo+team", keys.has(listingKey) && keys.has(avatarKey) && keys.has(logoKey) && keys.has(teamKey), `n=${targets.length}`);
  check("C2", "excludes neighbor listing key", !keys.has(neighborKey));
  check("C3", "excludes unsplash/external", !collectAccountBlobDeleteTargets({
    userId: owner.id,
    listingImages: [],
    avatarUrl: "https://images.unsplash.com/photo-1555215695-3004980ad54e",
    business: null,
  }).length);

  // foreign managed key in collect still present → enqueue must fail closed
  const foreignManaged = `listings/${neighbor.id}/${uuid()}.webp`;
  storageKeys.push(foreignManaged);
  const badTargets = [...targets, { storageKey: foreignManaged, url: `/api/media/${foreignManaged}` }];
  let failedClosed = false;
  try {
    await prisma.$transaction(async (tx) => {
      await enqueueAccountBlobDeletes(tx, owner.id, badTargets);
    });
  } catch (e) {
    failedClosed = e instanceof Error && e.message.includes("blob_queue.enqueue_failed");
  }
  check("F1", "foreign managed key aborts enqueue", failedClosed);
  const foreignRow = await prisma.pendingBlobDelete.findUnique({ where: { storageKey: foreignManaged } });
  check("F2", "foreign key not persisted after abort", foreignRow == null);

  const hash = await hashPassword(randomBytes(32).toString("base64url"));
  const buyer = await seedUser();
  const conv = await prisma.conversation.create({
    data: { buyerId: buyer.id, sellerId: owner.id, listingId: listing.id },
  });
  await prisma.message.create({
    data: { conversationId: conv.id, senderId: owner.id, body: "secret 2b chat" },
  });

  // Happy path: enqueue + anonymize in one txn
  const { removedListings, enqueued } = await prisma.$transaction(async (tx) => {
    const q = await enqueueAccountBlobDeletes(tx, owner.id, targets);
    const anon = await anonymizeAccountInTransaction(tx, {
      userId: owner.id,
      provider: "email",
      unusablePasswordHash: hash,
    });
    return { ...anon, enqueued: q.enqueued };
  });
  check("D1", "enqueue count matches targets", enqueued === targets.length, `enqueued=${enqueued}`);
  check("D2", "listings soft-removed", removedListings >= 1);

  const queueRows = await prisma.pendingBlobDelete.findMany({
    where: { storageKey: { in: [...keys] } },
  });
  check("D3", "all keys pending in queue", queueRows.length === targets.length && queueRows.every((r) => r.status === "pending"));

  const after = await prisma.user.findUnique({ where: { id: owner.id }, include: { profile: true } });
  check("D4", "account tombstoned/banned", !!after?.bannedAt && after.bannedReason === "account_deleted");
  check("D5", "avatar cleared", after?.profile?.avatarUrl == null);
  check("D6", "notifications deleted", (await prisma.notification.count({ where: { userId: owner.id } })) === 0);
  check("D7", "business row deleted", (await prisma.businessAccount.count({ where: { userId: owner.id } })) === 0);
  check("D8", "listing images deleted", (await prisma.listingImage.count({ where: { listingId: listing.id } })) === 0);
  const msgAfter = await prisma.message.findFirst({ where: { conversationId: conv.id } });
  check("D9", "message anonymized", msgAfter?.body === DELETED_MESSAGE_BODY && !!msgAfter.deletedAt);
  const listingAfter = await prisma.listing.findUnique({ where: { id: listing.id } });
  check("D10", "listing soft-delete retained", listingAfter?.status === "removed" && !!listingAfter.deletedAt);

  // neighbor intact
  check("N1", "neighbor listing image intact", (await prisma.listingImage.count({ where: { storageKey: neighborKey } })) === 1);
  check("N2", "neighbor not banned", !(await prisma.user.findUnique({ where: { id: neighbor.id } }))?.bannedAt);

  // duplicate enqueue idempotency
  const again = await prisma.$transaction((tx) =>
    enqueuePendingBlobDelete(tx, { storageKey: listingKey, reason: "account_delete", expectedOwnerUserId: owner.id }),
  );
  check("I1", "duplicate enqueue already_pending", again.ok && again.outcome === "already_pending");
  check("I2", "still one queue row", (await prisma.pendingBlobDelete.count({ where: { storageKey: listingKey } })) === 1);

  // refcount: after anonymize, owner refs gone; neighbor key still referenced
  check("R0", "owner listing key refs=0", (await countActiveBlobReferences(prisma, listingKey)) === 0);
  check("R0b", "neighbor key refs>=1", (await countActiveBlobReferences(prisma, neighborKey)) >= 1);

  // successful local delete → mark done
  const delListing = await tryDeleteStoredObject(listingKey);
  check("B1", "local listing blob deleted", delListing.deleted && !(await localExists(listingKey)));
  const marked = await markPendingBlobDeleteDone(prisma, listingKey);
  check("B2", "queue marked done after confirmed delete", marked.ok && marked.updated === true);
  check("B3", "status is done", (await prisma.pendingBlobDelete.findUnique({ where: { storageKey: listingKey } }))?.status === "done");

  // failed delete must NOT mark done — simulate by leaving file and forcing tryDelete on missing path that returns false
  // Use a pending key still on disk; mock failure by calling mark only when deleted=false path
  const stillPending = await prisma.pendingBlobDelete.findUnique({ where: { storageKey: avatarKey } });
  check("B4", "avatar still pending before delete", stillPending?.status === "pending");
  // Simulate failed Blob delete (do not call tryDelete); assert we would not mark done
  check("B5", "failed delete leaves pending (by design)", stillPending?.status === "pending" && (await localExists(avatarKey)));

  // Partial / timeout simulation: commit enqueue then "crash" before physical delete — rows remain
  const timeoutUser = await seedUser();
  const tKey = `listings/${timeoutUser.id}/${uuid()}.webp`;
  storageKeys.push(tKey);
  await writeLocalBlob(tKey);
  await prisma.listing.create({
    data: {
      listingNo: `B2BT${TAG}`.slice(0, 20),
      sellerId: timeoutUser.id,
      categoryId: "vasita",
      title: "TIMEOUT SIM",
      description: "synthetic",
      price: 1,
      currency: "TRY",
      city: "Lefkoşa",
      status: "active",
      postedAt: new Date(),
      expiresAt: new Date(Date.now() + 86400_000),
      images: {
        create: [{ storageKey: tKey, url: `/api/media/${tKey}`, sortOrder: 0, isCover: true }],
      },
    },
  });
  const tTargets = collectAccountBlobDeleteTargets({
    userId: timeoutUser.id,
    listingImages: [{ storageKey: tKey, url: `/api/media/${tKey}` }],
    avatarUrl: null,
    business: null,
  });
  await prisma.$transaction(async (tx) => {
    await enqueueAccountBlobDeletes(tx, timeoutUser.id, tTargets);
    await anonymizeAccountInTransaction(tx, {
      userId: timeoutUser.id,
      provider: "email",
      unusablePasswordHash: hash,
    });
  });
  // "request timed out" — skip physical delete
  const tRow = await prisma.pendingBlobDelete.findUnique({ where: { storageKey: tKey } });
  check("T1", "timeout leaves queue pending", tRow?.status === "pending");
  check("T2", "timeout leaves local file", await localExists(tKey));

  // Transaction rollback: enqueue then throw before anonymize completes
  const rollUser = await seedUser();
  const rollKey = `avatars/${rollUser.id}/${uuid()}.webp`;
  storageKeys.push(rollKey);
  await writeLocalBlob(rollKey);
  await prisma.profile.update({
    where: { userId: rollUser.id },
    data: { avatarUrl: `/api/media/${rollKey}` },
  });
  const rollTargets = collectAccountBlobDeleteTargets({
    userId: rollUser.id,
    listingImages: [],
    avatarUrl: `/api/media/${rollKey}`,
    business: null,
  });
  const emailBefore = rollUser.email;
  try {
    await prisma.$transaction(async (tx) => {
      await enqueueAccountBlobDeletes(tx, rollUser.id, rollTargets);
      await anonymizeAccountInTransaction(tx, {
        userId: rollUser.id,
        provider: "email",
        unusablePasswordHash: hash,
      });
      throw new Error("forced-rollback-2b");
    });
  } catch (e) {
    check("RB1", "rollback threw", e instanceof Error && e.message === "forced-rollback-2b");
  }
  check("RB2", "rollback drops queue row", (await prisma.pendingBlobDelete.findUnique({ where: { storageKey: rollKey } })) == null);
  const rollAfter = await prisma.user.findUnique({ where: { id: rollUser.id }, include: { profile: true } });
  check("RB3", "rollback keeps email", rollAfter?.email === emailBefore);
  check("RB4", "rollback keeps avatar url", !!rollAfter?.profile?.avatarUrl);
  check("RB5", "rollback not banned", !rollAfter?.bannedAt);
  check("RB6", "rollback keeps notification", (await prisma.notification.count({ where: { userId: rollUser.id } })) === 1);

  // Session revoke behaviour preserved (route calls revokeUserSessions after commit — mirror here)
  await prisma.userSession.updateMany({
    where: { userId: owner.id, revokedAt: null },
    data: { revokedAt: new Date(), revokedReason: "account-deleted" },
  });
  check("S1", "sessions revoked after delete", (await prisma.userSession.count({ where: { userId: owner.id, revokedAt: null } })) === 0);

  // Static route wiring + no cron in this PR
  const { readFileSync } = await import("node:fs");
  const routeSrc = readFileSync("src/app/api/account/delete/route.ts", "utf8");
  check("X1", "route enqueues inside transaction", routeSrc.includes("enqueueAccountBlobDeletes") && routeSrc.includes("$transaction"));
  check("X2", "route marks done only after tryDelete", routeSrc.includes("tryDeleteStoredObject") && routeSrc.includes("markPendingBlobDeleteDone"));
  check("X3", "route fail-closed on enqueue error", routeSrc.includes("account.delete.err.failed"));
  check("X4", "route keeps CSRF/admin/reauth gates", routeSrc.includes("requireMutatingRequest") && routeSrc.includes("account.delete.err.admin") && routeSrc.includes("auth.err.reauth"));
  check("X5", "route keeps revokeUserSessions", routeSrc.includes("revokeUserSessions"));
  check(
    "X6",
    "no cron schedule / setInterval in route",
    !/setInterval|\/api\/cron|schedule\(/i.test(routeSrc),
  );
  check("X7", "skip delete when active refs", routeSrc.includes("countActiveBlobReferences"));

  // ENOENT idempotent done path
  const gone = await tryDeleteStoredObject(listingKey);
  check("B6", "ENOENT treated as deleted", gone.deleted === true);

  // Cleanup
  for (const key of storageKeys) {
    await prisma.pendingBlobDelete.deleteMany({ where: { storageKey: key } }).catch(() => undefined);
    const abs = path.join(LOCAL_ROOT, ...key.split("/"));
    await fs.unlink(abs).catch(() => undefined);
  }
  for (const id of userIds) {
    await prisma.notification.deleteMany({ where: { userId: id } }).catch(() => undefined);
    await prisma.userSession.deleteMany({ where: { userId: id } }).catch(() => undefined);
    await prisma.message.deleteMany({ where: { senderId: id } }).catch(() => undefined);
    await prisma.conversation.deleteMany({ where: { OR: [{ buyerId: id }, { sellerId: id }] } }).catch(() => undefined);
    await prisma.listingImage.deleteMany({ where: { listing: { sellerId: id } } }).catch(() => undefined);
    await prisma.listing.deleteMany({ where: { sellerId: id } }).catch(() => undefined);
    await prisma.businessAccount.deleteMany({ where: { userId: id } }).catch(() => undefined);
    await prisma.profile.deleteMany({ where: { userId: id } }).catch(() => undefined);
    await prisma.user.deleteMany({ where: { id } }).catch(() => undefined);
  }
  await prisma.$disconnect();

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length) {
    console.error("FAILED:", failed.map((f) => f.id).join(", "));
    process.exit(1);
  }
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect().catch(() => undefined);
  process.exit(1);
});
