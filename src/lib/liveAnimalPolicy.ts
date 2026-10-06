import type { Listing } from "@/data/store";

export const ALLOWED_PET_CATEGORY_IDS = [
  "pets",
  "pets-acc",
  "pets-food",
  "pets-cage",
  "pets-leash",
  "pets-tank",
  "pets-care",
] as const;

export const BANNED_LIVE_ANIMAL_CATEGORY_IDS = [
  "pets-home",
  "pets-fish",
  "pets-poultry",
  "pets-cattle",
  "pets-sheep",
  "pets-sea",
] as const;

export const BANNED_LIVE_ANIMAL_SLUGS = [
  "evcil-hayvanlar",
  "akvaryum-baliklari",
  "kumes-hayvanlari",
  "buyukbas",
  "kucukbas",
  "deniz-canlilari",
] as const;

export type ModerationHit = {
  blocked: boolean;
  reason?: "mod.animal" | "mod.animal.video" | "mod.animal.cat";
};

const ACCESSORY = [
  "mama",
  "yem",
  "kuru mama",
  "yas mama",
  "tasma",
  "kayis",
  "gezdirme",
  "kafes",
  "kulube",
  "tasima cantasi",
  "akvaryum",
  "filtre",
  "hava motoru",
  "isitici",
  "kum",
  "tuvalet",
  "tirmalama",
  "oyuncak",
  "mama kabi",
  "suluk",
  "sampuan",
  "bakim",
  "tirnak",
  "yatak",
  "minder",
  "dispenser",
  "collar",
  "leash",
  "cage",
  "kennel",
  "aquarium",
  "feeder",
  "litter",
  "harness",
];

const SPECIES = [
  "kedi",
  "kopek",
  "koyun",
  "inek",
  "dana",
  "kuzu",
  "duve",
  "buzagi",
  "koc",
  "keci",
  "at",
  "tayi",
  "esek",
  "katir",
  "deve",
  "kus",
  "papagan",
  "muhabbet",
  "kanarya",
  "tavuk",
  "horoz",
  "hindi",
  "ordek",
  "kaz",
  "civciv",
  "hamster",
  "tavsan",
  "iguana",
  "yilan",
  "balik",
  "beta",
  "japon balik",
  "pitbull",
  "golden",
  "yorkshire",
  "sokak kedisi",
  "sokak kopegi",
];

const LIVE_SALE = [
  "canli hayvan",
  "canli kedi",
  "canli kopek",
  "satilik kedi",
  "satilik kopek",
  "satilik kus",
  "satilik tavuk",
  "satilik inek",
  "satilik koyun",
  "satilik kuzu",
  "satilik at",
  "yavru kedi",
  "yavru kopek",
  "yavru kus",
  "damizlik",
  "ciftlestirme",
  "ucretli sahiplendirme",
  "sahiplendirme ucret",
  "canli teslim",
  "kumes hayvan",
  "buyukbas",
  "kucukbas",
  "deniz canli",
  "akvaryum balik",
  "evcil hayvan sat",
  "hayvan satisi",
  "hayvan satilik",
  "live animal",
  "puppy for sale",
  "kitten for sale",
  "for sale puppy",
  "for sale kitten",
];

const SALE_HINT = [
  "satilik",
  "satiyorum",
  "satilir",
  "teslim yavru",
  "damizlik",
  "canli teslim",
  "ucretli sahiplendirme",
];

const VIDEO_HINT = [".mp4", ".mov", ".webm", ".avi", ".mkv", "video/", "canli yayin", "reels", "tiktok"];

export function foldPolicyText(value: string) {
  return value
    .toLocaleLowerCase("tr")
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9.\s_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Live-animal rules apply only to Hayvanlar Alemi IDs (`pets`, `pets-*`), never by name. */
export function isPetsCategoryId(categoryId: string) {
  const id = categoryId.trim();
  if (!id) return false;
  if (ALLOWED_PET_CATEGORY_IDS.includes(id as (typeof ALLOWED_PET_CATEGORY_IDS)[number])) return true;
  if (BANNED_LIVE_ANIMAL_CATEGORY_IDS.includes(id as (typeof BANNED_LIVE_ANIMAL_CATEGORY_IDS)[number])) {
    return true;
  }
  return id === "pets" || id.startsWith("pets-");
}

export type ListingPolicyKind = "live-animal";

export function applicableListingPolicies(categoryId: string): ListingPolicyKind[] {
  return isPetsCategoryId(categoryId) ? ["live-animal"] : [];
}

export function isBannedLiveAnimalCategory(categoryId: string) {
  return BANNED_LIVE_ANIMAL_CATEGORY_IDS.includes(
    categoryId as (typeof BANNED_LIVE_ANIMAL_CATEGORY_IDS)[number],
  );
}

export function isBannedLiveAnimalSlug(slug: string) {
  return BANNED_LIVE_ANIMAL_SLUGS.includes(slug as (typeof BANNED_LIVE_ANIMAL_SLUGS)[number]);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Whole-token match so "at" (horse) cannot fire inside "satılık" / "fiyat". */
function hasToken(hay: string, needle: string) {
  const n = needle.trim();
  if (!n) return false;
  if (n.includes(" ")) return hay.includes(n);
  return new RegExp(`(?:^|[^a-z0-9])${escapeRegExp(n)}(?:$|[^a-z0-9])`).test(hay);
}

function hasAny(hay: string, needles: string[]) {
  return needles.some((n) => hasToken(hay, n));
}

function detectInText(text: string, categoryId: string): ModerationHit {
  if (!applicableListingPolicies(categoryId).includes("live-animal")) {
    return { blocked: false };
  }

  const hay = foldPolicyText(text);
  if (!hay) return { blocked: false };

  if (hasAny(hay, VIDEO_HINT) && (hasAny(hay, SPECIES) || hasAny(hay, LIVE_SALE))) {
    return { blocked: true, reason: "mod.animal.video" };
  }

  const accessory = hasAny(hay, ACCESSORY);
  const species = hasAny(hay, SPECIES);
  const sale = hasAny(hay, SALE_HINT);

  if (hasAny(hay, ["canli hayvan", "damizlik", "ucretli sahiplendirme", "hayvan satisi", "hayvan satilik"])) {
    return { blocked: true, reason: "mod.animal" };
  }

  if (accessory && !hasAny(hay, ["canli teslim", "damizlik", "yavru sat"])) {
    return { blocked: false };
  }

  if (hasAny(hay, LIVE_SALE) || (species && sale)) {
    return { blocked: true, reason: "mod.animal" };
  }

  if (species && !accessory) {
    return { blocked: true, reason: "mod.animal" };
  }

  return { blocked: false };
}

export function moderateListingMaterial(file: File, categoryId = ""): ModerationHit {
  const video = file.type.startsWith("video/") || /\.(mp4|mov|webm|avi|mkv)$/i.test(file.name);
  if (video) {
    if (!applicableListingPolicies(categoryId).includes("live-animal")) return { blocked: false };
    return { blocked: true, reason: "mod.animal.video" };
  }
  return detectInText(file.name, categoryId);
}

export function moderateListingDraft(input: {
  title?: string;
  description?: string;
  categoryId?: string;
  images?: string[];
  filenames?: string[];
}): ModerationHit {
  const categoryId = input.categoryId ?? "";
  if (isBannedLiveAnimalCategory(categoryId)) {
    return { blocked: true, reason: "mod.animal.cat" };
  }
  if (!applicableListingPolicies(categoryId).includes("live-animal")) {
    return { blocked: false };
  }

  const images = input.images ?? [];
  if (images.some((src) => src.startsWith("data:video") || /\.(mp4|mov|webm|avi|mkv)(\?|$)/i.test(src))) {
    return { blocked: true, reason: "mod.animal.video" };
  }

  const blob = [input.title, input.description, ...(input.filenames ?? [])].filter(Boolean).join(" \n ");
  return detectInText(blob, categoryId);
}

export function isBlockedLiveAnimalListing(
  listing: Pick<Listing, "title" | "description" | "categoryId" | "images" | "subtitle">,
) {
  return moderateListingDraft({
    title: `${listing.title} ${listing.subtitle ?? ""}`,
    description: listing.description,
    categoryId: listing.categoryId,
    images: listing.images,
  }).blocked;
}
