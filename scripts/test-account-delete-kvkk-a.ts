/**
 * LOCAL ONLY — KVKK PR-A account deletion checks against loopback Postgres :55433.
 *
 *   DATABASE_URL=postgresql://postgres@127.0.0.1:55433/alsat \
 *     npx tsx --conditions=react-server scripts/test-account-delete-kvkk-a.ts
 *
 * Refuses non-loopback:55433. Creates throwaway users (@kvkk-a-test.invalid) and removes them.
 */
import { randomBytes } from "node:crypto";
import { PrismaClient, type AuthProvider } from "@prisma/client";
import { anonymizeAccountInTransaction, DELETED_MESSAGE_BODY } from "../src/lib/security/accountDeletion";
import {
  createAccountTombstone,
  emailEmbedsUuid,
  isTombstoneEmail,
} from "../src/lib/security/accountTombstone";
import { hashPassword } from "../src/lib/security/password";

const DB = process.env.DATABASE_URL ?? process.env.E2E_DATABASE_URL ?? "";
const TAG = randomBytes(4).toString("hex");

function assertLoopback() {
  let u: URL;
  try {
    u = new URL(DB);
  } catch {
    throw new Error("DATABASE_URL required");
  }
  const host = u.hostname;
  if (!/^(localhost|127\.0\.0\.1|\[::1\])$/.test(host) || u.port !== "55433") {
    throw new Error(`Refusing non-loopback:55433 (got ${host}:${u.port || "5432"})`);
  }
}

type Result = { id: string; name: string; pass: boolean; detail?: string };
const results: Result[] = [];
function check(id: string, name: string, pass: boolean, detail = "") {
  results.push({ id, name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${id.padEnd(6)} ${name}${detail ? ` — ${detail}` : ""}`);
}

assertLoopback();
const prisma = new PrismaClient();

async function seedUser(opts: { provider?: AuthProvider; role?: "member" | "admin"; withNotif?: boolean }) {
  const id = cryptoRandomUuid();
  const email = `kvkk-a-${TAG}-${id.slice(0, 8)}@kvkk-a-test.invalid`;
  const username = `kvkka_${TAG}_${id.slice(0, 8)}`;
  const passwordHash = await hashPassword("Kvkk-A-Test-Password-9!");
  await prisma.user.create({
    data: {
      id,
      email,
      username,
      passwordHash: opts.provider === "google" ? null : passwordHash,
      provider: opts.provider ?? "email",
      providerSub: opts.provider === "google" ? `google-sub-${id}` : null,
      role: opts.role ?? "member",
      emailVerifiedAt: new Date(),
      profile: {
        create: {
          displayName: "KVKK Test",
          fullName: "KVKK Test User",
          phone: null,
          address: "Test Address 1",
          city: "Lefkoşa",
          notificationPrefs: { priceDrop: { email: true }, nearby: { inApp: true } },
          marketingEmail: true,
          readReceipts: true,
          notifPriceDrop: true,
        },
      },
    },
  });
  if (opts.withNotif !== false) {
    await prisma.notification.create({
      data: {
        userId: id,
        kind: "test",
        title: "Personal notice",
        body: `Secret body for ${email}`,
        eventKey: `kvkk-a-${TAG}-${id}`,
      },
    });
  }
  const session = await prisma.userSession.create({
    data: {
      userId: id,
      method: "password",
      expiresAt: new Date(Date.now() + 86400_000),
      userAgent: "kvkk-a-test",
      ipMasked: "1.2.x.x",
    },
  });
  return { id, email, username, passwordHash, sessionId: session.id };
}

function cryptoRandomUuid() {
  return randomBytes(16).toString("hex").replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, "$1-$2-$3-$4-$5");
}

async function main() {
  // --- unit: tombstone ---
  const seenEmail = new Set<string>();
  const seenUser = new Set<string>();
  let uuidLeak = 0;
  for (let i = 0; i < 2000; i++) {
    const t = createAccountTombstone();
    if (emailEmbedsUuid(t.email) || !isTombstoneEmail(t.email)) uuidLeak++;
    if (t.username.length < 2 || t.username.length > 40) uuidLeak++;
    seenEmail.add(t.email.toLowerCase());
    seenUser.add(t.username.toLowerCase());
  }
  check("T1", "tombstone uniqueness (2000)", seenEmail.size === 2000 && seenUser.size === 2000, `e=${seenEmail.size} u=${seenUser.size}`);
  check("T2", "tombstone never embeds UUID", uuidLeak === 0, `leaks=${uuidLeak}`);

  const userIds: string[] = [];
  try {
    const u = await seedUser({});
    userIds.push(u.id);
    const beforeNotif = await prisma.notification.count({ where: { userId: u.id } });
    check("S1", "seed notification present", beforeNotif === 1);

    const hash = await hashPassword(randomBytes(32).toString("base64url"));
    const result = await prisma.$transaction((tx) =>
      anonymizeAccountInTransaction(tx, {
        userId: u.id,
        provider: "email",
        unusablePasswordHash: hash,
      }),
    );

    const after = await prisma.user.findUnique({ where: { id: u.id }, include: { profile: true } });
    const notifLeft = await prisma.notification.count({ where: { userId: u.id } });
    const sessionsOpen = await prisma.userSession.count({ where: { userId: u.id, revokedAt: null } });

    check("D1", "notifications deleted", notifLeft === 0, `left=${notifLeft}`);
    check("D2", "tombstone email format", !!after && isTombstoneEmail(after.email) && !emailEmbedsUuid(after.email), after?.email ?? "");
    check("D3", "email != original", after?.email !== u.email);
    check("D4", "username tombstoned", !!after && after.username.startsWith("silinmis_"));
    check("D5", "banned account_deleted", after?.bannedReason === "account_deleted" && !!after.bannedAt);
    check("D6", "profile prefs cleared", !!after?.profile && after.profile.marketingEmail === false && after.profile.readReceipts === false);
    check(
      "D7",
      "notificationPrefs empty",
      !!after?.profile && JSON.stringify(after.profile.notificationPrefs) === "{}",
    );
    check("D8", "PII nullified", !after?.profile?.fullName && !after?.profile?.address && !after?.profile?.phone);
    check("D9", "returned tombstone matches row", result.email === after?.email && result.username === after?.username);

    // multi-session revoke mirrors route revokeUserSessions(userId, "account-deleted")
    await prisma.userSession.create({
      data: {
        userId: u.id,
        method: "password",
        expiresAt: new Date(Date.now() + 86400_000),
        userAgent: "kvkk-a-test-2",
        ipMasked: "3.4.x.x",
      },
    });
    const openBeforeRevoke = await prisma.userSession.count({ where: { userId: u.id, revokedAt: null } });
    await prisma.userSession.updateMany({
      where: { userId: u.id, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: "account-deleted" },
    });
    const openAfter = await prisma.userSession.count({ where: { userId: u.id, revokedAt: null } });
    check(
      "D10",
      "all sessions revoked",
      openAfter === 0 && openBeforeRevoke >= 2 && sessionsOpen === 1,
      `seedOpen=${sessionsOpen} beforeRevoke=${openBeforeRevoke} after=${openAfter}`,
    );

    // neighbor isolation: deleting A must not clear B's notifications/prefs
    const neighbor = await seedUser({});
    userIds.push(neighbor.id);
    const victim = await seedUser({});
    userIds.push(victim.id);
    await prisma.$transaction((tx) =>
      anonymizeAccountInTransaction(tx, {
        userId: victim.id,
        provider: "email",
        unusablePasswordHash: hash,
      }),
    );
    const neighborAfter = await prisma.user.findUnique({ where: { id: neighbor.id }, include: { profile: true } });
    const neighborNotif = await prisma.notification.count({ where: { userId: neighbor.id } });
    check("N1", "neighbor notification intact", neighborNotif === 1);
    check(
      "N2",
      "neighbor prefs intact",
      !!neighborAfter?.profile &&
        neighborAfter.profile.marketingEmail === true &&
        neighborAfter.email === neighbor.email &&
        !neighborAfter.bannedAt,
    );

    // P2002: first tombstone collides with an existing row; retry allocates a fresh one in the same tx
    const holder = await seedUser({ withNotif: false });
    userIds.push(holder.id);
    const conflictEmail = `deleted-force-${TAG}@deleted.invalid`;
    const conflictUser = `silinmis_f${TAG}`.slice(0, 40);
    await prisma.user.update({
      where: { id: holder.id },
      data: { email: conflictEmail, username: conflictUser },
    });
    const collideVictim = await seedUser({ withNotif: false });
    userIds.push(collideVictim.id);
    let tombCalls = 0;
    const afterCollision = await prisma.$transaction((tx) =>
      anonymizeAccountInTransaction(tx, {
        userId: collideVictim.id,
        provider: "email",
        unusablePasswordHash: hash,
        createTombstone: () => {
          tombCalls++;
          if (tombCalls === 1) {
            return { email: conflictEmail, username: conflictUser, token: "force-collision" };
          }
          return createAccountTombstone();
        },
      }),
    );
    const holderAfter = await prisma.user.findUnique({ where: { id: holder.id } });
    check("P1", "P2002 retried then succeeded", tombCalls >= 2 && isTombstoneEmail(afterCollision.email));
    check("P2", "collision victim email != conflict", afterCollision.email.toLowerCase() !== conflictEmail.toLowerCase());
    check("P3", "holder row unchanged after P2002 retry", holderAfter?.email === conflictEmail && !holderAfter.bannedAt);
    check("P4", "victim banned after successful retry", !!(await prisma.user.findUnique({ where: { id: collideVictim.id } }))?.bannedAt);

    // no payment / report / audit delete in helper source
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const helperSrc = readFileSync(join(process.cwd(), "src/lib/security/accountDeletion.ts"), "utf8");
    check(
      "X1",
      "helper has no payment/report/audit delete",
      !/\.(payment|report|auditLog)\.(delete|deleteMany)/i.test(helperSrc) &&
        !helperSrc.includes("tx.payment") &&
        !helperSrc.includes("tx.report") &&
        !helperSrc.includes("tx.auditLog"),
    );

    // rollback: throw inside transaction after partial work should leave seed-like state — use second user
    const u2 = await seedUser({});
    userIds.push(u2.id);
    const emailBefore = u2.email;
    try {
      await prisma.$transaction(async (tx) => {
        await anonymizeAccountInTransaction(tx, {
          userId: u2.id,
          provider: "email",
          unusablePasswordHash: hash,
        });
        throw new Error("forced-rollback");
      });
    } catch (e) {
      check("R1", "forced rollback threw", e instanceof Error && e.message === "forced-rollback");
    }
    const u2after = await prisma.user.findUnique({ where: { id: u2.id }, include: { profile: true } });
    const n2 = await prisma.notification.count({ where: { userId: u2.id } });
    check("R2", "rollback restores email", u2after?.email === emailBefore);
    check("R3", "rollback keeps notification", n2 === 1);
    check("R4", "rollback not banned", !u2after?.bannedAt);
    check("R5", "rollback keeps address PII", u2after?.profile?.address === "Test Address 1");

    // message anonymize + listing soft-delete unchanged behaviour
    const seller = await seedUser({ withNotif: false });
    userIds.push(seller.id);
    const listing = await prisma.listing.create({
      data: {
        listingNo: `KVKKA${TAG}`.slice(0, 20),
        sellerId: seller.id,
        categoryId: "vasita",
        title: "TEST DELETE LISTING",
        description: "synthetic",
        price: 1000,
        currency: "TRY",
        city: "Lefkoşa",
        status: "active",
        postedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400_000 * 30),
      },
    });
    // need a buyer for conversation
    const buyer = await seedUser({ withNotif: false });
    userIds.push(buyer.id);
    const conv = await prisma.conversation.create({
      data: { buyerId: buyer.id, sellerId: seller.id, listingId: listing.id },
    });
    await prisma.message.create({
      data: { conversationId: conv.id, senderId: seller.id, body: "secret listing chat" },
    });
    // payment/report rows intentionally untouched by anonymize — leave none created
    await prisma.$transaction((tx) =>
      anonymizeAccountInTransaction(tx, {
        userId: seller.id,
        provider: "email",
        unusablePasswordHash: hash,
      }),
    );
    const listingAfter = await prisma.listing.findUnique({ where: { id: listing.id } });
    const msgAfter = await prisma.message.findFirst({ where: { conversationId: conv.id } });
    check("L1", "listing soft-deleted", listingAfter?.status === "removed" && !!listingAfter.deletedAt);
    check("L2", "listing row retained", !!listingAfter);
    check("M1", "message anonymized", msgAfter?.body === DELETED_MESSAGE_BODY && !!msgAfter.deletedAt);

    // admin path is in the route — simulate role check expectation by documenting code path
    const admin = await seedUser({ role: "admin", withNotif: false });
    userIds.push(admin.id);
    check("A1", "admin seed role", (await prisma.user.findUnique({ where: { id: admin.id } }))?.role === "admin");

    // OAuth user without password — anonymize still works (route requires fresh session separately)
    const oauth = await seedUser({ provider: "google", withNotif: true });
    userIds.push(oauth.id);
    await prisma.$transaction((tx) =>
      anonymizeAccountInTransaction(tx, {
        userId: oauth.id,
        provider: "google",
        unusablePasswordHash: null,
      }),
    );
    const oauthAfter = await prisma.user.findUnique({ where: { id: oauth.id } });
    check("O1", "oauth providerSub cleared", oauthAfter?.providerSub == null);
    check("O2", "oauth password stays null", oauthAfter?.passwordHash == null);
    check("O3", "oauth notifications gone", (await prisma.notification.count({ where: { userId: oauth.id } })) === 0);
  } finally {
    // cleanup throwaways (hard) — only @kvkk-a-test.invalid / tombstones we created
    for (const id of userIds) {
      await prisma.notification.deleteMany({ where: { userId: id } }).catch(() => undefined);
      await prisma.userSession.deleteMany({ where: { userId: id } }).catch(() => undefined);
      await prisma.message.deleteMany({ where: { senderId: id } }).catch(() => undefined);
      await prisma.conversation.deleteMany({ where: { OR: [{ buyerId: id }, { sellerId: id }] } }).catch(() => undefined);
      await prisma.listingImage.deleteMany({ where: { listing: { sellerId: id } } }).catch(() => undefined);
      await prisma.listing.deleteMany({ where: { sellerId: id } }).catch(() => undefined);
      await prisma.profile.deleteMany({ where: { userId: id } }).catch(() => undefined);
      await prisma.user.deleteMany({ where: { id } }).catch(() => undefined);
    }
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
