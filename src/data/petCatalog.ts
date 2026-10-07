import { PRODUCT_CONDITIONS } from "@/data/listingOptions";
import { isLivestockCategoryId, isPetsCategoryId } from "@/lib/liveAnimalPolicy";

/**
 * Hayvanlar Alemi has two listing kinds, decided by the category id alone:
 * live farm animals under `pets-farm`, and products/equipment everywhere else under `pets`.
 * The listing form, search filters and the create/update API all read from here.
 */
export type PetListingKind = "livestock" | "product";
export type PetProductBranch = "food" | "cage" | "leash" | "tank" | "care" | "acc";
export type LivestockGroup = "cattle" | "sheep" | "poultry";

export const PET_SPEC = {
  animal: "Hayvan",
  breed: "Irk",
  age: "Yaş (ay)",
  sex: "Cinsiyet",
  qty: "Adet",
  product: "Ürün",
  brand: "Marka",
  amount: "Miktar",
  cond: "Durum",
  from: "Kimden",
} as const;

export const LIVESTOCK_AGE_MAX_MONTHS = 360;
export const LIVESTOCK_QTY_MAX = 10_000;
export const LIVESTOCK_SEXES = ["Dişi", "Erkek", "Karışık"];
export const LIVESTOCK_FROM = ["Sahibinden", "Çiftlikten / Üreticiden"];
export const PET_PRODUCT_FROM = ["Sahibinden", "Mağazadan"];

const LIVESTOCK_SPECIES: Record<LivestockGroup, string[]> = {
  cattle: ["İnek", "Düve", "Dana", "Tosun", "Boğa", "Buzağı", "Manda", "Öküz"],
  sheep: ["Koyun", "Koç", "Kuzu", "Keçi", "Teke", "Oğlak"],
  poultry: ["Tavuk", "Horoz", "Civciv", "Hindi", "Ördek", "Kaz", "Bıldırcın"],
};

const LIVESTOCK_BREEDS: Record<LivestockGroup, string[]> = {
  cattle: [
    "Holstein",
    "Simental",
    "Montofon (Esmer)",
    "Jersey",
    "Angus",
    "Şarole",
    "Limuzin",
    "Hereford",
    "Yerli Kara",
    "Doğu Anadolu Kırmızısı",
    "Boz Irk",
    "Anadolu Mandası",
  ],
  sheep: [
    "Merinos",
    "Kıvırcık",
    "Akkaraman",
    "Morkaraman",
    "İvesi",
    "Sakız",
    "Romanov",
    "Karayaka",
    "Dağlıç",
    "Saanen",
    "Kıl Keçisi",
    "Ankara Keçisi",
    "Kilis Keçisi",
    "Malta Keçisi",
    "Honamlı",
  ],
  poultry: [
    "Atak-S",
    "Lohmann",
    "Brahma",
    "Sussex",
    "Leghorn",
    "Denizli",
    "Gerze",
    "Bronz Hindi",
    "Beyaz Hindi",
    "Pekin Ördeği",
    "Toulouse Kazı",
    "Japon Bıldırcını",
  ],
};

const BREED_FALLBACK = ["Melez", "Diğer"];

/** "Which animal is this product for" — kept identical to the vocabulary already stored on listings. */
export const PET_PRODUCT_ANIMALS = ["Kedi", "Köpek", "Kuş", "Balık", "Kemirgen", "Sürüngen", "At", "Diğer"];

const PET_PRODUCT_TYPES: Record<PetProductBranch, string[]> = {
  food: ["Kuru Mama", "Yaş Mama", "Ödül Maması", "Vitamin & Takviye", "Yem & Tohum Karışımı", "Diğer"],
  cage: ["Kafes", "Kulübe", "Kedi Evi", "Taşıma Kafesi", "Kümes", "Diğer"],
  leash: ["Tasma", "Göğüs Tasması", "Gezdirme Kayışı", "Taşıma Çantası", "Ağızlık", "Diğer"],
  tank: ["Akvaryum", "Filtre", "Isıtıcı", "Aydınlatma", "Hava Motoru", "Dekor & Kum", "Diğer"],
  care: ["Şampuan & Sabun", "Kedi Kumu", "Tarak & Fırça", "Tırnak Bakımı", "Çiş Pedi", "Diğer"],
  acc: ["Oyuncak", "Yatak & Minder", "Mama Kabı & Suluk", "Tırmalama", "Giyim", "Diğer"],
};

export const PET_FOOD_AMOUNTS = ["0-1 kg", "1-5 kg", "5-10 kg", "10-20 kg", "20+ kg"];

export function petListingKind(categoryId: string): PetListingKind | null {
  if (!isPetsCategoryId(categoryId)) return null;
  return isLivestockCategoryId(categoryId) ? "livestock" : "product";
}

export function livestockGroupOf(categoryId: string): LivestockGroup | null {
  if (categoryId.startsWith("pets-farm-cattle")) return "cattle";
  if (categoryId.startsWith("pets-farm-sheep")) return "sheep";
  if (categoryId.startsWith("pets-farm-poultry")) return "poultry";
  return null;
}

function groupsFor(categoryId: string): LivestockGroup[] {
  const group = livestockGroupOf(categoryId);
  return group ? [group] : ["cattle", "sheep", "poultry"];
}

export function livestockSpeciesFor(categoryId: string) {
  return groupsFor(categoryId).flatMap((g) => LIVESTOCK_SPECIES[g]);
}

export function livestockBreedsFor(categoryId: string) {
  return [...groupsFor(categoryId).flatMap((g) => LIVESTOCK_BREEDS[g]), ...BREED_FALLBACK];
}

export function petProductBranch(categoryId: string): PetProductBranch | null {
  if (categoryId.startsWith("pets-food")) return "food";
  if (categoryId.startsWith("pets-cage")) return "cage";
  if (categoryId.startsWith("pets-leash")) return "leash";
  if (categoryId.startsWith("pets-tank")) return "tank";
  if (categoryId.startsWith("pets-care")) return "care";
  if (categoryId.startsWith("pets-acc")) return "acc";
  return null;
}

export function petProductTypesFor(branch: PetProductBranch | null) {
  return branch ? PET_PRODUCT_TYPES[branch] : [];
}

/** Consumables have no meaningful second-hand state; hygiene items only new or lightly used. */
export function petConditionsFor(branch: PetProductBranch | null): string[] | null {
  if (branch === "food") return null;
  if (branch === "care") return ["Sıfır", "Az Kullanılmış"];
  return PRODUCT_CONDITIONS;
}

/** Leaf branches already name the animal (e.g. `pets-food-cat`), so the form does not ask again. */
export function petProductAnimalFixed(categoryId: string): string | null {
  if (categoryId.endsWith("-cat")) return "Kedi";
  if (categoryId.endsWith("-dog")) return "Köpek";
  if (categoryId.endsWith("-bird")) return "Kuş";
  if (categoryId.endsWith("-fish")) return "Balık";
  return null;
}

export function petProductAsksAnimal(categoryId: string) {
  return petProductBranch(categoryId) !== "tank" && !petProductAnimalFixed(categoryId);
}
