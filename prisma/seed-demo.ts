import { createHash, randomBytes } from "node:crypto";
import { Prisma, PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

if (process.env.VERCEL_ENV === "production") {
  console.error("seed-demo: refused. Demo data is never seeded in production.");
  process.exit(1);
}
if (process.env.SEED_DEMO_LISTINGS !== "1") {
  console.error("seed-demo: refused. Set SEED_DEMO_LISTINGS=1 explicitly to create demo sellers/listings.");
  process.exit(1);
}

const prisma = new PrismaClient();

function stableUuid(key: string) {
  const h = createHash("sha1").update(`alsatport.demo:${key}`).digest();
  const b = Buffer.from(h.subarray(0, 16));
  b[6] = (b[6]! & 0x0f) | 0x50;
  b[8] = (b[8]! & 0x3f) | 0x80;
  const hex = b.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/** Demo accounts get an unknown random password, so nobody can sign in as them. */
async function seedDemoSellers() {
  const { DEMO_SELLERS } = await import("../src/data/demoSeed");
  const map = new Map<string, string>();
  let i = 0;
  for (const seller of DEMO_SELLERS) {
    const id = stableUuid(`seller:${seller.id}`);
    map.set(seller.id, id);
    const phone = `0532${String(1000001 + i).slice(-7)}`;
    i += 1;
    const passwordHash = await bcrypt.hash(randomBytes(32).toString("base64url"), 10);
    await prisma.user.upsert({
      where: { id },
      update: {},
      create: {
        id,
        email: `${seller.id}@demo.alsatport.com`,
        username: seller.id.replace(/^u-/, "demo-"),
        passwordHash,
        provider: "email",
        role: "seller",
        emailVerifiedAt: new Date(),
      },
    });
    await prisma.profile.upsert({
      where: { userId: id },
      update: {},
      create: {
        userId: id,
        displayName: seller.name,
        fullName: seller.name,
        avatarUrl: seller.avatar,
        phone,
        phoneVerifiedAt: new Date(),
        city: "İstanbul",
        verified: seller.verified,
        profileComplete: true,
        plan: seller.verified ? "profesyonel" : "standart",
      },
    });
  }
  return map;
}

/** Insert-only: existing listings (demo or real) are never deleted or modified. */
async function seedDemoListings(sellerMap: Map<string, string>) {
  const { buildDemoListings, DEMO_LISTING_PREFIX } = await import("../src/data/demoSeed");
  const listings = buildDemoListings();

  const catIds = new Set((await prisma.category.findMany({ select: { id: true } })).map((c) => c.id));
  if (!catIds.size) throw new Error("No categories found. Run the base seed (prisma/seed.ts) first.");
  const valid = listings.filter((l) => catIds.has(l.categoryId) && sellerMap.has(l.sellerId));
  const seenNo = new Set<string>();
  const rows = valid.map((l, idx) => {
    let listingNo = (l.listingNo || `${DEMO_LISTING_PREFIX}${idx}`).slice(0, 20);
    if (seenNo.has(listingNo)) listingNo = `${DEMO_LISTING_PREFIX}${idx.toString(36)}`.slice(0, 20);
    seenNo.add(listingNo);
    return {
      id: stableUuid(l.id),
      listingNo,
      sellerId: sellerMap.get(l.sellerId)!,
      categoryId: l.categoryId,
      title: l.title.slice(0, 200),
      subtitle: (l.subtitle || "").slice(0, 160),
      description: l.description.slice(0, 8000),
      price: new Prisma.Decimal(l.price),
      city: l.city,
      district: l.district,
      neighborhood: l.neighborhood || "",
      status: "active" as const,
      featured: !!l.featured,
      vip: !!l.vip,
      urgent: !!l.urgent,
      refurbished: !!l.refurbished,
      views: l.views,
      specs: (l.specs ?? []) as Prisma.InputJsonValue,
      features: (l.features ?? []) as Prisma.InputJsonValue,
      postedAt: l.postedAt ? new Date(l.postedAt) : new Date(),
      expiresAt: new Date(Date.now() + 90 * 24 * 3_600_000),
      images: l.images,
    };
  });

  let inserted = 0;
  const BATCH = 80;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const existing = new Set(
      (
        await prisma.listing.findMany({
          where: { OR: [{ id: { in: chunk.map((r) => r.id) } }, { listingNo: { in: chunk.map((r) => r.listingNo) } }] },
          select: { id: true, listingNo: true },
        })
      ).flatMap((r) => [r.id, r.listingNo]),
    );
    const fresh = chunk.filter((r) => !existing.has(r.id) && !existing.has(r.listingNo));
    if (!fresh.length) continue;
    const res = await prisma.listing.createMany({
      data: fresh.map(({ images: _images, ...row }) => row),
      skipDuplicates: true,
    });
    inserted += res.count;
    const images = fresh.flatMap((row) =>
      row.images.slice(0, 8).map((url, sortOrder) => ({
        listingId: row.id,
        storageKey: `demo/${row.id}/${sortOrder}`,
        url,
        sortOrder,
        isCover: sortOrder === 0,
      })),
    );
    if (images.length) await prisma.listingImage.createMany({ data: images, skipDuplicates: true });
  }

  return inserted;
}

async function main() {
  console.log("seed-demo: start");
  const sellers = await seedDemoSellers();
  const listings = await seedDemoListings(sellers);
  console.log(`seed-demo: ${sellers.size} demo sellers ensured, ${listings} demo listings inserted.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
