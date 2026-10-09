/**
 * Vasıta sub-category tests (all 14 profile categories; Otomobil must stay unchanged).
 *
 * Unit part (no server): form ↔ filter coverage, brand → model dependency and server-side rejection of a model from
 * another brand, per-field matching on two form-built listings per category, URL round-trip, query allowlist.
 * HTTP part runs ONLY against a local server + local database:
 *
 *   VASITA_TEST_BASE=http://127.0.0.1:3013 DATABASE_URL=<local> npx tsx --conditions=react-server scripts/test-vasita-filters.ts
 *
 * Creates one throw-away seller (`*@vasitatest.invalid`) with two listings per category, removed at the end.
 */
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { findCategory } from "@/data/categories";
import {
  dependentAttrKeys,
  emptyChassis,
  missingRequiredAttrs,
  schemaForCategoryId,
  specsWithChassis,
  type AttrField,
  type ChassisStatus,
} from "@/data/listingSchema";
import {
  bodiesOfModel,
  brandNamesForSegment,
  enginesOfModel,
  modelsOfBrand,
  packagesOfModel,
  rangesOfModel,
  type VehicleSegment,
} from "@/data/listingOptions";
import { catalogForSegment, VEHICLE_OTHER, vehicleComboError } from "@/data/vehicleIndex";
import { vehicleProfileSpec } from "@/data/vehicleProfiles";
import { vehicleProfileFromCategoryId } from "@/data/vehicleIndex";
import {
  filterFieldsForCategory,
  hasAdvancedFilters,
  listingMatchesDynamicFilters,
  type FilterField,
  type FilterState,
} from "@/lib/categoryFilters";
import { filtersFromSearchParams, mergeFilterQuery, serverFilterState } from "@/lib/filterUrl";
import { parseListingInput } from "@/lib/listings/store";
import { vehicleSpecError } from "@/lib/listings/vehicleSpecPolicy";
import type { Listing } from "@/data/store";

const BASE = process.env.VASITA_TEST_BASE ?? "";
const DB = process.env.DATABASE_URL ?? "";
const LOOPBACK = /^(localhost|127\.0\.0\.1|\[::1\])$/;
const TAG = randomBytes(4).toString("hex");

const CATEGORIES = [
  "vasita-suv",
  "vasita-ev",
  "vasita-moto",
  "vasita-van",
  "vasita-ticari",
  "vasita-kiralik",
  "vasita-deniz",
  "vasita-hasarli",
  "vasita-karavan",
  "vasita-klasik",
  "vasita-hava",
  "vasita-atv",
  "vasita-utv",
  "vasita-engelli",
];

const results: { id: string; pass: boolean }[] = [];
function check(id: string, name: string, pass: boolean, detail = "") {
  results.push({ id, pass });
  console.log(`${pass ? "PASS" : "FAIL"}  ${id.padEnd(7)} ${name}${detail ? `  — ${detail}` : ""}`);
}

const fieldsFor = (id: string) => filterFieldsForCategory(findCategory(id)!);
const short = (id: string) => id.replace("vasita-", "");

function optionsFor(field: AttrField, attrs: Record<string, string>, kind: VehicleSegment) {
  const k = field.catalogKind ?? kind;
  if (field.optionSource === "vehicleModels") return modelsOfBrand(attrs.brand, k);
  if (field.optionSource === "vehiclePackages") return packagesOfModel(attrs.brand, attrs.model, k);
  if (field.optionSource === "vehicleEngines") return enginesOfModel(attrs.brand, attrs.model, k);
  if (field.optionSource === "vehicleBodies") return bodiesOfModel(attrs.brand, attrs.model, k);
  if (field.optionSource === "vehicleRanges") return rangesOfModel(attrs.brand, attrs.model, k);
  return field.options ?? [];
}

/** Catalog brands whose first model fills the most cascades (packages + engines, else packages), so every field gets a value. */
function richBrands(kind: VehicleSegment) {
  const brands = catalogForSegment(kind).filter((b) => b.name !== VEHICLE_OTHER);
  const first = (b: (typeof brands)[number]) => b.models.find((x) => x.name !== VEHICLE_OTHER);
  const full = brands.filter((b) => first(b)?.packages.length && first(b)?.engines.length);
  const withPk = brands.filter((b) => first(b)?.packages.length);
  return (full.length >= 2 ? full : withPk.length >= 2 ? withPk : brands.filter((b) => first(b))).map((b) => b.name);
}

function numberFor(field: AttrField, v: 0 | 1) {
  if (field.key === "km") return v ? "180000" : "45000";
  if (field.key === "restorationYear") return v ? "1995" : "2015";
  if (field.key === "batterySoh") return v ? "80" : "95";
  if (field.decimal) return v ? "30,5" : "12,5";
  if (field.unit === "₺") return v ? "4500" : "1500";
  return v ? "450" : "150";
}

/** Fills the form the way a user would: every field in order, cascades from the chosen parents. */
function fill(categoryId: string, v: 0 | 1) {
  const schema = schemaForCategoryId(categoryId);
  const kind = schema.catalogKind ?? "auto";
  const attrs: Record<string, string> = {};
  for (const field of schema.fields) {
    if (field.key === "brand") {
      const brands = richBrands(kind);
      attrs.brand = brands[v] ?? brands[0];
      continue;
    }
    if (field.kind === "number") {
      attrs[field.key] = numberFor(field, v);
      continue;
    }
    if (field.kind === "text") {
      attrs[field.key] = v ? "Standart seri" : "Limited 500 adet";
      continue;
    }
    const opts = optionsFor(field, attrs, kind).filter((o) => o !== VEHICLE_OTHER);
    if (!opts.length) continue;
    const idx = field.key === "year" ? (v ? 6 : 2) : v;
    attrs[field.key] = opts[Math.min(idx, opts.length - 1)];
  }
  return { schema, attrs };
}

function chassisFor(v: 0 | 1) {
  const c = emptyChassis();
  if (v) {
    const first = Object.keys(c)[0] as keyof typeof c;
    (c as Record<string, ChassisStatus>)[first] = "painted";
  }
  return c;
}

function featuresFor(categoryId: string, v: 0 | 1) {
  return schemaForCategoryId(categoryId).groups.map((g) => g.items[v]).filter(Boolean);
}

function fixture(categoryId: string, v: 0 | 1) {
  const { schema, attrs } = fill(categoryId, v);
  const chassis = schema.chassis ? chassisFor(v) : undefined;
  return {
    attrs,
    specs: specsWithChassis(schema, attrs, chassis ?? emptyChassis()),
    features: featuresFor(categoryId, v),
    chassis,
    price: v ? 2_400_000 : 800_000,
  };
}

function fakeListing(categoryId: string, v: 0 | 1): Listing {
  const f = fixture(categoryId, v);
  return {
    id: v ? "B" : "A",
    title: `Vasita test ${v ? "B" : "A"}`,
    subtitle: "",
    price: f.price,
    categoryId,
    city: "Ankara",
    district: v ? "Keçiören" : "Çankaya",
    neighborhood: "",
    images: ["https://images.unsplash.com/photo-1494976388531-d1058494cdd8"],
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
    specs: f.specs,
    features: f.features,
    chassis: f.chassis,
    listingNo: v ? "B" : "A",
    postedAt: Date.now(),
  };
}

const numOf = (raw: string) => Number(raw.replace(",", "."));

/** One filter state per backend filter of the category that listing A satisfies and listing B does not. */
function expectations(categoryId: string) {
  const spec = vehicleProfileSpec(vehicleProfileFromCategoryId(categoryId))!;
  const a = fill(categoryId, 0).attrs;
  const b = fill(categoryId, 1).attrs;
  const out: { name: string; state: FilterState }[] = [];
  for (const def of spec.fields) {
    const fl = def.filter;
    if (!fl) continue;
    const key = fl.key ?? def.key;
    const av = a[def.key];
    const bv = b[def.key];
    if (!av || av === bv) continue;
    const mode = fl.mode ?? (def.kind === "number" ? "range" : def.kind === "text" ? "text" : "select");
    if (mode === "range") {
      const n = Math.floor(numOf(av));
      out.push({ name: `${key}Min/Max`, state: { [`${key}Min`]: String(n), [`${key}Max`]: String(n + 1) } });
    } else if (mode === "text") {
      out.push({ name: key, state: { [key]: av.split(" ")[0].toLocaleLowerCase("tr") } });
    } else {
      out.push({ name: key, state: { [key]: av } });
    }
  }
  if (spec.chassis) out.push({ name: "paint", state: { paint: "Boyasız" } });
  for (const g of spec.groups) if (g.items[0] && g.items[1]) out.push({ name: `${g.id}Feat`, state: { [`${g.id}Feat`]: g.items[0] } });
  out.push({ name: "district", state: { city: "Ankara", district: "Çankaya" } });
  out.push({ name: "priceMax", state: { priceMax: "1000000" } });
  return out;
}

function unitTests() {
  // Otomobil untouched
  const oto = fieldsFor("vasita-otomobil").map((f) => f.key);
  check("O1", "Otomobil keeps its filter set (brand/model/trim/year/km/fuel/gear/bodyType/engineSize/power/drive/color/damage/paint/kimden/equip)",
    ["brand", "model", "trim", "yearMin", "kmMin", "fuel", "gear", "bodyType", "engineSize", "power", "drive", "color", "damage", "paint", "kimden", "equip"].every((k) => oto.includes(k)) &&
      !schemaForCategoryId("vasita-otomobil").vehicleProfile && !hasAdvancedFilters(findCategory("vasita-otomobil")));

  for (const id of CATEGORIES) {
    const s = short(id);
    const schema = schemaForCategoryId(id);
    const fields = fieldsFor(id);
    const spec = vehicleProfileSpec(vehicleProfileFromCategoryId(id));

    // Form ↔ filter coverage
    const labels = new Set(schema.fields.map((f) => f.specLabel));
    const items = new Set(schema.groups.flatMap((g) => g.items));
    const misses: string[] = [];
    for (const f of fields) {
      if (["city", "district", "urgent", "paint"].includes(f.key) || f.key.startsWith("price")) continue;
      if (f.kind === "multi") {
        if ((f.options ?? []).some((o) => !items.has(o))) misses.push(f.key);
        continue;
      }
      if (!(f.specKeys ?? []).some((k) => labels.has(k))) misses.push(f.key);
    }
    const formFilterable = (spec?.fields ?? []).filter((d) => d.filter).length;
    check(`F.${s}`, `${s}: ${schema.fields.length} form fields, ${fields.length} filters; every filter maps to a stored spec/feature, all grouped`,
      Boolean(spec) && schema.vehicleProfile === true && misses.length === 0 && fields.every((f) => f.group) && formFilterable > 5 && hasAdvancedFilters(findCategory(id)),
      misses.join(","));

    // Per-field matching on two form-built listings
    const A = fakeListing(id, 0);
    const B = fakeListing(id, 1);
    const bad = expectations(id).filter(({ state }) => {
      const got = [A, B].filter((l) => listingMatchesDynamicFilters(l, state, fields)).map((l) => l.id).join("");
      return got !== "A";
    });
    const total = expectations(id).length;
    check(`M.${s}`, `${s}: ${total} filters each find A (form value) and exclude B`, bad.length === 0 && total >= 8, bad.map((b) => b.name).join(","));

    // Required fields are fillable from the form data (no blocking empty cascades)
    const missing = missingRequiredAttrs(schema, fill(id, 0).attrs).map((f) => f.key);
    check(`R.${s}`, `${s}: generated form passes required validation`, missing.length === 0, missing.join(","));

    // URL round-trip + allowlist
    const exp = expectations(id).slice(0, 4);
    const state = Object.assign({}, ...exp.map((e) => e.state)) as FilterState;
    const qs = mergeFilterQuery(new URLSearchParams(`kategori=${id}`), state);
    const back = filtersFromSearchParams(new URLSearchParams(qs));
    const srv = serverFilterState(new URLSearchParams(qs), fields);
    check(`U.${s}`, `${s}: filter state → URL → state lossless and accepted by the server allowlist`,
      JSON.stringify(back) === JSON.stringify(state) && JSON.stringify(srv) === JSON.stringify(state), qs);
  }

  // Brand → model dependency
  const kinds: VehicleSegment[] = ["suv", "ev", "moto", "van", "ticari", "deniz", "caravan", "classic", "air", "atv", "utv", "auto"];
  const depBad: string[] = [];
  for (const kind of kinds) {
    const brands = richBrands(kind);
    const [b1, b2] = brands;
    if (!b1 || !b2) {
      depBad.push(`${kind}:brands`);
      continue;
    }
    const m1 = modelsOfBrand(b1, kind);
    const foreign = modelsOfBrand(b2, kind).find((m) => m !== VEHICLE_OTHER && !m1.includes(m));
    const own = m1.find((m) => m !== VEHICLE_OTHER)!;
    const pk = packagesOfModel(b1, own, kind)[0];
    // Otomobil's catalog (also used by Kiralık / Hasarlı / Engelli) is left exactly as before, without "Diğer".
    const other =
      kind === "auto"
        ? !brandNamesForSegment(kind).includes(VEHICLE_OTHER)
        : vehicleComboError(kind, { brand: b1, model: VEHICLE_OTHER }) === null &&
          vehicleComboError(kind, { brand: VEHICLE_OTHER, model: VEHICLE_OTHER }) === null &&
          brandNamesForSegment(kind).includes(VEHICLE_OTHER);
    const ok =
      Boolean(foreign) &&
      vehicleComboError(kind, { brand: b1, model: foreign }) === "model" &&
      (!pk ||
        (vehicleComboError(kind, { brand: b1, model: own, trim: pk }) === null &&
          vehicleComboError(kind, { brand: b1, model: own, trim: "Uydurma Paket" }) === "trim")) &&
      modelsOfBrand("", kind).length === 0 &&
      other;
    if (!ok) depBad.push(`${kind}${foreign ? "" : ":noForeign"}`);
  }
  check("D1", "every catalog: models only for the chosen brand; foreign model/trim rejected; controlled 'Diğer' accepted", depBad.length === 0, depBad.join(","));

  const evSchema = schemaForCategoryId("vasita-ev");
  check("D2", "model locked until brand (dependsOn) in form and filter",
    evSchema.fields.find((f) => f.key === "model")?.dependsOn === "brand" && fieldsFor("vasita-ev").find((f) => f.key === "model")?.dependsOn === "brand");
  const vanDeps = dependentAttrKeys(schemaForCategoryId("vasita-van"), "engine");
  const brandDeps = dependentAttrKeys(evSchema, "brand");
  check("D3", "form clears only dependants (van: engine change keeps body; brand clears model/trim/body)",
    !vanDeps.includes("body") && ["model", "trim", "body"].every((k) => brandDeps.includes(k)) && !brandDeps.includes("batteryKwh"), `${vanDeps}|${brandDeps}`);
  const otherAttrs = { ...fill("vasita-suv", 0).attrs, model: VEHICLE_OTHER, trim: "", engine: "", body: "" };
  check("D4", "'Diğer' model: empty package/engine cascades are not required", missingRequiredAttrs(schemaForCategoryId("vasita-suv"), otherAttrs).length === 0);

  // Server-side validation through the same parser POST/PATCH use
  const good = fixture("vasita-moto", 0);
  const ownMoto = good.attrs;
  const foreignMoto = modelsOfBrand(richBrands("moto")[1], "moto").find((m) => !modelsOfBrand(ownMoto.brand, "moto").includes(m))!;
  const badSpecs = good.specs.map((s) => (s.label === "Model" ? { ...s, value: foreignMoto } : s));
  const body = (specs: { label: string; value: string }[]) => ({
    title: "Test motosiklet",
    categoryId: "vasita-moto",
    city: "Ankara",
    district: "Çankaya",
    price: 100000,
    images: ["https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=1200"],
    specs,
  });
  const parsedGood = parseListingInput(body(good.specs));
  const parsedBad = parseListingInput(body(badSpecs));
  check("S1", "server parser accepts a catalog brand/model and rejects a model of another brand",
    !("error" in parsedGood && parsedGood.error === "post.vehicleModel") && "error" in parsedBad && parsedBad.error === "post.vehicleModel",
    `${"error" in parsedGood ? parsedGood.error : "ok"} / ${"error" in parsedBad ? parsedBad.error : "ok"}`);
  check("S2", "edit of an older listing with an unchanged legacy combo stays allowed; changing to a foreign model is rejected",
    vehicleSpecError("vasita-moto", badSpecs, { categoryId: "vasita-moto", specs: badSpecs }) === null &&
      vehicleSpecError("vasita-moto", badSpecs, { categoryId: "vasita-moto", specs: good.specs }) === "post.vehicleModel");
  check("S3", "Otomobil and non-catalog brands are not affected by the check",
    vehicleSpecError("vasita-otomobil", badSpecs) === null &&
      vehicleSpecError("vasita-moto", [{ label: "Marka", value: "Yerli Usta" }, { label: "Model", value: "X1" }]) === null);

  // Older listings (labels written before this change) remain findable
  const legacy = (categoryId: string, specs: { label: string; value: string }[]) => ({ ...fakeListing(categoryId, 0), specs });
  const evOld = legacy("vasita-ev", [{ label: "Marka", value: "Tesla" }, { label: "Batarya", value: "75 kWh" }, { label: "Menzil", value: "480 km" }]);
  const boatOld = legacy("vasita-deniz", [{ label: "Tekne tipi", value: "Yelkenli" }, { label: "Motor", value: "150 hp" }]);
  const vanOld = legacy("vasita-van", [{ label: "Yük", value: payloadSample() }, { label: "Kasa tipi", value: "Panelvan" }]);
  check("L1", "legacy labels: EV 'Batarya' → batteryKwh range, deniz 'Tekne tipi' → boatType, van 'Yük'/'Kasa tipi'",
    listingMatchesDynamicFilters(evOld, { batteryKwhMin: "70", rangeKmMin: "400" }, fieldsFor("vasita-ev")) &&
      listingMatchesDynamicFilters(boatOld, { boatType: "Yelkenli", hpMin: "100" }, fieldsFor("vasita-deniz")) &&
      listingMatchesDynamicFilters(vanOld, { payload: payloadSample(), bodyType: "Panelvan" }, fieldsFor("vasita-van")));

  // Allowlist on profile filters
  const evil = new URLSearchParams();
  evil.append("__proto__", "x");
  evil.append("chargeType", `Type 2 + CCS2,EVIL,DROP TABLE`);
  evil.append("batteryKwhMin", "1e9");
  evil.append("rangeKmMax", "600");
  evil.append("safetyFeat", "ABS," + "x".repeat(3000));
  evil.append("cond", "Sıfır");
  const srv = serverFilterState(evil, fieldsFor("vasita-ev"));
  check("Q1", "invalid options / non-integer ranges / unknown keys (old deniz 'cond') dropped",
    srv.chargeType === "Type 2 + CCS2" && srv.batteryKwhMin === undefined && srv.rangeKmMax === "600" && srv.safetyFeat === "ABS" &&
      srv.cond === undefined && !Object.keys(srv).includes("__proto__"), JSON.stringify(srv));
  check("Q2", "Deniz has no condition filter without a form field", !fieldsFor("vasita-deniz").some((f) => f.key === "cond"));
  const commas = CATEGORIES.flatMap((id) =>
    fieldsFor(id)
      .filter((f) => f.multiPick || f.kind === "multi")
      .flatMap((f) => (f.options ?? []).filter((o) => o.includes(",")).map((o) => `${short(id)}.${f.key}:${o}`)),
  );
  check("Q3", "no multi-select option contains the URL list separator ','", commas.length === 0, commas.slice(0, 5).join(" | "));
}

function payloadSample() {
  return schemaForCategoryId("vasita-van").fields.find((f) => f.key === "payload")!.options![0];
}

async function get(path: string) {
  const res = await fetch(`${BASE}${path}`, { headers: { "x-forwarded-for": `10.89.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` } });
  const body = (await res.json().catch(() => null)) as { ok?: boolean; listings?: { title: string }[]; count?: number } | null;
  return { status: res.status, body };
}

async function httpTests() {
  if (!LOOPBACK.test(new URL(BASE).hostname)) throw new Error("Refusing to run HTTP tests against a non-local app.");
  if (!LOOPBACK.test(new URL(DB).hostname)) throw new Error("Refusing to run HTTP tests against a non-local database.");
  const prisma = new PrismaClient({ datasources: { db: { url: DB } } });
  const seller = await prisma.user.create({
    data: {
      email: `seller-${TAG}@vasitatest.invalid`,
      username: `vasitatest_${TAG}`,
      role: "seller",
      passwordHash: await bcrypt.hash(randomBytes(12).toString("base64url"), 10),
      emailVerifiedAt: new Date(),
      profile: {
        create: {
          displayName: "Vasita Test",
          fullName: "Vasita Test",
          profileComplete: true,
          phone: `53${String(randomBytes(4).readUInt32BE() % 100_000_000).padStart(8, "0")}`,
          city: "Ankara",
        },
      },
    },
  });
  const now = new Date();
  const created: string[] = [];
  try {
    for (const id of CATEGORIES) {
      for (const v of [0, 1] as const) {
        const f = fixture(id, v);
        const key = v ? "B" : "A";
        const row = await prisma.listing.create({
          data: {
            status: "active",
            postedAt: now,
            expiresAt: new Date(now.getTime() + 10 * 86400_000),
            sellerId: seller.id,
            listingNo: `VT${TAG}${short(id)}${key}`.slice(0, 40),
            categoryId: id,
            title: `Vasita test ${key} ${TAG}`,
            description: "Vasıta filtre test ilanı.",
            price: f.price,
            city: "Ankara",
            district: v ? "Keçiören" : "Çankaya",
            neighborhood: "",
            specs: f.specs,
            features: f.features,
            ...(f.chassis ? { chassis: f.chassis } : {}),
            images: { create: [{ storageKey: `test/${TAG}/${id}/${key}`, url: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8", sortOrder: 0, isCover: true }] },
          },
        });
        created.push(row.id);
      }
    }

    // Stored specs are exactly what the form produced
    const stored = await prisma.listing.findMany({ where: { id: { in: created } }, select: { categoryId: true, title: true, specs: true } });
    const specBad = stored.filter((r) => {
      const v = r.title.includes(" B ") ? 1 : 0;
      return JSON.stringify(r.specs) !== JSON.stringify(fixture(r.categoryId, v as 0 | 1).specs);
    });
    check("H0", `form values written to DB unchanged (${stored.length} listings)`, stored.length === CATEGORIES.length * 2 && specBad.length === 0);

    const keysIn = (body: { listings?: { title: string }[] } | null) =>
      (body?.listings ?? []).map((l) => l.title.split(" ")[2]).sort().join("");
    for (const id of CATEGORIES) {
      const s = short(id);
      const fails: string[] = [];
      const exp = [{ name: "none", state: {} as FilterState, want: "AB" }, ...expectations(id).map((e) => ({ ...e, want: "A" }))];
      for (const e of exp) {
        const qs = mergeFilterQuery(new URLSearchParams(`kategori=${id}&q=${TAG}`), e.state);
        const list = await get(`/api/listings?${qs}`);
        const count = await get(`/api/listings?${qs}&count=1`);
        const got = keysIn(list.body);
        if (list.status !== 200 || got !== e.want || count.body?.count !== e.want.length) fails.push(`${e.name}:${got || "-"}/${count.body?.count}`);
      }
      check(`H.${s}`, `${s}: ${exp.length} API queries (list + count=1) return the expected listings`, fails.length === 0, fails.slice(0, 5).join(" "));
    }

    const page = await fetch(`${BASE}/ara?kategori=vasita-ev&brand=${encodeURIComponent(fill("vasita-ev", 0).attrs.brand)}&batteryKwhMin=10`);
    check("H90", "filtered results page renders (URL is shareable)", page.status === 200);
    const evil = await get(`/api/listings?kategori=vasita-moto&q=${TAG}&__proto__=x&engineType=${encodeURIComponent("DROP TABLE")}&kmMin=abc`);
    check("H91", "manipulated params ignored (no 5xx, unfiltered result)", evil.status === 200 && keysIn(evil.body) === "AB");
  } finally {
    await prisma.listingImage.deleteMany({ where: { listingId: { in: created } } });
    await prisma.listing.deleteMany({ where: { id: { in: created } } });
    await prisma.user.delete({ where: { id: seller.id } }).catch(() => undefined);
    await prisma.$disconnect();
  }
}

async function main() {
  unitTests();
  if (BASE) await httpTests();
  else console.log("(HTTP part skipped — set VASITA_TEST_BASE and a local DATABASE_URL)");
  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
}

void main();
