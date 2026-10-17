/**
 * LOCAL ONLY: a handful of fake Otomobil listings so the mobile filter screens can be reviewed with real cards.
 * Refuses any DATABASE_URL that is not a loopback host on port 55433 (the embedded test Postgres).
 *
 *   npx tsx scripts/local-fixtures-otomobil.ts            # add (skips if already present)
 *   npx tsx scripts/local-fixtures-otomobil.ts --remove   # remove everything this script created
 *   npx tsx scripts/local-fixtures-otomobil.ts --dry      # print the generated specs, no DB access
 */
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { emptyChassis, schemaForCategoryId, specsWithChassis, type AttrField } from "@/data/listingSchema";
import { modelsOfBrand, packagesOfModel, enginesOfModel, bodiesOfModel, rangesOfModel } from "@/data/listingOptions";
import { VEHICLE_OTHER } from "@/data/vehicleIndex";

const CAT = "vasita-otomobil";
const EMAIL = "otomobil-fixture@fixture.invalid";
const PREFIX = "LFOTO";

const PHOTOS = [
  "photo-1555215695-3004980ad54e",
  "photo-1494976388531-d1058494cdd8",
  "photo-1503376780353-7e6692767b70",
  "photo-1492144534655-ae79c964c9d7",
  "photo-1542362567-b07e54358753",
  "photo-1553440569-bcc63803a83d",
  "photo-1549317661-bd32c8ce0db2",
  "photo-1583121274602-3e2820c69888",
];

const CARS = [
  // Price kept inside the E2E combo window (700k–1.5M TRY) used by test-otomobil-filters.
  // Both BMW 3 Serisi share trim/Paket=316i so Marka→Seri→Paket footer count (T3) matches bmw3=2.
  { brand: "BMW", model: "3 Serisi", year: "2019", km: "68000", fuel: "Benzin", gear: "Otomatik", trim: "316i", price: 1_250_000, city: "İstanbul", district: "Kadıköy" },
  { brand: "BMW", model: "3 Serisi", year: "2020", km: "42000", fuel: "Dizel", gear: "Otomatik", trim: "316i", price: 1_380_000, city: "Ankara", district: "Çankaya" },
  { brand: "Mercedes-Benz", model: "C Serisi", year: "2017", km: "112000", fuel: "Dizel", gear: "Otomatik", price: 1_450_000, city: "Ankara", district: "Çankaya" },
  { brand: "Renault", model: "Clio", year: "2021", km: "34000", fuel: "Benzin", gear: "Manuel", price: 765_000, city: "İzmir", district: "Karşıyaka" },
  { brand: "Fiat", model: "Egea", year: "2020", km: "89000", fuel: "Dizel", gear: "Manuel", price: 690_000, city: "Bursa", district: "Nilüfer" },
  { brand: "Toyota", model: "Corolla", year: "2022", km: "21000", fuel: "Hibrit", gear: "Otomatik", price: 1_120_000, city: "Antalya", district: "Muratpaşa" },
  { brand: "Volkswagen", model: "Passat", year: "2016", km: "164000", fuel: "Dizel", gear: "Otomatik", price: 980_000, city: "İstanbul", district: "Beşiktaş" },
  { brand: "Honda", model: "Civic", year: "2018", km: "97000", fuel: "LPG", gear: "Otomatik", price: 1_040_000, city: "Kocaeli", district: "İzmit" },
  { brand: "Hyundai", model: "i20", year: "2014", km: "185000", fuel: "Benzin", gear: "Manuel", price: 420_000, city: "Lefkoşa", district: "Gönyeli" },
];

function optionsFor(field: AttrField, attrs: Record<string, string>) {
  const k = field.catalogKind ?? "auto";
  if (field.optionSource === "vehicleModels") return modelsOfBrand(attrs.brand, k);
  if (field.optionSource === "vehiclePackages") return packagesOfModel(attrs.brand, attrs.model, k);
  if (field.optionSource === "vehicleEngines") return enginesOfModel(attrs.brand, attrs.model, k);
  if (field.optionSource === "vehicleBodies") return bodiesOfModel(attrs.brand, attrs.model, k);
  if (field.optionSource === "vehicleRanges") return rangesOfModel(attrs.brand, attrs.model, k);
  return field.options ?? [];
}

function build(car: (typeof CARS)[number], i: number) {
  const schema = schemaForCategoryId(CAT);
  const attrs: Record<string, string> = {};
  for (const field of schema.fields) {
    if (field.key === "brand") {
      attrs.brand = car.brand;
      continue;
    }
    if (field.key === "km") {
      attrs.km = car.km;
      continue;
    }
    if (field.kind === "number" || field.kind === "text") continue;
    const opts = optionsFor(field, attrs).filter((o) => o !== VEHICLE_OTHER);
    if (!opts.length) continue;
    const want = (car as Record<string, unknown>)[field.key];
    if (typeof want === "string" && opts.includes(want)) attrs[field.key] = want;
    else if (field.key === "model" || field.key === "year" || field.key === "trim") {
      if (typeof want === "string") throw new Error(`${car.brand}: "${want}" is not in the catalog for ${field.key}`);
      if (field.key === "model" || field.key === "year") throw new Error(`${car.brand}: missing ${field.key}`);
      attrs[field.key] = opts[i % opts.length];
    } else attrs[field.key] = opts[i % opts.length];
  }
  const specs = specsWithChassis(schema, attrs, emptyChassis());
  return { attrs, specs, title: `${attrs.brand} ${attrs.model} ${attrs.year} (test ilanı)` };
}

async function main() {
  const dry = process.argv.includes("--dry");
  if (dry) {
    for (const [i, car] of CARS.entries()) console.log(JSON.stringify(build(car, i).specs));
    return;
  }
  const raw = process.env.DATABASE_URL ?? "";
  let host = "";
  let port = "";
  try {
    const u = new URL(raw);
    host = u.hostname;
    port = u.port;
  } catch {
    /* handled below */
  }
  if (!/^(localhost|127\.0\.0\.1|\[::1\])$/.test(host) || port !== "55433") {
    throw new Error("Refusing to touch a database that is not the local test Postgres (loopback:55433).");
  }
  const prisma = new PrismaClient({ datasources: { db: { url: raw } } });
  try {
    const existing = await prisma.user.findFirst({ where: { email: EMAIL }, select: { id: true } });
    if (process.argv.includes("--remove")) {
      if (!existing) return console.log("nothing to remove");
      const ids = (await prisma.listing.findMany({ where: { sellerId: existing.id, listingNo: { startsWith: PREFIX } }, select: { id: true } })).map((r) => r.id);
      await prisma.listingImage.deleteMany({ where: { listingId: { in: ids } } });
      await prisma.listing.deleteMany({ where: { id: { in: ids } } });
      await prisma.user.delete({ where: { id: existing.id } });
      return console.log(`removed ${ids.length} fixture listings and the fixture seller`);
    }
    if (existing) return console.log("fixtures already present");
    const seller = await prisma.user.create({
      data: {
        email: EMAIL,
        username: `otofixture_${randomBytes(3).toString("hex")}`,
        role: "seller",
        passwordHash: await bcrypt.hash(randomBytes(12).toString("base64url"), 10),
        emailVerifiedAt: new Date(),
        profile: { create: { displayName: "Test Galeri", fullName: "Test Galeri", profileComplete: true, phone: "5300000000", city: "İstanbul" } },
      },
    });
    const now = Date.now();
    for (const [i, car] of CARS.entries()) {
      const b = build(car, i);
      await prisma.listing.create({
        data: {
          status: "active",
          postedAt: new Date(now - i * 26 * 3600_000),
          expiresAt: new Date(now + 14 * 86400_000),
          sellerId: seller.id,
          listingNo: `${PREFIX}${i}${randomBytes(2).toString("hex")}`,
          categoryId: CAT,
          title: b.title,
          description: "Yerel test ilanı; yalnızca geliştirme veritabanında bulunur.",
          price: car.price,
          city: car.city,
          district: car.district,
          specs: b.specs,
          features: [],
          chassis: emptyChassis(),
          images: {
            create: [
              {
                storageKey: `fixture/otomobil/${i}`,
                url: `https://images.unsplash.com/${PHOTOS[i % PHOTOS.length]}?w=800&q=70`,
                sortOrder: 0,
                isCover: true,
              },
            ],
          },
        },
      });
    }
    console.log(`added ${CARS.length} fixture listings`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
