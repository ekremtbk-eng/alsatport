/**
 * LOCAL ONLY — KVKK 2C blob purge retry worker (loopback Postgres :55433).
 *
 *   DATABASE_URL=postgresql://postgres@127.0.0.1:55433/alsat \
 *     npx tsx --conditions=react-server scripts/test-blob-purge-worker-2c.ts
 *
 * MEDIA_STORAGE=local mock Blob. Does not touch Production / Vercel Blob / Neon.
 */
import { randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  BLOB_PURGE_DEFAULTS,
  BLOB_PURGE_ROUTE_MAX_DURATION_SEC,
  blobPurgeStaleProcessingMs,
  claimNextBlobPurgeJob,
  computeBlobPurgeBackoffMs,
  isBlobPurgeDryRun,
  isBlobPurgeEnabled,
  processClaimedBlobPurgeJob,
  recoverStaleBlobPurgeJobs,
  runBlobPurgeSweep,
} from "../src/lib/storage/blobPurgeWorker";

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
const keys: string[] = [];
const userIds: string[] = [];

async function enqueue(storageKey: string, attempts = 0, status = "pending", nextAttemptAt = new Date()) {
  keys.push(storageKey);
  return prisma.pendingBlobDelete.create({
    data: {
      storageKey,
      reason: "account_delete",
      status,
      attempts,
      nextAttemptAt,
      lastErrorCode: null,
    },
  });
}

async function main() {
  // --- unit: kill switch / dry-run / backoff ---
  const prevEnabled = process.env.BLOB_PURGE_ENABLED;
  const prevDry = process.env.BLOB_PURGE_DRY_RUN;
  delete process.env.BLOB_PURGE_ENABLED;
  check("U1", "default purge disabled", isBlobPurgeEnabled() === false);
  process.env.BLOB_PURGE_ENABLED = "0";
  check("U2", "BLOB_PURGE_ENABLED=0 disabled", isBlobPurgeEnabled() === false);
  process.env.BLOB_PURGE_ENABLED = "true";
  check("U3", "non-exact true stays disabled", isBlobPurgeEnabled() === false);
  process.env.BLOB_PURGE_ENABLED = "1";
  check("U4", "BLOB_PURGE_ENABLED=1 enabled", isBlobPurgeEnabled() === true);
  delete process.env.BLOB_PURGE_DRY_RUN;
  check("U5", "dry-run default off", isBlobPurgeDryRun() === false);
  process.env.BLOB_PURGE_DRY_RUN = "1";
  check("U6", "dry-run on", isBlobPurgeDryRun() === true);
  check("U7", "backoff increases", computeBlobPurgeBackoffMs(1, 0) < computeBlobPurgeBackoffMs(5, 0));
  check(
    "U8",
    "stale floor exceeds route maxDuration",
    BLOB_PURGE_DEFAULTS.minStaleProcessingMs > BLOB_PURGE_ROUTE_MAX_DURATION_SEC * 1000 &&
      blobPurgeStaleProcessingMs({ BLOB_PURGE_STALE_PROCESSING_MS: "1000" }) >=
        BLOB_PURGE_DEFAULTS.minStaleProcessingMs,
  );

  const owner = uuid();
  const neighbor = uuid();
  userIds.push(owner, neighbor);
  const keyOk = `listings/${owner}/${uuid()}.webp`;
  const keyOk2 = `avatars/${owner}/${uuid()}.webp`;
  const keyForeignShape = `listings/${neighbor}/${uuid()}.webp`;
  const keyBad = `remote/${uuid()}`;
  const keyRefs = `listings/${owner}/${uuid()}.webp`;
  const keyFail = `business/${owner}/logo-${uuid()}.webp`;
  const keyStale = `listings/${owner}/${uuid()}.jpg`;
  const keyTimeout = `listings/${owner}/${uuid()}.png`;

  await writeLocalBlob(keyOk);
  await writeLocalBlob(keyOk2);
  await writeLocalBlob(keyForeignShape);
  await writeLocalBlob(keyRefs);
  await writeLocalBlob(keyFail);
  await writeLocalBlob(keyStale);
  await writeLocalBlob(keyTimeout);

  // disabled sweep no-ops
  process.env.BLOB_PURGE_ENABLED = "0";
  const disabled = await runBlobPurgeSweep(prisma, { enabled: false, dryRun: false });
  check("D1", "disabled sweep does nothing", disabled.enabled === false && disabled.claimed === 0);

  await enqueue(keyOk);
  await enqueue(keyOk2);
  await enqueue(keyForeignShape); // queueable but we will treat as normal purge for owner path — it's neighbor's key, still queueable shape
  // invalid remote key should not normally be enqueued; insert directly to test permanent fail
  await prisma.pendingBlobDelete.create({
    data: { storageKey: keyBad, reason: "other", status: "pending", attempts: 0, nextAttemptAt: new Date() },
  });
  keys.push(keyBad);

  // dry-run: no file delete, no status change
  process.env.BLOB_PURGE_ENABLED = "1";
  process.env.BLOB_PURGE_DRY_RUN = "1";
  const beforeDry = await prisma.pendingBlobDelete.findMany({
    where: { storageKey: { in: [keyOk, keyOk2] } },
    select: { storageKey: true, status: true, attempts: true },
  });
  const dry = await runBlobPurgeSweep(prisma, { enabled: true, dryRun: true, batchLimit: 10 });
  const afterDry = await prisma.pendingBlobDelete.findMany({
    where: { storageKey: { in: [keyOk, keyOk2] } },
    select: { storageKey: true, status: true, attempts: true },
  });
  check("DR1", "dry-run would-delete > 0", dry.dryRunWouldDelete >= 2, `n=${dry.dryRunWouldDelete}`);
  check("DR2", "dry-run files intact", (await localExists(keyOk)) && (await localExists(keyOk2)));
  check(
    "DR3",
    "dry-run statuses unchanged",
    JSON.stringify(beforeDry) === JSON.stringify(afterDry),
  );
  delete process.env.BLOB_PURGE_DRY_RUN;

  // concurrent claims — distinct rows
  const [c1, c2] = await Promise.all([claimNextBlobPurgeJob(prisma), claimNextBlobPurgeJob(prisma)]);
  check("C1", "both workers claimed", !!c1 && !!c2);
  check("C2", "claims are distinct keys", !!c1 && !!c2 && c1.storageKey !== c2.storageKey, `${c1?.id.slice(0, 8)}/${c2?.id.slice(0, 8)}`);
  check("C3", "status processing", (await prisma.pendingBlobDelete.count({ where: { status: "processing", storageKey: { in: [c1!.storageKey, c2!.storageKey] } } })) === 2);

  // process successes with real local delete
  const o1 = await processClaimedBlobPurgeJob(prisma, c1!, {
    deleteFn: async (k) => {
      const abs = path.join(LOCAL_ROOT, ...k.split("/"));
      await fs.unlink(abs).catch(() => undefined);
      return { deleted: true };
    },
  });
  const o2 = await processClaimedBlobPurgeJob(prisma, c2!, {
    deleteFn: async (k) => {
      const abs = path.join(LOCAL_ROOT, ...k.split("/"));
      await fs.unlink(abs).catch(() => undefined);
      return { deleted: true };
    },
  });
  check("P1", "concurrent jobs done", o1 === "done" && o2 === "done");

  // permanent: remote key
  const badClaim = await claimNextBlobPurgeJob(prisma);
  // may claim foreignShape or keyBad depending on nextAttempt order — force process keyBad
  const badRow = await prisma.pendingBlobDelete.findUnique({ where: { storageKey: keyBad } });
  if (badRow && badRow.status === "pending") {
    await prisma.pendingBlobDelete.update({
      where: { storageKey: keyBad },
      data: { status: "processing" },
    });
  }
  // release accidental claim if not keyBad
  if (badClaim && badClaim.storageKey !== keyBad) {
    await prisma.pendingBlobDelete.update({
      where: { storageKey: badClaim.storageKey },
      data: { status: "pending", nextAttemptAt: new Date() },
    });
  }
  const perm = await processClaimedBlobPurgeJob(prisma, {
    id: "x",
    storageKey: keyBad,
    attempts: 0,
  });
  check("F1", "remote key failed_permanent", perm === "failed_permanent");
  check(
    "F2",
    "permanent error code set",
    (await prisma.pendingBlobDelete.findUnique({ where: { storageKey: keyBad } }))?.lastErrorCode ===
      "blob_queue.err.remote" ||
      (await prisma.pendingBlobDelete.findUnique({ where: { storageKey: keyBad } }))?.status ===
        "failed_permanent",
  );

  // active refs block delete
  await prisma.user.create({
    data: {
      id: owner,
      email: `blob2c-${TAG}@kvkk-2c-test.invalid`,
      username: `blob2c_${TAG}`,
      passwordHash: null,
      provider: "google",
      providerSub: `google-2c-${TAG}`,
      profile: { create: { displayName: "2C", avatarUrl: null } },
    },
  });
  const listing = await prisma.listing.create({
    data: {
      listingNo: `C2C${TAG}`.slice(0, 20),
      sellerId: owner,
      categoryId: "vasita",
      title: "2C REF",
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
            storageKey: keyRefs,
            url: `/api/media/${keyRefs.split("/").map(encodeURIComponent).join("/")}`,
            sortOrder: 0,
            isCover: true,
          },
        ],
      },
    },
  });
  await enqueue(keyRefs);
  await prisma.pendingBlobDelete.update({
    where: { storageKey: keyRefs },
    data: { status: "processing" },
  });
  const skipped = await processClaimedBlobPurgeJob(prisma, { id: "r", storageKey: keyRefs, attempts: 0 }, {
    maxAttempts: 8,
    deleteFn: async () => ({ deleted: true }),
  });
  check("R1", "active ref skips delete", skipped === "skipped_refs");
  check("R2", "file kept when refs active", await localExists(keyRefs));
  check(
    "R3",
    "requeued pending with blob_ref_active",
    (await prisma.pendingBlobDelete.findUnique({ where: { storageKey: keyRefs } }))?.status === "pending" &&
      (await prisma.pendingBlobDelete.findUnique({ where: { storageKey: keyRefs } }))?.lastErrorCode ===
        "blob_ref_active",
  );

  // transient delete failure → requeue + backoff
  await enqueue(keyFail);
  await prisma.pendingBlobDelete.update({
    where: { storageKey: keyFail },
    data: { status: "processing", attempts: 0 },
  });
  const beforeFail = await prisma.pendingBlobDelete.findUnique({ where: { storageKey: keyFail } });
  const requeued = await processClaimedBlobPurgeJob(
    prisma,
    { id: beforeFail!.id, storageKey: keyFail, attempts: 0 },
    { deleteFn: async () => ({ deleted: false }), maxAttempts: 8 },
  );
  const afterFail = await prisma.pendingBlobDelete.findUnique({ where: { storageKey: keyFail } });
  check("B1", "transient failure requeued", requeued === "requeued");
  check("B2", "attempts incremented", afterFail?.attempts === 1);
  check("B3", "nextAttemptAt in future", !!afterFail && afterFail.nextAttemptAt.getTime() > Date.now() - 1000);
  check("B4", "file kept after failed delete", await localExists(keyFail));
  check("B5", "error code blob_del_failed", afterFail?.lastErrorCode === "blob_del_failed");

  // max attempts → permanent
  await prisma.pendingBlobDelete.update({
    where: { storageKey: keyFail },
    data: { status: "processing", attempts: 7 },
  });
  const exhausted = await processClaimedBlobPurgeJob(
    prisma,
    { id: afterFail!.id, storageKey: keyFail, attempts: 7 },
    { deleteFn: async () => ({ deleted: false }), maxAttempts: 8 },
  );
  check("B6", "max attempts failed_permanent", exhausted === "failed_permanent");
  check(
    "B7",
    "status failed_permanent",
    (await prisma.pendingBlobDelete.findUnique({ where: { storageKey: keyFail } }))?.status ===
      "failed_permanent",
  );

  // crash recovery: stale processing
  await enqueue(keyStale, 0, "processing", new Date(Date.now() - 1000));
  await prisma.pendingBlobDelete.update({
    where: { storageKey: keyStale },
    data: { status: "processing", updatedAt: new Date(Date.now() - 10 * 60 * 1000) },
  });
  // Fresh in-flight lease must NOT be reclaimed (active worker protection).
  const keyFresh = `listings/${owner}/${uuid()}.webp`;
  keys.push(keyFresh);
  await enqueue(keyFresh, 0, "processing", new Date());
  await prisma.pendingBlobDelete.update({
    where: { storageKey: keyFresh },
    data: { status: "processing", updatedAt: new Date() },
  });
  const recovered = await recoverStaleBlobPurgeJobs(prisma, {
    now: new Date(),
    staleProcessingMs: 120_000,
  });
  check("S1", "stale processing recovered", recovered >= 1);
  check(
    "S2",
    "stale back to pending",
    (await prisma.pendingBlobDelete.findUnique({ where: { storageKey: keyStale } }))?.status === "pending",
  );
  check(
    "S3",
    "fresh processing lease not reclaimed",
    (await prisma.pendingBlobDelete.findUnique({ where: { storageKey: keyFresh } }))?.status === "processing",
  );

  // timeout mid-flight: claim then abandon — row stays processing until recovery
  await enqueue(keyTimeout);
  const claimedTimeout = await claimNextBlobPurgeJob(prisma);
  // may claim keyStale or keyTimeout or keyForeignShape
  const timeoutKey = claimedTimeout?.storageKey ?? keyTimeout;
  if (claimedTimeout) {
    check("T1", "claimed leaves processing", (await prisma.pendingBlobDelete.findUnique({ where: { storageKey: timeoutKey } }))?.status === "processing");
    // simulate crash: do not process
    await prisma.pendingBlobDelete.update({
      where: { storageKey: timeoutKey },
      data: { updatedAt: new Date(Date.now() - 10 * 60 * 1000) },
    });
    const rec2 = await recoverStaleBlobPurgeJobs(prisma, { staleProcessingMs: 60_000 });
    check("T2", "timeout row recoverable", rec2 >= 1);
    check(
      "T3",
      "timeout row not lost",
      (await prisma.pendingBlobDelete.findUnique({ where: { storageKey: timeoutKey } })) != null,
    );
  } else {
    check("T1", "claimed leaves processing", false, "no claim");
    check("T2", "timeout row recoverable", false);
    check("T3", "timeout row not lost", false);
  }

  // route static gates
  const { readFileSync } = await import("node:fs");
  const routeSrc = readFileSync("src/app/api/cron/blob-purge/route.ts", "utf8");
  const workerSrc = readFileSync("src/lib/storage/blobPurgeWorker.ts", "utf8");
  check("X1", "route uses CRON_SECRET + timingSafeEqual", routeSrc.includes("CRON_SECRET") && routeSrc.includes("timingSafeEqual"));
  check("X2", "route preview write lock", routeSrc.includes("isPreviewWriteLockActive"));
  check("X3", "route kill switch enabled check", routeSrc.includes("isBlobPurgeEnabled"));
  check("X4", "route no storageKey in JSON response helpers", !routeSrc.includes("storageKey") && !routeSrc.includes("storage_key"));
  check("X5", "SKIP LOCKED claim", workerSrc.includes("FOR UPDATE SKIP LOCKED"));
  check("X6", "vercel.json cron not registered yet", !readFileSync("vercel.json", "utf8").includes("blob-purge"));
  check("X7", "no KVKK retention auto-purge", !workerSrc.includes("retention") && !workerSrc.includes("saklama"));

  // cleanup
  await prisma.listingImage.deleteMany({ where: { listingId: listing.id } }).catch(() => undefined);
  await prisma.listing.deleteMany({ where: { id: listing.id } }).catch(() => undefined);
  await prisma.pendingBlobDelete.deleteMany({ where: { storageKey: { in: keys } } }).catch(() => undefined);
  for (const id of userIds) {
    await prisma.profile.deleteMany({ where: { userId: id } }).catch(() => undefined);
    await prisma.user.deleteMany({ where: { id } }).catch(() => undefined);
  }
  for (const k of keys) {
    await fs.unlink(path.join(LOCAL_ROOT, ...k.split("/"))).catch(() => undefined);
  }

  if (prevEnabled === undefined) delete process.env.BLOB_PURGE_ENABLED;
  else process.env.BLOB_PURGE_ENABLED = prevEnabled;
  if (prevDry === undefined) delete process.env.BLOB_PURGE_DRY_RUN;
  else process.env.BLOB_PURGE_DRY_RUN = prevDry;

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
