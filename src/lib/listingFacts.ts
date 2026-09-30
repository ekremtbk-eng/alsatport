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
  return spec(listing, "Kimden") || (listing.vip ? "Mağazadan" : "Sahibinden");
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
  rows.push({ label: t("list.fact.from"), value: kimdenOf(listing) });
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
  rows.push({ label: t("list.fact.from"), value: kimdenOf(listing) });
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
  rows.push({ label: t("list.fact.from"), value: kimdenOf(listing) });
  const used = spec(listing, "Çıkma Yedek Parça", "Çıkma");
  if (used) rows.push({ label: t("list.fact.used"), value: used });
  const cond = spec(listing, "Durumu", "Durum");
  if (cond) rows.push({ label: t("list.fact.cond"), value: cond });
  return rows;
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
