/**
 * LOCAL ONLY — loopback Postgres :55433.
 * Seeds a loginable mobile-shot user + a few photo listings for UI screenshots.
 * Never touches Production. Idempotent by fixed UUIDs / listingNos.
 */
import { createHash, randomUUID } from "node:crypto";
import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

const url = process.env.DATABASE_URL || "";
let host = "";
let port = "";
try {
  const u = new URL(url);
  host = u.hostname;
  port = u.port || "5432";
} catch {
  console.error("Invalid DATABASE_URL");
  process.exit(1);
}
if (!/^(localhost|127\.0\.0\.1|\[::1\])$/.test(host) || port !== "55433") {
  console.error(`Refusing non-loopback:55433 (got ${host}:${port})`);
  process.exit(1);
}

const prisma = new PrismaClient();

function stableUuid(key) {
  const h = createHash("sha1").update(`alsatport.mobile-ui:${key}`).digest();
  const b = Buffer.from(h.subarray(0, 16));
  b[6] = (b[6] & 0x0f) | 0x50;
  b[8] = (b[8] & 0x3f) | 0x80;
  const hex = b.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

const U = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=80`;

const USER_ID = stableUuid("user:mobile-shot");
const EMAIL = "mobile-shot@local.alsatport.test";
const USERNAME = "mobileshot";
const PASSWORD = "MobileShot!2026";
/** ~9 years tenure for green badge */
const JOINED = new Date("2017-06-15T10:00:00.000Z");

const LISTINGS = [
  {
    key: "otomobil",
    categoryId: "vasita-otomobil",
    title: "BMW 320i M Sport 2020",
    price: 1850000,
    city: "İstanbul",
    district: "Kadıköy",
    neighborhood: "Caferağa",
    images: [U("photo-1555215695-3004980ad54e"), U("photo-1494976388531-d1058494cdd8"), U("photo-1503376780353-7e6692767b70")],
    specs: [
      { label: "Marka", value: "BMW" },
      { label: "Seri", value: "3 Serisi" },
      { label: "Model", value: "320i" },
      { label: "Yıl", value: "2020" },
      { label: "Kilometre", value: "48000" },
      { label: "Yakıt", value: "Benzin" },
      { label: "Vites", value: "Otomatik" },
      { label: "Kasa Tipi", value: "Sedan" },
    ],
    description: "Bakımlı, boyasız BMW 320i. Yerel mobil UI test ilanı — Production dışı.",
  },
  {
    key: "suv",
    categoryId: "vasita-suv",
    title: "Toyota RAV4 Hybrid 2021",
    price: 2450000,
    city: "Ankara",
    district: "Çankaya",
    neighborhood: "Kızılay",
    images: [U("photo-1519641471654-76ce0107ad1b"), U("photo-1533473359331-0135ef1b58bf")],
    specs: [
      { label: "Marka", value: "Toyota" },
      { label: "Seri", value: "RAV4" },
      { label: "Model", value: "Hybrid" },
      { label: "Yıl", value: "2021" },
      { label: "Kilometre", value: "32000" },
      { label: "Yakıt", value: "Hibrit" },
      { label: "Vites", value: "Otomatik" },
      { label: "Kasa Tipi", value: "SUV" },
    ],
    description: "SUV test ilanı — izole ortam.",
  },
  {
    key: "moto",
    categoryId: "vasita-moto",
    title: "Honda CB500X 2019",
    price: 285000,
    city: "İzmir",
    district: "Bornova",
    neighborhood: "Erzene",
    images: [U("photo-1558981852-426c6c22a060"), U("photo-1568772585407-9361f9bf3a87")],
    specs: [
      { label: "Marka", value: "Honda" },
      { label: "Model", value: "CB500X" },
      { label: "Yıl", value: "2019" },
      { label: "Kilometre", value: "18000" },
      { label: "Motor Hacmi", value: "471" },
    ],
    description: "Motosiklet test ilanı — izole ortam.",
  },
  {
    key: "emlak",
    categoryId: "emlak-konut",
    title: "Deniz Manzaralı 3+1 Daire",
    price: 8750000,
    city: "İstanbul",
    district: "Beşiktaş",
    neighborhood: "Levazım",
    images: [U("photo-1502672260266-1c1ef2d93688"), U("photo-1560448204-e02f11c3d0e2"), U("photo-1600596542815-ffad4c1539a9")],
    specs: [
      { label: "Emlak Tipi", value: "Daire" },
      { label: "m² (Brüt)", value: "145" },
      { label: "Oda Sayısı", value: "3+1" },
      { label: "Bina Yaşı", value: "5" },
      { label: "Kat", value: "8" },
    ],
    description: "Emlak test ilanı — izole ortam.",
  },
  {
    key: "pickup",
    categoryId: "vasita-suv",
    title: "Ford Ranger Wildtrak 2022",
    price: 2650000,
    city: "Bursa",
    district: "Nilüfer",
    neighborhood: "Özlüce",
    images: [U("photo-1533473359331-0135ef1b58bf"), U("photo-1519641471654-76ce0107ad1b")],
    specs: [
      { label: "Marka", value: "Ford" },
      { label: "Seri", value: "Ranger" },
      { label: "Model", value: "Wildtrak" },
      { label: "Yıl", value: "2022" },
      { label: "Kilometre", value: "22000" },
      { label: "Yakıt", value: "Dizel" },
      { label: "Vites", value: "Otomatik" },
      { label: "Kasa Tipi", value: "Pickup" },
    ],
    description: "Pickup test ilanı — izole ortam.",
  },
];

async function ensureCategories() {
  const needed = [...new Set(LISTINGS.map((l) => l.categoryId))];
  const have = new Set(
    (await prisma.category.findMany({ where: { id: { in: needed } }, select: { id: true } })).map((c) => c.id),
  );
  const missing = needed.filter((id) => !have.has(id));
  if (missing.length) {
    throw new Error(
      `Missing categories in local DB: ${missing.join(", ")}. Run: npx prisma db seed (loopback :55433 only).`,
    );
  }
}

async function ensureUser() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  await prisma.user.upsert({
    where: { id: USER_ID },
    update: {
      passwordHash,
      emailVerifiedAt: new Date(),
      bannedAt: null,
      createdAt: JOINED,
    },
    create: {
      id: USER_ID,
      email: EMAIL,
      username: USERNAME,
      passwordHash,
      provider: "email",
      role: "seller",
      emailVerifiedAt: new Date(),
      createdAt: JOINED,
    },
  });
  // Prisma may ignore createdAt on update for @default — force via updateMany
  await prisma.user.updateMany({ where: { id: USER_ID }, data: { createdAt: JOINED } });
  await prisma.profile.upsert({
    where: { userId: USER_ID },
    update: {
      displayName: "Ekrem Test",
      fullName: "Ekrem Test",
      phone: "05321234567",
      city: "İstanbul",
      district: "Kadıköy",
      neighborhood: "Caferağa",
      address: "Test Mah. No:1",
      profileComplete: true,
      plan: "standart",
      freeListingQuota: 3,
      planListingAllowance: 0,
      dopingUntil: null,
      planUntil: null,
      openAccessUntil: null,
      termsAcceptedAt: new Date(),
      kvkkNotifiedAt: new Date(),
    },
    create: {
      userId: USER_ID,
      displayName: "Ekrem Test",
      fullName: "Ekrem Test",
      phone: "05321234567",
      city: "İstanbul",
      district: "Kadıköy",
      neighborhood: "Caferağa",
      address: "Test Mah. No:1",
      profileComplete: true,
      plan: "standart",
      freeListingQuota: 3,
      planListingAllowance: 0,
      termsAcceptedAt: new Date(),
      kvkkNotifiedAt: new Date(),
    },
  });
  return USER_ID;
}

async function ensureListings(sellerId) {
  const now = new Date();
  const expires = new Date(now.getTime() + 15 * 24 * 3600_000);
  let n = 0;
  for (const L of LISTINGS) {
    const id = stableUuid(`listing:${L.key}`);
    const listingNo = `MOB-${L.key}`.slice(0, 20);
    const existing = await prisma.listing.findFirst({
      where: { OR: [{ id }, { listingNo }] },
      select: { id: true },
    });
    if (existing) {
      await prisma.listing.update({
        where: { id: existing.id },
        data: {
          status: "active",
          postedAt: now,
          expiresAt: expires,
          deletedAt: null,
          title: L.title,
          price: new Prisma.Decimal(L.price),
          city: L.city,
          district: L.district,
          neighborhood: L.neighborhood,
          description: L.description,
          specs: L.specs,
          categoryId: L.categoryId,
          sellerId,
        },
      });
      await prisma.listingImage.deleteMany({ where: { listingId: existing.id } });
      await prisma.listingImage.createMany({
        data: L.images.map((url, sortOrder) => ({
          id: randomUUID(),
          listingId: existing.id,
          storageKey: `mobile-ui/${L.key}/${sortOrder}`,
          url,
          sortOrder,
          isCover: sortOrder === 0,
        })),
      });
      n += 1;
      continue;
    }
    await prisma.listing.create({
      data: {
        id,
        listingNo,
        sellerId,
        categoryId: L.categoryId,
        title: L.title,
        subtitle: "",
        description: L.description,
        price: new Prisma.Decimal(L.price),
        currency: "TRY",
        city: L.city,
        district: L.district,
        neighborhood: L.neighborhood,
        status: "active",
        views: 12 + n,
        specs: L.specs,
        features: [],
        postedAt: now,
        expiresAt: expires,
        images: {
          create: L.images.map((url, sortOrder) => ({
            storageKey: `mobile-ui/${L.key}/${sortOrder}`,
            url,
            sortOrder,
            isCover: sortOrder === 0,
          })),
        },
      },
    });
    n += 1;
  }
  return n;
}

async function main() {
  console.log("seed-mobile-ui-shots: start (loopback :55433)");
  await ensureCategories();
  const sellerId = await ensureUser();
  const listings = await ensureListings(sellerId);
  console.log(
    JSON.stringify(
      {
        ok: true,
        sellerId,
        email: EMAIL,
        password: PASSWORD,
        listings,
        badgeJoined: JOINED.toISOString(),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
