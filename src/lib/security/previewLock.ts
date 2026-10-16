import { NextResponse } from "next/server";

/**
 * Preview deployments currently share Production DATABASE_URL.
 * This lock blocks durable side effects on Vercel Preview only.
 *
 * Active when:
 * - VERCEL_ENV=preview (Vercel Preview deployments) — cannot be disabled by env, or
 * - PREVIEW_WRITE_LOCK=1 (local/isolated tests)
 *
 * PREVIEW_WRITE_LOCK=0 is intentionally ignored when VERCEL_ENV=preview so a
 * mistaken Preview env var cannot reopen Production writes.
 * Production (VERCEL_ENV=production) and local (no VERCEL_ENV) stay unlocked
 * unless PREVIEW_WRITE_LOCK=1 is set for tests.
 */
export function isPreviewWriteLockActive() {
  if (process.env.VERCEL_ENV === "preview") return true;
  return process.env.PREVIEW_WRITE_LOCK === "1";
}

export class PreviewWriteBlockedError extends Error {
  readonly code = "preview.writeBlocked" as const;
  constructor(detail?: string) {
    super(
      detail
        ? `Preview write blocked (${detail}). Vercel Preview must not mutate shared Production data.`
        : "Preview write blocked. Vercel Preview must not mutate shared Production data.",
    );
    this.name = "PreviewWriteBlockedError";
  }
}

export function assertPreviewWritesAllowed(detail?: string) {
  if (isPreviewWriteLockActive()) throw new PreviewWriteBlockedError(detail);
}

export function previewWriteBlockedResponse() {
  return NextResponse.json(
    { ok: false, error: "preview.writeBlocked" },
    { status: 403, headers: { "Cache-Control": "no-store" } },
  );
}

/** Prisma model/client operations that change durable state. */
export const PRISMA_WRITE_OPERATIONS = new Set([
  "create",
  "createMany",
  "createManyAndReturn",
  "update",
  "updateMany",
  "updateManyAndReturn",
  "upsert",
  "delete",
  "deleteMany",
]);
