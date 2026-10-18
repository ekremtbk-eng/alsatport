import "server-only";
import type { Prisma } from "@prisma/client";
import {
  assertQueueableBlobKey,
  countActiveBlobReferences,
  type BlobDeleteQueueTx,
} from "@/lib/storage/blobDeleteQueue";
import { tryDeleteStoredObject } from "@/lib/storage/media";

/**
 * Structural DB surface for the purge worker — accepts the Preview-locked
 * extended Prisma client from `@/lib/db` as well as a plain PrismaClient in tests.
 */
export type BlobPurgeDb = BlobDeleteQueueTx & {
  pendingBlobDelete: BlobDeleteQueueTx["pendingBlobDelete"] & {
    findMany: (args: {
      where: Prisma.PendingBlobDeleteWhereInput;
      orderBy?: Prisma.PendingBlobDeleteOrderByWithRelationInput;
      take?: number;
      select: { storageKey: true };
    }) => Promise<Array<{ storageKey: string }>>;
    updateMany: (args: {
      where: Prisma.PendingBlobDeleteWhereInput;
      data: {
        status?: string;
        attempts?: number;
        nextAttemptAt?: Date;
        lastErrorCode?: string | null;
        processedAt?: Date | null;
      };
    }) => Promise<{ count: number }>;
  };
  $queryRaw: <T = unknown>(query: TemplateStringsArray, ...values: unknown[]) => Promise<T>;
};

type EnvBag = Record<string, string | undefined>;

/** Fail-closed: only the exact string `"1"` enables destructive purge work. */
export function isBlobPurgeEnabled(env: EnvBag = process.env): boolean {
  return (env.BLOB_PURGE_ENABLED ?? "0").trim() === "1";
}

export function isBlobPurgeDryRun(env: EnvBag = process.env): boolean {
  const v = (env.BLOB_PURGE_DRY_RUN ?? "").trim();
  return v === "1" || v.toLowerCase() === "true";
}

/** Must stay below `BLOB_PURGE_DEFAULTS.staleProcessingMs` (and the env clamp minimum). */
export const BLOB_PURGE_ROUTE_MAX_DURATION_SEC = 60;

export const BLOB_PURGE_DEFAULTS = {
  batchLimit: 20,
  maxAttempts: 8,
  /**
   * Recover rows left in `processing` after a crashed worker.
   * Must exceed the cron `maxDuration` (60s) so an in-flight lease is not stolen.
   */
  staleProcessingMs: 5 * 60 * 1000,
  /** Floor for env override — always > route maxDuration. */
  minStaleProcessingMs: 2 * 60 * 1000,
  baseBackoffMs: 60_000,
  maxBackoffMs: 6 * 60 * 60 * 1000,
} as const;

export type BlobPurgeDeleteFn = (storageKey: string) => Promise<{ deleted: boolean }>;

export type BlobPurgeJobOutcome = "done" | "skipped_refs" | "requeued" | "failed_permanent";

export type BlobPurgeSweepResult = {
  enabled: boolean;
  dryRun: boolean;
  recoveredStale: number;
  claimed: number;
  done: number;
  requeued: number;
  failedPermanent: number;
  skippedRefs: number;
  dryRunWouldDelete: number;
  dryRunWouldSkip: number;
};

type ClaimedRow = {
  id: string;
  storage_key: string;
  reason: string;
  status: string;
  attempts: number;
};

function clampInt(raw: string | undefined, fallback: number, min: number, max: number): number {
  const n = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function blobPurgeBatchLimit(env: EnvBag = process.env): number {
  return clampInt(env.BLOB_PURGE_BATCH_LIMIT, BLOB_PURGE_DEFAULTS.batchLimit, 1, 100);
}

export function blobPurgeMaxAttempts(env: EnvBag = process.env): number {
  return clampInt(env.BLOB_PURGE_MAX_ATTEMPTS, BLOB_PURGE_DEFAULTS.maxAttempts, 1, 30);
}

export function blobPurgeStaleProcessingMs(env: EnvBag = process.env): number {
  return clampInt(
    env.BLOB_PURGE_STALE_PROCESSING_MS,
    BLOB_PURGE_DEFAULTS.staleProcessingMs,
    BLOB_PURGE_DEFAULTS.minStaleProcessingMs,
    3_600_000,
  );
}

/** Exponential backoff with small deterministic jitter from attempts (no randomness needed for tests). */
export function computeBlobPurgeBackoffMs(attemptsAfterFailure: number, nowMs = Date.now()): number {
  const exp = Math.min(
    BLOB_PURGE_DEFAULTS.maxBackoffMs,
    BLOB_PURGE_DEFAULTS.baseBackoffMs * 2 ** Math.max(0, attemptsAfterFailure - 1),
  );
  const jitter = (nowMs + attemptsAfterFailure * 17) % Math.min(5_000, Math.floor(exp / 10) + 1);
  return Math.min(BLOB_PURGE_DEFAULTS.maxBackoffMs, exp + jitter);
}

/**
 * Reclaim crashed workers' leases.
 * Only `processing` rows whose `updatedAt` is older than the stale window are touched —
 * a freshly claimed in-flight lease (updated_at ≈ now) is never reclaimed.
 */
export async function recoverStaleBlobPurgeJobs(
  prisma: BlobPurgeDb,
  opts: { now?: Date; staleProcessingMs?: number } = {},
): Promise<number> {
  const now = opts.now ?? new Date();
  const staleMs = opts.staleProcessingMs ?? blobPurgeStaleProcessingMs();
  const cutoff = new Date(now.getTime() - staleMs);
  const res = await prisma.pendingBlobDelete.updateMany({
    where: { status: "processing", updatedAt: { lt: cutoff } },
    data: {
      status: "pending",
      nextAttemptAt: now,
      lastErrorCode: "blob_stale_processing",
    },
  });
  return res.count;
}

/**
 * Atomically claim one due job (`pending` + `next_attempt_at <= now`) via SKIP LOCKED.
 * Concurrent workers cannot claim the same row.
 */
export async function claimNextBlobPurgeJob(
  prisma: BlobPurgeDb,
  now: Date = new Date(),
): Promise<{ id: string; storageKey: string; reason: string; attempts: number } | null> {
  const rows = await prisma.$queryRaw<ClaimedRow[]>`
    UPDATE pending_blob_deletes AS p
    SET
      status = 'processing',
      updated_at = ${now}
    WHERE p.id = (
      SELECT id
      FROM pending_blob_deletes
      WHERE status = 'pending'
        AND next_attempt_at <= ${now}
      ORDER BY next_attempt_at ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    RETURNING p.id, p.storage_key, p.reason, p.status, p.attempts
  `;
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    storageKey: row.storage_key,
    reason: row.reason,
    attempts: row.attempts,
  };
}

/** Update only while we still hold the `processing` lease — no-op if another worker reclaimed. */
async function updateWhileProcessing(
  prisma: BlobPurgeDb,
  storageKey: string,
  data: {
    status: string;
    attempts: number;
    lastErrorCode: string | null;
    nextAttemptAt: Date;
    processedAt: Date | null;
  },
): Promise<boolean> {
  const res = await prisma.pendingBlobDelete.updateMany({
    where: { storageKey, status: "processing" },
    data,
  });
  return res.count === 1;
}

async function markFailedPermanent(
  prisma: BlobPurgeDb,
  storageKey: string,
  code: string,
  now: Date,
  attempts: number,
): Promise<boolean> {
  return updateWhileProcessing(prisma, storageKey, {
    status: "failed_permanent",
    attempts,
    lastErrorCode: code.slice(0, 64),
    processedAt: now,
    nextAttemptAt: now,
  });
}

async function requeuePending(
  prisma: BlobPurgeDb,
  storageKey: string,
  code: string,
  attempts: number,
  now: Date,
): Promise<boolean> {
  const next = new Date(now.getTime() + computeBlobPurgeBackoffMs(attempts, now.getTime()));
  return updateWhileProcessing(prisma, storageKey, {
    status: "pending",
    attempts,
    lastErrorCode: code.slice(0, 64),
    nextAttemptAt: next,
    processedAt: null,
  });
}

/**
 * Process one already-claimed (`processing`) job. Does not claim.
 * Caller must not invoke this in dry-run mode (sweep handles dry-run as read-only).
 */
export async function processClaimedBlobPurgeJob(
  prisma: BlobPurgeDb,
  job: { id: string; storageKey: string; attempts: number },
  opts: {
    now?: Date;
    maxAttempts?: number;
    deleteFn?: BlobPurgeDeleteFn;
  } = {},
): Promise<BlobPurgeJobOutcome> {
  const now = opts.now ?? new Date();
  const maxAttempts = opts.maxAttempts ?? blobPurgeMaxAttempts();
  const deleteFn = opts.deleteFn ?? ((key: string) => tryDeleteStoredObject(key));
  const storageKey = job.storageKey;

  const gate = assertQueueableBlobKey(storageKey);
  if (!gate.ok) {
    await markFailedPermanent(prisma, storageKey, gate.error, now, job.attempts);
    return "failed_permanent";
  }

  const refs = await countActiveBlobReferences(prisma, storageKey);
  if (refs > 0) {
    const nextAttempts = job.attempts + 1;
    if (nextAttempts >= maxAttempts) {
      await markFailedPermanent(prisma, storageKey, "blob_ref_active", now, nextAttempts);
      return "failed_permanent";
    }
    await requeuePending(prisma, storageKey, "blob_ref_active", nextAttempts, now);
    return "skipped_refs";
  }

  // Narrow TOCTOU window: refs checked immediately before delete. Path layout embeds owner UUID;
  // cross-user attachment of the same key is rejected by upload/owned-image gates.
  const { deleted } = await deleteFn(storageKey);
  const nextAttempts = job.attempts + 1;
  if (deleted) {
    // Only mark done if we still hold the lease (status=processing).
    await updateWhileProcessing(prisma, storageKey, {
      status: "done",
      attempts: nextAttempts,
      lastErrorCode: null,
      processedAt: now,
      nextAttemptAt: now,
    });
    return "done";
  }

  if (nextAttempts >= maxAttempts) {
    await markFailedPermanent(prisma, storageKey, "blob_del_failed", now, nextAttempts);
    return "failed_permanent";
  }
  await requeuePending(prisma, storageKey, "blob_del_failed", nextAttempts, now);
  return "requeued";
}

/**
 * One sweep: optional stale recovery, then up to `batchLimit` claimed jobs.
 * Logs must never include storage keys, URLs, tokens, or PII — only aggregate counts.
 */
export async function runBlobPurgeSweep(
  prisma: BlobPurgeDb,
  opts: {
    now?: Date;
    enabled?: boolean;
    dryRun?: boolean;
    batchLimit?: number;
    maxAttempts?: number;
    staleProcessingMs?: number;
    deleteFn?: BlobPurgeDeleteFn;
  } = {},
): Promise<BlobPurgeSweepResult> {
  const enabled = opts.enabled ?? isBlobPurgeEnabled();
  const dryRun = opts.dryRun ?? isBlobPurgeDryRun();
  const result: BlobPurgeSweepResult = {
    enabled,
    dryRun,
    recoveredStale: 0,
    claimed: 0,
    done: 0,
    requeued: 0,
    failedPermanent: 0,
    skippedRefs: 0,
    dryRunWouldDelete: 0,
    dryRunWouldSkip: 0,
  };

  const now = opts.now ?? new Date();
  const batchLimit = opts.batchLimit ?? blobPurgeBatchLimit();
  const maxAttempts = opts.maxAttempts ?? blobPurgeMaxAttempts();
  const staleProcessingMs = opts.staleProcessingMs ?? blobPurgeStaleProcessingMs();

  // Dry-run is independent of ENABLED: read-only inspect only (no claim / mutate / Blob delete).
  // Must run even when BLOB_PURGE_ENABLED is unset/0 so Production can audit without arming deletes.
  if (dryRun) {
    // Intentionally ignore opts.deleteFn — dry-run must never reach physical delete.
    const due = await prisma.pendingBlobDelete.findMany({
      where: { status: "pending", nextAttemptAt: { lte: now } },
      orderBy: { nextAttemptAt: "asc" },
      take: batchLimit,
      select: { storageKey: true },
    });
    for (const row of due) {
      result.claimed += 1;
      const gate = assertQueueableBlobKey(row.storageKey);
      if (!gate.ok) {
        result.dryRunWouldSkip += 1;
        continue;
      }
      const refs = await countActiveBlobReferences(prisma, row.storageKey);
      if (refs > 0) {
        result.dryRunWouldSkip += 1;
        continue;
      }
      result.dryRunWouldDelete += 1;
    }
    return result;
  }

  if (!enabled) return result;

  result.recoveredStale = await recoverStaleBlobPurgeJobs(prisma, { now, staleProcessingMs });

  for (let i = 0; i < batchLimit; i++) {
    const job = await claimNextBlobPurgeJob(prisma, now);
    if (!job) break;
    result.claimed += 1;
    const outcome = await processClaimedBlobPurgeJob(prisma, job, {
      now,
      maxAttempts,
      deleteFn: opts.deleteFn,
    });
    switch (outcome) {
      case "done":
        result.done += 1;
        break;
      case "requeued":
        result.requeued += 1;
        break;
      case "failed_permanent":
        result.failedPermanent += 1;
        break;
      case "skipped_refs":
        result.skippedRefs += 1;
        break;
      default:
        break;
    }
  }

  return result;
}
