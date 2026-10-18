/**
 * LOCAL ONLY — KVKK 2A pending blob delete queue (loopback Postgres :55433).
 *
 *   DATABASE_URL=postgresql://postgres@127.0.0.1:55433/alsat \
 *     npx tsx --conditions=react-server scripts/test-blob-delete-queue-2a.ts
 *
 * Does not call Vercel Blob. Does not touch Production.
 */
import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import {
  assertOwnBlobUrlOrMediaPath,
  assertQueueableBlobKey,
  countActiveBlobReferences,
  enqueuePendingBlobDelete,
} from "../src/lib/storage/blobDeleteQueue";

const DB = process.env.DATABASE_URL ?? "";

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

assertLoopback();
const prisma = new PrismaClient();
const TAG = randomBytes(3).toString("hex");
const ownerA = uuid();
const ownerB = uuid();
const keyA = `listings/${ownerA}/${uuid()}.webp`;
const keyB = `avatars/${ownerB}/${uuid()}.webp`;

async function main() {
  // --- unit gates (no DB) ---
  check("U1", "managed listing key ok", assertQueueableBlobKey(keyA, ownerA).ok === true);
  check("U2", "reject other owner", assertQueueableBlobKey(keyA, ownerB).ok === false);
  check("U3", "reject path traversal", assertQueueableBlobKey(`listings/${ownerA}/../etc/passwd`, ownerA).ok === false);
  check("U4", "reject remote key", assertQueueableBlobKey(`remote/${uuid()}`, ownerA).ok === false);
  check("U5", "reject unmanaged prefix", assertQueueableBlobKey(`uploads/${ownerA}/${uuid()}.webp`, ownerA).ok === false);
  check("U6", "reject backslash", assertQueueableBlobKey(`listings\\${ownerA}\\x.webp`, ownerA).ok === false);

  process.env.BLOB_PUBLIC_HOST = "teststore.public.blob.vercel-storage.com";
  const ownUrl = `https://teststore.public.blob.vercel-storage.com/${keyA}`;
  const foreignUrl = `https://evil.public.blob.vercel-storage.com/${keyA}`;
  const unsplash = "https://images.unsplash.com/photo-1555215695-3004980ad54e";
  check("U7", "own-host URL accepted", assertOwnBlobUrlOrMediaPath(ownUrl).ok === true);
  check("U8", "foreign blob host rejected", assertOwnBlobUrlOrMediaPath(foreignUrl).ok === false);
  check("U9", "unsplash rejected", assertOwnBlobUrlOrMediaPath(unsplash).ok === false);
  check(
    "U10",
    "local media path accepted",
    assertOwnBlobUrlOrMediaPath(`/api/media/${keyA.split("/").map(encodeURIComponent).join("/")}`).ok === true,
  );

  const createdIds: string[] = [];
  try {
    const created = await prisma.$transaction((tx) =>
      enqueuePendingBlobDelete(tx, { storageKey: keyA, reason: "account_delete", expectedOwnerUserId: ownerA }),
    );
    check("E1", "enqueue create", created.ok && created.outcome === "created", JSON.stringify(created));
    if (created.ok) createdIds.push(created.id);

    const again = await prisma.$transaction((tx) =>
      enqueuePendingBlobDelete(tx, { storageKey: keyA, reason: "account_delete", expectedOwnerUserId: ownerA }),
    );
    check("E2", "idempotent pending", again.ok && again.outcome === "already_pending");

    const count = await prisma.pendingBlobDelete.count({ where: { storageKey: keyA } });
    check("E3", "unique storage_key (one row)", count === 1);

    // mark done then re-enqueue → already_done (no reopen)
    await prisma.pendingBlobDelete.update({
      where: { storageKey: keyA },
      data: { status: "done", processedAt: new Date() },
    });
    const afterDone = await prisma.$transaction((tx) =>
      enqueuePendingBlobDelete(tx, { storageKey: keyA, reason: "listing_edit", expectedOwnerUserId: ownerA }),
    );
    check("E4", "done stays done", afterDone.ok && afterDone.outcome === "already_done");
    const stillDone = await prisma.pendingBlobDelete.findUnique({ where: { storageKey: keyA } });
    check("E5", "status remains done", stillDone?.status === "done");

    // failed_permanent → reopen
    await prisma.pendingBlobDelete.update({
      where: { storageKey: keyA },
      data: { status: "failed_permanent", lastErrorCode: "blob_del_failed", attempts: 9 },
    });
    const reopened = await prisma.$transaction((tx) =>
      enqueuePendingBlobDelete(tx, { storageKey: keyA, reason: "account_delete", expectedOwnerUserId: ownerA }),
    );
    check("E6", "failed_permanent reopened", reopened.ok && reopened.outcome === "reopened");
    const afterReopen = await prisma.pendingBlobDelete.findUnique({ where: { storageKey: keyA } });
    check("E7", "reopen clears attempts/error", afterReopen?.status === "pending" && afterReopen.attempts === 0 && !afterReopen.lastErrorCode);

    // reject cross-owner enqueue
    const cross = await enqueuePendingBlobDelete(prisma, {
      storageKey: keyA,
      reason: "account_delete",
      expectedOwnerUserId: ownerB,
    });
    check("E8", "cross-owner rejected", !cross.ok && cross.error === "blob_queue.err.owner");

    // no PII columns on row
    const row = await prisma.pendingBlobDelete.findUnique({ where: { storageKey: keyA } });
    const json = JSON.stringify(row);
    check(
      "P1",
      "row has no url/email/ip/token fields",
      !!row &&
        !("url" in (row as object)) &&
        !json.includes("@") &&
        !json.toLowerCase().includes("token") &&
        !json.includes("BLOB_"),
    );

    // rollback: enqueue then throw
    const rollKey = `listings/${ownerA}/${uuid()}.jpg`;
    try {
      await prisma.$transaction(async (tx) => {
        const r = await enqueuePendingBlobDelete(tx, {
          storageKey: rollKey,
          reason: "listing_edit",
          expectedOwnerUserId: ownerA,
        });
        check("R0", "rollback path enqueued", r.ok && r.outcome === "created");
        throw new Error("forced-rollback");
      });
    } catch (e) {
      check("R1", "rollback threw", e instanceof Error && e.message === "forced-rollback");
    }
    const rolled = await prisma.pendingBlobDelete.findUnique({ where: { storageKey: rollKey } });
    check("R2", "rollback drops queue row", rolled == null);

    // refcount: no refs → 0; with listing image → ≥1
    const refs0 = await countActiveBlobReferences(prisma, keyB);
    check("C1", "refcount zero for unused key", refs0 === 0, `n=${refs0}`);

    // seed minimal user+listing+image for keyB owner path under ownerA listing key
    const imgKey = `listings/${ownerA}/${uuid()}.webp`;
    const user = await prisma.user.create({
      data: {
        id: ownerA,
        email: `blob2a-${TAG}@kvkk-2a-test.invalid`,
        username: `blob2a_${TAG}`,
        passwordHash: null,
        provider: "google",
        providerSub: `google-${TAG}`,
        profile: { create: { displayName: "Blob2A", avatarUrl: null } },
      },
    });
    createdIds.push(user.id);
    // category vasita must exist
    const listing = await prisma.listing.create({
      data: {
        listingNo: `B2A${TAG}`.slice(0, 20),
        sellerId: ownerA,
        categoryId: "vasita",
        title: "BLOB 2A TEST",
        description: "synthetic",
        price: 1,
        currency: "TRY",
        city: "Lefkoşa",
        status: "active",
        postedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400_000),
        images: {
          create: [{ storageKey: imgKey, url: `/api/media/${imgKey.split("/").map(encodeURIComponent).join("/")}`, sortOrder: 0, isCover: true }],
        },
      },
    });
    const refs1 = await countActiveBlobReferences(prisma, imgKey);
    check("C2", "refcount finds listing image", refs1 >= 1, `n=${refs1}`);

    // HTTPS own-host avatar URL must count (Production shape)
    process.env.BLOB_PUBLIC_HOST = "teststore.public.blob.vercel-storage.com";
    const avKey = `avatars/${ownerA}/${uuid()}.webp`;
    const avHttps = `https://teststore.public.blob.vercel-storage.com/${avKey}`;
    await prisma.profile.update({ where: { userId: ownerA }, data: { avatarUrl: avHttps } });
    const refsAv = await countActiveBlobReferences(prisma, avKey);
    check("C2b", "refcount finds https avatar URL", refsAv >= 1, `n=${refsAv}`);
    await prisma.profile.update({ where: { userId: ownerA }, data: { avatarUrl: null } });

    // cleanup listing images via cascade when we delete listing/user
    await prisma.listingImage.deleteMany({ where: { listingId: listing.id } });
    await prisma.listing.delete({ where: { id: listing.id } });
    const refs2 = await countActiveBlobReferences(prisma, imgKey);
    check("C3", "refcount zero after image removed", refs2 === 0);

    // 2B wires account delete to the queue (enqueueAccountBlobDeletes).
    const { readFileSync } = await import("node:fs");
    const delRoute = readFileSync("src/app/api/account/delete/route.ts", "utf8");
    check(
      "X1",
      "account delete wires enqueueAccountBlobDeletes",
      delRoute.includes("enqueueAccountBlobDeletes") && delRoute.includes("markPendingBlobDeleteDone"),
    );
  } finally {
    await prisma.pendingBlobDelete.deleteMany({
      where: { OR: [{ storageKey: { startsWith: `listings/${ownerA}/` } }, { storageKey: keyA }, { storageKey: keyB }] },
    });
    await prisma.notification.deleteMany({ where: { userId: ownerA } }).catch(() => undefined);
    await prisma.userSession.deleteMany({ where: { userId: ownerA } }).catch(() => undefined);
    await prisma.profile.deleteMany({ where: { userId: ownerA } }).catch(() => undefined);
    await prisma.user.deleteMany({ where: { id: ownerA } }).catch(() => undefined);
    await prisma.$disconnect();
  }

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length) {
    console.error("FAILED:", failed.map((f) => f.id).join(", "));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
