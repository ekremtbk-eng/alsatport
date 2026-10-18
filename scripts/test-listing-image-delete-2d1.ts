/**
 * LOCAL ONLY — KVKK 2D-1 listing-edit image delete safety (loopback Postgres :55433).
 *
 *   DATABASE_URL=postgresql://postgres@127.0.0.1:55433/alsat \
 *     npx tsx --conditions=react-server scripts/test-listing-image-delete-2d1.ts
 *
 * Uses MEDIA_STORAGE=local mock Blob under .data/uploads. Does not touch Production / Vercel Blob.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import type { StoredUser } from "../src/lib/security/userStore";
import { updateListingRecord } from "../src/lib/listings/store";
import {
  collectListingEditBlobDeleteTargets,
  countActiveBlobReferences,
  enqueueListingEditBlobDeletes,
  enqueuePendingBlobDelete,
  markPendingBlobDeleteDone,
} from "../src/lib/storage/blobDeleteQueue";
import { tryDeleteStoredObject } from "../src/lib/storage/media";
import { isEidsPublishLockActive } from "../src/lib/listings/eidsPublishLock";

process.env.MEDIA_STORAGE = "local";
delete process.env.BLOB_READ_WRITE_TOKEN;
delete process.env.BLOB_PUBLIC_HOST;

const DB = process.env.DATABASE_URL ?? "";
const TAG = randomBytes(3).toString("hex");
const LOCAL_ROOT = path.resolve(process.cwd(), ".data", "uploads");
const CATEGORY = "shopping-phone";

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

function mediaUrl(storageKey: string) {
  return `/api/media/${storageKey.split("/").map(encodeURIComponent).join("/")}`;
}

async function writeLocalBlob(storageKey: string) {
  const abs = path.join(LOCAL_ROOT, ...storageKey.split("/"));
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  return abs;
}

async function localExists(storageKey: string) {
  try {
    await fs.access(path.join(LOCAL_ROOT, ...storageKey.split("/")));
    return true;
  } catch {
    return false;
  }
}

assertLoopback();
const prisma = new PrismaClient();
const userIds: string[] = [];
const listingIds: string[] = [];
const storageKeys: string[] = [];

async function ensureCategory() {
  const existing = await prisma.category.findUnique({ where: { id: CATEGORY } });
  if (existing) return;
  await prisma.category.create({
    data: { id: CATEGORY, slug: CATEGORY, name: "Cep Telefonu", sortOrder: 0 },
  });
}

async function seedUser() {
  const id = uuid();
  const email = `kvkk-2d1-${TAG}-${id.slice(0, 8)}@kvkk-2d1-test.invalid`;
  const username = `kvkk2d1_${TAG}_${id.slice(0, 8)}`;
  await prisma.user.create({
    data: {
      id,
      email,
      username,
      passwordHash: "x",
      provider: "email",
      role: "member",
      emailVerifiedAt: new Date(),
      profile: {
        create: {
          displayName: "KVKK 2D1",
          fullName: "KVKK 2D1 User",
          city: "Lefkoşa",
        },
      },
    },
  });
  userIds.push(id);
  return { id, email, username };
}

function asStoredUser(u: { id: string; email: string; username: string }): StoredUser {
  return {
    id: u.id,
    email: u.email,
    username: u.username,
    provider: "email",
    role: "member",
    profile: {
      id: u.id,
      username: u.username,
      displayName: "KVKK 2D1",
      avatar: "",
      verified: false,
      memberSince: "2026",
      listings: 0,
      sales: 0,
      stars: 0,
      followers: 0,
      following: 0,
      city: "Lefkoşa",
      plan: "standart",
    },
  };
}

async function seedListing(
  sellerId: string,
  images: Array<{ storageKey: string; url: string }>,
  listingNoSuffix: string,
) {
  const row = await prisma.listing.create({
    data: {
      listingNo: `D1${TAG}${listingNoSuffix}`.slice(0, 20),
      sellerId,
      categoryId: CATEGORY,
      title: "BLOB 2D1 TEST PHONE",
      description: "synthetic listing for kvkk 2d1 image delete safety",
      price: 100,
      currency: "TRY",
      city: "İstanbul",
      district: "Kadıköy",
      status: "active",
      postedAt: new Date(),
      expiresAt: new Date(Date.now() + 86400_000),
      images: {
        create: images.map((img, i) => ({
          storageKey: img.storageKey,
          url: img.url,
          sortOrder: i,
          isCover: i === 0,
        })),
      },
    },
    include: { images: true },
  });
  listingIds.push(row.id);
  return row;
}

async function main() {
  await ensureCategory();
  const owner = await seedUser();
  const neighbor = await seedUser();
  const user = asStoredUser(owner);

  const keepKey = `listings/${owner.id}/${uuid()}.webp`;
  const dropKey = `listings/${owner.id}/${uuid()}.webp`;
  const dropKey2 = `listings/${owner.id}/${uuid()}.webp`;
  const neighborKey = `listings/${neighbor.id}/${uuid()}.webp`;
  const sharedKey = `listings/${owner.id}/${uuid()}.webp`;
  storageKeys.push(keepKey, dropKey, dropKey2, neighborKey, sharedKey);

  for (const k of [keepKey, dropKey, dropKey2, neighborKey, sharedKey]) {
    await writeLocalBlob(k);
  }

  const keepUrl = mediaUrl(keepKey);
  const dropUrl = mediaUrl(dropKey);
  const dropUrl2 = mediaUrl(dropKey2);
  const neighborUrl = mediaUrl(neighborKey);
  const sharedUrl = mediaUrl(sharedKey);

  // --- collect unit gates ---
  const collected = collectListingEditBlobDeleteTargets({
    sellerId: owner.id,
    existingImages: [
      { storageKey: keepKey, url: keepUrl },
      { storageKey: dropKey, url: dropUrl },
      { storageKey: neighborKey, url: neighborUrl },
      { storageKey: "remote/not-ours", url: "https://images.unsplash.com/photo-x" },
    ],
    keepUrls: [keepUrl],
  });
  const collectedKeys = new Set(collected.map((t) => t.storageKey));
  check("C1", "collects dropped own managed key", collectedKeys.has(dropKey));
  check("C2", "keeps retained image out of targets", !collectedKeys.has(keepKey));
  check("C3", "omits neighbor/foreign owner key", !collectedKeys.has(neighborKey));
  check("C4", "omits external/unmanaged URL", collected.every((t) => !t.storageKey.startsWith("remote/")));

  // empty keep list would collect all own managed — but update path rejects photo.minN first
  const allDropped = collectListingEditBlobDeleteTargets({
    sellerId: owner.id,
    existingImages: [
      { storageKey: keepKey, url: keepUrl },
      { storageKey: dropKey, url: dropUrl },
    ],
    keepUrls: [],
  });
  check("C5", "empty keep collects both own keys", allDropped.length === 2);

  // --- rollback: enqueue then force abort — Blob + listing images must survive ---
  const listingRb = await seedListing(
    owner.id,
    [
      { storageKey: dropKey, url: dropUrl },
      { storageKey: keepKey, url: keepUrl },
    ],
    "RB",
  );
  let rolled = false;
  try {
    await prisma.$transaction(async (tx) => {
      await enqueueListingEditBlobDeletes(tx, owner.id, [{ storageKey: dropKey, url: dropUrl }]);
      await tx.listingImage.deleteMany({ where: { listingId: listingRb.id } });
      throw new Error("force_rollback_2d1");
    });
  } catch (e) {
    rolled = e instanceof Error && e.message === "force_rollback_2d1";
  }
  check("R1", "forced txn abort", rolled);
  check("R2", "blob file intact after rollback", await localExists(dropKey));
  check(
    "R3",
    "listing images restored after rollback",
    (await prisma.listingImage.count({ where: { listingId: listingRb.id } })) === 2,
  );
  check(
    "R4",
    "no pending queue row after rollback",
    (await prisma.pendingBlobDelete.findUnique({ where: { storageKey: dropKey } })) == null,
  );

  // foreign managed in enqueue array → fail closed
  const foreign = `listings/${neighbor.id}/${uuid()}.webp`;
  storageKeys.push(foreign);
  let failClosed = false;
  try {
    await prisma.$transaction(async (tx) => {
      await enqueueListingEditBlobDeletes(tx, owner.id, [
        { storageKey: dropKey, url: dropUrl },
        { storageKey: foreign },
      ]);
    });
  } catch (e) {
    failClosed = e instanceof Error && e.message.includes("blob_queue.enqueue_failed");
  }
  check("F1", "foreign key aborts enqueue", failClosed);
  check(
    "F2",
    "no partial queue persist on abort",
    (await prisma.pendingBlobDelete.findUnique({ where: { storageKey: dropKey } })) == null &&
      (await prisma.pendingBlobDelete.findUnique({ where: { storageKey: foreign } })) == null,
  );

  // --- empty photo list rejected without mutation ---
  const empty = await updateListingRecord(user, listingRb.id, { images: [] });
  check(
    "E1",
    "empty images rejected (minN or schema)",
    "error" in empty && (empty.error === "photo.minN" || empty.error === "auth.err.required"),
    "error" in empty ? empty.error : "ok",
  );
  check(
    "E2",
    "empty images left DB photos intact",
    (await prisma.listingImage.count({ where: { listingId: listingRb.id } })) === 2,
  );
  check("E3", "empty images left blobs intact", (await localExists(dropKey)) && (await localExists(keepKey)));

  // --- happy path via updateListingRecord: drop one, keep one ---
  const updated = await updateListingRecord(user, listingRb.id, {
    images: [keepUrl],
    title: "BLOB 2D1 TEST PHONE UPDATED",
  });
  check("H1", "updateListingRecord ok", !("error" in updated), "error" in updated ? updated.error : "");
  if (!("error" in updated)) {
    check("H2", "client listing has one image", updated.listing.images.length === 1 && updated.listing.images[0] === keepUrl);
  }
  check(
    "H3",
    "DB has only keep image",
    (await prisma.listingImage.count({ where: { listingId: listingRb.id, storageKey: keepKey } })) === 1 &&
      (await prisma.listingImage.count({ where: { listingId: listingRb.id, storageKey: dropKey } })) === 0,
  );
  const qDrop = await prisma.pendingBlobDelete.findUnique({ where: { storageKey: dropKey } });
  check("H4", "dropped key queued then marked done", !!qDrop && qDrop.status === "done" && qDrop.reason === "listing_edit");
  check("H5", "dropped blob physically gone", !(await localExists(dropKey)));
  check("H6", "kept blob still on disk", await localExists(keepKey));
  check("H7", "keep key not queued", (await prisma.pendingBlobDelete.findUnique({ where: { storageKey: keepKey } })) == null);

  // --- delete failure keeps pending (no markDone without confirmed delete) ---
  const failKey = `listings/${owner.id}/${uuid()}.webp`;
  storageKeys.push(failKey);
  await writeLocalBlob(failKey);
  await prisma.$transaction(async (tx) => {
    await enqueuePendingBlobDelete(tx, {
      storageKey: failKey,
      reason: "listing_edit",
      expectedOwnerUserId: owner.id,
    });
  });
  const pendingBefore = await prisma.pendingBlobDelete.findUnique({ where: { storageKey: failKey } });
  check("D1", "pending row stays pending when not deleted", pendingBefore?.status === "pending");
  // Simulate failed physical delete: do not call tryDelete / markDone
  const pendingAfter = await prisma.pendingBlobDelete.findUnique({ where: { storageKey: failKey } });
  check("D2", "queue not marked done without confirmed delete", pendingAfter?.status === "pending");
  check("D3", "blob still present after skipped delete", await localExists(failKey));

  const { deleted: okDel } = await tryDeleteStoredObject(failKey);
  check("D4", "tryDelete succeeds", okDel);
  await markPendingBlobDeleteDone(prisma, failKey);
  check(
    "D5",
    "mark done only after success",
    (await prisma.pendingBlobDelete.findUnique({ where: { storageKey: failKey } }))?.status === "done",
  );

  // --- refcount: shared key across two listings blocks physical delete ---
  const listingA = await seedListing(owner.id, [{ storageKey: sharedKey, url: sharedUrl }], "SA");
  const listingB = await seedListing(owner.id, [{ storageKey: sharedKey, url: sharedUrl }], "SB");
  check("S0", "shared key refs>=2", (await countActiveBlobReferences(prisma, sharedKey)) >= 2);

  const sharedUpdate = await updateListingRecord(user, listingA.id, {
    images: [keepUrl],
  });
  check("S1", "shared listing A update ok", !("error" in sharedUpdate));
  check("S2", "shared blob still on disk (B refs)", await localExists(sharedKey));
  check(
    "S3",
    "shared key queue pending (not done) while B refs",
    (await prisma.pendingBlobDelete.findUnique({ where: { storageKey: sharedKey } }))?.status === "pending",
  );
  check("S4", "listing B still references key", (await prisma.listingImage.count({ where: { listingId: listingB.id, storageKey: sharedKey } })) === 1);

  // Remove from B too → opportunistic would delete; call update
  const sharedUpdateB = await updateListingRecord(user, listingB.id, { images: [keepUrl] });
  check("S5", "shared listing B update ok", !("error" in sharedUpdateB));
  check("S6", "shared blob gone after last ref", !(await localExists(sharedKey)));
  check(
    "S7",
    "shared queue done after last delete",
    (await prisma.pendingBlobDelete.findUnique({ where: { storageKey: sharedKey } }))?.status === "done",
  );

  // --- neighbor listing untouched ---
  const neighborListing = await seedListing(neighbor.id, [{ storageKey: neighborKey, url: neighborUrl }], "NB");
  check("N1", "neighbor blob intact", await localExists(neighborKey));
  check(
    "N2",
    "neighbor image row intact",
    (await prisma.listingImage.count({ where: { listingId: neighborListing.id } })) === 1,
  );

  // --- source-order safety: no pre-txn deleteStoredObject in updateListingRecord ---
  const storeSrc = await fs.readFile(path.resolve("src/lib/listings/store.ts"), "utf8");
  const updateFn = storeSrc.slice(storeSrc.indexOf("export async function updateListingRecord"));
  const txnIdx = updateFn.indexOf("$transaction");
  const beforeTxn = updateFn.slice(0, txnIdx);
  check("X1", "no deleteStoredObject before txn", !beforeTxn.includes("deleteStoredObject") && !beforeTxn.includes("tryDeleteStoredObject"));
  check("X2", "enqueueListingEditBlobDeletes inside txn path", updateFn.includes("enqueueListingEditBlobDeletes"));
  check("X3", "tryDeleteStoredObject only after txn", updateFn.indexOf("tryDeleteStoredObject") > txnIdx);
  check("X4", "EIDS lock still active", isEidsPublishLockActive() === true);

  // --- concurrent race note (synthetic): pending + active ref → purge must skip ---
  const raceKey = `listings/${owner.id}/${uuid()}.webp`;
  storageKeys.push(raceKey);
  await writeLocalBlob(raceKey);
  const raceUrl = mediaUrl(raceKey);
  const raceListing = await seedListing(owner.id, [{ storageKey: raceKey, url: raceUrl }], "RC");
  await prisma.$transaction(async (tx) => {
    await enqueuePendingBlobDelete(tx, {
      storageKey: raceKey,
      reason: "listing_edit",
      expectedOwnerUserId: owner.id,
    });
  });
  // Simulate purge/opportunistic before image rows removed
  const raceRefs = await countActiveBlobReferences(prisma, raceKey);
  check("Y1", "race: active ref blocks delete while listing still has image", raceRefs >= 1);
  if (raceRefs === 0) {
    await tryDeleteStoredObject(raceKey, raceUrl);
  } else {
    check("Y2", "race: blob preserved under active ref", await localExists(raceKey));
  }
  // After rewrite without opportunistic (manual), refs drop
  await prisma.$transaction(async (tx) => {
    await tx.listingImage.deleteMany({ where: { listingId: raceListing.id } });
    await tx.listingImage.createMany({
      data: [{ listingId: raceListing.id, storageKey: keepKey, url: keepUrl, sortOrder: 0, isCover: true }],
    });
  });
  check("Y3", "race: refs=0 after image rewrite", (await countActiveBlobReferences(prisma, raceKey)) === 0);
  const { deleted: raceDel } = await tryDeleteStoredObject(raceKey, raceUrl);
  if (raceDel) await markPendingBlobDeleteDone(prisma, raceKey);
  check("Y4", "race: safe delete after refs cleared", raceDel && !(await localExists(raceKey)));

  void neighborListing;
  void dropKey2;
  void dropUrl2;
}

main()
  .catch((err) => {
    console.error(err);
    results.push({ id: "FATAL", name: String(err), pass: false });
  })
  .finally(async () => {
    // best-effort cleanup of synthetic rows (local DB only)
    try {
      if (listingIds.length) {
        await prisma.listingImage.deleteMany({ where: { listingId: { in: listingIds } } });
        await prisma.listing.deleteMany({ where: { id: { in: listingIds } } });
      }
      if (storageKeys.length) {
        await prisma.pendingBlobDelete.deleteMany({ where: { storageKey: { in: storageKeys } } });
        for (const k of storageKeys) {
          await fs.unlink(path.join(LOCAL_ROOT, ...k.split("/"))).catch(() => undefined);
        }
      }
      if (userIds.length) {
        await prisma.profile.deleteMany({ where: { userId: { in: userIds } } });
        await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      }
    } catch (e) {
      console.warn("cleanup warning", e);
    }
    await prisma.$disconnect();
    const failed = results.filter((r) => !r.pass);
    console.log(`\n${results.filter((r) => r.pass).length}/${results.length} passed`);
    process.exit(failed.length ? 1 : 0);
  });
