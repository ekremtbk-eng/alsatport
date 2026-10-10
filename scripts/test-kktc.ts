/**
 * Türkiye + KKTC tests. Unit part runs without a server; the HTTP part runs ONLY against a local server + local DB:
 *
 *   KKTC_TEST_BASE=http://127.0.0.1:3013 DATABASE_URL=<local> AUTH_SECRET=<same as server> \
 *     npx tsx --conditions=react-server scripts/test-kktc.ts
 *
 * Creates throw-away users (`*@kktctest.invalid`) with their listings and vehicle requests; removes them at the end and
 * checks that every other listing kept its city / district / currency.
 */
import { randomBytes } from "node:crypto";
import { rm } from "node:fs/promises";
import path from "node:path";
import bcrypt from "bcryptjs";
import sharp from "sharp";
import { SignJWT } from "jose";
import { PrismaClient } from "@prisma/client";
import { KKTC_DISTRICTS } from "@/data/kktc";
import { TURKEY_CITIES, districtsOf } from "@/data/turkey";
import { countryOfCity, isKnownCity, KKTC_REGION_NAMES, placeLabel, regionNamesFor } from "@/data/locations";
import { DISTANCE_MILE, DISTANCE_UNIT_LABEL, isRightHandDrive, STEERING_RIGHT, withDeclaredDistance } from "@/data/kktcVehicle";
import { isApprovedCombo, withApprovedOptions } from "@/data/vehicleRequests";
import { findCategory } from "@/data/categories";
import { enginesOfModel, modelsOfBrand, packagesOfModel } from "@/data/vehicleIndex";
import { missingRequiredAttrs, schemaForCategoryId } from "@/data/listingSchema";
import { fieldOffered, filterFieldsForCategory, listingMatchesDynamicFilters, type FilterState } from "@/lib/categoryFilters";
import { filtersFromSearchParams, mergeFilterQuery, serverFilterState } from "@/lib/filterUrl";
import { parseListingInput } from "@/lib/listings/store";
import { vehicleSpecError } from "@/lib/listings/vehicleSpecPolicy";
import { isValidPhone } from "@/lib/profile";
import { isValidTaxNumber, normalizeBusinessPhone } from "@/lib/business/shared";
import { formatMoney } from "@/i18n/config";
import { parseSmartQuery } from "@/lib/smartSearch/parse";
import type { Listing } from "@/data/store";

const BASE = process.env.KKTC_TEST_BASE ?? "";
const DB = process.env.DATABASE_URL ?? "";
const SECRET = process.env.AUTH_SECRET ?? "";
const LOOPBACK = /^(localhost|127\.0\.0\.1|\[::1\])$/;
const TAG = randomBytes(4).toString("hex");

type Result = { id: string; name: string; pass: boolean; detail: string };
const results: Result[] = [];
function check(id: string, name: string, pass: boolean, detail = "") {
  results.push({ id, name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${id.padEnd(5)} ${name}${detail ? `  — ${detail}` : ""}`);
}

const GIRNE = KKTC_DISTRICTS.find((d) => d.name === "Girne")!;
const GIRNE_PLACE = GIRNE.settlements[0].name;

function fakeListing(over: Partial<Listing>): Listing {
  return {
    id: "x",
    title: "t",
    description: "",
    price: 1000,
    currency: "TRY",
    city: "İstanbul",
    district: "Kadıköy",
    categoryId: "vasita-otomobil",
    images: [],
    specs: [],
    features: [],
    ...over,
  } as unknown as Listing;
}

function unitTests() {
  // Locations
  check("L1", "KKTC has 6 ilçe, every ilçe has settlements", KKTC_DISTRICTS.length === 6 && KKTC_DISTRICTS.every((d) => d.settlements.length > 0));
  const trNames = new Set(TURKEY_CITIES.map((c) => c.name));
  check("L2", "KKTC ilçe names never clash with the 81 Turkish provinces", TURKEY_CITIES.length === 81 && KKTC_REGION_NAMES.every((n) => !trNames.has(n)));
  check("L3", "Country derived from city; unknown legacy cities count as Türkiye",
    countryOfCity("Girne") === "KKTC" && countryOfCity("Ankara") === "TR" && countryOfCity("Eski Şehir Adı") !== "KKTC");
  check("L4", "Region lists per country", regionNamesFor("KKTC").length === 6 && regionNamesFor("TR").length === 81 && regionNamesFor().length === 87);
  check("L5", "KKTC settlements are the district list of a KKTC ilçe; Turkish districts unchanged",
    districtsOf("Girne").includes(GIRNE_PLACE) && districtsOf("İstanbul").includes("Kadıköy") && isKnownCity("Lefkoşa"));
  check("L6", "Place label marks KKTC only", placeLabel("Girne", GIRNE_PLACE) === `Girne · ${GIRNE_PLACE} · KKTC` && placeLabel("Ankara", "Çankaya") === "Ankara · Çankaya");
  const settlementKeys = KKTC_DISTRICTS.flatMap((d) => d.settlements.map((s) => `${d.name}/${s.name}`.toLocaleLowerCase("tr")));
  const dupMah = KKTC_DISTRICTS.flatMap((d) => d.settlements).filter((s) => new Set(s.neighborhoods).size !== s.neighborhoods.length);
  check("L7", "No duplicate settlement within an ilçe and no duplicate mahalle within a settlement",
    new Set(settlementKeys).size === settlementKeys.length && dupMah.length === 0, `${settlementKeys.length} settlements`);
  const has = (d: string, s: string) => districtsOf(d).includes(s);
  check("L8", "Spellings follow 15/2022 Belediyeler Birleştirme Yasası (İkinci Cetvel)",
    has("Girne", "Malatya") && has("Girne", "İncesu") && has("Girne", "Kılıçarslan") && has("İskele", "Topçuköy") &&
      has("Lefkoşa", "Kızılbaş") && has("Lefke", "Yağmuralan") && !has("Girne", "Malatya-İncesu"));

  // Vehicle catalog: Türkiye entries unchanged, KKTC market models added without guessed packages
  check("V1", "Existing Türkiye catalog lines keep their packages (Toyota Corolla, BMW 3 Serisi untouched)",
    packagesOfModel("Toyota", "Corolla").length > 1 && modelsOfBrand("Toyota")[0] === "Yaris" && modelsOfBrand("BMW").length >= 18);
  check("V2", "JDM / UK-import models present with empty packages and engines",
    ["Vitz", "Aqua", "Noah"].every((m) => modelsOfBrand("Toyota").includes(m)) && modelsOfBrand("Vauxhall").includes("Corsa") &&
      packagesOfModel("Toyota", "Vitz").length === 0 && enginesOfModel("Honda", "Fit").length === 0);
  check("V3", "SUV-bodied additions reach the Arazi/SUV catalog",
    modelsOfBrand("Honda", "suv").includes("Vezel") && modelsOfBrand("Toyota", "suv").includes("Harrier") && !modelsOfBrand("Toyota", "suv").includes("Vitz"));
  const autoSchema = schemaForCategoryId("vasita-otomobil");
  check("V4", "A catalog model without packages never blocks the form (trim/engine not required)",
    !missingRequiredAttrs(autoSchema, { brand: "Toyota", model: "Vitz" }).some((f) => f.key === "trim" || f.key === "engine"));

  // Currency display
  check("C1", "Prices keep their own currency (no conversion)",
    formatMoney(25000, "tr", "GBP").includes("£") && formatMoney(25000, "tr", "EUR").includes("€") && formatMoney(25000, "tr").includes("₺") &&
      formatMoney(25000, "tr", "GBP").includes("25"));
  check("C2", "Unknown currency code falls back to TRY", formatMoney(10, "tr", "XXX").includes("₺"));

  // Filters (client + server share this matcher)
  const cat = findCategory("vasita-otomobil")!;
  const fields = filterFieldsForCategory(cat);
  const kk = fakeListing({ id: "K", city: "Girne", district: GIRNE_PLACE, currency: "GBP", price: 9000, specs: [
    { label: "Direksiyon", value: STEERING_RIGHT }, { label: "Mesafe birimi", value: DISTANCE_MILE }, { label: "KM", value: "50000" },
  ] });
  const tr = fakeListing({ id: "T", city: "Ankara", district: "Çankaya", currency: "TRY", price: 9000 });
  const legacy = fakeListing({ id: "O", city: "Ankara", district: "Çankaya", currency: undefined, price: 9000 });
  const pick = (state: FilterState) => [kk, tr, legacy].filter((l) => listingMatchesDynamicFilters(l, state, fields)).map((l) => l.id).join("");
  check("F1", "Country filter: KKTC / Türkiye / all", pick({ country: "KKTC" }) === "K" && pick({ country: "TR" }) === "TO" && pick({}) === "KTO",
    `${pick({ country: "KKTC" })}|${pick({ country: "TR" })}|${pick({})}`);
  check("F2", "Currency filter matches only that currency; legacy rows count as TRY", pick({ currency: "GBP" }) === "K" && pick({ currency: "TRY" }) === "TO");
  check("F3", "Price range without a currency compares TRY prices only (never across currencies)",
    pick({ priceMin: "8000", priceMax: "10000" }) === "TO" && pick({ priceMin: "8000", priceMax: "10000", currency: "GBP" }) === "K");
  check("F4", "Right-hand-drive filter", pick({ country: "KKTC", steering: STEERING_RIGHT }) === "K" && isRightHandDrive(kk.specs) && !isRightHandDrive(tr.specs));
  const kmField = fields.find((f) => f.key === "km" || f.key === "kmMin");
  check("F5", "Mileage in miles is compared in km (50 000 mi ≈ 80 467 km)",
    !kmField || (pick({ country: "KKTC", kmMin: "80000", kmMax: "81000" }) === "K" && pick({ country: "KKTC", kmMax: "60000" }) === ""),
    kmField ? kmField.key : "no km field");
  const kktcOnly = fields.filter((f) => f.country === "KKTC");
  check("F6", "KKTC vehicle filters only offered when KKTC is selected or implied by the city",
    kktcOnly.length >= 6 && kktcOnly.every((f) => !fieldOffered(f, { country: "TR" }) && fieldOffered(f, { country: "KKTC" }) && fieldOffered(f, { city: "Girne" })));

  // URL persistence
  const state = filtersFromSearchParams(new URLSearchParams(`ulke=kktc&para=GBP&steering=${encodeURIComponent(STEERING_RIGHT)}`));
  const qs = mergeFilterQuery(new URLSearchParams("kategori=vasita-otomobil"), state).toString();
  const back = serverFilterState(new URLSearchParams(qs), fields);
  check("U1", "Country / currency / KKTC filters survive the URL round-trip",
    state.country === "kktc" && state.currency === "GBP" && back.country === "kktc" && back.currency === "GBP" && back.steering === STEERING_RIGHT, qs);
  const bad = serverFilterState(new URLSearchParams("ulke=mars&para=BTC"), fields);
  check("U2", "Unknown country / currency values are dropped server-side", !bad.country && !bad.currency, JSON.stringify(bad));

  // Smart search
  const s1 = parseSmartQuery("girne kiralık daire");
  const s2 = parseSmartQuery("güzelyurt satılık ev");
  const s3 = parseSmartQuery("kktc güzelyurt satılık ev");
  check("Q1", "Smart search: KKTC ilçe recognised; 'Güzelyurt' alone keeps its Turkish meaning; 'KKTC Güzelyurt' is KKTC",
    s1.state.city === "Girne" && s2.state.city !== "Güzelyurt" && s3.state.city === "Güzelyurt",
    `${s1.state.city}|${s2.state.city}/${s2.state.district}|${s3.state.city}`);
  const fold = (s: string) => s.toLocaleLowerCase("tr");
  const kktcPlaceNames = new Set(KKTC_DISTRICTS.flatMap((d) => d.settlements.map((s) => fold(s.name))));
  const trCount = new Map<string, number>();
  for (const c of TURKEY_CITIES) for (const d of c.districts) trCount.set(fold(d), (trCount.get(fold(d)) ?? 0) + 1);
  const shared = TURKEY_CITIES.flatMap((c) =>
    c.districts.filter((d) => d.length >= 5 && kktcPlaceNames.has(fold(d)) && trCount.get(fold(d)) === 1).map((d) => ({ city: c.name, d })),
  );
  const sharedWrong = shared.filter(({ city, d }) => {
    const p = parseSmartQuery(`${d} satılık ev`).state;
    return p.city !== city || p.country === "kktc";
  });
  check("Q2", `Turkish districts that are also KKTC village names stay Turkish (${shared.length} names)`,
    shared.length > 0 && sharedWrong.length === 0, sharedWrong.map((x) => x.d).join(", "));
  const korkuteli = parseSmartQuery("korkuteli satılık arsa").state;
  check("Q3", "'korkuteli satılık arsa' → Antalya / Korkuteli", korkuteli.city === "Antalya" && korkuteli.district === "Korkuteli",
    `${korkuteli.city}/${korkuteli.district}`);
  const pier = parseSmartQuery("tekne iskele").state;
  const kktcIskele = parseSmartQuery("kktc iskele satılık ev").state;
  check("Q4", "'iskele' alone is not pinned to KKTC İskele; 'kktc iskele' is", pier.city !== "İskele" && !pier.country && kktcIskele.city === "İskele",
    `${pier.city}/${pier.country} | ${kktcIskele.city}`);
  const gbp = parseSmartQuery("girne araba 10 bin sterlin altı").state;
  const tl = parseSmartQuery("ankara araba 500 bin tl altı").state;
  const eur = parseSmartQuery("girne kiralık daire 800 euro altı").state;
  check("Q5", "Smart search reads the price currency (sterlin → GBP, euro → EUR, TL stays default)",
    gbp.currency === "GBP" && gbp.priceMax === "10000" && !tl.currency && tl.priceMax === "500000" && eur.currency === "EUR",
    `${gbp.currency}/${gbp.priceMax} ${tl.currency}/${tl.priceMax} ${eur.currency}/${eur.priceMax}`);
  const mileSpecs = [{ label: "Km", value: "42000" }, { label: DISTANCE_UNIT_LABEL, value: DISTANCE_MILE }];
  const shownKm = withDeclaredDistance(mileSpecs).find((s) => s.label === "Km")?.value ?? "";
  const kmOnly = withDeclaredDistance([{ label: "Km", value: "42000" }])[0].value;
  check("Q6", "Odometer declared in miles is shown as miles (with km estimate), km listings unchanged",
    /^42\.000 mil \(≈ 67\.592 km\)$/.test(shownKm) && kmOnly === "42000", `${shownKm} | ${kmOnly}`);

  // Phone / business
  check("P1", "KKTC mobile numbers (533 / 542 / 548) accepted for membership", ["+90 533 850 12 34", "05428501234", "5488501234"].every(isValidPhone));
  check("P2", "KKTC landline (0392) accepted as business phone", normalizeBusinessPhone("+90 392 228 12 34") === "3922281234");
  check("P3", "Tax number: KKTC format flexible (admin-reviewed), Türkiye still 10–11 digits",
    isValidTaxNumber("123456", "Girne") && !isValidTaxNumber("123456", "Ankara") && isValidTaxNumber("1234567890", "Ankara"));

  // Listing input
  const base = { title: "KKTC test", description: "Açıklama metni", categoryId: "shopping-other", price: 100, images: ["https://images.unsplash.com/photo-1?w=10"], specs: [] };
  const okKktc = parseListingInput({ ...base, city: "Girne", district: GIRNE_PLACE, currency: "GBP" });
  const badPlace = parseListingInput({ ...base, city: "Girne", district: "Kadıköy" });
  const badCur = parseListingInput({ ...base, city: "Ankara", district: "Çankaya", currency: "BTC" });
  const legacyIn = parseListingInput({ ...base, city: "Ankara", district: "Çankaya" });
  check("I1", "KKTC listing input accepted with its settlement and currency", !("error" in okKktc) && okKktc.currency === "GBP", "error" in okKktc ? okKktc.error : "");
  check("I2", "KKTC listing with a settlement of another ilçe rejected", "error" in badPlace && badPlace.error === "post.needDist");
  check("I3", "Unknown currency rejected; omitted currency stays TRY (old clients)",
    "error" in badCur && !("error" in legacyIn) && legacyIn.currency === "TRY");

  // Approved vehicle requests
  const approved = [{ segment: "moto" as const, brand: "Yamaha", model: `Test Model ${TAG}`, series: "", engine: "" }];
  const specs = [{ label: "Marka", value: "Yamaha" }, { label: "Model", value: `Test Model ${TAG}` }];
  check("V1", "Model outside the catalog rejected until an admin approves it",
    vehicleSpecError("vasita-moto", specs) === "post.vehicleModel" && vehicleSpecError("vasita-moto", specs, undefined, approved) === null);
  check("V2", "Approved names are appended to the form cascade only for their segment / brand",
    withApprovedOptions("model", ["MT-07"], approved, "moto", { brand: "Yamaha" }).includes(`Test Model ${TAG}`) &&
      !withApprovedOptions("model", ["MT-07"], approved, "moto", { brand: "Honda" }).includes(`Test Model ${TAG}`) &&
      !withApprovedOptions("model", [], approved, "auto", { brand: "Yamaha" }).length &&
      isApprovedCombo(approved, { segment: "moto", brand: "yamaha", model: `test model ${TAG}` }));
}

// ---------------- HTTP ----------------

type Role = "member" | "seller" | "admin";
type TestUser = { id: string; email: string; username: string; role: Role };
type Sess = { cookie: string; csrf: string };
type Res = { status: number; json: Record<string, unknown>; text: string };

async function http() {
  if (!BASE) {
    console.log("\n(HTTP part skipped: KKTC_TEST_BASE not set)");
    return;
  }
  if (!LOOPBACK.test(new URL(BASE).hostname)) throw new Error("Refusing to run against a non-local app.");
  if (!LOOPBACK.test(new URL(DB).hostname)) throw new Error("Refusing to run against a non-local database host.");
  if (SECRET.length < 32) throw new Error("AUTH_SECRET (same value as the local server) is required.");

  const prisma = new PrismaClient({ datasources: { db: { url: DB } } });
  const key = new TextEncoder().encode(SECRET);

  async function makeUser(label: string, role: Role, phone?: string): Promise<TestUser> {
    const email = `${label}-${TAG}@kktctest.invalid`;
    const username = `kktctest_${label}_${TAG}`;
    const u = await prisma.user.create({
      data: {
        email,
        username,
        role,
        passwordHash: await bcrypt.hash(randomBytes(12).toString("base64url"), 10),
        emailVerifiedAt: new Date(),
        profile: {
          create: {
            displayName: `Kktc ${label}`,
            fullName: `Kktc Test ${label}`,
            profileComplete: !!phone,
            ...(phone ? { phone, address: "Ziya Rızkı Caddesi No:12 Girne", city: "Girne" } : {}),
          },
        },
      },
    });
    return { id: u.id, email, username, role };
  }

  async function makeSession(u: TestUser, opts: { stepUp?: boolean } = {}): Promise<Sess> {
    const created = new Date(Date.now() - 60 * 60_000);
    const row = await prisma.userSession.create({
      data: {
        userId: u.id,
        method: u.role === "admin" ? "otp" : "password",
        mfaAt: u.role === "admin" ? created : null,
        stepUpAt: opts.stepUp ? new Date() : null,
        createdAt: created,
        lastSeenAt: created,
        expiresAt: new Date(Date.now() + 3600_000),
        userAgent: "kktc-test",
      },
    });
    const access = await new SignJWT({ sub: u.id, id: u.id, sid: row.id, role: u.role, email: u.email, username: u.username, pc: 1, ev: 1, typ: "access" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("15m")
      .setSubject(u.id)
      .sign(key);
    const csrf = randomBytes(32).toString("hex");
    return { cookie: `ap_session=${access}; ap_csrf=${csrf}`, csrf };
  }

  async function send(method: string, p: string, s: Sess | null, body?: BodyInit, contentType?: string): Promise<Res> {
    const headers: Record<string, string> = {};
    if (s) {
      headers.cookie = s.cookie;
      if (method !== "GET") headers["x-csrf-token"] = s.csrf;
    }
    if (contentType) headers["content-type"] = contentType;
    const res = await fetch(`${BASE}${p}`, { method, headers, body, redirect: method === "GET" ? "follow" : "manual" });
    const text = await res.text();
    let json: Record<string, unknown> = {};
    try {
      json = JSON.parse(text) as Record<string, unknown>;
    } catch {
      /* HTML */
    }
    return { status: res.status, json, text };
  }
  const call = (method: string, p: string, s: Sess | null, body?: unknown) =>
    send(method, p, s, body === undefined ? undefined : JSON.stringify(body), body === undefined ? undefined : "application/json");

  async function photo(s: Sess, categoryId: string) {
    const bytes = await sharp({ create: { width: 800, height: 600, channels: 3, background: "#0e7490" } })
      .composite([{ input: Buffer.from('<svg width="800" height="600"><rect x="200" y="150" width="400" height="300" fill="#fff"/></svg>') }])
      .png()
      .toBuffer();
    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(bytes)], { type: "image/png" }), "p.png");
    form.append("categoryId", categoryId);
    const r = await send("POST", "/api/uploads", s, form);
    return String(r.json.url ?? "");
  }

  // Snapshot of every listing that is not ours, to prove nothing else changed.
  const before = await prisma.listing.findMany({ select: { id: true, city: true, district: true, currency: true, price: true, updatedAt: true } });

  await prisma.rateLimitBucket.deleteMany({ where: { key: { contains: "vehicle-request" } } });
  const seller = await makeUser("seller", "seller", "+90 533 850 12 34");
  const trSeller = await makeUser("trseller", "seller", "05321234567");
  const admin = await makeUser("admin", "admin");
  const sSeller = await makeSession(seller);
  const sTr = await makeSession(trSeller);
  const sAdminNoStep = await makeSession(admin);
  const sAdmin = await makeSession(admin, { stepUp: true });
  let kktcId = "";
  let trId = "";

  try {
    console.log(`\nHTTP → ${BASE} (tag ${TAG})`);
    // Create
    const img = await photo(sSeller, "vasita-otomobil");
    let r = await call("POST", "/api/listings", sSeller, {
      title: `KKTC Test Otomobil ${TAG}`,
      description: "Sağ direksiyon, İngiltere menşeli, gümrüğü ödenmiş test aracı.",
      categoryId: "vasita-otomobil",
      city: "Girne",
      district: GIRNE_PLACE,
      price: 9500,
      currency: "GBP",
      images: [img],
      specs: [
        { label: "Direksiyon", value: STEERING_RIGHT },
        { label: "Mesafe birimi", value: DISTANCE_MILE },
        { label: "Menşei", value: "İngiltere" },
        { label: "Gümrük durumu", value: "Gümrüğü ödenmiş" },
      ],
      features: [],
    });
    kktcId = String(r.json.id ?? "");
    const created = r.json.listing as Record<string, unknown> | undefined;
    check("H1", "KKTC member (533 phone) posts a Girne listing in GBP", r.status === 200 && !!kktcId && created?.currency === "GBP" && created?.city === "Girne",
      `status ${r.status} ${String(r.json.error ?? "")}`);
    const trImg = await photo(sTr, "vasita-otomobil");
    r = await call("POST", "/api/listings", sTr, {
      title: `TR Test Otomobil ${TAG}`,
      description: "Türkiye ilanı, para birimi gönderilmeyen eski istemci gibi.",
      categoryId: "vasita-otomobil",
      city: "Ankara",
      district: "Çankaya",
      price: 9500,
      images: [trImg],
      specs: [],
      features: [],
    });
    trId = String(r.json.id ?? "");
    check("H2", "Türkiye listing without currency is stored as TRY", r.status === 200 && (r.json.listing as Record<string, unknown>)?.currency === "TRY",
      `status ${r.status} ${String(r.json.error ?? "")}`);
    r = await call("POST", "/api/listings", sSeller, { title: "x", description: "y", categoryId: "shopping-other", city: "Girne", district: "Kadıköy", price: 1, images: [img] });
    check("H3", "Settlement from another ilçe rejected by the API", r.status === 400 && r.json.error === "post.needDist", `status ${r.status} ${String(r.json.error)}`);

    // Query
    const ids = async (qs: string) => {
      const res = await call("GET", `/api/listings?${qs}`, null);
      const rows = (res.json.listings as { id: string }[] | undefined) ?? [];
      return { k: rows.some((l) => l.id === kktcId), t: rows.some((l) => l.id === trId), status: res.status };
    };
    let a = await ids("ulke=kktc"), b = await ids("ulke=tr"), c = await ids("");
    check("H4", "API country filter (ulke=kktc / ulke=tr / none)", a.k && !a.t && !b.k && b.t && c.k && c.t, JSON.stringify([a, b, c]));
    a = await ids("para=GBP");
    b = await ids("priceMin=9000&priceMax=10000");
    c = await ids("priceMin=9000&priceMax=10000&para=GBP");
    check("H5", "API currency filter; price range alone applies to TRY only", a.k && !a.t && !b.k && b.t && c.k && !c.t, JSON.stringify([a, b, c]));
    a = await ids(`kategori=vasita-otomobil&ulke=kktc&steering=${encodeURIComponent(STEERING_RIGHT)}`);
    check("H6", "Category page filter: KKTC + right-hand drive", a.k && !a.t, JSON.stringify(a));
    r = await call("GET", "/api/listings?ulke=mars", null);
    check("H7", "Invalid ulke value rejected", r.status === 400, `status ${r.status}`);

    // Pages
    r = await call("GET", `/ilan/${kktcId}`, null);
    check("H8", "Detail page: KKTC place, £ price, RHD badge, declaration notice, JSON-LD GBP",
      r.status === 200 && r.text.includes("KKTC") && r.text.includes("£") && r.text.includes("Sağ direksiyon") &&
        r.text.includes("satıcı beyanıdır") && r.text.includes('"priceCurrency":"GBP"'),
      `status ${r.status}`);
    r = await call("GET", `/ilan/${trId}`, null);
    check("H9", "Türkiye detail page unchanged: TRY price, no KKTC marks", r.status === 200 && r.text.includes('"priceCurrency":"TRY"') && !r.text.includes("Sağ direksiyon"));
    r = await call("GET", "/ara?kategori=vasita-otomobil&ulke=kktc&para=GBP", null);
    const canonical = /<link rel="canonical" href="([^"]+)"/.exec(r.text)?.[1] ?? "";
    check("H10", "Filtered (ulke/para) page is noindex with canonical to the plain category URL",
      r.status === 200 && /content="noindex, follow"/.test(r.text) && /\/ara\?kategori=otomobil$/.test(canonical), canonical);
    r = await call("GET", "/magazalar?ulke=kktc", null);
    check("H11", "Store directory KKTC filter works and is noindex", r.status === 200 && /content="noindex, follow"/.test(r.text));

    // Vehicle requests
    const req = { segment: "moto", brand: "Kktctest", model: `Model ${TAG}`, series: "Std", yearFrom: 2020, yearTo: 2024 };
    r = await call("POST", "/api/vehicle-requests", null, req);
    check("R1", "Guest cannot submit a vehicle request", r.status === 401 || r.status === 403, `status ${r.status}`);
    r = await call("POST", "/api/vehicle-requests", sSeller, { ...req, yearFrom: 2025, yearTo: 2020 });
    check("R2", "Invalid year range rejected", r.status === 400, `status ${r.status}`);
    r = await call("POST", "/api/vehicle-requests", sSeller, req);
    check("R3", "Member submits a missing vehicle", r.status === 200, `status ${r.status} ${String(r.json.error ?? "")}`);
    r = await call("POST", "/api/vehicle-requests", sTr, req);
    check("R4", "Duplicate request rejected", r.status === 409, `status ${r.status}`);
    const listed = async () => ((await call("GET", "/api/vehicle-requests", null)).json.vehicles as { model: string }[]).some((v) => v.model === req.model);
    check("R5", "Pending request is not offered publicly", !(await listed()));
    r = await call("GET", "/api/admin/vehicle-requests", sSeller);
    check("R6", "Non-admin cannot list requests", r.status === 403 || r.status === 401, `status ${r.status}`);
    r = await call("GET", "/api/admin/vehicle-requests?status=pending", sAdminNoStep);
    const row = ((r.json.requests as { id: string; model: string }[] | undefined) ?? []).find((x) => x.model === req.model);
    check("R7", "Admin sees the pending request", r.status === 200 && !!row, `status ${r.status}`);
    r = await call("POST", `/api/admin/vehicle-requests/${row?.id}`, sAdminNoStep, { action: "approve" });
    check("R8", "Approval requires a fresh step-up", r.status === 403, `status ${r.status}`);
    r = await call("POST", `/api/admin/vehicle-requests/${row?.id}`, sAdmin, { action: "reject" });
    check("R9", "Reject needs a reason", r.status === 400, `status ${r.status}`);
    r = await call("POST", `/api/admin/vehicle-requests/${row?.id}`, sAdmin, { action: "approve" });
    check("R10", "Admin approves with step-up", r.status === 200 && r.json.state === "approved", `status ${r.status}`);
    const audit = await prisma.auditLog.findFirst({ where: { actorId: admin.id, entityId: row?.id, action: "vehicle_request.approve" } });
    check("R11", "Approval audit-logged", !!audit);
    check("R12", "Approved vehicle offered publicly", await listed());
    r = await call("POST", `/api/admin/vehicle-requests/${row?.id}`, sAdmin, { action: "reject", reason: "tekrar" });
    check("R13", "Decided request cannot be changed again", r.status === 409, `status ${r.status}`);
  } finally {
    const tagged = await prisma.user.findMany({ where: { email: { endsWith: `-${TAG}@kktctest.invalid` } }, select: { id: true } });
    const uids = tagged.map((u) => u.id);
    await prisma.vehicleCatalogRequest.deleteMany({ where: { userId: { in: uids } } });
    await prisma.listingImage.deleteMany({ where: { listing: { sellerId: { in: uids } } } });
    await prisma.listing.deleteMany({ where: { sellerId: { in: uids } } });
    await prisma.auditLog.deleteMany({ where: { OR: [{ actorId: { in: uids } }, { entityId: { in: uids } }] } });
    await prisma.user.deleteMany({ where: { id: { in: uids } } });
    for (const id of uids) await rm(path.join(process.cwd(), ".data", "uploads", "listings", id), { recursive: true, force: true });
    const after = await prisma.listing.findMany({ select: { id: true, city: true, district: true, currency: true, price: true, updatedAt: true } });
    const byId = new Map(after.map((l) => [l.id, l]));
    const changed = before.filter((l) => {
      const n = byId.get(l.id);
      return !n || n.city !== l.city || n.district !== l.district || n.currency !== l.currency || String(n.price) !== String(l.price) || n.updatedAt.getTime() !== l.updatedAt.getTime();
    });
    check("X1", `Other listings untouched (${before.length} checked: city, district, currency, price, updatedAt)`, changed.length === 0 && after.length === before.length,
      `${changed.length} changed`);
    await prisma.$disconnect();
  }
}

async function main() {
  unitTests();
  await http();
  const failed = results.filter((x) => !x.pass);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
