/**
 * Builds a slim brand-mark registry from catalog brand names + Simple Icons (CC0).
 * Run: npx tsx scripts/build-brand-marks.ts
 */
import fs from "node:fs";
import path from "node:path";
import * as si from "simple-icons";
import { VEHICLE_BRANDS } from "../src/data/vehicleCatalog";
import {
  PHONE_BRANDS,
  MACHINE_BRANDS,
  COMPUTER_BRANDS,
  WATCH_BRANDS,
  CAMERA_BRANDS,
  TV_BRANDS,
  APPLIANCE_BRANDS,
  PART_BRANDS,
  TIRE_BRANDS,
  AUDIO_BRANDS,
  HELMET_BRANDS,
  MOTO_GEAR_BRANDS,
  AUTO_ACC_BRANDS,
} from "../src/data/listingOptions";
import { shoppingCategories, otherCategories } from "../src/data/shoppingCatalog";

type Icon = { title: string; slug: string; hex: string; path: string };

const bySlug = new Map<string, Icon>();
for (const v of Object.values(si)) {
  if (v && typeof v === "object" && "slug" in v && "path" in v) {
    const ic = v as Icon;
    bySlug.set(ic.slug, ic);
  }
}

/** Manual aliases: normalized brand label → simple-icons slug */
const ALIASES: Record<string, string> = {
  // Mercedes removed from Simple Icons — use manual mark (see brandMarks.manual)
  bmw: "bmw",
  "mini cooper": "mini",
  mini: "mini",
  "land rover": "landrover",
  landrover: "landrover",
  "range rover": "landrover",
  "alfa romeo": "alfaromeo",
  "aston martin": "astonmartin",
  "rolls-royce": "rollsroyce",
  "rolls royce": "rollsroyce",
  "general motors": "gm",
  chevrolet: "chevrolet",
  "citroën": "citroen",
  citroen: "citroen",
  "ds automobiles": "dsautomobiles",
  "great wall": "greatwall",
  "mg motor": "mg",
  mg: "mg",
  "byd": "byd",
  tesla: "tesla",
  skoda: "skoda",
  "škoda": "skoda",
  "seat": "seat",
  cupra: "seat",
  dacia: "dacia",
  mitsubishi: "mitsubishi",
  nissan: "nissan",
  mazda: "mazda",
  subaru: "subaru",
  suzuki: "suzuki",
  // isuzu / lexus → manual Wikimedia marks (not in Simple Icons)
  infiniti: "infiniti",
  acura: "acura",
  porsche: "porsche",
  ferrari: "ferrari",
  lamborghini: "lamborghini",
  maserati: "maserati",
  bentley: "bentley",
  jaguar: "jaguar",
  jeep: "jeep",
  dodge: "dodge",
  chrysler: "chrysler",
  ram: "ram",
  gmc: "gmc",
  cadillac: "cadillac",
  lincoln: "lincoln",
  buick: "buick",
  "harley-davidson": "harleydavidson",
  "harley davidson": "harleydavidson",
  // Motorcycles — Yamaha Motor (NOT Yamaha Corporation audio / NOT Alpine Linux)
  yamaha: "yamahamotorcorporation",
  "yamaha motor": "yamahamotorcorporation",
  kawasaki: "kawasaki",
  ducati: "ducati",
  "ktm": "ktm",
  triumph: "triumph",
  "royal enfield": "royalenfield",
  vespa: "vespa",
  piaggio: "piaggio",
  aprilia: "aprilia",
  "apple (macbook)": "apple",
  "apple (iphone)": "apple",
  "apple (ipad)": "apple",
  "microsoft (surface)": "microsoft",
  "microsoft surface": "microsoft",
  "microsoft xbox": "xbox",
  monster: "monster",
  razer: "razer",
  leica: "leica",
  "3m": "3m",
  apple: "apple",
  samsung: "samsung",
  "samsung (galaxy)": "samsung",
  "samsung (galaxy tab)": "samsung",
  xiaomi: "xiaomi",
  huawei: "huawei",
  oppo: "oppo",
  honor: "honor",
  google: "google",
  "google pixel": "google",
  "google (pixel)": "google",
  oneplus: "oneplus",
  vivo: "vivo",
  nokia: "nokia",
  sony: "sony",
  "sony playstation": "playstation",
  lg: "lg",
  asus: "asus",
  "asus (rog phone)": "asus",
  "asus rog": "asus",
  acer: "acer",
  lenovo: "lenovo",
  dell: "dell",
  hp: "hp",
  "hewlett-packard": "hp",
  msi: "msi",
  microsoft: "microsoft",
  toshiba: "toshiba",
  panasonic: "panasonic",
  sharp: "sharp",
  bosch: "bosch",
  siemens: "siemens",
  vestel: "vestel",
  // Beko / Arçelik / Michelin / etc. → manual Wikimedia marks (see brandMarks.manual.ts)
  "caterpillar": "caterpillar",
  cat: "caterpillar",
  volvo: "volvo",
  hitachi: "hitachi",
  jcb: "jcb",
  case: "caseih",
  "case ih": "caseih",
  newholland: "newholland",
  "new holland": "newholland",
  john: "johndeere",
  "john deere": "johndeere",
  nike: "nike",
  adidas: "adidas",
  puma: "puma",
  reebok: "reebok",
  underarmour: "underarmour",
  "under armour": "underarmour",
  nikon: "nikon",
  fujifilm: "fujifilm",
  dji: "dji",
  bose: "bose",
  jbl: "jbl",
  "harman kardon": "harmankardon",
  // Alpine car brand must NEVER map to alpinelinux — handled by manual mark or fallback
  shoel: "shoei",
  shoei: "shoei",
  agv: "agv",
  arai: "arai",
  hisense: "hisense",
  "grundig": "grundig",
  "profilo": "profilo",
  "altus": "altus",
  "regal": "regal",
  "amazon fire": "amazon",
  "amazon": "amazon",
  "nintendo switch": "nintendoswitch",
  "steam deck": "steamdeck",
  "rockstar games": "rockstargames",
  ubisoft: "ubisoft",
  "ea sports": "ea",
  "the north face": "thenorthface",
  "bluetooth hoparlör": "bluetooth",
  "bluetooth kulaklık": "bluetooth",
  drone: "drone",
  "raspberry pi": "raspberrypi",
  arduino: "arduino",
  corsair: "corsair",
  steelseries: "steelseries",
  hyperx: "hyperx",
  sennheiser: "sennheiser",
  fluke: "fluke",
  tamiya: "tamiya",
  dior: "dior",
  pandora: "pandora",
};

function fold(s: string) {
  // TR locale turns ASCII "I" into "ı" (MSI→msı). Normalize ı→i for brand keys.
  return s
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’`]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function slugify(s: string) {
  return fold(s).replace(/\s+/g, "");
}

function collectShoppingBrands(): string[] {
  const out = new Set<string>();
  for (const g of [...shoppingCategories, ...otherCategories]) {
    for (const leaf of g.subCategories ?? []) {
      for (const b of leaf.brands ?? []) out.add(b);
    }
  }
  return [...out];
}

function collectAllBrands(): string[] {
  const set = new Set<string>();
  const add = (arr: readonly string[] | string[] | undefined) => {
    for (const b of arr ?? []) if (b?.trim()) set.add(b.trim());
  };
  add(VEHICLE_BRANDS.map((b) => b.name));
  add(PHONE_BRANDS);
  add(MACHINE_BRANDS);
  add(COMPUTER_BRANDS);
  add(WATCH_BRANDS);
  add(CAMERA_BRANDS);
  add(TV_BRANDS);
  add(APPLIANCE_BRANDS);
  add(PART_BRANDS);
  add(TIRE_BRANDS);
  add(AUDIO_BRANDS);
  add(HELMET_BRANDS);
  add(MOTO_GEAR_BRANDS);
  add(AUTO_ACC_BRANDS);
  // Shopping "brands" arrays often hold product types; only keep resolvable / brand-like labels.
  for (const b of collectShoppingBrands()) {
    if (resolveAny(b)) set.add(b);
    else {
      const head = b.split("(")[0]?.trim() ?? "";
      if (head && resolveAny(head)) set.add(b);
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b, "tr"));
}

/** Load manual Wikimedia / handcrafted file marks (run optimize-manual-brand-marks.ts first). */
function loadManual(): Record<string, { title: string; hex: string; file: string }> {
  const p = path.join(process.cwd(), "src", "data", "brandMarks.manual.json");
  if (!fs.existsSync(p)) return {};
  return JSON.parse(fs.readFileSync(p, "utf8")) as Record<string, { title: string; hex: string; file: string }>;
}

const MANUAL = loadManual();

function resolveSiSlug(label: string): string | null {
  const f = fold(label);
  // Never resolve Alpine (cars) via SI — alpinelinux would be wrong.
  if (f === "alpine" || slugify(label) === "alpine") return null;
  if (ALIASES[f]) return ALIASES[f];
  const compact = slugify(label);
  if (ALIASES[compact]) return ALIASES[compact];
  if (bySlug.has(compact)) return compact;
  const first = f.split(" ")[0];
  if (ALIASES[first]) return ALIASES[first];
  if (bySlug.has(first)) return first;
  return null;
}

function resolveManualSlug(label: string): string | null {
  const compact = slugify(label);
  const f = fold(label);
  const candidates = [compact, f.replace(/\s+/g, ""), f.split(" ")[0] ?? ""];
  for (const c of candidates) {
    if (c && MANUAL[c]) return c;
  }
  return null;
}

function resolveAny(label: string): boolean {
  const si = resolveSiSlug(label);
  if (si && bySlug.has(si)) return true;
  return Boolean(resolveManualSlug(label));
}

const brands = collectAllBrands();
const marks: Record<string, { title: string; hex: string; path: string }> = {};
const aliasOut: Record<string, string> = { ...ALIASES };
const missing: string[] = [];
const foundSi: string[] = [];
const foundManual: string[] = [];

for (const label of brands) {
  const siSlug = resolveSiSlug(label);
  const ic = siSlug ? bySlug.get(siSlug) : undefined;
  if (ic) {
    foundSi.push(label);
    marks[ic.slug] = { title: ic.title, hex: ic.hex, path: ic.path };
    aliasOut[fold(label)] = ic.slug;
    aliasOut[slugify(label)] = ic.slug;
    continue;
  }
  const manSlug = resolveManualSlug(label);
  if (manSlug && MANUAL[manSlug]) {
    foundManual.push(label);
    aliasOut[fold(label)] = `manual:${manSlug}`;
    aliasOut[slugify(label)] = `manual:${manSlug}`;
    continue;
  }
  missing.push(label);
}

const outDir = path.join(process.cwd(), "src", "data");
const outFile = path.join(outDir, "brandMarks.generated.ts");
const reportFile = path.join(process.cwd(), "docs", "brand-marks-coverage.md");

const body = `/* eslint-disable */
/** Auto-generated by scripts/build-brand-marks.ts — do not edit by hand. */
export const BRAND_MARK_ALIASES: Record<string, string> = ${JSON.stringify(aliasOut, null, 2)};

export const BRAND_MARKS: Record<string, { title: string; hex: string; path: string }> = ${JSON.stringify(marks, null, 2)};
`;

fs.writeFileSync(outFile, body, "utf8");

const covered = foundSi.length + foundManual.length;
const report = `# Brand mark coverage

Generated: ${new Date().toISOString()}

- Catalog brands scanned: **${brands.length}**
- With logo (Simple Icons + manual): **${covered}** (${((covered / brands.length) * 100).toFixed(1)}%)
  - Simple Icons (CC0): **${foundSi.length}**
  - Manual (Wikimedia PD-textlogo / simplified ID marks): **${foundManual.length}**
- Missing (letter fallback): **${missing.length}**
- Unique Simple Icons SVG paths: **${Object.keys(marks).length}**
- Unique manual SVG files: **${Object.keys(MANUAL).length}**

## Priority brands (requested)

| Brand | Status |
|-------|--------|
| Togg | ${resolveAny("Togg") ? "logo" : "fallback"} |
| BYD | ${resolveAny("BYD") ? "logo" : "fallback"} |
| Chery | ${resolveAny("Chery") ? "logo" : "fallback"} |
| Yamaha | ${resolveAny("Yamaha") ? "logo (SI Yamaha Motor)" : "fallback"} |
| Arçelik | ${resolveAny("Arçelik") ? "logo" : "fallback"} |
| Beko | ${resolveAny("Beko") ? "logo" : "fallback"} |
| Abarth | ${resolveAny("Abarth") ? "logo" : "fallback"} |
| Alpine | ${resolveAny("Alpine") ? "logo (cars — not Alpine Linux)" : "fallback"} |
| Hidromek | ${resolveAny("Hidromek") ? "logo" : "fallback"} |
| Michelin | ${resolveAny("Michelin") ? "logo" : "fallback"} |
| Bridgestone | ${resolveAny("Bridgestone") ? "logo" : "fallback"} |
| Goodyear | ${resolveAny("Goodyear") ? "logo" : "fallback"} |
| DJI | ${resolveAny("DJI") ? "logo" : "fallback"} |
| Realme | ${resolveAny("Realme") ? "logo" : "fallback"} |
| MSI | ${resolveAny("MSI") ? "logo" : "fallback"} |
| Komatsu | ${resolveAny("Komatsu") ? "logo" : "fallback"} |
| Liebherr | ${resolveAny("Liebherr") ? "logo" : "fallback"} |

## Missing brands

${missing.map((m) => `- ${m}`).join("\n") || "_none_"}

## Covered (Simple Icons)

${foundSi.map((m) => `- ${m}`).join("\n")}

## Covered (manual files)

${foundManual.map((m) => `- ${m}`).join("\n")}

## Manual batch sources & licensing (2026-10-18)

PD-textlogo / PD-shape clears **copyright** only; Commons tags many as **Trademarked**.
Used nominatively in filters/forms. See also \`docs/brand-marks-sources.md\`.

| Slug | Brand | Source basis |
|------|-------|--------------|
| agv | AGV | Commons \`Agv motorsports logo.svg\` (PD-textlogo + Trademarked) |
| alpinestars | Alpinestars | Commons \`Alpinestars logo.svg\` (PD-textlogo + Trademarked) |
| anker | Anker | Official Innovations wordmark (Commons-cited PD-textlogo source) |
| continental | Continental | Commons \`Continental wordmark.svg\` (PD-textlogo + Trademarked) |
| daihatsu | Daihatsu | Commons \`Daihatsu symbol.svg\` (PD-shape + Trademarked) |
| dodge | Dodge | Commons \`Dodge black logo.svg\` (PD-textlogo + Trademarked) |
| focal | Focal | Commons \`Focal logo.svg\` (PD-shape + Trademarked) |
| olympus | Olympus | Commons \`Olympus Corporation logo.svg\` (PD-textlogo + Trademarked) |
| osram | Osram | Commons \`Osram Logo.svg\` (PD-textlogo + Trademarked) |
| pirelli | Pirelli | Commons \`Pirelli - logo black (Italy, 1970).svg\` (PD-textlogo + Trademarked) |
| saab | Saab | Commons \`Saab wordmark blue.svg\` (PD-textlogo + Trademarked) |
| seiko | Seiko | Commons \`Seiko logo.svg\` (PD-textlogo + Trademarked) |
| skf | SKF | Commons \`SKF logo.svg\` (PD-textlogo; cleaned broken xlink uses) |
| thule | Thule | Commons \`Thule Group Logo.svg\` (PD-textlogo + Trademarked) |

**Intentionally not mapped:** Alfa Romeo (model wordmarks only), GMC (wrong Commons file risk),
Fabrikasyon / Orijinal (generic labels), and other missing brands listed above.
`;

fs.mkdirSync(path.dirname(reportFile), { recursive: true });
fs.writeFileSync(reportFile, report, "utf8");

console.log(`Wrote ${outFile}`);
console.log(`Wrote ${reportFile}`);
console.log(`si=${foundSi.length} manual=${foundManual.length} missing=${missing.length} marks=${Object.keys(marks).length}`);
