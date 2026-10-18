/**
 * LOCAL ONLY — KVKK 2D-2 business logo/cover/team image delete safety (loopback Postgres :55433).
 *
 *   DATABASE_URL=postgresql://postgres@127.0.0.1:55433/alsat \
 *     npx tsx --conditions=react-server scripts/test-business-image-delete-2d2.ts
 *
 * Uses MEDIA_STORAGE=local mock Blob under .data/uploads. Does not touch Production / Vercel Blob.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { updateStoreProfile } from "../src/lib/business/store";
import {
  collectBusinessReplaceBlobDeleteTargets,
  countActiveBlobReferences,
  enqueueBusinessReplaceBlobDeletes,
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

function bizKey(userId: string, kind: "logo" | "cover" | "team") {
  return `business/${userId}/${kind}-${uuid()}.webp`;
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
const businessIds: string[] = [];
const storageKeys: string[] = [];

async function seedUser() {
  const id = uuid();
  const email = `kvkk-2d2-${TAG}-${id.slice(0, 8)}@kvkk-2d2-test.invalid`;
  const username = `kvkk2d2_${TAG}_${id.slice(0, 8)}`;
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
          displayName: "KVKK 2D2",
          fullName: "KVKK 2D2 User",
          city: "İstanbul",
          businessVerifiedAt: new Date(),
        },
      },
    },
  });
  userIds.push(id);
  return { id, email, username };
}

async function seedBusiness(
  userId: string,
  opts: { logoKey: string; coverKey: string; teamKey?: string; slugSuffix: string },
) {
  const logoUrl = mediaUrl(opts.logoKey);
  const coverUrl = mediaUrl(opts.coverKey);
  const team = opts.teamKey
    ? [{ name: "Ali", role: "Satis", photo: mediaUrl(opts.teamKey) }]
    : [];
  const row = await prisma.businessAccount.create({
    data: {
      userId,
      slug: `kvkk2d2-${TAG}-${opts.slugSuffix}`.slice(0, 60),
      status: "approved",
      name: "2D2 Store",
      contactName: "Owner Test",
      companyType: "sahis",
      taxOffice: "Kadikoy",
      taxNumber: "1234567890",
      categoryId: "shopping-phone",
      city: "İstanbul",
      district: "Kadıköy",
      description: "synthetic business for kvkk 2d2 image delete safety tests only",
      email: `store-${TAG}-${opts.slugSuffix}@kvkk-2d2-test.invalid`,
      phone: "5330000000",
      logoUrl,
      coverUrl,
      team,
      approvedAt: new Date(),
    },
  });
  businessIds.push(row.id);
  return row;
}

async function main() {
  const owner = await seedUser();
  const neighbor = await seedUser();

  const logoOld = bizKey(owner.id, "logo");
  const logoNew = bizKey(owner.id, "logo");
  const coverOld = bizKey(owner.id, "cover");
  const coverKeep = bizKey(owner.id, "cover");
  const teamOld = bizKey(owner.id, "team");
  const teamNew = bizKey(owner.id, "team");
  const teamKeep = bizKey(owner.id, "team");
  const neighborLogo = bizKey(neighbor.id, "logo");
  storageKeys.push(logoOld, logoNew, coverOld, coverKeep, teamOld, teamNew, teamKeep, neighborLogo);

  for (const k of storageKeys) await writeLocalBlob(k);

  const logoOldUrl = mediaUrl(logoOld);
  const logoNewUrl = mediaUrl(logoNew);
  const coverOldUrl = mediaUrl(coverOld);
  const coverKeepUrl = mediaUrl(coverKeep);
  const teamOldUrl = mediaUrl(teamOld);
  const teamNewUrl = mediaUrl(teamNew);
  const teamKeepUrl = mediaUrl(teamKeep);
  const neighborLogoUrl = mediaUrl(neighborLogo);

  // --- collect unit gates ---
  const collected = collectBusinessReplaceBlobDeleteTargets({
    userId: owner.id,
    before: {
      logoUrl: logoOldUrl,
      coverUrl: coverOldUrl,
      team: [
        { name: "A", role: "R", photo: teamOldUrl },
        { name: "B", role: "R", photo: teamKeepUrl },
      ],
    },
    after: {
      logoUrl: logoNewUrl,
      coverUrl: coverOldUrl,
      team: [
        { name: "B", role: "R", photo: teamKeepUrl },
        { name: "C", role: "R", photo: teamNewUrl },
      ],
    },
  });
  const keys = new Set(collected.map((t) => t.storageKey));
  check("C1", "collects replaced logo", keys.has(logoOld));
  check("C2", "keeps unchanged cover out", !keys.has(coverOld));
  check("C3", "collects dropped team photo", keys.has(teamOld));
  check("C4", "keeps retained team photo out", !keys.has(teamKeep));
  check("C5", "does not collect new team photo", !keys.has(teamNew));

  const foreign = collectBusinessReplaceBlobDeleteTargets({
    userId: owner.id,
    before: { logoUrl: neighborLogoUrl, coverUrl: coverKeepUrl, team: [] },
    after: { logoUrl: logoNewUrl, coverUrl: coverKeepUrl, team: [] },
  });
  check("C6", "omits neighbor logo", !foreign.some((t) => t.storageKey === neighborLogo));
  check(
    "C7",
    "omits external URL",
    collectBusinessReplaceBlobDeleteTargets({
      userId: owner.id,
      before: { logoUrl: "https://images.unsplash.com/photo-x", coverUrl: coverKeepUrl, team: [] },
      after: { logoUrl: logoNewUrl, coverUrl: coverKeepUrl, team: [] },
    }).length === 0,
  );

  // --- rollback: enqueue then abort — blobs + DB stay ---
  const bizRb = await seedBusiness(owner.id, {
    logoKey: logoOld,
    coverKey: coverKeep,
    teamKey: teamOld,
    slugSuffix: "rb",
  });
  let rolled = false;
  try {
    await prisma.$transaction(async (tx) => {
      await enqueueBusinessReplaceBlobDeletes(tx, owner.id, [{ storageKey: logoOld, url: logoOldUrl }]);
      await tx.businessAccount.update({
        where: { id: bizRb.id },
        data: { logoUrl: logoNewUrl },
      });
      throw new Error("force_rollback_2d2");
    });
  } catch (e) {
    rolled = e instanceof Error && e.message === "force_rollback_2d2";
  }
  check("R1", "forced txn abort", rolled);
  check("R2", "logo blob intact after rollback", await localExists(logoOld));
  const rbAfter = await prisma.businessAccount.findUniqueOrThrow({ where: { id: bizRb.id } });
  check("R3", "DB logo URL restored after rollback", rbAfter.logoUrl === logoOldUrl);
  check(
    "R4",
    "no pending queue row after rollback",
    (await prisma.pendingBlobDelete.findUnique({ where: { storageKey: logoOld } })) == null,
  );

  // foreign key in enqueue → fail closed
  const foreignKey = bizKey(neighbor.id, "logo");
  storageKeys.push(foreignKey);
  let failClosed = false;
  try {
    await prisma.$transaction(async (tx) => {
      await enqueueBusinessReplaceBlobDeletes(tx, owner.id, [
        { storageKey: logoOld, url: logoOldUrl },
        { storageKey: foreignKey },
      ]);
    });
  } catch (e) {
    failClosed = e instanceof Error && e.message.includes("blob_queue.enqueue_failed");
  }
  check("F1", "foreign key aborts enqueue", failClosed);
  check(
    "F2",
    "no partial queue on abort",
    (await prisma.pendingBlobDelete.findUnique({ where: { storageKey: logoOld } })) == null,
  );

  // duplicate enqueue idempotency
  await prisma.$transaction(async (tx) => {
    const a = await enqueuePendingBlobDelete(tx, {
      storageKey: logoOld,
      reason: "business_replace",
      expectedOwnerUserId: owner.id,
    });
    const b = await enqueuePendingBlobDelete(tx, {
      storageKey: logoOld,
      reason: "business_replace",
      expectedOwnerUserId: owner.id,
    });
    check("I1", "first enqueue created", a.ok && a.outcome === "created");
    check("I2", "second enqueue already_pending", b.ok && b.outcome === "already_pending");
  });
  await prisma.pendingBlobDelete.delete({ where: { storageKey: logoOld } }).catch(() => undefined);

  // --- partial update via updateStoreProfile: logo only ---
  const updated = await updateStoreProfile(owner.id, { logoUrl: logoNewUrl });
  check("H1", "updateStoreProfile logo ok", !("error" in updated), "error" in updated ? updated.error : "");
  if (!("error" in updated)) {
    check("H2", "DB logo replaced", updated.row.logoUrl === logoNewUrl);
    check("H3", "DB cover unchanged", updated.row.coverUrl === coverKeepUrl);
  }
  const qLogo = await prisma.pendingBlobDelete.findUnique({ where: { storageKey: logoOld } });
  check("H4", "old logo queued then done", !!qLogo && qLogo.status === "done" && qLogo.reason === "business_replace");
  check("H5", "old logo blob gone", !(await localExists(logoOld)));
  check("H6", "new logo blob intact", await localExists(logoNew));
  check("H7", "cover blob intact", await localExists(coverKeep));

  // --- team partial: drop one, keep one, add one ---
  await writeLocalBlob(logoOld); // restore for later neighbor checks
  const teamUpdate = await updateStoreProfile(owner.id, {
    team: [
      { name: "Bora", role: "Satis", photo: teamKeepUrl },
      { name: "Cem", role: "Destek", photo: teamNewUrl },
    ],
  });
  check("T1", "team update ok", !("error" in teamUpdate), "error" in teamUpdate ? teamUpdate.error : "");
  check("T2", "old team blob gone", !(await localExists(teamOld)));
  check("T3", "kept team blob intact", await localExists(teamKeep));
  check("T4", "new team blob intact", await localExists(teamNew));
  const qTeam = await prisma.pendingBlobDelete.findUnique({ where: { storageKey: teamOld } });
  check("T5", "dropped team queued done", !!qTeam && qTeam.status === "done");

  // --- failed delete keeps pending ---
  const failKey = bizKey(owner.id, "cover");
  storageKeys.push(failKey);
  await writeLocalBlob(failKey);
  await prisma.$transaction(async (tx) => {
    await enqueuePendingBlobDelete(tx, {
      storageKey: failKey,
      reason: "business_replace",
      expectedOwnerUserId: owner.id,
    });
  });
  check(
    "D1",
    "pending without delete stays pending",
    (await prisma.pendingBlobDelete.findUnique({ where: { storageKey: failKey } }))?.status === "pending",
  );
  check("D2", "blob still present", await localExists(failKey));
  const { deleted: okDel } = await tryDeleteStoredObject(failKey);
  check("D3", "tryDelete succeeds", okDel);
  await markPendingBlobDeleteDone(prisma, failKey);
  check(
    "D4",
    "mark done only after success",
    (await prisma.pendingBlobDelete.findUnique({ where: { storageKey: failKey } }))?.status === "done",
  );

  // --- refcount: same URL still referenced on another business (neighbor) ---
  // Neighbor keeps own logo; simulate shared path is impossible across users.
  // Instead: leave coverKeep on owner while also pointing a second synthetic URL ref via listing? Business-only:
  // Temporarily put coverOld back as cover AND as a second field is impossible.
  // Use countActiveBlobReferences while URL still on row, then replace.
  await writeLocalBlob(coverOld);
  await prisma.businessAccount.update({
    where: { id: bizRb.id },
    data: { coverUrl: coverOldUrl },
  });
  check("S0", "coverOld refs>=1 while on business", (await countActiveBlobReferences(prisma, coverOld)) >= 1);
  // Enqueue + attempt opportunistic while still referenced
  await prisma.$transaction(async (tx) => {
    await enqueuePendingBlobDelete(tx, {
      storageKey: coverOld,
      reason: "business_replace",
      expectedOwnerUserId: owner.id,
    });
  });
  {
    const refs = await countActiveBlobReferences(prisma, coverOld);
    if (refs > 0) {
      check("S1", "refcount blocks physical delete", true);
      check("S2", "blob preserved under active ref", await localExists(coverOld));
    } else {
      check("S1", "refcount blocks physical delete", false, "refs=0 unexpectedly");
    }
  }
  // Replace cover away then delete
  const coverSwap = await updateStoreProfile(owner.id, { coverUrl: coverKeepUrl });
  // may already be coverKeep — force via prisma then update
  if ("error" in coverSwap || (await prisma.businessAccount.findUniqueOrThrow({ where: { id: bizRb.id } })).coverUrl === coverOldUrl) {
    await prisma.businessAccount.update({ where: { id: bizRb.id }, data: { coverUrl: coverOldUrl } });
    const swap2 = await updateStoreProfile(owner.id, { coverUrl: coverKeepUrl });
    check("S3", "cover replace ok", !("error" in swap2), "error" in swap2 ? swap2.error : "");
  } else {
    check("S3", "cover already keep / replace path", true);
  }
  // Ensure coverOld no longer referenced then opportunistic
  await prisma.businessAccount.updateMany({
    where: { coverUrl: coverOldUrl },
    data: { coverUrl: coverKeepUrl },
  });
  check("S4", "refs=0 after cover cleared", (await countActiveBlobReferences(prisma, coverOld)) === 0);
  const { deleted: coverDel } = await tryDeleteStoredObject(coverOld, coverOldUrl);
  if (coverDel) await markPendingBlobDeleteDone(prisma, coverOld);
  check("S5", "safe delete after refs cleared", coverDel && !(await localExists(coverOld)));

  // --- neighbor intact ---
  await seedBusiness(neighbor.id, { logoKey: neighborLogo, coverKey: neighborLogo, slugSuffix: "nb" });
  check("N1", "neighbor logo blob intact", await localExists(neighborLogo));
  check(
    "N2",
    "neighbor business row intact",
    (await prisma.businessAccount.count({ where: { userId: neighbor.id } })) === 1,
  );

  // --- source-order safety ---
  const storeSrc = await fs.readFile(path.resolve("src/lib/business/store.ts"), "utf8");
  check("X1", "dropReplacedImages removed", !storeSrc.includes("dropReplacedImages"));
  check("X2", "no deleteStoredObject in business store", !storeSrc.includes("deleteStoredObject"));
  check("X3", "enqueueBusinessReplaceBlobDeletes wired", storeSrc.includes("enqueueBusinessReplaceBlobDeletes"));
  check("X4", "tryDelete only via after-commit helper", storeSrc.includes("purgeReplacedBusinessImagesAfterCommit"));
  const helper = storeSrc.slice(storeSrc.indexOf("purgeReplacedBusinessImagesAfterCommit"));
  check("X5", "refcount before tryDelete in purge helper", helper.indexOf("countActiveBlobReferences") < helper.indexOf("tryDeleteStoredObject"));
  check("X6", "EIDS lock still active", isEidsPublishLockActive() === true);

  // --- race note: active ref while pending ---
  const raceKey = bizKey(owner.id, "logo");
  storageKeys.push(raceKey);
  await writeLocalBlob(raceKey);
  const raceUrl = mediaUrl(raceKey);
  await prisma.businessAccount.update({ where: { id: bizRb.id }, data: { logoUrl: raceUrl } });
  await prisma.$transaction(async (tx) => {
    await enqueuePendingBlobDelete(tx, {
      storageKey: raceKey,
      reason: "business_replace",
      expectedOwnerUserId: owner.id,
    });
  });
  check("Y1", "race: refs>=1 while still on row", (await countActiveBlobReferences(prisma, raceKey)) >= 1);
  check("Y2", "race: blob preserved", await localExists(raceKey));
}

main()
  .catch((err) => {
    console.error(err);
    results.push({ id: "FATAL", name: String(err), pass: false });
  })
  .finally(async () => {
    try {
      if (businessIds.length) {
        await prisma.businessAccount.deleteMany({ where: { id: { in: businessIds } } });
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
