/**
 * Favoriter notify on seller delete + admin reject (audit P1-B).
 * LOCAL ONLY — loopback Postgres :55433. No Production, no real e-mail.
 *
 *   DATABASE_URL=postgresql://postgres@127.0.0.1:55433/alsat \
 *     npx tsx --conditions=react-server scripts/test-favoriter-notify-gone.ts
 *
 * Optional API layer (local-test-server):
 *   E2E_BASE=http://127.0.0.1:3014 AUTH_SECRET=<from server> … same DB …
 */
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { isPublicListing } from "../src/lib/categoryCounts";
import { isLiveRow, newPeriod, notifyFavoriters, sweepListings } from "../src/lib/listings/lifecycle";
import { deleteListingRecord, markListingSold } from "../src/lib/listings/store";
import type { Listing } from "../src/data/store";
import type { StoredUser } from "../src/lib/security/userStore";

const DB = process.env.E2E_DATABASE_URL ?? process.env.DATABASE_URL ?? "";
const BASE = (process.env.E2E_BASE ?? "").replace(/\/$/, "");
const LOOPBACK = /^(localhost|127\.0\.0\.1|\[::1\])$/;
const TAG = randomBytes(4).toString("hex");
const PASSWORD = `Fg!${randomBytes(6).toString("base64url")}9a`;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

{
  let host = "";
  let port = "";
  try {
    const u = new URL(DB);
    host = u.hostname;
    port = u.port;
  } catch {
    throw new Error("E2E_DATABASE_URL required (loopback:55433)");
  }
  if (!LOOPBACK.test(host) || port !== "55433") {
    throw new Error(`Refusing non-loopback:55433 DB (got ${host}:${port})`);
  }
  if (BASE && !LOOPBACK.test(new URL(BASE).hostname)) {
    throw new Error("Refusing non-local E2E_BASE");
  }
}

type Result = { id: string; name: string; pass: boolean; detail: string };
const results: Result[] = [];
function check(id: string, name: string, pass: boolean, detail = "") {
  results.push({ id, name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${id.padEnd(5)} ${name}${detail ? `  — ${detail}` : ""}`);
}

const prisma = new PrismaClient({ datasources: { db: { url: DB } } });

async function seedUser(label: string, role: "seller" | "admin" = "seller") {
  const email = `${label}-${TAG}@favgone.invalid`;
  const username = `fg_${label}_${TAG}`;
  const user = await prisma.user.create({
    data: {
      email,
      username,
      role,
      passwordHash: await bcrypt.hash(PASSWORD, 10),
      emailVerifiedAt: new Date(),
      profile: {
        create: {
          displayName: `FG ${label}`,
          fullName: `FG ${label}`,
          profileComplete: true,
          phone: `0533${String(1_000_000 + (randomBytes(3).readUIntBE(0, 3) % 8_999_999)).padStart(7, "0")}`,
          address: "Test Mah. Test Sk. No:1",
          city: "Ankara",
        },
      },
    },
  });
  return { id: user.id, email, username, role };
}

function asStored(u: { id: string; email: string; username: string; role: string }): StoredUser {
  return {
    id: u.id,
    email: u.email,
    username: u.username,
    role: u.role as StoredUser["role"],
    passwordHash: "x",
    provider: "email",
    profile: {
      id: u.id,
      username: u.username,
      displayName: u.username,
      avatar: "",
      verified: true,
      memberSince: "2026",
      listings: 0,
      sales: 0,
      stars: 0,
      followers: 0,
      following: 0,
      city: "Ankara",
      plan: "standart",
      email: u.email,
      emailVerified: true,
      profileComplete: true,
      authProvider: "email",
      role: u.role as "seller" | "admin" | "member",
      fullName: u.username,
      phone: "05331234567",
      address: "x",
    },
  };
}

async function seedListing(
  sellerId: string,
  title: string,
  opts: { status?: "active" | "passive" | "expired" | "pending"; expiresAt?: Date } = {},
) {
  const period = newPeriod();
  return prisma.listing.create({
    data: {
      status: opts.status ?? "active",
      postedAt: period.postedAt,
      expiresAt: opts.expiresAt ?? period.expiresAt,
      sellerId,
      listingNo: `FG${TAG}${randomBytes(2).toString("hex")}`,
      // Non-EİDS tree so renew/resale paths stay usable if API tests run later.
      categoryId: "shopping-phone",
      title,
      description: "Favoriter notify synthetic listing; auto-removed.",
      price: 12_500,
      city: "Ankara",
      district: "Çankaya",
      specs: [],
      features: [],
      chassis: {},
      images: {
        create: [
          {
            storageKey: `fg/${TAG}/${randomBytes(2).toString("hex")}`,
            url: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400",
            sortOrder: 0,
            isCover: true,
          },
        ],
      },
    },
  });
}

function toListingShape(row: {
  id: string;
  status: string;
  title: string;
  categoryId: string;
  price: number;
  city: string;
  district: string | null;
  images: { url: string; isCover: boolean }[];
}): Listing {
  const imgs = row.images.map((i) => i.url);
  return {
    id: row.id,
    // DB may use "removed"; public UI only treats "active" as live.
    status: row.status === "active" ? "active" : "rejected",
    title: row.title,
    subtitle: "",
    categoryId: row.categoryId,
    price: row.price,
    city: row.city,
    district: row.district ?? "",
    description: "",
    images: imgs,
    sellerId: "x",
    sellerName: "x",
    sellerAvatar: "",
    sellerVerified: false,
    createdAt: new Date().toISOString(),
    views: 0,
    featured: false,
    vip: false,
    specs: [],
    listingNo: "FG",
  };
}

async function main() {
  const owner = await seedUser("owner");
  const fan = await seedUser("fan");
  const admin = await seedUser("admin", "admin");
  const ids = [owner.id, fan.id, admin.id];
  const lids: string[] = [];

  try {
    // --- Seller delete while live ---
    const live = await seedListing(owner.id, `FG live delete ${TAG}`);
    lids.push(live.id);
    check("L0", "Seed live listing isLiveRow", isLiveRow(live), `status=${live.status}`);
    await prisma.favorite.create({ data: { userId: fan.id, listingId: live.id } });
    // Seller should not get favoriter notify when they are the only "fan"
    await prisma.favorite.create({ data: { userId: owner.id, listingId: live.id } }).catch(() => undefined);

    const deleted = await deleteListingRecord(asStored(owner), live.id);
    check("D1", "deleteListingRecord ok + wasLive", !("error" in deleted) && deleted.ok && deleted.wasLive === true, JSON.stringify(deleted));
    if (!("error" in deleted)) {
      await notifyFavoriters(deleted.ref, "favorite.gone");
      // Idempotent second call (eventKey unique)
      await notifyFavoriters(deleted.ref, "favorite.gone");
    }
    const fanAfterDelete = await prisma.notification.findMany({
      where: { userId: fan.id, listingId: live.id, kind: "favorite.gone" },
    });
    check("D2", "Favoriter got exactly one favorite.gone after seller delete", fanAfterDelete.length === 1, `n=${fanAfterDelete.length}`);
    const ownerFavNotifs = await prisma.notification.findMany({
      where: { userId: owner.id, listingId: live.id, kind: "favorite.gone" },
    });
    check("D3", "Seller is not notified as favoriter", ownerFavNotifs.length === 0, `n=${ownerFavNotifs.length}`);
    const body = fanAfterDelete[0];
    check(
      "D4",
      "Notify body has title only (no email/phone PII)",
      !!body &&
        /yayında değil|yayından/i.test(`${body.title} ${body.body}`) &&
        !body.body.includes(fan.email) &&
        !body.body.includes(owner.email) &&
        !/\d{10,}/.test(body.body),
      `body=${body?.body?.slice(0, 120)}`,
    );
    check("D5", "Href is favorites path", body?.href === "/profil?p=fav-ilan", `href=${body?.href}`);

    const delRow = await prisma.listing.findUnique({
      where: { id: live.id },
      include: { images: true },
    });
    check("D6", "Listing soft-removed", delRow?.status === "removed" && !!delRow.deletedAt, `status=${delRow?.status}`);
    const publicShape = toListingShape({
      id: delRow!.id,
      status: delRow!.status,
      title: delRow!.title,
      categoryId: delRow!.categoryId,
      price: Number(delRow!.price),
      city: delRow!.city,
      district: delRow!.district,
      images: delRow!.images,
    });
    check("D7", "Removed listing not isPublicListing (favoriler UI hides it)", !isPublicListing(publicShape), `status=${publicShape.status}`);

    // Non-live delete: no favoriter notify
    const passive = await seedListing(owner.id, `FG passive ${TAG}`, { status: "passive" });
    lids.push(passive.id);
    await prisma.favorite.create({ data: { userId: fan.id, listingId: passive.id } });
    const beforePassive = await prisma.notification.count({ where: { userId: fan.id, listingId: passive.id } });
    const delPassive = await deleteListingRecord(asStored(owner), passive.id);
    if (!("error" in delPassive) && delPassive.wasLive) {
      await notifyFavoriters(delPassive.ref, "favorite.gone");
    }
    check("D8", "Passive delete wasLive=false", !("error" in delPassive) && delPassive.wasLive === false, JSON.stringify(delPassive));
    const afterPassive = await prisma.notification.count({ where: { userId: fan.id, listingId: passive.id } });
    check("D9", "No favoriter notify for non-live delete", afterPassive === beforePassive, `${beforePassive}→${afterPassive}`);

    // --- Admin reject while live ---
    const toReject = await seedListing(owner.id, `FG reject ${TAG}`);
    lids.push(toReject.id);
    await prisma.favorite.create({ data: { userId: fan.id, listingId: toReject.id } });
    const wasLiveReject = isLiveRow(toReject);
    const rejectRow = await prisma.listing.update({
      where: { id: toReject.id },
      data: { status: "rejected", rejectedReason: "rules" },
      select: { id: true, title: true, sellerId: true, expiresAt: true },
    });
    // Mirror admin route: seller notice + conditional favoriter notice
    const { notifyListingEvent } = await import("../src/lib/listings/lifecycle");
    await notifyListingEvent(rejectRow, "listing.rejected", { extra: "rules", unique: String(Date.now()) });
    if (wasLiveReject) await notifyFavoriters(rejectRow, "favorite.gone");
    if (wasLiveReject) await notifyFavoriters(rejectRow, "favorite.gone"); // duplicate
    const fanReject = await prisma.notification.findMany({
      where: { userId: fan.id, listingId: toReject.id, kind: "favorite.gone" },
    });
    check("R1", "Admin reject of live listing notifies favoriter once", wasLiveReject && fanReject.length === 1, `n=${fanReject.length}`);
    const sellerReject = await prisma.notification.findMany({
      where: { userId: owner.id, listingId: toReject.id, kind: "listing.rejected" },
    });
    check("R2", "Seller still gets listing.rejected", sellerReject.length >= 1, `n=${sellerReject.length}`);
    check("R3", "Reject reason not leaked into favoriter body", !fanReject[0]?.body.includes("rules"), `body=${fanReject[0]?.body}`);

    // Pending (never live) reject — no favoriter notify
    const pending = await seedListing(owner.id, `FG pending ${TAG}`, { status: "pending" });
    lids.push(pending.id);
    await prisma.favorite.create({ data: { userId: fan.id, listingId: pending.id } });
    const wasLivePending = isLiveRow(pending);
    const pendingRow = await prisma.listing.update({
      where: { id: pending.id },
      data: { status: "rejected", rejectedReason: "pending-reject" },
      select: { id: true, title: true, sellerId: true, expiresAt: true },
    });
    if (wasLivePending) await notifyFavoriters(pendingRow, "favorite.gone");
    check("R4", "Pending listing wasLive=false", wasLivePending === false, `status=pending`);
    const fanPending = await prisma.notification.count({
      where: { userId: fan.id, listingId: pending.id, kind: "favorite.gone" },
    });
    check("R5", "No favoriter notify on reject of non-live listing", fanPending === 0, `n=${fanPending}`);

    // --- Regression: sold + expire still notify ---
    const forSold = await seedListing(owner.id, `FG sold ${TAG}`);
    lids.push(forSold.id);
    await prisma.favorite.create({ data: { userId: fan.id, listingId: forSold.id } });
    const sold = await markListingSold(asStored(owner), forSold.id);
    check("S1", "markListingSold wasLive", !("error" in sold) && sold.wasLive === true);
    if (!("error" in sold) && sold.wasLive) await notifyFavoriters(sold.ref, "favorite.sold");
    const fanSold = await prisma.notification.findMany({
      where: { userId: fan.id, listingId: forSold.id, kind: "favorite.sold" },
    });
    check("S2", "favorite.sold still works", fanSold.length === 1, `n=${fanSold.length}`);

    const due = await seedListing(owner.id, `FG expire ${TAG}`, {
      status: "active",
      expiresAt: new Date(Date.now() - 60_000),
    });
    lids.push(due.id);
    await prisma.favorite.create({ data: { userId: fan.id, listingId: due.id } });
    const sweep = await sweepListings({ sellerId: owner.id, now: new Date() });
    const fanGoneExp = await prisma.notification.findMany({
      where: { userId: fan.id, listingId: due.id, kind: "favorite.gone" },
    });
    check("E1", "Expire sweep still notifies favoriter", sweep.expired >= 1 && fanGoneExp.length === 1, `expired=${sweep.expired} n=${fanGoneExp.length}`);

    // notifySafe must not throw into caller — force a second identical notifyFavoriters already covered.
    // EİDS lock module still active (env unlock token absent)
    const { isEidsPublishLockActive, eidsBlocksActivePublish } = await import("../src/lib/listings/eidsPublishLock");
    check("EIDS", "EİDS publish lock still active", isEidsPublishLockActive() === true);
    check("EIDS2", "EİDS still blocks emlak active publish", eidsBlocksActivePublish("emlak-konut") === true);

    void admin; // seeded for role realism; admin reject exercised via same notify path as route

    // Optional HTTP DELETE against local-test-server
    if (BASE) {
      const jar = new Map<string, string>();
      const take = (res: Response) => {
        const raw = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
        for (const c of raw) {
          const [kv] = c.split(";");
          const i = kv.indexOf("=");
          if (i > 0) jar.set(kv.slice(0, i), kv.slice(i + 1));
        }
      };
      const cookie = () => [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
      const csrfRes = await fetch(`${BASE}/api/auth/csrf`, { headers: { cookie: cookie() } });
      take(csrfRes);
      const { token } = (await csrfRes.json()) as { token: string };
      jar.set("ap_csrf", token);
      const loginRes = await fetch(`${BASE}/api/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json", cookie: cookie(), "x-csrf-token": token },
        body: JSON.stringify({ identifier: owner.email, password: PASSWORD }),
      });
      take(loginRes);
      check("H0", "Local login for API delete", loginRes.status === 200, `status=${loginRes.status}`);
      const apiLive = await seedListing(owner.id, `FG api delete ${TAG}`);
      lids.push(apiLive.id);
      await prisma.favorite.create({ data: { userId: fan.id, listingId: apiLive.id } });
      const delRes = await fetch(`${BASE}/api/listings/${apiLive.id}`, {
        method: "DELETE",
        headers: { cookie: cookie(), "x-csrf-token": jar.get("ap_csrf") || token },
      });
      check("H1", "API DELETE 200", delRes.status === 200, `status=${delRes.status}`);
      await sleep(800);
      const apiFan = await prisma.notification.findMany({
        where: { userId: fan.id, listingId: apiLive.id, kind: "favorite.gone" },
      });
      check("H2", "API DELETE notified favoriter via after()", apiFan.length === 1, `n=${apiFan.length}`);
    } else {
      check("H0", "API layer skipped (set E2E_BASE for HTTP checks)", true, "store-level coverage only");
    }
  } finally {
    await prisma.notification.deleteMany({ where: { OR: [{ userId: { in: ids } }, { listingId: { in: lids } }] } }).catch(() => undefined);
    await prisma.favorite.deleteMany({ where: { OR: [{ userId: { in: ids } }, { listingId: { in: lids } }] } }).catch(() => undefined);
    await prisma.listingImage.deleteMany({ where: { listingId: { in: lids } } }).catch(() => undefined);
    await prisma.listing.deleteMany({ where: { id: { in: lids } } }).catch(() => undefined);
    await prisma.profile.deleteMany({ where: { userId: { in: ids } } }).catch(() => undefined);
    await prisma.userSession.deleteMany({ where: { userId: { in: ids } } }).catch(() => undefined);
    await prisma.user.deleteMany({ where: { id: { in: ids } } }).catch(() => undefined);
    await prisma.$disconnect();
  }

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length) {
    console.error("FAILED:", failed.map((f) => `${f.id} ${f.name}`).join("; "));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
