/**
 * Multi-currency consistency suite (TRY, GBP, EUR, USD): poster, cards/detail formatting, price-drop alerts,
 * vehicle/estate amount fields, filters, sorting, KKTC default and texts. The DB part runs ONLY against a local
 * database and creates throw-away listings (title prefix "Kur testi") that it removes at the end:
 *
 *   DATABASE_URL=<loopback> npx tsx --conditions=react-server scripts/test-multi-currency.ts
 *
 * KEEP_FIXTURES=1 leaves the fake listings for a manual browser check; CLEANUP_ONLY=1 removes them.
 */
import type { Listing } from "@/data/store";

const LOOPBACK = /^(localhost|127\.0\.0\.1|\[::1\])$/;
const dbHost = (() => {
  try {
    return new URL(process.env.DATABASE_URL ?? "").hostname;
  } catch {
    return "";
  }
})();
if (!LOOPBACK.test(dbHost)) throw new Error(`Refusing to run against non-local database host: ${dbHost || "(unset)"}`);

const FIXTURE_TITLE = "Kur testi";
const FIXTURE_EMAIL = "currency-fixture@currencytest.invalid";

const results: { id: string; pass: boolean }[] = [];
function check(id: string, name: string, pass: boolean, detail = "") {
  results.push({ id, pass });
  console.log(`${pass ? "PASS" : "FAIL"}  ${id.padEnd(4)} ${name}${detail ? `  - ${detail}` : ""}`);
}
const sp = (s: string) => s.replace(/\s/g, " ");

const CASES = [
  { currency: "GBP", price: 8500, symbol: "£", text: "£8.500" },
  { currency: "EUR", price: 25000, symbol: "€", text: "€25.000" },
  { currency: "USD", price: 12000, symbol: "$", text: "$12.000" },
  { currency: "TRY", price: 750000, symbol: "₺", text: "₺750.000" },
] as const;

function fake(extra: Partial<Listing>): Listing {
  return {
    id: crypto.randomUUID(),
    listingNo: "1",
    title: FIXTURE_TITLE,
    subtitle: "",
    description: "",
    price: 0,
    categoryId: "phones",
    city: "İstanbul",
    district: "Kadıköy",
    images: ["/api/media/listings/currency-test.jpg"],
    specs: [],
    features: [],
    sellerId: "s",
    status: "active",
    ...extra,
  } as Listing;
}

async function main() {
  const { posterPrice } = await import("../src/lib/poster");
  const { formatMoney } = await import("../src/i18n/config");
  const { priceDropOf, readWatchedPrices, watchedPriceOf } = await import("../src/lib/priceWatch");
  const cur = await import("../src/lib/listings/currency");
  const { categories, walkCategories, findCategory } = await import("../src/data/categories");
  const { schemaForCategoryId, specsFromAttrs, editAttrValue } = await import("../src/data/listingSchema");
  const filters = await import("../src/lib/categoryFilters");
  const { buildFirmProfile } = await import("../src/lib/serviceFirm");
  const { MESSAGES } = await import("../src/i18n/messages");
  const msg = (key: string) => [MESSAGES.tr[key], MESSAGES.en[key], MESSAGES.de[key], MESSAGES.ar[key], MESSAGES.ru[key]];
  const { regionNamesFor } = await import("../src/data/locations");

  if (process.env.CLEANUP_ONLY !== "1") {
    // ---------------- Display: poster, cards/detail ----------------
    for (const c of CASES) {
      check(`P-${c.currency}`, `Poster shows ${c.currency} with its own symbol`, sp(posterPrice(c.price, null, c.currency)) === c.text, posterPrice(c.price, null, c.currency));
      check(`F-${c.currency}`, `Card/detail format (tr) for ${c.currency}`, sp(formatMoney(c.price, "tr", c.currency)) === c.text, formatMoney(c.price, "tr", c.currency));
      check(`E-${c.currency}`, `English UI keeps ${c.currency} symbol`, formatMoney(c.price, "en", c.currency).includes(c.symbol), formatMoney(c.price, "en", c.currency));
    }
    check("P5", "Poster rent suffix keeps the currency", sp(posterPrice(8500, "month", "GBP")) === "£8.500 / Ay", posterPrice(8500, "month", "GBP"));
    check("P6", "Poster for an old listing without currency stays ₺", sp(posterPrice(750000, null)) === "₺750.000" && sp(posterPrice(18000, "month")) === "₺18.000 / Ay");

    // ---------------- Price-drop alerts ----------------
    const gbp = fake({ price: 8500, currency: "GBP" });
    const drop = priceDropOf(watchedPriceOf(gbp), { ...gbp, price: 8000 });
    check("N1", "GBP drop is reported in £, no TL", !!drop && sp(drop.from) === "£8.500" && sp(drop.to) === "£8.000" && !`${drop.from}${drop.to}`.includes("TL"), JSON.stringify(drop));
    check("N2", "Currency change GBP 8.500 → TRY 8.000 is not a drop", priceDropOf(watchedPriceOf(gbp), { price: 8000, currency: "TRY" }) === null);
    check("N3", "Currency change TRY 750.000 → EUR 25.000 is not a drop", priceDropOf({ price: 750000, currency: "TRY" }, { price: 25000, currency: "EUR" }) === null);
    check("N4", "Entry saved before currencies were tracked only re-baselines", priceDropOf({ price: 9000 }, { price: 8000, currency: "GBP" }) === null);
    check("N5", "Price increase is not a drop", priceDropOf(watchedPriceOf(gbp), { price: 9000, currency: "GBP" }) === null);
    const tryDrop = priceDropOf({ price: 750000, currency: "TRY" }, { price: 700000 });
    check("N6", "TRY drop on an existing listing still reported", !!tryDrop && sp(tryDrop.to) === "₺700.000", JSON.stringify(tryDrop));
    const legacy = readWatchedPrices({ a: 100, b: { price: 5, currency: "EUR" }, c: "x", d: { price: "y" } });
    check("N7", "Stored map: legacy numbers kept without currency, junk dropped", JSON.stringify(legacy) === JSON.stringify({ a: { price: 100 }, b: { price: 5, currency: "EUR" } }), JSON.stringify(legacy));

    // ---------------- Amount fields (vehicle rental, tramer, dues) ----------------
    const findBy = (key: string) => {
      let id = "";
      walkCategories(categories, (c) => {
        if (!id && schemaForCategoryId(c.id).fields.some((f) => f.key === key)) id = c.id;
      });
      return id;
    };
    const rentalId = findBy("dailyPrice");
    const damagedId = findBy("tramer");
    const estateId = findBy("dues");
    const rental = schemaForCategoryId(rentalId);
    const rentAttrs = { dailyPrice: "1500", weeklyPrice: "9000", monthlyPrice: "30000", deposit: "5000" };
    const gbpSpecs = specsFromAttrs(rental, rentAttrs, "GBP");
    const val = (specs: { label: string; value: string }[], label: string) => specs.find((s) => s.label === label)?.value;
    check(
      "V1",
      "KKTC rental in GBP: daily/weekly/monthly/deposit stored with £",
      val(gbpSpecs, "Günlük fiyat") === "1.500 £" && val(gbpSpecs, "Haftalık fiyat") === "9.000 £" && val(gbpSpecs, "Aylık fiyat") === "30.000 £" && val(gbpSpecs, "Depozito") === "5.000 £",
      `${rentalId}: ${gbpSpecs.filter((s) => /fiyat|Depozito/.test(s.label)).map((s) => s.value).join(", ")}`,
    );
    check("V2", "No ₺ on a GBP rental", !gbpSpecs.some((s) => s.value.includes("₺")));
    const trySpecs = specsFromAttrs(rental, rentAttrs);
    check("V3", "Türkiye rental without currency keeps ₺ (unchanged)", val(trySpecs, "Günlük fiyat") === "1.500 ₺" && val(trySpecs, "Depozito") === "5.000 ₺");
    check("V4", "Form labels follow the chosen currency", rental.fields.filter((f) => f.money).every((f) => cur.fieldUnit(f, "EUR") === "€") && rental.fields.filter((f) => f.money).length === 4);
    const tramer = specsFromAttrs(schemaForCategoryId(damagedId), { tramer: "12000" }, "USD");
    check("V5", "Tramer amount uses the listing currency", val(tramer, "Tramer tutarı") === "12.000 $", `${damagedId}: ${val(tramer, "Tramer tutarı")}`);
    const estate = schemaForCategoryId(estateId);
    const dues = specsFromAttrs(estate, { dues: "150" }, "GBP");
    check("V6", "Estate dues: label without TL, value in £", estate.fields.find((f) => f.key === "dues")?.label === "Aidat" && val(dues, "Aidat") === "150 £", `${estateId}: ${val(dues, "Aidat")}`);
    const daily = rental.fields.find((f) => f.key === "dailyPrice")!;
    check("V7", "Editing an amount reads back the bare number (£ or ₺)", editAttrValue(daily, "1.500 £", true) === "1500" && editAttrValue(estate.fields.find((f) => f.key === "dues")!, "150 £") === "150" && editAttrValue(estate.fields.find((f) => f.key === "dues")!, "150") === "150");

    // ---------------- Filters (client and server share listingMatchesDynamicFilters) ----------------
    const pool = CASES.map((c) => fake({ price: c.price, currency: c.currency }));
    const legacyTry = fake({ price: 9000 });
    const all = [...pool, legacyTry];
    const common = filters.commonFilterFields();
    const ids = (state: Record<string, string>) =>
      all.filter((l) => filters.listingMatchesDynamicFilters(l, state, common)).map((l) => cur.listingCurrencyOf(l.currency));
    check("F1", "Price range without currency = TRY only (incl. old listing without currency)", JSON.stringify(ids({ priceMin: "5000", priceMax: "1000000" })) === JSON.stringify(["TRY", "TRY"]), ids({ priceMin: "5000", priceMax: "1000000" }).join(","));
    check("F2", "GBP range 8.000–9.000 finds the £8.500 listing only", JSON.stringify(ids({ currency: "GBP", priceMin: "8000", priceMax: "9000" })) === JSON.stringify(["GBP"]));
    check("F3", "EUR range 20.000–30.000 finds €25.000 only (not £/$/₺)", JSON.stringify(ids({ currency: "EUR", priceMin: "20000", priceMax: "30000" })) === JSON.stringify(["EUR"]));
    check("F4", "USD 0–100.000 does not include £8.500 or €25.000", JSON.stringify(ids({ currency: "USD", priceMax: "100000" })) === JSON.stringify(["USD"]));
    check("F5", "Currency without range = all listings in that currency", JSON.stringify(ids({ currency: "GBP" })) === JSON.stringify(["GBP"]));
    check("F6", "No filter = every currency listed", ids({}).length === 5);
    const counts = CASES.map((c) => filters.countFilterOption(all, common, { priceMin: "1" }, "currency", c.currency));
    check("F7", "Result counts per currency (with a price range) are 1 each", JSON.stringify(counts) === JSON.stringify([1, 1, 1, 2]), JSON.stringify(counts));
    const priceField = common.find((f) => f.key === "priceMin")!;
    check("F8", "Price filter suffix: £ for GBP, € EUR, $ USD, ₺ default", filters.rangeSuffix(priceField, { currency: "GBP" }) === "£" && filters.rangeSuffix(priceField, { currency: "EUR" }) === "€" && filters.rangeSuffix(priceField, { currency: "USD" }) === "$" && filters.rangeSuffix(priceField, {}) === "₺");
    const rentalFields = filters.filterFieldsForCategory(findCategory(rentalId));
    const dailyField = rentalFields.find((f) => f.key === "dailyPriceMin");
    const rentals = [
      fake({ categoryId: rentalId, price: 1, currency: "GBP", specs: [{ label: "Günlük fiyat", value: "60 £" }] }),
      fake({ categoryId: rentalId, price: 1, currency: "TRY", specs: [{ label: "Günlük fiyat", value: "2.500 ₺" }] }),
    ];
    const rentHits = (state: Record<string, string>) =>
      rentals.filter((l) => filters.listingMatchesDynamicFilters(l, state, rentalFields)).map((l) => l.currency);
    check("F9", "Daily price filter is a money range with currency suffix", !!dailyField?.money && filters.rangeSuffix(dailyField, { currency: "GBP" }) === "£");
    check("F10", "Daily price 50–100 in GBP: £60 only, ₺2.500 never compared", JSON.stringify(rentHits({ currency: "GBP", dailyPriceMin: "50", dailyPriceMax: "100" })) === JSON.stringify(["GBP"]));
    check("F11", "Daily price 50–3.000 without currency: TRY only (£60 excluded)", JSON.stringify(rentHits({ dailyPriceMin: "50", dailyPriceMax: "3000" })) === JSON.stringify(["TRY"]));
    const estateFields = filters.filterFieldsForCategory(findCategory(estateId));
    const duesField = estateFields.find((f) => f.key === "duesMin");
    check("F12", "Dues filter is a money range (label without TL)", !!duesField?.money && !msg("flt.dues").some((s) => s.includes("TL")));

    // ---------------- Sorting ----------------
    const sorted = [...pool].sort((a, b) => cur.currencyOrder(a, b) || a.price - b.price).map((l) => l.currency);
    check("S1", "Cheapest-first groups by currency (TRY, GBP, EUR, USD), never mixes amounts", JSON.stringify(sorted) === JSON.stringify(["TRY", "GBP", "EUR", "USD"]), sorted.join(","));

    // ---------------- Service firm fallback ----------------
    const firmListing = fake({ categoryId: "phones", price: 8500, currency: "GBP" });
    const firm = buildFirmProfile(firmListing, []);
    check("SF1", "Service-firm fallback price keeps the listing currency", firm.prices[0]?.currency === "GBP" && firm.prices[0]?.min === 8500, JSON.stringify(firm.prices[0]));

    // ---------------- KKTC default and texts ----------------
    check("K1", "Default currency: KKTC → GBP, Türkiye → TRY", cur.defaultCurrencyForCountry("KKTC") === "GBP" && cur.defaultCurrencyForCountry("TR") === "TRY" && cur.defaultCurrencyForCountry(undefined) === "TRY");
    const note = msg("lang.priceNote");
    check("T1", "English note no longer says prices are only in lira", !/Turkish lira/i.test(note[1]) && note[1].includes("£") && note[0].includes("£"), note[1]);
    check("T2", "TR/EN currency notes say the same thing (own currency, no conversion)", /dönüşümü yapılmaz/.test(note[0]) && /no conversion/.test(note[1]) && /dönüşümü yapılmaz/.test(msg("cur.note")[0]) && /no conversion/.test(msg("cur.note")[1]));
    check("T3", "KKTC hint exists in all 5 languages with £", msg("cur.kktcHint").every((s) => !!s?.includes("£")));
    check("T4", "No language says prices are only in TL/lira", !msg("lang.priceNote").some((s) => /yalnızca TL|only in Turkish|nur in/i.test(s)));
    check("K2", "KKTC regions exist for fixtures", regionNamesFor("KKTC").length > 0);
  }

  // ---------------- DB: server-side currency filter on fake listings ----------------
  const { prisma } = await import("../src/lib/db");
  const { queryListings } = await import("../src/lib/listings/store");
  try {
    const old = await prisma.listing.findMany({ where: { seller: { email: FIXTURE_EMAIL } }, select: { id: true } });
    await prisma.listing.deleteMany({ where: { id: { in: old.map((l) => l.id) } } });
    await prisma.user.deleteMany({ where: { email: FIXTURE_EMAIL } });
    if (process.env.CLEANUP_ONLY === "1") {
      console.log(`cleanup: ${old.length} fake listings removed`);
      return;
    }
    const seller = await prisma.user.create({
      data: {
        email: FIXTURE_EMAIL,
        username: `currency_fixture_${Date.now().toString(36)}`,
        role: "seller",
        provider: "email",
        emailVerifiedAt: new Date(),
        profile: { create: { displayName: "Kur Test", fullName: "Kur Test", profileComplete: true } },
      },
    });
    const kktcCity = regionNamesFor("KKTC")[0];
    const expiresAt = new Date(Date.now() + 10 * 86_400_000);
    const made: { id: string; currency: string }[] = [];
    for (const [i, c] of [...CASES, { currency: "", price: 9000 }].entries()) {
      const row = await prisma.listing.create({
        data: {
          listingNo: `9${Date.now().toString().slice(-7)}${i}`,
          sellerId: seller.id,
          categoryId: "phones",
          title: `${FIXTURE_TITLE} ${c.currency || "eski TRY"}`,
          description: "Sahte kur testi ilanı (yalnızca yerel test veritabanı).",
          price: c.price,
          ...(c.currency ? { currency: c.currency } : {}),
          city: c.currency === "GBP" ? kktcCity : "İstanbul",
          status: "active",
          postedAt: new Date(),
          expiresAt,
          images: { create: [{ storageKey: `currency-test-${i}`, url: `/api/media/listings/currency-test-${i}.jpg`, isCover: true }] },
        },
        select: { id: true, currency: true },
      });
      made.push(row);
    }
    check("D1", "Old-style row without currency defaults to TRY in the DB", made[4].currency === "TRY");
    const mine = new Set(made.map((m) => m.id));
    const q = async (p: Parameters<typeof queryListings>[0]) =>
      (await queryListings(p)).filter((l) => mine.has(l.id)).map((l) => `${l.currency}:${l.price}`).sort();
    check("D2", "API para=GBP lists only £8.500", JSON.stringify(await q({ currency: "GBP" })) === JSON.stringify(["GBP:8500"]));
    check("D3", "API price 5.000–1.000.000 without para = TRY only", JSON.stringify(await q({ priceMin: 5000, priceMax: 1000000 })) === JSON.stringify(["TRY:750000", "TRY:9000"].sort()));
    check("D4", "API para=EUR 20.000–30.000 = €25.000 only", JSON.stringify(await q({ currency: "EUR", priceMin: 20000, priceMax: 30000 })) === JSON.stringify(["EUR:25000"]));
    check("D5", "API para=USD max 100.000 = $12.000 only", JSON.stringify(await q({ currency: "USD", priceMax: 100000 })) === JSON.stringify(["USD:12000"]));
    check("D6", "API without filters returns all five fake listings", (await q({})).length === 5);
    if (process.env.KEEP_FIXTURES === "1") {
      console.log(`fixtures kept: ${made.map((m) => `${m.currency}=${m.id}`).join(" ")}`);
      return;
    }
    await prisma.listing.deleteMany({ where: { id: { in: [...mine] } } });
    await prisma.user.deleteMany({ where: { email: FIXTURE_EMAIL } });
    console.log(`cleanup: ${mine.size} fake listings removed`);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => {
    const failed = results.filter((r) => !r.pass);
    console.log(`${results.length - failed.length}/${results.length} passed`);
    process.exit(failed.length ? 1 : 0);
  })
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
