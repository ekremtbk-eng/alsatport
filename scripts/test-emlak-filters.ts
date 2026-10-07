/**
 * Emlak (real estate) advanced filter tests.
 *
 * Unit part (no server): per-category field sets, form ↔ filter coverage (every filter maps to data
 * "İlan Ver" stores), strict matching, URL round-trip, query allowlist, smart-search compatibility.
 * HTTP part runs ONLY against a local server + local database:
 *
 *   EMLAK_TEST_BASE=http://localhost:3013 DATABASE_URL=<local> npx tsx scripts/test-emlak-filters.ts
 *
 * Creates one throw-away seller (`*@emlaktest.invalid`) with five listings built through the form schema,
 * removed at the end.
 */
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { allCategoryNodes, findCategory, rootOf } from "@/data/categories";
import {
  estateDealFromCategoryId,
  estateHomeTypeFromCategoryId,
  schemaForCategoryId,
  specsWithChassis,
} from "@/data/listingSchema";
import {
  filterFieldsForCategory,
  listingMatchesDynamicFilters,
  type FilterField,
  type FilterState,
} from "@/lib/categoryFilters";
import { filtersFromSearchParams, mergeFilterQuery, serverFilterState } from "@/lib/filterUrl";
import { parseSmartQuery, smartResultsHref, validateSmartState } from "@/lib/smartSearch/parse";
import { mahallelerOf } from "@/data/regionProfiles";
import type { Listing } from "@/data/store";

const BASE = process.env.EMLAK_TEST_BASE ?? "";
const DB = process.env.DATABASE_URL ?? "";
const LOOPBACK = /^(localhost|127\.0\.0\.1|\[::1\])$/;
const TAG = randomBytes(4).toString("hex");

const results: { id: string; pass: boolean }[] = [];
function check(id: string, name: string, pass: boolean, detail = "") {
  results.push({ id, pass });
  console.log(`${pass ? "PASS" : "FAIL"}  ${id.padEnd(5)} ${name}${detail ? `  — ${detail}` : ""}`);
}

const keysOf = (fields: FilterField[]) => new Set(fields.map((f) => f.key));
const fieldsFor = (id: string) => filterFieldsForCategory(findCategory(id)!);

/** Same spec assembly as /ilan-ver: schema attrs plus deal/type implied by the category. */
function formSpecs(categoryId: string, attrs: Record<string, string>) {
  const specs = specsWithChassis(schemaForCategoryId(categoryId), attrs);
  const deal = estateDealFromCategoryId(categoryId);
  const homeType = estateHomeTypeFromCategoryId(categoryId);
  if (deal && !specs.some((s) => s.label === "İlan tipi")) specs.push({ label: "İlan tipi", value: deal });
  if (homeType && !specs.some((s) => s.label === "Emlak tipi")) specs.push({ label: "Emlak tipi", value: homeType });
  return specs;
}

type Fixture = {
  key: string;
  categoryId: string;
  price: number;
  district: string;
  neighborhood?: string;
  attrs: Record<string, string>;
  features: string[];
};

const HOOD = mahallelerOf("Ankara", "Çankaya")[0] ?? "";

const FIXTURES: Fixture[] = [
  {
    key: "A",
    categoryId: "emlak-konut-kiralik-daire",
    price: 25_000,
    district: "Çankaya",
    neighborhood: HOOD,
    attrs: {
      sqm: "100", sqmNet: "85", rooms: "2+1", age: "1-5", floorCount: "5", floor: "1", heating: "Kombi", bath: "1",
      kitchen: "Kapalı", balcony: "Var", elevator: "Var", parking: "Kapalı Otopark", furnished: "Hayır", usage: "Boş",
      site: "Evet", siteName: "Yeşilvadi Sitesi", dues: "750", credit: "Evet", deed: "Kat Mülkiyeti", swap: "Hayır",
      kimden: "Sahibinden", facade: "Güney",
    },
    features: ["Asansör", "Jakuzi", "Güvenlik", "Metro", "Deniz", "Ara Kat", "Engelliye Uygun", "Market"],
  },
  {
    key: "B",
    categoryId: "emlak-konut-kiralik-daire",
    price: 40_000,
    district: "Keçiören",
    attrs: {
      sqm: "150", sqmNet: "130", rooms: "3+1", age: "11-15", floorCount: "10+", floor: "10+", heating: "Merkezi",
      bath: "2", kitchen: "Açık (Amerikan)", elevator: "Yok", dues: "1500", kimden: "Emlak Ofisinden",
    },
    features: ["Asansör"],
  },
  {
    key: "C",
    categoryId: "emlak-konut-satilik-villa",
    price: 9_000_000,
    district: "Çankaya",
    attrs: { sqm: "300", sqmNet: "260", rooms: "5+1", age: "0 (Sıfır)", floor: "Bahçe", heating: "Yerden Isıtma", kimden: "İnşaat Firmasından" },
    features: ["Yüzme Havuzu", "Doğa"],
  },
  {
    key: "D",
    categoryId: "emlak-arsa-tarla",
    price: 1_500_000,
    district: "Polatlı",
    attrs: { deal: "Satılık", sqm: "5000", zoning: "Tarla", kimden: "Sahibinden", swap: "Evet" },
    features: ["Anayol"],
  },
  {
    key: "E",
    categoryId: "emlak-isyeri-ofis",
    price: 60_000,
    district: "Çankaya",
    attrs: { deal: "Kiralık", sqm: "120", sqmNet: "100", age: "6-10", floor: "3", heating: "Klima", elevator: "Var", dues: "2000", kimden: "Emlak Ofisinden" },
    features: ["Fiber İnternet"],
  },
];

function fakeListing(f: Fixture): Listing {
  return {
    id: f.key,
    title: `Test ${f.key}`,
    subtitle: "",
    price: f.price,
    categoryId: f.categoryId,
    city: "Ankara",
    district: f.district,
    neighborhood: f.neighborhood ?? "",
    images: ["https://images.unsplash.com/photo-1560185007-cde436f6a4d0"],
    description: "",
    sellerId: "s",
    sellerName: "s",
    sellerAvatar: "",
    sellerVerified: false,
    createdAt: new Date().toISOString(),
    views: 0,
    featured: false,
    vip: false,
    status: "active",
    specs: formSpecs(f.categoryId, f.attrs),
    features: f.features,
    listingNo: f.key,
    postedAt: Date.now(),
  };
}

function unitTests() {
  // Category-specific sets
  const kiralikDaire = keysOf(fieldsFor("emlak-konut-kiralik-daire"));
  check("C1", "Konut/Kiralık/Daire: rooms, m², kitchen, dues, features; deal+type fixed by category",
    ["rooms", "sqmMin", "sqmNetMin", "age", "floor", "floorCount", "heat", "kitchen", "duesMin", "inFeat", "viewFeat", "housingFeat", "accessFeat", "facade"].every((k) => kiralikDaire.has(k)) &&
      !kiralikDaire.has("deal") && !kiralikDaire.has("homeType"));
  const satilik = keysOf(fieldsFor("emlak-konut-satilik"));
  check("C2", "Konut/Satılık: homeType selectable, deal fixed", satilik.has("homeType") && !satilik.has("deal") && satilik.has("rooms"));
  const arsa = keysOf(fieldsFor("emlak-arsa-tarla"));
  check("C3", "Arsa: no rooms/floor/heat/kitchen; m², zoning, deal, swap, muhit, ulaşım",
    !["rooms", "floor", "heat", "kitchen", "sqmNetMin", "inFeat", "viewFeat"].some((k) => arsa.has(k)) &&
      ["sqmMin", "zoning", "deal", "swap", "hoodFeat", "transitFeat"].every((k) => arsa.has(k)));
  const ofis = keysOf(fieldsFor("emlak-isyeri-ofis"));
  check("C4", "İşyeri: no rooms/furnished/usage/kitchen/housing; deal, m², floor, heat",
    !["rooms", "furnished", "usage", "kitchen", "housingFeat", "siteName"].some((k) => ofis.has(k)) &&
      ["deal", "sqmMin", "sqmNetMin", "floor", "heat", "elevator"].every((k) => ofis.has(k)));
  const root = keysOf(fieldsFor("emlak"));
  check("C5", "Emlak root: deal + homeType selectable", root.has("deal") && root.has("homeType"));
  const allGrouped = fieldsFor("emlak-konut-kiralik").every((f) => Boolean(f.group));
  check("C6", "every estate field is assigned to a dialog group", allGrouped);
  const primary = fieldsFor("emlak-konut-kiralik").filter((f) => f.primary && !f.key.endsWith("Max")).map((f) => f.key);
  check("C7", "sidebar basics: price, m² brüt/net, rooms, age, floorCount, floor, heat, kimden",
    ["priceMin", "sqmMin", "sqmNetMin", "rooms", "age", "floorCount", "floor", "heat", "kimden"].every((k) => primary.includes(k)), primary.join(","));

  // Form ↔ filter coverage: no filter control without stored data
  const misses: string[] = [];
  const estateNodes = allCategoryNodes().filter((c) => rootOf(c).id === "emlak" && !c.filter);
  for (const node of estateNodes) {
    const schema = schemaForCategoryId(node.id);
    const labels = new Set([...schema.fields.map((f) => f.specLabel), "İlan tipi", "Emlak tipi"]);
    const featureItems = new Set((schema.groups ?? []).flatMap((g) => g.items));
    for (const f of filterFieldsForCategory(node)) {
      if (["city", "district", "neighborhood", "urgent"].includes(f.key) || f.key.startsWith("price")) continue;
      if (f.kind === "multi") {
        const bad = (f.options ?? []).filter((o) => !featureItems.has(o));
        if (bad.length) misses.push(`${node.id}:${f.key}(${bad.join("/")})`);
        continue;
      }
      if (!(f.specKeys ?? []).some((k) => labels.has(k))) misses.push(`${node.id}:${f.key}`);
    }
  }
  check("V1", `${estateNodes.length} estate nodes: every filter maps to a spec/feature the form saves`, misses.length === 0, misses.slice(0, 6).join(" "));

  // Strict matching on form-built listings
  const L = Object.fromEntries(FIXTURES.map((f) => [f.key, fakeListing(f)])) as Record<string, Listing>;
  const fk = fieldsFor("emlak-konut-kiralik");
  const hit = (state: FilterState, fields = fk, pool = [L.A, L.B]) =>
    pool.filter((l) => listingMatchesDynamicFilters(l, state, fields)).map((l) => l.id).join("");
  check("M1", "rooms single + multi (OR)", hit({ rooms: "2+1" }) === "A" && hit({ rooms: "2+1,3+1" }) === "AB");
  check("M2", "floor=1 does not match '10+' (strict, no text fuzz)", hit({ floor: "1" }) === "A" && hit({ floor: "10+" }) === "B");
  check("M3", "m² brüt/net ranges", hit({ sqmMin: "120" }) === "B" && hit({ sqmMin: "90", sqmMax: "110" }) === "A" && hit({ sqmNetMax: "90" }) === "A");
  check("M4", "heat / age / elevator / kitchen", hit({ heat: "Merkezi" }) === "B" && hit({ age: "1-5" }) === "A" && hit({ elevator: "Var" }) === "A" && hit({ kitchen: "Kapalı" }) === "A");
  check("M5", "features AND within a group", hit({ inFeat: "Asansör" }) === "AB" && hit({ inFeat: "Asansör,Jakuzi" }) === "A");
  check("M6", "view / housing / access / transit / hood / exterior", ["viewFeat=Deniz", "housingFeat=Ara Kat", "accessFeat=Engelliye Uygun", "transitFeat=Metro", "hoodFeat=Market", "outFeat=Güvenlik"].every((p) => {
    const [k, v] = p.split("=");
    return hit({ [k]: v }) === "A";
  }));
  check("M7", "dues range, site name, facade, swap, deed, credit, usage",
    hit({ duesMax: "1000" }) === "A" && hit({ siteName: "yeşilvadi" }) === "A" && hit({ facade: "Güney" }) === "A" &&
      hit({ swap: "Hayır" }) === "A" && hit({ deed: "Kat Mülkiyeti" }) === "A" && hit({ credit: "Evet" }) === "A" && hit({ usage: "Boş" }) === "A");
  check("M8", "listing without the spec never matches that filter", hit({ facade: "Kuzey" }) === "" && hit({ swap: "Evet" }) === "");
  check("M9", "il → ilçe → mahalle", hit({ city: "Ankara", district: "Çankaya" }) === "A" && (!HOOD || hit({ city: "Ankara", district: "Çankaya", neighborhood: HOOD }) === "A"));
  const fa = fieldsFor("emlak-arsa");
  check("M10", "Arsa: zoning / m² / swap", hit({ zoning: "Tarla" }, fa, [L.D]) === "D" && hit({ zoning: "Konut" }, fa, [L.D]) === "" && hit({ sqmMin: "4000", swap: "Evet" }, fa, [L.D]) === "D");
  check("M11", "deal on root uses stored İlan tipi", hit({ deal: "Kiralık" }, fieldsFor("emlak"), Object.values(L)) === "ABE");

  // URL round-trip
  const state: FilterState = { city: "Ankara", district: "Çankaya", rooms: "2+1,3+1", sqmMin: "100", sqmMax: "150", inFeat: "Asansör,Jakuzi", posted: "7" };
  const qs = mergeFilterQuery(new URLSearchParams("kategori=emlak-konut-kiralik"), state, { sira: "ucuz" });
  const back = filtersFromSearchParams(new URLSearchParams(qs));
  check("U1", "state → URL → state is lossless (ilce alias, comma lists)", JSON.stringify(back) === JSON.stringify(state) && qs.includes("ilce=") && qs.includes("kategori=emlak-konut-kiralik"), qs);

  // Server allowlist
  const evil = new URLSearchParams();
  evil.append("__proto__", "x");
  evil.append("constructor", "x");
  evil.append("prototype", "x");
  evil.append("__proto__[polluted]", "1");
  evil.append("rooms", "2+1,EVIL,DROP TABLE");
  evil.append("sqmMin", "1e9");
  evil.append("sqmMax", "200");
  evil.append("unknownKey", "1");
  evil.append("inFeat", "Asansör," + "x".repeat(3000));
  const srv = serverFilterState(evil, fk);
  const pollutedProto = ({} as Record<string, unknown>).polluted !== undefined;
  check("Q1", "__proto__/constructor/prototype dropped, no prototype pollution",
    !Object.keys(srv).some((k) => ["constructor", "prototype", "__proto__"].includes(k)) &&
      Object.getPrototypeOf(srv) === Object.prototype && !pollutedProto, JSON.stringify(Object.keys(srv)));
  check("Q2", "unknown keys / invalid options / non-integer ranges dropped",
    srv.rooms === "2+1" && srv.sqmMin === undefined && srv.sqmMax === "200" && srv.unknownKey === undefined && srv.inFeat === "Asansör", JSON.stringify(srv));
  const arsaSrv = serverFilterState(new URLSearchParams("rooms=2%2B1&zoning=Tarla"), fa);
  check("Q3", "Arsa ignores room filter (not a land field)", arsaSrv.rooms === undefined && arsaSrv.zoning === "Tarla");

  // Smart search shares the same URL/filter system
  const parsed = parseSmartQuery("Ankara Çankaya kiralık 2+1 daire 100 m2 üstü");
  const cat = parsed.category;
  const smartHref = smartResultsHref(cat, parsed.state);
  const smartParams = new URLSearchParams(smartHref.split("?")[1] ?? "");
  const roundTrip = cat ? serverFilterState(smartParams, filterFieldsForCategory(cat)) : {};
  check("S1", "smart search → estate category with rooms/m²/city", Boolean(cat && rootOf(cat).id === "emlak") && parsed.state.rooms === "2+1" && parsed.state.sqmMin === "100" && parsed.state.city === "Ankara",
    `${cat?.id} ${JSON.stringify(parsed.state)}`);
  check("S2", "smart href survives the server allowlist unchanged", Boolean(cat) && JSON.stringify(roundTrip) === JSON.stringify(validateSmartState(cat, parsed.state)), smartHref);
  const facadeParse = parseSmartQuery("Denizli Güney kiralık daire");
  check("S3", "free text does not fill new ambiguous selects (facade/kitchen/swap)", !facadeParse.state.facade && !facadeParse.state.kitchen && !facadeParse.state.swap);
}

async function get(path: string) {
  const res = await fetch(`${BASE}${path}`, { headers: { "x-forwarded-for": `10.88.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` } });
  const body = (await res.json().catch(() => null)) as { ok?: boolean; listings?: { title: string }[]; count?: number } | null;
  return { status: res.status, body };
}

async function httpTests() {
  if (!LOOPBACK.test(new URL(BASE).hostname)) throw new Error("Refusing to run HTTP tests against a non-local app.");
  if (!LOOPBACK.test(new URL(DB).hostname)) throw new Error("Refusing to run HTTP tests against a non-local database.");
  const prisma = new PrismaClient({ datasources: { db: { url: DB } } });
  const seller = await prisma.user.create({
    data: {
      email: `seller-${TAG}@emlaktest.invalid`,
      username: `emlaktest_${TAG}`,
      role: "seller",
      passwordHash: await bcrypt.hash(randomBytes(12).toString("base64url"), 10),
      emailVerifiedAt: new Date(),
      profile: {
        create: {
          displayName: "Emlak Test",
          fullName: "Emlak Test",
          profileComplete: true,
          phone: `53${String(randomBytes(4).readUInt32BE() % 100_000_000).padStart(8, "0")}`,
          city: "Ankara",
        },
      },
    },
  });
  const now = new Date();
  const created: { id: string; key: string }[] = [];
  try {
    for (const f of FIXTURES) {
      const row = await prisma.listing.create({
        data: {
          status: "active",
          postedAt: now,
          expiresAt: new Date(now.getTime() + 10 * 86400_000),
          sellerId: seller.id,
          listingNo: `ET${TAG}${f.key}`,
          categoryId: f.categoryId,
          title: `Emlak test ${f.key} ${TAG}`,
          description: "Emlak filtre test ilanı.",
          price: f.price,
          city: "Ankara",
          district: f.district,
          neighborhood: f.neighborhood ?? "",
          specs: formSpecs(f.categoryId, f.attrs),
          features: f.features,
          images: { create: [{ storageKey: `test/${TAG}/${f.key}`, url: "https://images.unsplash.com/photo-1560185007-cde436f6a4d0", sortOrder: 0, isCover: true }] },
        },
      });
      created.push({ id: row.id, key: f.key });
    }

    const keysIn = (body: { listings?: { title: string }[] } | null) =>
      (body?.listings ?? []).map((l) => l.title.split(" ")[2]).sort().join("");
    const run = async (id: string, name: string, kategori: string, query: string, want: string) => {
      const base = `/api/listings?kategori=${kategori}&q=${TAG}${query ? `&${query}` : ""}`;
      const list = await get(base);
      const count = await get(`${base}&count=1`);
      const got = keysIn(list.body);
      check(id, name, list.status === 200 && got === want && count.body?.count === want.length, `got=${got || "-"} count=${count.body?.count}`);
    };
    const enc = encodeURIComponent;
    await run("H1", "Kiralık konut: no filter → A,B", "emlak-konut-kiralik", "", "AB");
    await run("H2", "rooms 2+1", "emlak-konut-kiralik", `rooms=${enc("2+1")}`, "A");
    await run("H3", "rooms 2+1 OR 3+1", "emlak-konut-kiralik", `rooms=${enc("2+1,3+1")}`, "AB");
    await run("H4", "m² brüt 90–110", "emlak-konut-kiralik", "sqmMin=90&sqmMax=110", "A");
    await run("H5", "m² net ≤ 90", "emlak-konut-kiralik", "sqmNetMax=90", "A");
    await run("H6", "bulunduğu kat 1 (not 10+)", "emlak-konut-kiralik", "floor=1", "A");
    await run("H7", "bina yaşı 11-15", "emlak-konut-kiralik", `age=${enc("11-15")}`, "B");
    await run("H8", "ısıtma Merkezi", "emlak-konut-kiralik", "heat=Merkezi", "B");
    await run("H9", "çoklu özellik Asansör+Jakuzi", "emlak-konut-kiralik", `inFeat=${enc("Asansör,Jakuzi")}`, "A");
    await run("H10", "manzara Deniz + ulaşım Metro", "emlak-konut-kiralik", `viewFeat=Deniz&transitFeat=Metro`, "A");
    await run("H11", "il → ilçe", "emlak-konut-kiralik", `city=Ankara&ilce=${enc("Çankaya")}`, "A");
    if (HOOD) await run("H12", "il → ilçe → mahalle", "emlak-konut-kiralik", `city=Ankara&ilce=${enc("Çankaya")}&mahalle=${enc(HOOD)}`, "A");
    await run("H13", "fiyat max 30.000", "emlak-konut-kiralik", "priceMax=30000", "A");
    await run("H14", "aidat ≤ 1000 + mutfak Kapalı + cephe Güney", "emlak-konut-kiralik", `duesMax=1000&kitchen=${enc("Kapalı")}&facade=${enc("Güney")}`, "A");
    await run("H15", "site adı içerir", "emlak-konut-kiralik", `siteName=${enc("yeşilvadi")}`, "A");
    await run("H16", "kimden Emlak Ofisinden", "emlak-konut-kiralik", `kimden=${enc("Emlak Ofisinden")}`, "B");
    await run("H17", "boş sonuç", "emlak-konut-kiralik", `rooms=${enc("8+")}`, "");
    await run("H18", "Satılık konut: villa type", "emlak-konut-satilik", `homeType=Villa`, "C");
    await run("H19", "Arsa: zoning Tarla + m² ≥ 4000 + takas", "emlak-arsa", `zoning=Tarla&sqmMin=4000&swap=Evet`, "D");
    await run("H20", "Arsa: rooms param ignored", "emlak-arsa", `rooms=${enc("2+1")}`, "D");
    await run("H21", "İşyeri: deal Kiralık + kat 3 + Klima", "emlak-isyeri", `deal=${enc("Kiralık")}&floor=3&heat=Klima`, "E");
    await run("H22", "Emlak root: deal Kiralık → A,B,E", "emlak", `deal=${enc("Kiralık")}`, "ABE");
    await run("H23", "manipulated: __proto__/constructor/prototype + bad options ignored", "emlak-konut-kiralik",
      `__proto__=x&constructor=x&prototype=x&${enc("__proto__[polluted]")}=1&rooms=${enc("DROP TABLE")}&sqmMin=abc`, "AB");
    await run("H24", "manipulated: invalid feature item dropped, valid kept", "emlak-konut-kiralik", `inFeat=${enc("Asansör,<script>")}`, "AB");
    const huge = await get(`/api/listings?kategori=emlak-konut-kiralik&q=${TAG}&inFeat=${"a".repeat(6000)}`);
    check("H25", "oversized param handled without 5xx", huge.status < 500, `status=${huge.status}`);
    const badCount = await get(`/api/listings?kategori=emlak&count=2`);
    check("H26", "count param is allowlisted (count=2 rejected)", badCount.status === 400);
    const page = await fetch(`${BASE}/ara?kategori=emlak-konut-kiralik&rooms=${enc("2+1")}&ilce=${enc("Çankaya")}`);
    check("H27", "filtered results page renders (URL is shareable)", page.status === 200);
  } finally {
    await prisma.listingImage.deleteMany({ where: { listingId: { in: created.map((c) => c.id) } } });
    await prisma.listing.deleteMany({ where: { id: { in: created.map((c) => c.id) } } });
    await prisma.user.delete({ where: { id: seller.id } }).catch(() => undefined);
    await prisma.$disconnect();
  }
}

async function main() {
  unitTests();
  if (BASE) await httpTests();
  else console.log("(HTTP part skipped — set EMLAK_TEST_BASE and a local DATABASE_URL)");
  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
}

void main();
