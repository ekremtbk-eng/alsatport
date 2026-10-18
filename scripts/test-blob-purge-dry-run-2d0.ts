/**
 * LOCAL ONLY — KVKK 2D-0 dry-run safety (loopback Postgres :55433).
 *
 *   DATABASE_URL=postgresql://postgres@127.0.0.1:55433/alsat \
 *     npx tsx --conditions=react-server scripts/test-blob-purge-dry-run-2d0.ts
 *
 * Verifies dry-run is independent of BLOB_PURGE_ENABLED and never mutates DB / Blob.
 */
import { randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  isBlobPurgeDryRun,
  isBlobPurgeEnabled,
  runBlobPurgeSweep,
} from "../src/lib/storage/blobPurgeWorker";

process.env.MEDIA_STORAGE = "local";
delete process.env.BLOB_READ_WRITE_TOKEN;
delete process.env.BLOB_PUBLIC_HOST;

const DB = process.env.DATABASE_URL ?? "";
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

assertLoopback();
const prisma = new PrismaClient();

async function snapshotQueue(storageKey: string) {
  return prisma.pendingBlobDelete.findUnique({
    where: { storageKey },
    select: { status: true, attempts: true, nextAttemptAt: true, lastErrorCode: true, processedAt: true, updatedAt: true },
  });
}

async function main() {
  const owner = uuid();
  const key = `listings/${owner}/${uuid()}.webp`;
  const abs = path.join(LOCAL_ROOT, ...key.split("/"));
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));

  await prisma.pendingBlobDelete.create({
    data: {
      storageKey: key,
      reason: "listing_edit",
      status: "pending",
      attempts: 0,
      nextAttemptAt: new Date(Date.now() - 1000),
    },
  });

  let deleteCalls = 0;
  const trackingDelete = async () => {
    deleteCalls += 1;
    return { deleted: true };
  };

  const before = await snapshotQueue(key);
  const fileBefore = await fs.access(abs).then(() => true).catch(() => false);

  // --- env gate unit ---
  check("E1", "ENABLED default off", isBlobPurgeEnabled({}) === false);
  check("E2", "ENABLED=yes fail-closed", isBlobPurgeEnabled({ BLOB_PURGE_ENABLED: "yes" }) === false);
  check("E3", "ENABLED=1 on", isBlobPurgeEnabled({ BLOB_PURGE_ENABLED: "1" }) === true);
  check("E4", "DRY_RUN default off", isBlobPurgeDryRun({}) === false);
  check("E5", "DRY_RUN=yes fail-closed", isBlobPurgeDryRun({ BLOB_PURGE_DRY_RUN: "yes" }) === false);
  check("E6", "DRY_RUN=1 on", isBlobPurgeDryRun({ BLOB_PURGE_DRY_RUN: "1" }) === true);

  // Combo A: ENABLED=0 DRY_RUN=0 → disabled no-op
  deleteCalls = 0;
  const a = await runBlobPurgeSweep(prisma, {
    enabled: false,
    dryRun: false,
    deleteFn: trackingDelete,
  });
  check("A1", "0/0 disabled", a.enabled === false && a.dryRun === false && a.claimed === 0 && a.done === 0);
  check("A2", "0/0 no deleteFn calls", deleteCalls === 0);
  check("A3", "0/0 queue unchanged", JSON.stringify(await snapshotQueue(key)) === JSON.stringify(before));

  // Combo B: ENABLED=0 DRY_RUN=1 → read-only dry-run
  deleteCalls = 0;
  const b = await runBlobPurgeSweep(prisma, {
    enabled: false,
    dryRun: true,
    deleteFn: trackingDelete,
  });
  check("B1", "0/1 dry-run runs", b.dryRun === true && b.enabled === false && b.dryRunWouldDelete >= 1);
  check("B2", "0/1 no Blob delete", deleteCalls === 0);
  check("B3", "0/1 no DB mutation", JSON.stringify(await snapshotQueue(key)) === JSON.stringify(before));
  check("B4", "0/1 file intact", (await fs.access(abs).then(() => true).catch(() => false)) === fileBefore);
  check("B5", "0/1 no recoveredStale/done", b.recoveredStale === 0 && b.done === 0 && b.requeued === 0);

  // Combo C: ENABLED=1 DRY_RUN=1 → still dry-run only
  deleteCalls = 0;
  const c = await runBlobPurgeSweep(prisma, {
    enabled: true,
    dryRun: true,
    deleteFn: trackingDelete,
  });
  check("C1", "1/1 forces dry-run", c.dryRun === true && c.enabled === true && c.dryRunWouldDelete >= 1);
  check("C2", "1/1 no Blob delete despite ENABLED", deleteCalls === 0);
  check("C3", "1/1 no DB mutation", JSON.stringify(await snapshotQueue(key)) === JSON.stringify(before));
  check("C4", "1/1 no claim side-effects", (await prisma.pendingBlobDelete.findUnique({ where: { storageKey: key } }))?.status === "pending");

  // Combo D: ENABLED=1 DRY_RUN=0 → destructive path (mock only, local)
  deleteCalls = 0;
  const d = await runBlobPurgeSweep(prisma, {
    enabled: true,
    dryRun: false,
    deleteFn: trackingDelete,
    batchLimit: 5,
  });
  check("D1", "1/0 destructive armed", d.enabled === true && d.dryRun === false && d.claimed >= 1);
  check("D2", "1/0 deleteFn invoked", deleteCalls >= 1);
  check("D3", "1/0 marked done", (await prisma.pendingBlobDelete.findUnique({ where: { storageKey: key } }))?.status === "done");

  // Route static: dry-run before disabled; auth before sweep; no storageKey in responses
  const { readFileSync } = await import("node:fs");
  const routeSrc = readFileSync("src/app/api/cron/blob-purge/route.ts", "utf8");
  const handlerSrc = routeSrc.slice(routeSrc.indexOf("export async function GET"));
  const dryIdx = handlerSrc.indexOf("if (dryRun)");
  const disabledIdx = handlerSrc.indexOf("blob_purge.disabled");
  const authIdx = handlerSrc.indexOf("if (!authorized");
  const sweepIdx = handlerSrc.indexOf("runBlobPurgeSweep");
  check("X1", "auth before sweep in GET", authIdx >= 0 && sweepIdx >= 0 && authIdx < sweepIdx);
  check("X2", "dry-run branch before disabled message", dryIdx >= 0 && dryIdx < disabledIdx);
  check("X3", "preview lock before auth", handlerSrc.indexOf("isPreviewWriteLockActive") < authIdx);
  check("X4", "route response has no storageKey fields", !routeSrc.includes("storageKey") && !routeSrc.includes("storage_key"));
  check("X5", "CRON_SECRET + timingSafeEqual", routeSrc.includes("CRON_SECRET") && routeSrc.includes("timingSafeEqual"));

  // Worker: dry-run path never calls recover/claim (source)
  const workerSrc = readFileSync("src/lib/storage/blobPurgeWorker.ts", "utf8");
  const dryBlock = workerSrc.slice(workerSrc.indexOf("if (dryRun)"), workerSrc.indexOf("if (!enabled) return result"));
  check("X6", "dry-run block has no claimNext", !dryBlock.includes("claimNextBlobPurgeJob"));
  check("X7", "dry-run block has no recoverStale", !dryBlock.includes("recoverStaleBlobPurgeJobs"));
  check("X8", "dry-run block has no processClaimed", !dryBlock.includes("processClaimedBlobPurgeJob"));

  await prisma.pendingBlobDelete.deleteMany({ where: { storageKey: key } }).catch(() => undefined);
  await fs.unlink(abs).catch(() => undefined);
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
