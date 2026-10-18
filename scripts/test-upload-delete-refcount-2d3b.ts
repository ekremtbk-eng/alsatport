/**
 * LOCAL ONLY — KVKK 2D-3B DELETE /api/uploads refcount + enqueue-before-delete (loopback :55433).
 *
 *   DATABASE_URL=postgresql://postgres@127.0.0.1:55433/alsat \
 *     npx tsx --conditions=react-server scripts/test-upload-delete-refcount-2d3b.ts
 */
import fs from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import {
  countActiveBlobReferences,
  discardUnreferencedListingUpload,
} from "../src/lib/storage/blobDeleteQueue";
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
  if (await prisma.category.findUnique({ where: { id: CATEGORY } })) return;
  await prisma.category.create({
    data: { id: CATEGORY, slug: CATEGORY, name: "Cep Telefonu", sortOrder: 0 },
  });
}

async function seedUser() {
  const id = uuid();
  await prisma.user.create({
    data: {
      id,
      email: `kvkk-2d3b-${TAG}-${id.slice(0, 8)}@kvkk-2d3b-test.invalid`,
      username: `kvkk2d3b_${TAG}_${id.slice(0, 8)}`,
      passwordHash: "x",
      provider: "email",
      role: "member",
      emailVerifiedAt: new Date(),
      profile: { create: { displayName: "KVKK 2D3B", fullName: "KVKK 2D3B", city: "İstanbul" } },
    },
  });
  userIds.push(id);
  return id;
}

async function attachListing(sellerId: string, storageKey: string, suffix: string) {
  const row = await prisma.listing.create({
    data: {
      listingNo: `D3B${TAG}${suffix}`.slice(0, 20),
      sellerId,
      categoryId: CATEGORY,
      title: "BLOB 2D3B LISTED",
      description: "synthetic listed photo for upload delete refcount",
      price: 10,
      currency: "TRY",
      city: "İstanbul",
      district: "Kadıköy",
      status: "active",
      postedAt: new Date(),
      expiresAt: new Date(Date.now() + 86400_000),
      images: {
        create: [{ storageKey, url: mediaUrl(storageKey), sortOrder: 0, isCover: true }],
      },
    },
  });
  listingIds.push(row.id);
  return row;
}

async function main() {
  await ensureCategory();
  const owner = await seedUser();
  const neighbor = await seedUser();

  const draftKey = `listings/${owner}/${uuid()}.webp`;
  const listedKey = `listings/${owner}/${uuid()}.webp`;
  const raceKey = `listings/${owner}/${uuid()}.webp`;
  const interruptKey = `listings/${owner}/${uuid()}.webp`;
  const failKey = `listings/${owner}/${uuid()}.webp`;
  const neighborKey = `listings/${neighbor}/${uuid()}.webp`;
  const traversal = `listings/${owner}/../${uuid()}.webp`;
  storageKeys.push(draftKey, listedKey, raceKey, interruptKey, failKey, neighborKey);

  for (const k of [draftKey, listedKey, raceKey, interruptKey, failKey, neighborKey]) {
    await writeLocalBlob(k);
  }

  // --- ownership ---
  check(
    "O1",
    "neighbor key forbidden",
    !(await discardUnreferencedListingUpload(prisma, { userId: owner, storageKey: neighborKey })).ok,
  );
  check("O2", "neighbor blob intact", await localExists(neighborKey));
  check(
    "O3",
    "traversal forbidden",
    !(await discardUnreferencedListingUpload(prisma, { userId: owner, storageKey: traversal })).ok,
  );

  // --- happy path: enqueue then delete then done ---
  const draftDel = await discardUnreferencedListingUpload(prisma, {
    userId: owner,
    storageKey: draftKey,
  });
  check("D1", "unreferenced draft deleted", draftDel.ok && draftDel.deleted === true);
  check("D2", "draft blob gone", !(await localExists(draftKey)));
  check(
    "D3",
    "queue marked done after success",
    (await prisma.pendingBlobDelete.findUnique({ where: { storageKey: draftKey } }))?.status === "done",
  );

  // --- in use: 409, no enqueue, no delete ---
  await attachListing(owner, listedKey, "L");
  const listedDel = await discardUnreferencedListingUpload(prisma, {
    userId: owner,
    storageKey: listedKey,
  });
  check(
    "L1",
    "in-use 409 deferred",
    !listedDel.ok && listedDel.status === 409 && listedDel.deferred === true && listedDel.error === "photo.err.inUse",
  );
  check("L2", "in-use blob preserved", await localExists(listedKey));
  check(
    "L3",
    "in-use must not enqueue",
    (await prisma.pendingBlobDelete.findUnique({ where: { storageKey: listedKey } })) == null,
  );

  // --- enqueue failure → no delete ---
  const enqFailDb = {
    listingImage: prisma.listingImage,
    profile: prisma.profile,
    businessAccount: prisma.businessAccount,
    pendingBlobDelete: prisma.pendingBlobDelete,
    $transaction: async <T>(_fn: (tx: never) => Promise<T>): Promise<T> => {
      throw new Error("force_enqueue_fail");
    },
  };
  const enqFail = await discardUnreferencedListingUpload(enqFailDb, {
    userId: owner,
    storageKey: failKey,
  });
  check("E1", "enqueue fail returns 500", !enqFail.ok && enqFail.status === 500);
  check("E2", "enqueue fail leaves blob", await localExists(failKey));
  check(
    "E3",
    "enqueue fail leaves no queue row",
    (await prisma.pendingBlobDelete.findUnique({ where: { storageKey: failKey } })) == null,
  );

  // --- interrupt after enqueue: queue survives, blob survives ---
  let interrupted = false;
  try {
    await discardUnreferencedListingUpload(prisma, {
      userId: owner,
      storageKey: interruptKey,
      afterEnqueue: async () => {
        interrupted = true;
        throw new Error("force_interrupt_after_enqueue");
      },
    });
  } catch (e) {
    check(
      "I0",
      "interrupt thrown after enqueue",
      interrupted && e instanceof Error && e.message === "force_interrupt_after_enqueue",
    );
  }
  check("I1", "interrupt keeps blob", await localExists(interruptKey));
  check(
    "I2",
    "interrupt keeps pending queue row",
    (await prisma.pendingBlobDelete.findUnique({ where: { storageKey: interruptKey } }))?.status === "pending",
  );

  // --- TOCTOU: attach between enqueue and delete → 409, blob kept, pending kept ---
  const race = await discardUnreferencedListingUpload(prisma, {
    userId: owner,
    storageKey: raceKey,
    afterEnqueue: async () => {
      await attachListing(owner, raceKey, "R");
    },
  });
  check(
    "T1",
    "post-enqueue attach → 409",
    !race.ok && race.status === 409 && race.error === "photo.err.inUse",
  );
  check("T2", "TOCTOU blob preserved", await localExists(raceKey));
  check(
    "T3",
    "TOCTOU pending retained (worker will refcount)",
    (await prisma.pendingBlobDelete.findUnique({ where: { storageKey: raceKey } }))?.status === "pending",
  );
  check("T4", "listing still references key", (await countActiveBlobReferences(prisma, raceKey)) >= 1);

  // --- deleteFn fails after enqueue → pending remains ---
  const softKey = `listings/${owner}/${uuid()}.webp`;
  storageKeys.push(softKey);
  await writeLocalBlob(softKey);
  const soft = await discardUnreferencedListingUpload(prisma, {
    userId: owner,
    storageKey: softKey,
    deleteFn: async () => ({ deleted: false }),
  });
  check("F1", "failed physical delete keeps ok+pending", soft.ok && soft.pending === true && soft.deleted === false);
  check("F2", "failed delete blob intact", await localExists(softKey));
  check(
    "F3",
    "failed delete queue stays pending",
    (await prisma.pendingBlobDelete.findUnique({ where: { storageKey: softKey } }))?.status === "pending",
  );

  // --- PhotoUploader source: await 409 keeps form ---
  const uploaderSrc = await fs.readFile(path.resolve("src/components/PhotoUploader.tsx"), "utf8");
  check("U1", "PhotoUploader awaits apiDelete", uploaderSrc.includes("await apiDelete"));
  check("U2", "PhotoUploader returns early on 409", uploaderSrc.includes('res.status === 409') && uploaderSrc.includes("return;"));
  check("U3", "PhotoUploader shows photo.err.inUse", uploaderSrc.includes('t("photo.err.inUse")'));

  const helperSrc = await fs.readFile(path.resolve("src/lib/storage/blobDeleteQueue.ts"), "utf8");
  const discardFn = helperSrc.slice(helperSrc.indexOf("export async function discardUnreferencedListingUpload"));
  const enqIdx = discardFn.indexOf("enqueuePendingBlobDelete");
  const delIdx = discardFn.indexOf("await deleteFn(");
  check("X1", "enqueue before await deleteFn in helper", enqIdx > 0 && delIdx > enqIdx);
  check("X2", "post-enqueue refcount recheck present", discardFn.includes("refsAfter"));
  check("X3", "EIDS still active", isEidsPublishLockActive() === true);
}

main()
  .catch((err) => {
    console.error(err);
    results.push({ id: "FATAL", name: String(err), pass: false });
  })
  .finally(async () => {
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
