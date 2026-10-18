import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isPreviewWriteLockActive, previewWriteBlockedResponse } from "@/lib/security/previewLock";
import {
  isBlobPurgeDryRun,
  isBlobPurgeEnabled,
  runBlobPurgeSweep,
} from "@/lib/storage/blobPurgeWorker";

export const dynamic = "force-dynamic";
/** Keep in sync with `BLOB_PURGE_ROUTE_MAX_DURATION_SEC` / stale-lease floor in blobPurgeWorker. */
export const maxDuration = 60;

function digest(value: string) {
  return createHash("sha256").update(value).digest();
}

/** Vercel Cron sends `Authorization: Bearer $CRON_SECRET`; without a configured secret the job stays closed. */
function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return false;
  const header = req.headers.get("authorization") ?? "";
  return timingSafeEqual(digest(header), digest(`Bearer ${secret}`));
}

/**
 * Retry worker for `pending_blob_deletes`.
 * Default kill switch: BLOB_PURGE_ENABLED must be exactly `1` (otherwise no-op).
 * Dry-run: BLOB_PURGE_DRY_RUN=1 is read-only (no claim, no status mutation, no Blob delete).
 * Not registered in vercel.json yet — Production schedule requires separate approval.
 */
export async function GET(req: Request) {
  if (isPreviewWriteLockActive()) return previewWriteBlockedResponse();
  if (!authorized(req)) return NextResponse.json({ ok: false }, { status: 401 });

  const enabled = isBlobPurgeEnabled();
  if (!enabled) {
    return NextResponse.json(
      { ok: true, enabled: false, dryRun: isBlobPurgeDryRun(), message: "blob_purge.disabled" },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  // Aggregate counts only — never echo storage keys, URLs, tokens, or PII.
  const result = await runBlobPurgeSweep(prisma, {
    enabled: true,
    dryRun: isBlobPurgeDryRun(),
  });
  return NextResponse.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
}
