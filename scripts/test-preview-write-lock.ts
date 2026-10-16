/**
 * Isolated Preview write-lock checks (no Production DB; no live local DB required for lock path).
 *
 *   PREVIEW_WRITE_LOCK=1 npx tsx scripts/test-preview-write-lock.ts
 *   PREVIEW_WRITE_LOCK=0 npx tsx scripts/test-preview-write-lock.ts
 *   VERCEL_ENV=preview npx tsx scripts/test-preview-write-lock.ts
 */
import {
  PreviewWriteBlockedError,
  PRISMA_WRITE_OPERATIONS,
  assertPreviewWritesAllowed,
  isPreviewWriteLockActive,
  previewWriteBlockedResponse,
} from "../src/lib/security/previewLock";

const FAKE_UUID = "00000000-0000-0000-0000-000000000000";

async function expectBlocked(label: string, fn: () => Promise<unknown>) {
  try {
    await fn();
    return { label, ok: false, detail: "did not throw" };
  } catch (e) {
    return { label, ok: e instanceof PreviewWriteBlockedError, detail: e instanceof Error ? e.name : String(e) };
  }
}

async function main() {
  // Ensure Prisma does not try a real host during locked tests.
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = "postgresql://preview_lock_test@127.0.0.1:1/preview_lock_test";
  }

  const { prisma } = await import("../src/lib/db");

  let failed = 0;
  const check = (name: string, ok: boolean, detail = "") => {
    if (ok) console.log(`PASS ${name}`);
    else {
      failed += 1;
      console.error(`FAIL ${name}${detail ? ` — ${detail}` : ""}`);
    }
  };

  const locked = isPreviewWriteLockActive();
  const expectLocked =
    process.env.VERCEL_ENV === "preview" || process.env.PREVIEW_WRITE_LOCK === "1";
  check("lock flag matches env", locked === expectLocked, `locked=${locked} expect=${expectLocked}`);

  // PREVIEW_WRITE_LOCK=0 must NOT unlock real Preview.
  if (process.env.VERCEL_ENV === "preview") {
    const prev = process.env.PREVIEW_WRITE_LOCK;
    process.env.PREVIEW_WRITE_LOCK = "0";
    check("VERCEL_ENV=preview ignores PREVIEW_WRITE_LOCK=0", isPreviewWriteLockActive() === true);
    if (prev === undefined) delete process.env.PREVIEW_WRITE_LOCK;
    else process.env.PREVIEW_WRITE_LOCK = prev;
  }

  if (locked) {
    let blocked = false;
    try {
      assertPreviewWritesAllowed("test");
    } catch (e) {
      blocked = e instanceof PreviewWriteBlockedError;
    }
    check("assertPreviewWritesAllowed throws", blocked);

    const requiredOps = [
      "create",
      "createMany",
      "createManyAndReturn",
      "update",
      "updateMany",
      "updateManyAndReturn",
      "upsert",
      "delete",
      "deleteMany",
    ];
    check(
      "PRISMA_WRITE_OPERATIONS covers required ops",
      requiredOps.every((op) => PRISMA_WRITE_OPERATIONS.has(op)),
    );

    const modelChecks = await Promise.all([
      expectBlocked("create", () =>
        prisma.rateLimitBucket.create({
          data: { key: `preview-lock-test-${Date.now()}`, count: 1, resetAt: new Date(Date.now() + 60_000) },
        }),
      ),
      expectBlocked("createMany", () =>
        prisma.rateLimitBucket.createMany({
          data: [{ key: `preview-lock-cm-${Date.now()}`, count: 1, resetAt: new Date(Date.now() + 60_000) }],
        }),
      ),
      expectBlocked("createManyAndReturn", () =>
        prisma.rateLimitBucket.createManyAndReturn({
          data: [{ key: `preview-lock-cmr-${Date.now()}`, count: 1, resetAt: new Date(Date.now() + 60_000) }],
        }),
      ),
      expectBlocked("update", () =>
        prisma.user.update({ where: { id: FAKE_UUID }, data: { username: "x" } }),
      ),
      expectBlocked("updateMany", () =>
        prisma.user.updateMany({ where: { id: FAKE_UUID }, data: { username: "x" } }),
      ),
      expectBlocked("updateManyAndReturn", () =>
        prisma.user.updateManyAndReturn({ where: { id: FAKE_UUID }, data: { username: "x" } }),
      ),
      expectBlocked("upsert", () =>
        prisma.rateLimitBucket.upsert({
          where: { key: `preview-lock-up-${Date.now()}` },
          create: { key: `preview-lock-up-${Date.now()}`, count: 1, resetAt: new Date(Date.now() + 60_000) },
          update: { count: 2 },
        }),
      ),
      expectBlocked("delete", () => prisma.user.delete({ where: { id: FAKE_UUID } })),
      expectBlocked("deleteMany", () => prisma.user.deleteMany({ where: { id: FAKE_UUID } })),
    ]);
    for (const r of modelChecks) check(`prisma ${r.label} blocked`, r.ok, r.detail);

    const rawChecks = await Promise.all([
      expectBlocked("$executeRaw", () => prisma.$executeRaw`SELECT 1`),
      expectBlocked("$executeRawUnsafe", () => prisma.$executeRawUnsafe("SELECT 1")),
      expectBlocked("$queryRaw", () => prisma.$queryRaw`SELECT 1`),
      expectBlocked("$queryRawUnsafe", () => prisma.$queryRawUnsafe("SELECT 1")),
      expectBlocked("$queryRaw INSERT bypass", () =>
        prisma.$queryRaw`
          INSERT INTO rate_limit_buckets ("key", "count", "reset_at")
          VALUES (${"preview-lock-qraw"}, 1, ${new Date()})
          ON CONFLICT ("key") DO UPDATE SET "count" = rate_limit_buckets."count" + 1
          RETURNING "count"`,
      ),
    ]);
    for (const r of rawChecks) check(`prisma ${r.label} blocked`, r.ok, r.detail);

    const txInteractive = await expectBlocked("$transaction interactive create", () =>
      prisma.$transaction(async (tx) => {
        await tx.rateLimitBucket.create({
          data: { key: `preview-lock-tx-${Date.now()}`, count: 1, resetAt: new Date(Date.now() + 60_000) },
        });
      }),
    );
    check(`prisma ${txInteractive.label} blocked`, txInteractive.ok, txInteractive.detail);

    const txBatch = await expectBlocked("$transaction batch updateMany", () =>
      prisma.$transaction([prisma.user.updateMany({ where: { id: FAKE_UUID }, data: { username: "x" } })]),
    );
    check(`prisma ${txBatch.label} blocked`, txBatch.ok, txBatch.detail);

    const nested = await expectBlocked("nested write via create", () =>
      prisma.user.create({
        data: {
          id: FAKE_UUID,
          email: "preview-lock@example.invalid",
          username: "preview_lock",
          passwordHash: "x",
          role: "member",
          profile: { create: { displayName: "x" } },
        },
      }),
    );
    check(`prisma ${nested.label} blocked`, nested.ok, nested.detail);

    const res = previewWriteBlockedResponse();
    check("previewWriteBlockedResponse status 403", res.status === 403);
    const body = (await res.json()) as { error?: string };
    check("previewWriteBlockedResponse error key", body.error === "preview.writeBlocked");
  } else {
    check("unlocked: assert no-op", (() => {
      try {
        assertPreviewWritesAllowed("test");
        return true;
      } catch {
        return false;
      }
    })());
    check("unlocked: isPreviewWriteLockActive false", !isPreviewWriteLockActive());

    // Reads must still work when unlocked (prove $queryRaw extension is not always-on).
    // Skip live DB: only confirm the guard itself is off.
    check("unlocked: PREVIEW_WRITE_LOCK not forcing lock", process.env.PREVIEW_WRITE_LOCK !== "1");
  }

  if (failed) {
    console.error(`\n${failed} failed`);
    process.exit(1);
  }
  console.log("\nAll preview-write-lock checks passed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
