import { findCategory, parentOf } from "@/data/categories";
import { motoGearProductFromId, partsVehicleTypeFromId, schemaForCategoryId } from "@/data/listingSchema";
import { isSeaEquipCategoryId } from "@/data/seaEquip";
import type { Listing } from "@/data/store";

export type FactRow = { label: string; value: string };

function spec(listing: Listing, ...labels: string[]) {
  const set = new Set(labels.map((l) => l.toLocaleLowerCase("tr")));
  return listing.specs.find((s) => set.has(s.label.toLocaleLowerCase("tr")))?.value;
}

export function listingCategoryChain(categoryId: string) {
  const cat = findCategory(categoryId);
  if (!cat) return [];
  const chain = [cat];
  let walk = cat;
  for (let i = 0; i < 8; i++) {
    const p = parentOf(walk);
    if (!p) break;
    chain.unshift(p);
    walk = p;
  }
  return chain;
}

function kimdenOf(listing: Listing) {
  return spec(listing, "Kimden");
}

function motoClassifiedFactRows(
  listing: Listing,
  t: (key: string, vars?: Record<string, string | number>) => string,
): FactRow[] {
  const cat = findCategory(listing.categoryId);
  const chain = listingCategoryChain(listing.categoryId);
  const hub = chain.find((c) => c.id === "parts-moto");
  const group = chain.find((c) => c.parentId === "parts-moto");
  const product =
    motoGearProductFromId(listing.categoryId) ||
    spec(listing, "Ürün") ||
    (cat && cat.parentId === "parts-moto-gear" ? cat.name : undefined);
  const rows: FactRow[] = [
    { label: t("list.no"), value: listing.listingNo || listing.id },
    { label: t("list.posted"), value: listing.createdAt },
    { label: t("list.fact.cat"), value: hub?.name ?? "Motosiklet Ekipmanları" },
  ];
  if (group) rows.push({ label: t("list.fact.group"), value: group.name });
  if (product) rows.push({ label: t("list.fact.product"), value: product });
  const kind = spec(listing, "Türü");
  if (kind) rows.push({ label: t("list.fact.kind"), value: kind });
  const brand = spec(listing, "Marka");
  if (brand) rows.push({ label: t("list.fact.brand"), value: brand });
  const size = spec(listing, "Ölçü", "Beden");
  if (size) rows.push({ label: t("list.fact.size"), value: size });
  const from = kimdenOf(listing);
  if (from) rows.push({ label: t("list.fact.from"), value: from });
  const swap = spec(listing, "Takas");
  if (swap) rows.push({ label: t("flt.swap"), value: swap });
  const cond = spec(listing, "Durumu", "Durum");
  if (cond) rows.push({ label: t("list.fact.cond"), value: cond });
  return rows;
}

function seaClassifiedFactRows(
  listing: Listing,
  t: (key: string, vars?: Record<string, string | number>) => string,
): FactRow[] {
  const chain = listingCategoryChain(listing.categoryId);
  const hub = chain.find((c) => c.id === "parts-sea");
  const group = chain.find((c) => c.parentId === "parts-sea");
  const rows: FactRow[] = [
    { label: t("list.no"), value: listing.listingNo || listing.id },
    { label: t("list.posted"), value: listing.createdAt },
    { label: t("list.fact.cat"), value: hub?.name ?? "Deniz Aracı Ekipmanları" },
  ];
  if (group) rows.push({ label: t("list.fact.group"), value: group.name });
  const product = spec(listing, "Ürün");
  if (product) rows.push({ label: t("list.fact.product"), value: product });
  const brand = spec(listing, "Marka");
  if (brand) rows.push({ label: t("list.fact.brand"), value: brand });
  const from = kimdenOf(listing);
  if (from) rows.push({ label: t("list.fact.from"), value: from });
  const swap = spec(listing, "Takas");
  if (swap) rows.push({ label: t("flt.swap"), value: swap });
  const cond = spec(listing, "Durumu", "Durum");
  if (cond) rows.push({ label: t("list.fact.cond"), value: cond });
  return rows;
}

export function classifiedFactRows(
  listing: Listing,
  t: (key: string, vars?: Record<string, string | number>) => string,
): FactRow[] {
  if (isSeaEquipCategoryId(listing.categoryId)) return seaClassifiedFactRows(listing, t);
  if (listing.categoryId.startsWith("parts-moto")) return motoClassifiedFactRows(listing, t);

  const cat = findCategory(listing.categoryId);
  const chain = listingCategoryChain(listing.categoryId);
  const spare = chain.find((c) => c.id === "parts-auto-spare") ?? chain.find((c) => c.id.includes("spare"));
  const leaf = cat && cat.id !== spare?.id ? cat : undefined;
  const tipi =
    partsVehicleTypeFromId(listing.categoryId) ||
    spec(listing, "Tipi") ||
    (leaf && leaf.parentId === "parts-auto-spare" ? leaf.name : undefined);
  const kategori = spare?.name ?? chain[1]?.name ?? cat?.name ?? "Yedek Parça";

  const rows: FactRow[] = [
    { label: t("list.no"), value: listing.listingNo || listing.id },
    { label: t("list.posted"), value: listing.createdAt },
    { label: t("list.fact.cat"), value: kategori },
  ];
  if (tipi) rows.push({ label: t("list.fact.type"), value: tipi });
  const product = spec(listing, "Ürün");
  if (product) rows.push({ label: t("list.fact.product"), value: product });
  const vehicleBrand = spec(listing, "Araç Markası", "Uyumlu", "Marka");
  if (vehicleBrand) rows.push({ label: t("list.fact.vbrand"), value: vehicleBrand });
  const series = spec(listing, "Araç Serisi", "Seri", "Model");
  if (series) rows.push({ label: t("list.fact.vseries"), value: series });
  const partBrand = spec(listing, "Ürün Markası");
  if (partBrand) rows.push({ label: t("list.fact.pbrand"), value: partBrand });
  const from = kimdenOf(listing);
  if (from) rows.push({ label: t("list.fact.from"), value: from });
  const used = spec(listing, "Çıkma Yedek Parça", "Çıkma");
  if (used) rows.push({ label: t("list.fact.used"), value: used });
  const cond = spec(listing, "Durumu", "Durum");
  if (cond) rows.push({ label: t("list.fact.cond"), value: cond });
  return rows;
}

/** Labels tried first per schema family; the rest of the category schema fills remaining slots in field order. */
const FACT_PRIORITY: Record<string, string[]> = {
  vasita: ["Km", "Yıl", "Yakıt", "Motor gücü", "Motor hacmi", "Batarya", "Menzil", "Vites", "Saat"],
  emlak: ["m²", "Oda", "Bina yaşı", "Kat", "Isıtma", "İmar durumu"],
  makine: ["Yıl", "Çalışma saati", "Marka", "Yakıt", "Durum"],
  urun: ["Durum", "Durumu", "Marka", "Model", "Ürün", "Hayvan", "Miktar"],
  hizmet: ["Hizmet yeri", "Çalışma", "Yer", "Deneyim", "Garanti", "Yatılı"],
  diger: [
    "Hayvan",
    "Irk",
    "Yaş (ay)",
    "Cinsiyet",
    "Adet",
    "Ders",
    "Seviye",
    "Yer",
    "Çalışma Şekli",
    "Çalışma",
    "Deneyim",
    "Eğitim",
    "Sektör",
  ],
};
/** Never useful in a one-line summary: seller type, swap flags, admin labels or data already shown as location/category. */
const FACT_SKIP = new Set([
  "kimden",
  "takas",
  "lokasyon",
  "konum",
  "kategori",
  "ilan tipi",
  "kat sayısı",
  "net m²",
  "hasar kaydı",
  "renk",
]);
/** Values that mean nothing without their label. */
const FACT_AMBIGUOUS = new Set(["", "-", "—", "0", "undefined", "null", "yok", "var", "evet", "hayır", "belirtilmemiş"]);

function formatFact(label: string, raw: string): string | undefined {
  const value = raw.trim();
  const key = value.toLocaleLowerCase("tr");
  const l = label.toLocaleLowerCase("tr");
  const zeroish = /^0(\s*\(|$)/.test(value);
  if (l === "bina yaşı") {
    if (zeroish) return "Sıfır bina";
    if (/^\d+(-\d+|\+)$/.test(value)) return `${value} yaşında`;
  }
  if (l === "kat" && /^(zemin|giriş|bahçe|çatı)/i.test(value) && !/kat/i.test(value)) return `${value} kat`;
  if (l === "deneyim" && /^(aranmıyor|gerekmiyor)$/i.test(value)) return `Deneyim ${value.toLocaleLowerCase("tr")}`;
  if (zeroish || FACT_AMBIGUOUS.has(key)) return undefined;
  const digitsOnly = /^\d[\d.]*$/.test(value);
  const n = digitsOnly ? Number(value.replace(/\./g, "")) : NaN;
  if (digitsOnly && !(n > 0)) return undefined;
  if (!digitsOnly) return value;
  const grouped = n.toLocaleString("tr-TR");
  if (l === "km" || l === "menzil") return `${grouped} km`;
  if (l.includes("m²")) return `${grouped} m²`;
  if (l === "yaş (ay)") return `${n} ay`;
  if (l === "adet") return `${grouped} adet`;
  if (l === "çalışma saati" || l === "saat") return `${grouped} saat`;
  if (l === "bina yaşı") return `${n} yaşında`;
  if (l === "kat") return `${n}. kat`;
  if (l === "yıl") return value;
  return value;
}

/** Up to `max` short, category-specific facts for compact result rows, from the listing's real specs only. */
export function compactListingFacts(listing: Listing, max = 5): string[] {
  const schema = schemaForCategoryId(listing.categoryId);
  const byLabel = new Map<string, string>();
  for (const s of listing.specs ?? []) {
    const k = s.label?.trim().toLocaleLowerCase("tr");
    if (k && s.value != null && !byLabel.has(k)) byLabel.set(k, String(s.value));
  }
  const title = listing.title.toLocaleLowerCase("tr");
  const order = [
    ...(FACT_PRIORITY[schema.family] ?? []),
    ...schema.fields.map((f) => f.specLabel),
    ...(listing.specs ?? []).map((s) => s.label),
  ];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const label of order) {
    const k = label?.trim().toLocaleLowerCase("tr");
    if (!k || seen.has(k) || FACT_SKIP.has(k)) continue;
    seen.add(k);
    const raw = byLabel.get(k);
    if (raw == null) continue;
    if ((k === "marka" || k === "model") && title.includes(raw.trim().toLocaleLowerCase("tr"))) continue;
    const text = formatFact(label, raw);
    if (!text || text.length > 40 || out.includes(text)) continue;
    out.push(text);
    if (out.length >= max) break;
  }
  return out;
}

export function classifiedFeatureItems(listing: Listing) {
  const schema = schemaForCategoryId(listing.categoryId);
  const allowed = new Set(schema.groups.flatMap((g) => g.items));
  return (listing.features ?? []).filter((item) => allowed.has(item));
}

export function isClassifiedPartsListing(categoryId: string) {
  return (
    categoryId === "parts-auto-spare" ||
    categoryId.startsWith("parts-auto-spare-") ||
    categoryId === "parts-moto" ||
    categoryId.startsWith("parts-moto-") ||
    isSeaEquipCategoryId(categoryId)
  );
}
