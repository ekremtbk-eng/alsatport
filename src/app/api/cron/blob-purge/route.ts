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
 *
 * Modes (after auth + preview lock):
 * - DRY_RUN=1 → read-only aggregate inspect (works even when ENABLED is unset/0)
 * - ENABLED≠1 and DRY_RUN off → disabled no-op
 * - ENABLED=1 and DRY_RUN off → destructive sweep (Production enable requires separate approval)
 *
 * Not registered in vercel.json yet — Production schedule requires separate approval.
 */
export async function GET(req: Request) {
  if (isPreviewWriteLockActive()) return previewWriteBlockedResponse();
  if (!authorized(req)) return NextResponse.json({ ok: false }, { status: 401 });

  const dryRun = isBlobPurgeDryRun();
  const enabled = isBlobPurgeEnabled();

  // Dry-run first: never requires BLOB_PURGE_ENABLED=1 and never arms deletes.
  if (dryRun) {
    const result = await runBlobPurgeSweep(prisma, { enabled, dryRun: true });
    return NextResponse.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
  }

  if (!enabled) {
    return NextResponse.json(
      { ok: true, enabled: false, dryRun: false, message: "blob_purge.disabled" },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  // Aggregate counts only — never echo storage keys, URLs, tokens, or PII.
  const result = await runBlobPurgeSweep(prisma, { enabled: true, dryRun: false });
  return NextResponse.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
}
