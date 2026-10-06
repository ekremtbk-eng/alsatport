import type { Category } from "@/data/categories";
import { rootOf } from "@/data/categories";
import { extraBrandsFor, extraModelsFor } from "@/data/categoryFiles";
import {
  AIRCRAFT_TYPES,
  AUTO_PART_PRODUCTS,
  BATHS,
  BERTHS,
  BUILDING_AGES,
  CAMERA_TYPES,
  CLASSIFIED_SHOP_OPTS,
  COLORS,
  CONNECTIVITY,
  CYLINDERS,
  COOLING_TYPES,
  DAMAGE_KINDS,
  DAMAGE_RECORDS,
  DASHCAM_BRANDS,
  DASHCAM_CH,
  DASHCAM_RES,
  DEAL_TYPES,
  DEAL_TYPES_OFFICE,
  DEED_STATUS,
  FAST_CHARGE,
  FASHION_GENDER,
  FASHION_SIZES,
  FLOOR_COUNTS,
  FURNISHED_YN,
  FUELS,
  GEARS,
  GVW,
  HEATING,
  HELMET_BRANDS,
  HELMET_TYPES,
  JOB_EDUCATION,
  JOB_EXPERIENCE_LEVELS,
  JOB_PLACES,
  JOB_WORK_MODES,
  LISTING_FROM,
  MACHINE_BRANDS,
  MOTO_BOOT_SIZES,
  MOTO_GEAR_BRANDS,
  PART_BRANDS,
  PART_FROM,
  PAYLOADS,
  PRODUCT_CONDITIONS,
  RENT_PERIODS,
  ROOMS,
  SEA_EQUIP_BRANDS,
  STORAGES,
  SWAP_YN,
  TIRE_BRANDS,
  TIRE_SIZES,
  TRACTOR_TYPES,
  USAGE_STATUS,
  USED_PART,
  YEARS,
  ZONING,
  bodiesOfModel,
  brandNamesForSegment,
  enginesOfModel,
  isSeaEquipCategoryId,
  modelsOfBrand,
  packagesOfModel,
  rangesOfModel,
  seaEquipGroupById,
  seaEquipProductsFor,
  vehicleProfileFromCategoryId,
  vehicleSegmentFromCategoryId,
} from "@/data/listingOptions";
import {
  ANTIQUE_ERA,
  BABY_AGE,
  BOOK_LANG,
  CONSOLE_GEN,
  CPU_OPTS,
  GPU_OPTS,
  HELP_EXP,
  HELP_GENDER,
  HELP_LANG,
  JOB_SECTOR,
  MACHINE_FUEL,
  MUSIC_TYPE,
  OS_OPTS,
  RAM_OPTS,
  SCREEN_OPTS,
  SERVICE_EXP,
  SERVICE_PLACE,
  SPORT_SIZE,
  TV_RES,
  TV_SIZES,
  WARRANTY_OPTS,
} from "@/data/filterCatalog";
import { FILTER_ESTATE_FEATURES, FILTER_VEHICLE_FEATURES, motoGearProductFromId, partsVehicleTypeFromId } from "@/data/listingSchema";
import { TUTOR_PLACES, tutorLevelsFor, tutorSubjectsFor } from "@/data/tutorOptions";

const SERVICE_TYPES = ["Keşif", "Montaj", "Tamir", "Nakliye", "Bakım"];
const HELP_TYPES = ["Gündüzlü", "Yatılı", "Tam Zamanlı", "Yarı Zamanlı"];
const PET_KINDS = ["Yem & Mama", "Kafes & Kulübe", "Tasma & Gezdirme", "Akvaryum", "Bakım & Hijyen", "Aksesuar"];

function pick<T>(arr: readonly T[], i: number, fallback?: T): T {
  if (!arr.length) return (fallback as T) ?? ("" as T);
  return arr[i % arr.length]!;
}

function spec(label: string, value: string | number) {
  return { label, value: String(value) };
}

function vehicleBundle(cat: Category, i: number) {
  const segment = vehicleSegmentFromCategoryId(cat.id);
  const brands = brandNamesForSegment(segment);
  const brand = pick(brands, i, "Diğer");
  const models = modelsOfBrand(brand, segment);
  const model = pick(models, i, cat.name);
  const trims = packagesOfModel(brand, model, segment);
  const trim = pick(trims, i, "");
  const engines = enginesOfModel(brand, model, segment);
  const engine = pick(engines, i, "");
  const bodies = bodiesOfModel(brand, model, segment);
  const body = pick(bodies, i, "");
  const ranges = rangesOfModel(brand, model, segment);
  return { segment, brand, model, trim, engine, body, range: pick(ranges, i, ""), year: pick(YEARS, i + 3) };
}

export function specsForListing(
  cat: Category,
  i: number,
  city: string,
  district: string,
  hood: string,
): { label: string; value: string }[] {
  const root = rootOf(cat).id;
  const id = cat.id;

  if (root === "vasita") {
    const profile = vehicleProfileFromCategoryId(id);
    const v = vehicleBundle(cat, i);
    if (profile === "air") {
      return [
        spec("Tip", pick(AIRCRAFT_TYPES, i)),
        spec("Marka", v.brand),
        spec("Model", v.model),
        spec("Yıl", v.year),
        spec("Saat", 120 + i * 40),
        spec("Renk", pick(COLORS, i)),
        spec("Konum", `${city} / ${district}`),
      ];
    }
    const rows = [
      spec("Marka", v.brand),
      spec("Model", v.model),
      spec("Yıl", v.year),
      spec("Renk", pick(COLORS, i)),
      spec("Hasar kaydı", pick(DAMAGE_RECORDS, i)),
      spec("Konum", `${city} / ${district}`),
    ];
    if (v.trim) rows.splice(2, 0, spec("Paket", v.trim));
    if (profile === "ev") {
      if (v.engine) rows.push(spec("Batarya", v.engine));
      if (v.range) rows.push(spec("Menzil", v.range));
      rows.push(spec("Şarj", pick(FAST_CHARGE, i)));
    } else if (profile === "moto" || profile === "atv" || profile === "utv") {
      if (v.engine) rows.push(spec("Motor hacmi", v.engine));
      rows.push(spec("Vites", pick(GEARS, i)));
      rows.push(spec("Km", 8_000 + i * 4_500));
      rows.push(spec("Silindir", pick(CYLINDERS, i)));
      rows.push(spec("Soğutma", pick(COOLING_TYPES, i)));
    } else if (profile === "deniz") {
      if (v.engine) rows.push(spec("Motor", v.engine));
      if (v.body) rows.push(spec("Tekne", v.body));
      rows.push(spec("Durum", pick(PRODUCT_CONDITIONS, i)));
    } else {
      if (v.engine) rows.push(spec("Motor", v.engine));
      if (v.body) rows.push(spec("Kasa", v.body));
      rows.push(spec("Km", 12_000 + i * 9_500));
      rows.push(spec("Yakıt", pick(FUELS, i)));
      rows.push(spec("Vites", pick(GEARS, i)));
      if (!["van", "ticari", "caravan"].includes(profile)) {
        rows.push(spec("Motor gücü", ["110 hp", "136 hp", "150 hp", "184 hp", "190 hp"][i % 5]!));
        rows.push(spec("Çekiş", ["Önden çekiş", "Arkadan itiş", "4WD", "AWD"][i % 4]!));
      }
    }
    if (profile === "van" || profile === "ticari" || profile === "caravan") {
      rows.push(spec("Yük", pick(PAYLOADS, i)));
      rows.push(spec("Azami", pick(GVW, i)));
    }
    if (profile === "caravan") rows.push(spec("Yatak", pick(BERTHS, i)));
    if (profile === "rental") rows.push(spec("Süre", pick(RENT_PERIODS, i)));
    if (profile === "damaged") rows.push(spec("Hasar türü", pick(DAMAGE_KINDS, i)));
    return rows;
  }

  if (root === "emlak") {
    const deal = id.includes("gunluk")
      ? "Turistik Günlük Kiralık"
      : id.includes("devren")
        ? "Devren Satılık Konut"
        : id.includes("kiralik")
          ? pick(DEAL_TYPES_OFFICE, i)
          : pick(DEAL_TYPES, i);
    const sqm = 85 + i * 6;
    const base = [
      spec("Kategori", cat.name),
      spec("İlan tipi", deal),
      spec("Emlak tipi", cat.name),
      spec("m²", sqm),
      spec("Kimden", pick(LISTING_FROM, i)),
      spec("Mahalle", hood),
      spec("Konum", `${city} / ${district} / ${hood}`),
    ];
    if (id.includes("arsa")) {
      return [...base, spec("İmar", pick(ZONING, i))];
    }
    return [
      ...base,
      spec("Oda", pick(ROOMS, i)),
      spec("Net m²", 72 + i * 5),
      spec("Bina yaşı", pick(BUILDING_AGES, i)),
      spec("Kat sayısı", pick(FLOOR_COUNTS, i)),
      spec("Kat", ["1", "2", "3", "4", "5", "Zemin", "Giriş"][i % 7]!),
      spec("Isıtma", pick(HEATING, i)),
      spec("Banyo", pick(BATHS, i)),
      spec("Balkon", i % 4 === 0 ? "Yok" : "Var"),
      spec("Asansör", i % 3 === 0 ? "Yok" : "Var"),
      spec("Otopark", i % 5 === 0 ? "Yok" : "Kapalı Otopark"),
      spec("Eşyalı", pick(FURNISHED_YN, i)),
      spec("Kullanım durumu", pick(USAGE_STATUS, i)),
      spec("Site içerisinde", i % 2 === 0 ? "Evet" : "Hayır"),
      spec("Krediye uygun", i % 3 === 0 ? "Hayır" : "Evet"),
      spec("Tapu durumu", pick(DEED_STATUS, i)),
    ];
  }

  if (root === "shopping") {
    const brands = extraBrandsFor(cat);
    const brand = pick(brands.length ? brands : ["Samsung", "Apple", "Xiaomi"], i);
    const models = extraModelsFor(cat, brand);
    const model = pick(models.length ? models : [cat.name], i);
    const cond = pick(PRODUCT_CONDITIONS, i);
    const rows = [
      spec("Marka", brand),
      spec("Model", model),
      spec("Durum", cond),
      spec("Takas", pick(SWAP_YN, i)),
      spec("Garanti", pick(WARRANTY_OPTS, i)),
      spec("Renk", pick(COLORS, i)),
      spec("Konum", `${city} / ${district}`),
    ];
    if (id.includes("phone") || id === "phones") {
      rows.push(spec("Hafıza", pick(STORAGES, i)), spec("RAM", pick(RAM_OPTS, i)), spec("İşletim sistemi", pick(OS_OPTS, i)));
    }
    if (id.includes("computer") || id.includes("gamer") || id.includes("dizustu") || id.includes("masaustu") || id.includes("tablet")) {
      rows.push(
        spec("İşlemci", pick(CPU_OPTS, i)),
        spec("RAM", pick(RAM_OPTS, i)),
        spec("Ekran kartı", pick(GPU_OPTS, i)),
        spec("Hafıza", pick(STORAGES, i)),
        spec("Ekran", pick(SCREEN_OPTS, i)),
        spec("İşletim sistemi", pick(OS_OPTS, i)),
      );
    }
    if (id.includes("camera") || id.includes("lens")) rows.push(spec("Kamera", pick(CAMERA_TYPES, i)));
    if (id.includes("home-el") || id.includes("goruntu") || id.includes("tech") || id.includes("elektronik")) {
      rows.push(spec("Ekran boyutu", pick(TV_SIZES, i)), spec("Çözünürlük", pick(TV_RES, i)));
    }
    if (id.includes("fashion") || id.includes("giyim") || id.includes("ayakkabi")) {
      rows.push(spec("Cinsiyet", pick(FASHION_GENDER, i)), spec("Beden", pick(FASHION_SIZES, i)));
    }
    if (id.includes("gamer") || id.includes("konsol")) rows.push(spec("Konsol", pick(CONSOLE_GEN, i)));
    if (id.includes("book") || id.includes("kitap") || id.includes("dergi")) rows.push(spec("Dil", pick(BOOK_LANG, i)));
    if (id.includes("music") || id.includes("muzik")) rows.push(spec("Tür", pick(MUSIC_TYPE, i)));
    if (id.includes("sport") || id.includes("fitness") || id.includes("kamp")) rows.push(spec("Beden", pick(SPORT_SIZE, i)));
    if (id.includes("baby") || id.includes("bebek") || id.includes("anne")) rows.push(spec("Yaş", pick(BABY_AGE, i)));
    if (id.includes("antique") || id.includes("antika") || id.includes("koleksiyon") || id.includes("collect")) {
      rows.push(spec("Dönem", pick(ANTIQUE_ERA, i)));
    }
    return rows;
  }

  if (root === "machines") {
    const brands = extraBrandsFor(cat);
    const brand = pick(brands.length ? brands : MACHINE_BRANDS, i);
    const models = extraModelsFor(cat, brand);
    return [
      spec("Marka", brand),
      spec("Model", pick(models.length ? models : [cat.name], i)),
      spec("Yıl", pick(YEARS, i)),
      spec("Çalışma saati", 400 + i * 180),
      spec("Yakıt", pick(MACHINE_FUEL, i)),
      spec("Durum", pick(PRODUCT_CONDITIONS, i)),
      spec("Tür", pick(TRACTOR_TYPES, i)),
      spec("Konum", `${city} / ${district}`),
    ];
  }

  if (root === "parts") {
    if (isSeaEquipCategoryId(id)) {
      const products = seaEquipProductsFor(id);
      return [
        spec("Ürün Grubu", seaEquipGroupById(id)?.name ?? "Deniz Aracı Ekipmanları"),
        spec("Ürün", pick(products.length ? products : [cat.name], i)),
        spec("Marka", pick(SEA_EQUIP_BRANDS, i)),
        spec("Kimden", pick(PART_FROM, i)),
        spec("Takas", pick(SWAP_YN, i)),
        spec("Durumu", i % 3 === 0 ? "Sıfır" : "İkinci El"),
        spec("Konum", `${city} / ${district}`),
      ];
    }
    if (id.startsWith("parts-moto")) {
      const product = motoGearProductFromId(id) ?? cat.name;
      const isHelmet = product === "Kask" || id.includes("helmet") || id.includes("kask");
      const isBoots = product === "Ayakkabı & Bot";
      const rows = [
        spec("Ürün", product),
        spec("Marka", pick(isHelmet ? HELMET_BRANDS : MOTO_GEAR_BRANDS, i)),
        spec("Ölçü", isBoots ? pick(MOTO_BOOT_SIZES, i) : pick(FASHION_SIZES, i)),
        spec("Kimden", pick(PART_FROM, i)),
        spec("Takas", pick(SWAP_YN, i)),
        spec("Durumu", i % 3 === 0 ? "Sıfır" : "İkinci El"),
        spec("Konum", `${city} / ${district}`),
      ];
      if (isHelmet) rows.splice(1, 0, spec("Türü", pick(HELMET_TYPES, i)));
      return rows;
    }
    if (id.includes("cam")) {
      return [
        spec("Marka", pick(DASHCAM_BRANDS, i)),
        spec("Çözünürlük", pick(DASHCAM_RES, i)),
        spec("Kanal", pick(DASHCAM_CH, i)),
        spec("Bağlantı", pick(CONNECTIVITY, i)),
        spec("Durum", pick(PRODUCT_CONDITIONS, i)),
        spec("Takas", pick(SWAP_YN, i)),
      ];
    }
    if (id.includes("tire")) {
      return [
        spec("Marka", pick(TIRE_BRANDS, i)),
        spec("Ebat", pick(TIRE_SIZES, i)),
        spec("Durum", pick(PRODUCT_CONDITIONS, i)),
        spec("Takas", pick(SWAP_YN, i)),
      ];
    }
    if (id.includes("spare")) {
      const brands = brandNamesForSegment("auto");
      const brand = pick(brands, i);
      const series = modelsOfBrand(brand, "auto");
      return [
        spec("Tipi", partsVehicleTypeFromId(id) || cat.name),
        spec("Ürün", pick(AUTO_PART_PRODUCTS, i)),
        spec("Araç Markası", brand),
        spec("Araç Serisi", pick(series.length ? series : ["Civic", "Focus", "Golf"], i)),
        spec("Ürün Markası", pick(PART_BRANDS, i)),
        spec("Kimden", pick(PART_FROM, i)),
        spec("Çıkma Yedek Parça", pick(USED_PART, i)),
        spec("Durumu", i % 3 === 0 ? "Sıfır" : "İkinci El"),
        spec("Takas", pick(SWAP_YN, i)),
      ];
    }
    return [
      spec("Marka", pick(extraBrandsFor(cat).length ? extraBrandsFor(cat) : PART_BRANDS, i)),
      spec("Durum", pick(PRODUCT_CONDITIONS, i)),
      spec("Takas", pick(SWAP_YN, i)),
      spec("Renk", pick(COLORS, i)),
      spec("Konum", `${city} / ${district}`),
    ];
  }

  if (root === "services") {
    return [
      spec("Hizmet", pick(SERVICE_TYPES, i)),
      spec("Hizmet yeri", pick(SERVICE_PLACE, i)),
      spec("Deneyim", pick(SERVICE_EXP, i)),
      spec("Garanti", pick(WARRANTY_OPTS, i)),
      spec("Konum", `${city} / ${district}`),
    ];
  }

  if (root === "tutors") {
    const subjects = tutorSubjectsFor(id);
    const levels = tutorLevelsFor(id);
    return [
      spec("Kategori", cat.name),
      spec("Ders", pick(subjects.length ? subjects : [cat.name], i)),
      spec("Seviye", pick(levels.length ? levels : ["Genel"], i)),
      spec("Yer", pick(TUTOR_PLACES, i)),
      spec("Konum", `${city} / ${district}`),
    ];
  }

  if (root === "jobs") {
    return [
      spec("Kategori", cat.name),
      spec("Çalışma", pick(JOB_WORK_MODES, i)),
      spec("Sektör", pick(JOB_SECTOR, i)),
      spec("Eğitim", pick(JOB_EDUCATION, i)),
      spec("Deneyim", pick(JOB_EXPERIENCE_LEVELS, i)),
      spec("Lokasyon", pick(JOB_PLACES, i)),
      spec("Konum", `${city} / ${district}`),
    ];
  }

  if (root === "pets") {
    const brands = extraBrandsFor(cat);
    return [
      spec("Tür", pick(PET_KINDS, i)),
      spec("Hayvan", pick(extraModelsFor(cat, "marka").length ? extraModelsFor(cat, "marka") : ["Kedi", "Köpek"], i)),
      spec("Marka", pick(brands.length ? brands : ["Royal Canin", "Hills"], i)),
      spec("Durum", pick(PRODUCT_CONDITIONS, i)),
      spec("Konum", `${city} / ${district}`),
    ];
  }

  if (root === "helpers") {
    return [
      spec("Çalışma", pick(HELP_TYPES, i)),
      spec("Cinsiyet", pick(HELP_GENDER, i)),
      spec("Dil", pick(HELP_LANG, i)),
      spec("Deneyim", pick(HELP_EXP, i)),
      spec("Konum", `${city} / ${district}`),
    ];
  }

  return [
    spec("Marka", pick(extraBrandsFor(cat).length ? extraBrandsFor(cat) : ["Samsung", "Bosch"], i)),
    spec("Durum", pick(PRODUCT_CONDITIONS, i)),
    spec("Takas", pick(SWAP_YN, i)),
    spec("Konum", `${city} / ${district}`),
  ];
}

export function featuresForListing(cat: Category, i: number): string[] {
  const root = rootOf(cat).id;
  const shop = CLASSIFIED_SHOP_OPTS.filter((_, idx) => (i + idx) % 2 === 0);
  if (root === "vasita") {
    return FILTER_VEHICLE_FEATURES.filter((_, idx) => (i + idx) % 2 === 0);
  }
  if (root === "emlak") {
    return FILTER_ESTATE_FEATURES.filter((_, idx) => (i + idx) % 2 === 0);
  }
  if (root === "parts") {
    return [...shop, ...(i % 5 === 0 ? ["Video"] : [])];
  }
  if (root === "services" && i % 3 === 0) return ["7/24"];
  return shop;
}

export function vehicleTitleBits(cat: Category, i: number) {
  if (rootOf(cat).id !== "vasita") return null;
  const v = vehicleBundle(cat, i);
  return v;
}
