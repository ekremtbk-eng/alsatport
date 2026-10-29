/**
 * Public listing visibility alignment (list / suggest / counts / isPublicListing / renew-resale photo).
 *
 * Unit + source checks always run (no DB).
 * Optional loopback DB section (no Production / Neon):
 *
 *   E2E_DATABASE_URL=postgresql://postgres@127.0.0.1:55433/alsat \
 *     npx tsx --conditions=react-server scripts/test-listing-public-visibility.ts
 *
 * Optional HTTP suggest check when a local app is up:
 *   E2E_BASE=http://127.0.0.1:3014 ...
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isListingWithinPeriod, isPublicListing } from "../src/lib/categoryCounts";
import { isEidsGateCategory, isEidsPublishLockActive } from "../src/lib/listings/eidsPublishLock";
import type { Listing } from "../src/data/store";

type Row = { id: string; name: string; pass: boolean; detail?: string };
const results: Row[] = [];
function check(id: string, name: string, pass: boolean, detail = "") {
  results.push({ id, name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${id.padEnd(6)} ${name}${detail ? `  — ${detail}` : ""}`);
}

function baseListing(over: Partial<Listing> = {}): Listing {
  const now = Date.now();
  return {
    id: "l1",
    title: "Satılık iPhone 13",
    subtitle: "İstanbul",
    price: 10000,
    categoryId: "shopping-phone",
    city: "İstanbul",
    district: "Kadıköy",
    images: ["https://example.com/a.jpg"],
    description: "Temiz",
    sellerId: "u1",
    sellerName: "Ali",
    sellerAvatar: "",
    sellerVerified: false,
    createdAt: new Date(now).toISOString(),
    views: 0,
    featured: false,
    vip: false,
    status: "active",
    specs: [],
    listingNo: "1",
    postedAt: now,
    expiresAt: now + 7 * 86_400_000,
    ...over,
  };
}

console.log("\n--- unit: isPublicListing / period ---");
const now = Date.now();
check("U1", "valid active + photo + future expiresAt → public", isPublicListing(baseListing(), now));
check("U2", "no images → not public", !isPublicListing(baseListing({ images: [] }), now));
check(
  "U3",
  "past expiresAt → not public (even if status active)",
  !isPublicListing(baseListing({ expiresAt: now - 1000 }), now),
);
check("U4", "status expired → not public", !isPublicListing(baseListing({ status: "expired" }), now));
check("U5", "status sold → not public", !isPublicListing(baseListing({ status: "sold" }), now));
check(
  "U6",
  "nullish expiresAt + active + photo → public",
  isPublicListing(baseListing({ expiresAt: undefined }), now),
);
check("U7", "isListingWithinPeriod false when expired", !isListingWithinPeriod({ expiresAt: now - 1 }, now));
check(
  "U8",
  "pending without photo → not public",
  !isPublicListing(baseListing({ status: "pending", images: [] }), now),
);

console.log("\n--- unit: EİDS lock unchanged ---");
delete process.env.EIDS_PUBLISH_UNLOCK;
delete process.env.EIDS_PUBLISH_LOCK;
check("E1", "EİDS lock still active by default", isEidsPublishLockActive());
check("E2", "emlak still gated", isEidsGateCategory("emlak"));
check("E3", "vasita still gated", isEidsGateCategory("vasita-otomobil"));
check("E4", "shopping still not gated", !isEidsGateCategory("shopping"));

console.log("\n--- source: public list/suggest/counts/renew/resale alignment ---");
const root = process.cwd();
const storeSrc = readFileSync(join(root, "src/lib/listings/store.ts"), "utf8");
const catSrc = readFileSync(join(root, "src/lib/listings/categoryCounts.ts"), "utf8");
const clientSrc = readFileSync(join(root, "src/lib/categoryCounts.ts"), "utf8");
const sitemapSrc = readFileSync(join(root, "src/app/sitemap.ts"), "utf8");
const bizSrc = readFileSync(join(root, "src/lib/business/store.ts"), "utf8");

check("S1", "publicLiveWithImageWhere exported", /export function publicLiveWithImageWhere/.test(catSrc));
check(
  "S2",
  "publicCountWhere includes images.some",
  /images:\s*\{\s*some:\s*\{\s*\}/.test(catSrc) && /liveListingWhere/.test(catSrc),
);
check(
  "S3",
  "queryListings uses publicLiveWithImageWhere (not bare liveListingWhere)",
  /publicLiveWithImageWhere/.test(storeSrc) &&
    !/and\.push\(live\)/.test(storeSrc) &&
    !/and\.push\(liveListingWhere\(\)\)/.test(storeSrc),
);
check("S4", "suggestPublicListings uses publicCountWhere", /suggestPublicListings[\s\S]{0,400}publicCountWhere\(\)/.test(storeSrc));
check("S5", "renewListingRecord rejects photo.minN when no images", /renewListingRecord[\s\S]{0,800}photo\.minN/.test(storeSrc));
check("S6", "resaleListingRecord rejects photo.minN when no images", /resaleListingRecord[\s\S]{0,800}photo\.minN/.test(storeSrc));
check(
  "S7",
  "isPublicListing checks expiresAt/period",
  /isListingWithinPeriod/.test(clientSrc) && /isPublicListing[\s\S]{0,300}isListingWithinPeriod/.test(clientSrc),
);
check("S8", "sitemap uses publicCountWhere (image gate)", /publicCountWhere\(\)/.test(sitemapSrc));
check("S9", "public storefront uses publicLiveWithImageWhere", /publicLiveWithImageWhere\(\)/.test(bizSrc));
check(
  "S10",
  "listPublicAndOwnedListings uses publicLiveWithImageWhere",
  /listPublicAndOwnedListings[\s\S]{0,400}publicLiveWithImageWhere/.test(storeSrc),
);

const LOOPBACK = /^(localhost|127\.0\.0\.1|\[::1\])$/;
const appBase = (process.env.E2E_BASE ?? "").replace(/\/$/, "");
const db = process.env.E2E_DATABASE_URL ?? "";

async function dbSection() {
  if (!db) {
    console.log("\n--- DB section SKIPPED (set E2E_DATABASE_URL=postgresql://…@127.0.0.1:55433/alsat) ---");
    return;
  }
  let host = "";
  let port = "";
  try {
    const u = new URL(db);
    host = u.hostname;
    port = u.port;
  } catch {
    check("D0", "E2E_DATABASE_URL parseable", false, "invalid URL");
    return;
  }
  if (!LOOPBACK.test(host) || port !== "55433") {
    check("D0", "refuse non-loopback:55433", false, `${host}:${port}`);
    return;
  }
  if (appBase && !LOOPBACK.test(new URL(appBase).hostname)) {
    check("D0", "refuse non-loopback E2E_BASE", false, appBase);
    return;
  }

  // Store helpers read DATABASE_URL via @/lib/db — pin to the same loopback URL.
  process.env.DATABASE_URL = db;
  process.env.DIRECT_URL = db;

  const { randomBytes } = await import("node:crypto");
  const bcrypt = (await import("bcryptjs")).default;
  const { PrismaClient } = await import("@prisma/client");
  const { publicCountWhere, publicLiveWithImageWhere, computeCategoryCounts, invalidateCategoryCounts } =
    await import("../src/lib/listings/categoryCounts");
  const { liveListingWhere } = await import("../src/lib/listings/lifecycle");
  const {
    createListing,
    queryListings,
    findListingRecord,
    renewListingRecord,
    resaleListingRecord,
    markListingSold,
    suggestPublicListings,
  } = await import("../src/lib/listings/store");
  const { startConversation, postMessage } = await import("../src/lib/messages/store");
  const { eidsBlocksActivePublish } = await import("../src/lib/listings/eidsPublishLock");

  const TAG = randomBytes(3).toString("hex");
  const prisma = new PrismaClient({ datasources: { db: { url: db } } });
  const email = `vis-${TAG}@visibility.invalid`;
  const fanEmail = `fan-${TAG}@visibility.invalid`;
  const hash = await bcrypt.hash(`Vis!${TAG}9aA`, 10);
  let userId = "";
  let fanId = "";
  const listingIds: string[] = [];
  const imgKey = (suffix: string) => `vis/${TAG}/${suffix}.jpg`;
  const ownedUrl = (uid: string, name: string) => `/api/media/listings/${uid}/${name}`;

  try {
    const user = await prisma.user.create({
      data: {
        email,
        username: `vis_${TAG}`,
        role: "seller",
        passwordHash: hash,
        emailVerifiedAt: new Date(),
        profile: { create: { displayName: "Vis Test", profileComplete: true, city: "İstanbul" } },
      },
    });
    userId = user.id;

    const fan = await prisma.user.create({
      data: {
        email: fanEmail,
        username: `fan_${TAG}`,
        role: "member",
        passwordHash: hash,
        emailVerifiedAt: new Date(),
        profile: { create: { displayName: "Fan Test", profileComplete: true, city: "İstanbul" } },
      },
    });
    fanId = fan.id;

    const seller = {
      id: userId,
      email,
      username: `vis_${TAG}`,
      provider: "email" as const,
      role: "seller" as const,
      profile: {} as never,
    };

    const period = { postedAt: new Date(), expiresAt: new Date(Date.now() + 7 * 86_400_000) };
    const expiredPeriod = {
      postedAt: new Date(Date.now() - 20 * 86_400_000),
      expiresAt: new Date(Date.now() - 1000),
    };
    const listingBase = {
      sellerId: userId,
      subtitle: "İstanbul / Kadıköy",
      description: "sentetik görünürlük testi",
      price: 100,
      categoryId: "shopping-phone",
      city: "İstanbul",
      district: "Kadıköy",
      status: "active" as const,
    };

    // --- create via store (shopping must publish) ---
    const created = await createListing(seller, {
      title: `CreateOK ${TAG}`,
      description: "sentetik shopping ilanı en az kırk karakter açıklama metni.",
      categoryId: "shopping-phone",
      city: "İstanbul",
      district: "Kadıköy",
      price: 2500,
      currency: "TRY",
      images: [ownedUrl(userId, `${TAG}-create.jpg`)],
    });
    const createdListing = "listing" in created ? created.listing : undefined;
    check("D1", "createListing shopping with owned photo succeeds", !!createdListing, JSON.stringify(created));
    if (createdListing) listingIds.push(createdListing.id);

    const eidsBlocked = eidsBlocksActivePublish("vasita-otomobil");
    check("D2", "EİDS blocks vasita active publish", eidsBlocked === true);

    const eidsCreate = await createListing(seller, {
      title: `EidsBlock ${TAG}`,
      description: "bu ilan EİDS kilidi nedeniyle yayınlanmamalıdır ve test amaçlıdır.",
      categoryId: "vasita-otomobil",
      city: "İstanbul",
      district: "Kadıköy",
      price: 100000,
      currency: "TRY",
      images: [ownedUrl(userId, `${TAG}-eids.jpg`)],
    });
    const eidsDraft = "listing" in eidsCreate ? eidsCreate.listing : undefined;
    check(
      "D3",
      "createListing vasita saves as EİDS draft (not active)",
      !!eidsDraft && eidsDraft.status === "draft" && !eidsDraft.expiresAt && !("error" in eidsCreate),
      JSON.stringify(eidsCreate),
    );
    if (eidsDraft) listingIds.push(eidsDraft.id);

    // --- fixture rows for visibility matrix ---
    const withPhoto = await prisma.listing.create({
      data: {
        ...listingBase,
        title: `Valid ${TAG}`,
        listingNo: `V${TAG}a`,
        ...period,
        images: {
          create: [
            {
              storageKey: imgKey("a"),
              url: `https://example.invalid/${TAG}.jpg`,
              sortOrder: 0,
              isCover: true,
            },
          ],
        },
      },
    });
    listingIds.push(withPhoto.id);

    const noPhoto = await prisma.listing.create({
      data: {
        ...listingBase,
        title: `NoPhoto ${TAG}`,
        listingNo: `V${TAG}b`,
        ...period,
      },
    });
    listingIds.push(noPhoto.id);

    const expired = await prisma.listing.create({
      data: {
        ...listingBase,
        title: `Expired ${TAG}`,
        listingNo: `V${TAG}c`,
        ...expiredPeriod,
        images: {
          create: [
            {
              storageKey: imgKey("e"),
              url: `https://example.invalid/${TAG}-e.jpg`,
              sortOrder: 0,
              isCover: true,
            },
          ],
        },
      },
    });
    listingIds.push(expired.id);

    const liveOnly = await prisma.listing.count({
      where: { sellerId: userId, deletedAt: null, ...liveListingWhere() },
    });
    const publicOnly = await prisma.listing.count({
      where: { sellerId: userId, ...publicCountWhere() },
    });
    check("D4", "liveListingWhere includes photo-less time-valid", liveOnly >= 2, `live=${liveOnly}`);
    check("D5", "publicCountWhere only photo+live for seller fixtures", publicOnly >= 1, `public=${publicOnly}`);

    const publicIds = (
      await prisma.listing.findMany({
        where: { sellerId: userId, deletedAt: null, ...publicLiveWithImageWhere() },
        select: { id: true, title: true },
      })
    ).map((r) => r.id);
    check("D6", "no-photo excluded from public set", !publicIds.includes(noPhoto.id));
    check("D7", "expired excluded from public set", !publicIds.includes(expired.id));
    check("D8", "valid imaged included in public set", publicIds.includes(withPhoto.id));

    const emptyCount = await prisma.listing.count({
      where: { sellerId: "00000000-0000-0000-0000-000000000000", ...publicCountWhere() },
    });
    check("D9", "empty inventory → public count 0", emptyCount === 0);

    // --- search / suggest / detail / counts ---
    const listed = await queryListings({ q: TAG, categoryId: "shopping-phone" });
    const listedIds = listed.map((l) => l.id);
    check("D10", "queryListings excludes no-photo", !listedIds.includes(noPhoto.id), `n=${listed.length}`);
    check("D11", "queryListings excludes expired", !listedIds.includes(expired.id));
    check("D12", "queryListings includes valid imaged", listedIds.includes(withPhoto.id));

    const suggestions = await suggestPublicListings(`Valid ${TAG}`, 8);
    check(
      "D13",
      "suggestPublicListings finds valid imaged title",
      suggestions.some((s) => s.id === withPhoto.id),
      JSON.stringify(suggestions.map((s) => s.title)),
    );
    check(
      "D14",
      "suggestPublicListings omits no-photo title",
      !suggestions.some((s) => s.id === noPhoto.id),
    );

    const detail = await findListingRecord(withPhoto.id);
    check("D15", "findListingRecord returns valid listing", !!detail && detail.id === withPhoto.id);

    invalidateCategoryCounts();
    const counts = await computeCategoryCounts();
    const phoneCount = counts.counts["shopping-phone"] ?? 0;
    const shoppingCount = counts.counts.shopping ?? 0;
    check("D16", "category counts include shopping-phone public rows", phoneCount >= 1, `phone=${phoneCount}`);
    check("D17", "list/count alignment: shopping rollup >= phone", shoppingCount >= phoneCount, `shopping=${shoppingCount}`);

    // --- renew / resale photo.minN ---
    // Force noPhoto into expired so renew is eligible (not already live).
    await prisma.listing.update({
      where: { id: noPhoto.id },
      data: { status: "expired", expiresAt: new Date(Date.now() - 1000) },
    });
    const renewNoPhoto = await renewListingRecord(seller, noPhoto.id);
    check(
      "D18",
      "renew without photo → photo.minN",
      "error" in renewNoPhoto && renewNoPhoto.error === "photo.minN",
      JSON.stringify(renewNoPhoto),
    );

    const soldOk = await markListingSold(seller, withPhoto.id);
    check("D19", "markListingSold succeeds on imaged listing", "listing" in soldOk, JSON.stringify(soldOk));
    await prisma.listingImage.deleteMany({ where: { listingId: withPhoto.id } });
    const resaleNoPhoto = await resaleListingRecord(seller, withPhoto.id);
    check(
      "D20",
      "resale without photo → photo.minN",
      "error" in resaleNoPhoto && resaleNoPhoto.error === "photo.minN",
      JSON.stringify(resaleNoPhoto),
    );

    // Restore image and confirm resale works with photo.
    await prisma.listingImage.create({
      data: {
        listingId: withPhoto.id,
        storageKey: imgKey("restore"),
        url: `https://example.invalid/${TAG}-restore.jpg`,
        sortOrder: 0,
        isCover: true,
      },
    });
    const resaleOk = await resaleListingRecord(seller, withPhoto.id);
    check("D21", "resale with photo succeeds", "listing" in resaleOk, JSON.stringify(resaleOk));

    // --- favorites regression ---
    await prisma.favorite.create({ data: { userId: fanId, listingId: withPhoto.id } });
    const favRows = await prisma.favorite.findMany({
      where: { userId: fanId },
      include: { listing: { include: { images: true } } },
    });
    const favPublic = favRows.filter((f) => {
      const expiresAt = f.listing.expiresAt?.getTime();
      return isPublicListing({
        ...baseListing({
          id: f.listing.id,
          title: f.listing.title,
          status: f.listing.status === "removed" ? "expired" : (f.listing.status as Listing["status"]),
          images: f.listing.images.map((i) => i.url),
          expiresAt,
          categoryId: f.listing.categoryId,
        }),
      });
    });
    check("D22", "favorite on public listing remains visible via isPublicListing", favPublic.length === 1);

    await prisma.listing.update({
      where: { id: withPhoto.id },
      data: { expiresAt: new Date(Date.now() - 1000), status: "active" },
    });
    const favAfterExpire = favRows.filter((f) => {
      const listing = f.listing.id === withPhoto.id ? { ...f.listing, expiresAt: new Date(Date.now() - 1000) } : f.listing;
      return isPublicListing({
        ...baseListing({
          id: listing.id,
          title: listing.title,
          status: "active",
          images: listing.images.map((i) => i.url),
          expiresAt: listing.expiresAt?.getTime(),
          categoryId: listing.categoryId,
        }),
      });
    });
    check("D23", "favorite of expired listing filtered by isPublicListing", favAfterExpire.length === 0);

    // Restore period for messaging
    await prisma.listing.update({
      where: { id: withPhoto.id },
      data: { expiresAt: new Date(Date.now() + 7 * 86_400_000), status: "active" },
    });

    // --- messaging regression ---
    const convo = await startConversation(fanId, withPhoto.id);
    const conversation = "conversation" in convo ? convo.conversation : undefined;
    check("D24", "startConversation on listing succeeds", !!conversation, JSON.stringify(convo));
    if (conversation) {
      const posted = await postMessage(fanId, conversation.id, `Merhaba sentetik ${TAG}`);
      check("D25", "postMessage succeeds", "messageId" in posted, JSON.stringify(posted));
    } else {
      check("D25", "postMessage succeeds", false, "no conversation");
    }

    if (appBase) {
      const suggestRes = await fetch(`${appBase}/api/search/suggest?q=${encodeURIComponent(`Valid ${TAG}`)}`);
      check("D26", "HTTP suggest reachable", suggestRes.status < 500, `status=${suggestRes.status}`);
    } else {
      console.log("\n--- HTTP suggest SKIPPED (no E2E_BASE) — store suggest covered by D13/D14 ---");
    }
  } finally {
    try {
      if (listingIds.length) {
        await prisma.message.deleteMany({
          where: { conversation: { listingId: { in: listingIds } } },
        });
        await prisma.conversationRead.deleteMany({
          where: { conversation: { listingId: { in: listingIds } } },
        });
        await prisma.conversation.deleteMany({ where: { listingId: { in: listingIds } } });
        await prisma.favorite.deleteMany({ where: { listingId: { in: listingIds } } });
        await prisma.notification.deleteMany({ where: { listingId: { in: listingIds } } }).catch(() => undefined);
        await prisma.listingImage.deleteMany({ where: { listingId: { in: listingIds } } });
        await prisma.listing.deleteMany({ where: { id: { in: listingIds } } });
      }
      const userIds = [userId, fanId].filter(Boolean);
      if (userIds.length) {
        await prisma.profile.deleteMany({ where: { userId: { in: userIds } } });
        await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      }
    } catch (cleanupErr) {
      console.error("cleanup warning:", cleanupErr);
    }
    await prisma.$disconnect();
  }
}

async function main() {
  await dbSection();
  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length) {
    console.error("FAILED:", failed.map((f) => f.id).join(", "));
    process.exit(1);
  }
  console.log("listing public visibility tests passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
