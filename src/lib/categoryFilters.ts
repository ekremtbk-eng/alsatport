import type { Category } from "@/data/categories";
import { findCategory, hrefForCategory, isBeautyJobsCategory, isRenoCategory, isServiceTreeCategory, listingMatchesCategory, parentOf, rootOf, visibleChildren } from "@/data/categories";
import type { Listing } from "@/data/store";
import {
  CREDIT,
  DRIVES,
  ENGINE_POWERS,
  FILTER_VEHICLE_FEATURES,
  FLOORS,
  PARKING,
  YES_NO,
  motoGearProductFromId,
} from "@/data/listingSchema";
import {
  APPLIANCE_BRANDS,
  AUDIO_BRANDS,
  BATHS,
  BUILDING_AGES,
  CAMERA_BRANDS,
  CAMERA_TYPES,
  COLORS,
  COMPUTER_BRANDS,
  CONNECTIVITY,
  DAMAGE_KINDS,
  DAMAGE_RECORDS,
  DASHCAM_BRANDS,
  DASHCAM_CH,
  DASHCAM_RES,
  DEAL_TYPES,
  DEAL_TYPES_OFFICE,
  DEED_STATUS,
  FLOOR_COUNTS,
  FURNISHED_YN,
  LISTING_FROM,
  USAGE_STATUS,
  FASHION_GENDER,
  FASHION_SIZES,
  FUELS,
  GEARS,
  HEATING,
  HELMET_BRANDS,
  AUTO_ACC_BRANDS,
  AUTO_PART_PRODUCTS,
  AUTO_PART_VEHICLE_TYPES,
  CLASSIFIED_SHOP_OPTS,
  HELMET_TYPES,
  MOTO_BOOT_SIZES,
  MOTO_GEAR_BRANDS,
  SWAP_YN,
  PART_BRANDS,
  PART_FROM,
  VEHICLE_FROM,
  kimdenOptionsForRoot,
  USED_PART,
  JOB_PLACES,
  JOB_WORK_MODES,
  JOB_EDUCATION,
  JOB_EXPERIENCE_LEVELS,
  JOB_POSTED_WITHIN,
  seaEquipProductsFor,
  isSeaEquipCategoryId,
  bodiesOfModel,
  brandNamesForSegment,
  enginesOfModel,
  MACHINE_BRANDS,
  modelsOfBrand,
  packagesOfModel,
  PHONE_BRANDS,
  PRODUCT_CONDITIONS,
  rangesOfModel,
  RENT_PERIODS,
  ROOMS,
  SEA_NAV_BRANDS,
  STORAGES,
  TIRE_BRANDS,
  TIRE_SIZES,
  TRACTOR_TYPES,
  TV_BRANDS,
  vehicleSegmentFromCategoryId,
  vehicleProfileFromCategoryId,
  type VehicleSegment,
  WATCH_BRANDS,
  YEARS,
  ZONING,
  CYLINDERS,
  COOLING_TYPES,
  FAST_CHARGE,
  PAYLOADS,
  GVW,
  AIRCRAFT_TYPES,
  BERTHS,
} from "@/data/listingOptions";
import { TURKEY_CITIES, districtsOf } from "@/data/turkey";
import { mahallelerOf } from "@/data/regionProfiles";
import { tutorLevelsFor, tutorSubjectsFor, TUTOR_PLACES } from "@/data/tutorOptions";
import {
  CPU_OPTS,
  RAM_OPTS,
  GPU_OPTS,
  SCREEN_OPTS,
  OS_OPTS,
  WARRANTY_OPTS,
  TV_SIZES,
  TV_RES,
  CONSOLE_GEN,
  BOOK_LANG,
  MUSIC_TYPE,
  SPORT_SIZE,
  BABY_AGE,
  ANTIQUE_ERA,
  MACHINE_FUEL,
  MACHINE_BRANDS_WORK,
  MACHINE_BRANDS_FARM,
  MACHINE_BRANDS_IND,
  PET_FOOD_BRANDS,
  PET_CAGE_BRANDS,
  SERVICE_PLACE,
  SERVICE_EXP,
  HELP_GENDER,
  HELP_LANG,
  HELP_EXP,
  JOB_SECTOR,
  GENERIC_SHOP_BRANDS,
} from "@/data/filterCatalog";
import { extraBrandsFor, extraModelsFor, extraTrimsFor, extraNavRooms } from "@/data/categoryFiles";
import { listingMatchesTextQuery, listingMatchesTitleQuery, listingPostedAt, postedFilterHours } from "@/lib/listingQuery";

export type FilterKind = "select" | "range" | "toggle" | "city" | "district" | "multi" | "text";

export type FilterField = {
  key: string;
  kind: FilterKind;
  labelKey: string;
  options?: string[];
  specKeys?: string[];
  pairKey?: string;
  suffix?: string;
  dependsOn?: string;
  optionSource?: "vehicleModels" | "vehiclePackages" | "vehicleEngines" | "vehicleBodies" | "vehicleRanges" | "neighborhoods" | "catalogModels" | "catalogTrims";
  catalogKind?: VehicleSegment;
  catalogId?: string;
  searchable?: boolean;
  preferOpen?: boolean;
  currencyTabs?: boolean;
  ui?: "chips";
  chipKind?: "tutorSubject" | "tutorLevel" | "tutorPlace";
};

export type FilterState = Record<string, string>;

const CITIES = TURKEY_CITIES.map((c) => c.name);
const SERVICE_TYPES = ["Keşif", "Montaj", "Tamir", "Nakliye", "Bakım"];
const HELP_TYPES = ["Gündüzlü", "Yatılı", "Tam Zamanlı", "Yarı Zamanlı"];
const PET_KINDS = ["Yem & Mama", "Kafes & Kulübe", "Tasma & Gezdirme", "Akvaryum", "Bakım & Hijyen", "Aksesuar"];
const PET_QTY = ["0-1 kg", "1-5 kg", "5-10 kg", "10-20 kg", "20+ kg"];

function sel(
  key: string,
  labelKey: string,
  options: string[],
  specKeys: string[],
  extra: Partial<FilterField> = {},
): FilterField {
  return { key, kind: "select", labelKey, options, specKeys, ...extra };
}

function range(
  minKey: string,
  maxKey: string,
  labelKey: string,
  specKeys: string[],
  suffix?: string,
  preferOpen = false,
): FilterField[] {
  return [
    { key: minKey, kind: "range", labelKey, specKeys, pairKey: maxKey, suffix, preferOpen },
    { key: maxKey, kind: "range", labelKey, specKeys, pairKey: minKey, suffix, preferOpen },
  ];
}

export function commonFilterFields(): FilterField[] {
  return [
    { key: "city", kind: "city", labelKey: "post.city", options: CITIES, searchable: true, preferOpen: true },
    { key: "district", kind: "district", labelKey: "post.district", dependsOn: "city", searchable: true },
    ...range("priceMin", "priceMax", "flt.price", [], "₺", true),
    sel("seller", "cat.seller", ["Bireysel", "Kurumsal"], []),
    { key: "urgent", kind: "toggle", labelKey: "cat.filter-urgent" },
  ];
}

function cascadeSel(
  segment: VehicleSegment,
  key: string,
  labelKey: string,
  specKeys: string[],
  dependsOn: string,
  optionSource: FilterField["optionSource"],
): FilterField {
  return {
    key,
    kind: "select",
    labelKey,
    specKeys,
    dependsOn,
    optionSource,
    catalogKind: segment,
    searchable: true,
    preferOpen: true,
  };
}

function vehicleCascade(segment: VehicleSegment): FilterField[] {
  const brands = brandNamesForSegment(segment);
  const skipTrim = segment === "moto" || segment === "deniz";
  const engineParent = skipTrim ? "model" : "trim";
  const engineLabel =
    segment === "ev" ? "flt.battery" : segment === "van" || segment === "ticari" || segment === "deniz" ? "flt.power" : "flt.engine";
  const engineSpecs =
    segment === "ev"
      ? ["Batarya", "kWh", "Battery"]
      : segment === "moto"
        ? ["Motor hacmi", "cc", "Engine"]
        : ["Motor", "Motor gücü", "Engine"];
  const bodyLabel = segment === "deniz" ? "flt.boat" : "flt.body";
  const fields: FilterField[] = [
    sel("brand", "post.brand", brands, ["Marka", "Brand"], { searchable: true, preferOpen: true, catalogKind: segment }),
    cascadeSel(segment, "model", "post.model", ["Model"], "brand", "vehicleModels"),
  ];
  if (!skipTrim) {
    fields.push(cascadeSel(segment, "trim", "flt.trim", ["Paket", "Seri", "Trim"], "model", "vehiclePackages"));
  }
  fields.push(cascadeSel(segment, "engine", engineLabel, engineSpecs, engineParent, "vehicleEngines"));
  if (segment !== "moto") {
    fields.push(cascadeSel(segment, "body", bodyLabel, ["Kasa", "Gövde", "Tekne", "Body"], "engine", "vehicleBodies"));
  }
  if (segment === "ev") {
    fields.push(cascadeSel(segment, "range", "flt.range", ["Menzil", "Range", "km"], "engine", "vehicleRanges"));
  }
  return fields;
}

function vehicleCore(segment: VehicleSegment): FilterField[] {
  const skipKm = segment === "deniz";
  const skipFuel = segment === "ev" || segment === "deniz";
  const skipGear = segment === "deniz";
  const skipPower =
    segment === "ev" ||
    segment === "moto" ||
    segment === "atv" ||
    segment === "deniz" ||
    segment === "van" ||
    segment === "ticari";
  const skipDrive = segment === "moto" || segment === "atv" || segment === "deniz" || segment === "ev";
  return [
    ...vehicleCascade(segment),
        ...range("yearMin", "yearMax", "post.year", ["Yıl", "Year"], undefined, true),
        ...(skipKm ? [] : range("kmMin", "kmMax", "post.km", ["Km", "Kilometre"], undefined, true)),
        ...(skipFuel ? [] : [sel("fuel", "post.fuel", FUELS, ["Yakıt", "Fuel"], { preferOpen: true })]),
        ...(skipGear
          ? []
          : [sel("gear", "post.gear", GEARS, ["Vites", "Gearbox"], { preferOpen: true, catalogKind: segment })]),
        ...(skipPower ? [] : [sel("power", "flt.power", ENGINE_POWERS, ["Motor gücü", "Güç"], { preferOpen: true })]),
        ...(skipDrive
          ? []
          : [sel("drive", "flt.drive", DRIVES, ["Çekiş", "Drive"], { preferOpen: true })]),
    sel("color", "post.color", COLORS, ["Renk", "Color"]),
    sel("kimden", "flt.kimden", VEHICLE_FROM, ["Kimden"]),
    sel("damage", "flt.damage", DAMAGE_RECORDS, ["Hasar kaydı", "Hasar", "Tramer"]),
    {
      key: "equip",
      kind: "multi" as const,
      labelKey: "flt.equip",
      options: FILTER_VEHICLE_FEATURES,
    },
  ];
}

function classifiedShopFilters(): FilterField[] {
  return [
    sel("cond", "post.cond", ["İkinci El", "Sıfır"], ["Durumu", "Durum"], { preferOpen: true }),
    {
      key: "shopOpts",
      kind: "multi",
      labelKey: "flt.shopOpts",
      options: [...CLASSIFIED_SHOP_OPTS],
      preferOpen: true,
    },
    { key: "city", kind: "city", labelKey: "post.city", options: CITIES, searchable: true, preferOpen: true },
    { key: "district", kind: "district", labelKey: "post.district", dependsOn: "city", searchable: true },
    ...range("priceMin", "priceMax", "flt.price", [], "₺", true).map((f, i) => (i === 0 ? { ...f, currencyTabs: true } : f)),
    sel("swap", "flt.swap", SWAP_YN, ["Takas"], { preferOpen: true }),
    sel("kimden", "flt.kimden", PART_FROM, ["Kimden"]),
    { key: "keyword", kind: "text", labelKey: "flt.keyword", preferOpen: true },
  ];
}

function hid(id: string, ...needles: string[]) {
  return needles.some((n) => id.includes(n));
}

function fieldsForCategoryNode(cat: Category): FilterField[] {
  const root = rootOf(cat).id;
  const id = cat.id;

  if (root === "vasita") {
    const segment = vehicleSegmentFromCategoryId(id);
    const profile = vehicleProfileFromCategoryId(id);
    if (profile === "air") {
      return [
        sel("craft", "flt.craft", AIRCRAFT_TYPES, ["Tip", "Hava aracı"], { preferOpen: true }),
        ...range("yearMin", "yearMax", "post.year", ["Yıl", "Year"]),
        sel("kimden", "flt.kimden", VEHICLE_FROM, ["Kimden"]),
      ];
    }
    const extra: FilterField[] = [];
    if (profile === "ev") extra.push(sel("charge", "flt.charge", FAST_CHARGE, ["Şarj", "Hızlı şarj"]));
    if (profile === "moto" || profile === "atv" || profile === "utv") {
      extra.push(
        sel("cylinders", "flt.cylinders", CYLINDERS, ["Silindir"]),
        sel("cooling", "flt.cooling", COOLING_TYPES, ["Soğutma"]),
      );
    }
    if (profile === "van" || profile === "ticari" || profile === "caravan") {
      extra.push(
        sel("payload", "flt.payload", PAYLOADS, ["Yük", "Kapasite", "İstihap"]),
        sel("gvw", "flt.gvw", GVW, ["Azami", "Ağırlık", "GVW"]),
      );
    }
    if (profile === "caravan") extra.push(sel("berths", "flt.berths", BERTHS, ["Yatak"]));
    if (profile === "rental") extra.push(sel("rentPeriod", "flt.rentPeriod", RENT_PERIODS, ["Süre", "Dönem"]));
    if (profile === "damaged") extra.push(sel("damageKind", "flt.damageKind", DAMAGE_KINDS, ["Hasar türü"]));
    if (hid(id, "deniz")) {
      return [...vehicleCore("deniz"), sel("cond", "post.cond", PRODUCT_CONDITIONS, ["Durum", "Condition"]), ...extra];
    }
    return [...vehicleCore(segment), ...extra];
  }

  if (root === "emlak") {
    const neighborhood: FilterField = {
      key: "neighborhood",
      kind: "select",
      labelKey: "post.neighborhood",
      specKeys: ["Mahalle"],
      dependsOn: "district",
      optionSource: "neighborhoods",
      searchable: true,
    };
    const address: FilterField[] = [
      { key: "city", kind: "city", labelKey: "post.city", options: CITIES, searchable: true, preferOpen: true },
      { key: "district", kind: "district", labelKey: "post.district", dependsOn: "city", searchable: true },
      neighborhood,
      ...range("priceMin", "priceMax", "flt.price", [], "₺", true),
    ];
    const dealOffice = [sel("deal", "flt.deal", DEAL_TYPES_OFFICE, ["İlan tipi", "Tip"], { preferOpen: true })];
    const home = [
      sel("rooms", "post.rooms", ROOMS, ["Oda", "Oda sayısı", "Rooms"], { preferOpen: true }),
      ...range("sqmMin", "sqmMax", "flt.sqmGross", ["m²", "m2", "Brüt m²", "Brut", "Metrekare"], undefined, true),
      ...range("sqmNetMin", "sqmNetMax", "flt.sqmNet", ["Net m²", "Net"], undefined, true),
      sel("age", "post.age", BUILDING_AGES, ["Bina yaşı", "Yaş", "Building age"]),
      sel("floorCount", "flt.floorCount", FLOOR_COUNTS, ["Kat sayısı"]),
      sel("floor", "post.floor", FLOORS, ["Kat", "Floor", "Bulunduğu kat"]),
      sel("heat", "post.heat", HEATING, ["Isıtma", "Isınma", "Heating"]),
      sel("bath", "flt.bath", BATHS, ["Banyo", "Bath"]),
      sel("balcony", "flt.balcony", ["Var", "Yok", "Fransız", "Teras"], ["Balkon"]),
      sel("elevator", "flt.elevator", YES_NO, ["Asansör"]),
      sel("parking", "flt.parking", PARKING, ["Otopark"]),
      sel("furnished", "flt.furnished", FURNISHED_YN, ["Eşyalı", "Eşya"]),
      sel("usage", "flt.usage", USAGE_STATUS, ["Kullanım durumu", "Kullanım"]),
      sel("site", "flt.site", CREDIT, ["Site içerisinde", "Site"]),
      sel("credit", "flt.credit", CREDIT, ["Krediye uygun", "Kredi"]),
      sel("deed", "flt.deed", DEED_STATUS, ["Tapu durumu", "Tapu"]),
      sel("kimden", "flt.kimden", LISTING_FROM, ["Kimden"]),
      { key: "urgent", kind: "toggle" as const, labelKey: "cat.filter-urgent" },
    ];
    if (hid(id, "arsa")) {
      return [
        ...address,
        sel("deal", "flt.deal", DEAL_TYPES, ["İlan tipi", "Tip"], { preferOpen: true }),
        ...range("sqmMin", "sqmMax", "flt.sqmGross", ["m²", "m2", "Metrekare"]),
        sel("zoning", "flt.zoning", ZONING, ["İmar", "Ada"]),
        sel("kimden", "flt.kimden", LISTING_FROM, ["Kimden"]),
        { key: "urgent", kind: "toggle", labelKey: "cat.filter-urgent" },
      ];
    }
    if (hid(id, "isyeri")) {
      return [
        ...address,
        ...dealOffice,
        ...range("sqmMin", "sqmMax", "flt.sqmGross", ["m²", "m2", "Brüt m²", "Metrekare"]),
        ...range("sqmNetMin", "sqmNetMax", "flt.sqmNet", ["Net m²", "Net"]),
        sel("heat", "post.heat", HEATING, ["Isıtma"]),
        sel("age", "post.age", BUILDING_AGES, ["Bina yaşı"]),
        sel("floorCount", "flt.floorCount", FLOOR_COUNTS, ["Kat sayısı"]),
        sel("floor", "post.floor", FLOORS, ["Kat"]),
        sel("kimden", "flt.kimden", LISTING_FROM, ["Kimden"]),
        { key: "urgent", kind: "toggle", labelKey: "cat.filter-urgent" },
      ];
    }
    if (hid(id, "emlak-bina") && !hid(id, "konut")) {
      return [
        ...address,
        ...dealOffice,
        ...range("sqmMin", "sqmMax", "flt.sqmGross", ["m²", "m2"]),
        sel("age", "post.age", BUILDING_AGES, ["Bina yaşı"]),
        sel("floorCount", "flt.floorCount", FLOOR_COUNTS, ["Kat sayısı"]),
        sel("kimden", "flt.kimden", LISTING_FROM, ["Kimden"]),
        { key: "urgent", kind: "toggle", labelKey: "cat.filter-urgent" },
      ];
    }
    if (hid(id, "proje")) {
      return [
        ...address,
        sel("rooms", "post.rooms", ROOMS, ["Oda"]),
        ...range("sqmMin", "sqmMax", "flt.sqmGross", ["m²", "m2"]),
        sel("kimden", "flt.kimden", LISTING_FROM, ["Kimden"]),
      ];
    }
    return [...address, ...home];
  }

  if (root === "shopping") {
    const catalogBrands = extraBrandsFor(cat);
    const cond = sel("cond", "post.cond", PRODUCT_CONDITIONS, ["Durum", "Condition"], { preferOpen: true });
    const color = sel("color", "post.color", COLORS, ["Renk", "Color"]);
    const warranty = sel("warranty", "flt.warranty", WARRANTY_OPTS, ["Garanti", "Warranty"]);
    const brand = catalogBrands.length
      ? sel("brand", "post.brand", catalogBrands, ["Marka", "Brand"], {
          searchable: true,
          preferOpen: true,
          catalogId: cat.id,
        })
      : null;
    const model: FilterField = {
      key: "model",
      kind: "select",
      labelKey: "post.model",
      specKeys: ["Model", "Donanım"],
      dependsOn: "brand",
      optionSource: "catalogModels",
      catalogId: cat.id,
      searchable: true,
      preferOpen: true,
    };
    const core = [
      ...(brand ? [brand, model] : []),
      cond,
      sel("swap", "flt.swap", SWAP_YN, ["Takas"]),
      sel("kimden", "flt.kimden", kimdenOptionsForRoot("shopping"), ["Kimden"]),
    ];
    if (hid(id, "phone") || id === "phones") {
      return [
        ...core,
        sel("storage", "post.storage", STORAGES, ["Hafıza", "Storage"], { preferOpen: true }),
        sel("ram", "flt.ram", RAM_OPTS, ["RAM", "Bellek"]),
        sel("os", "flt.os", OS_OPTS, ["İşletim sistemi", "OS"]),
        warranty,
        color,
      ];
    }
    if (hid(id, "computer", "gamer", "dizustu", "masaustu", "tablet")) {
      return [
        ...core,
        sel("cpu", "flt.cpu", CPU_OPTS, ["İşlemci", "CPU", "Processor"], { preferOpen: true }),
        sel("ram", "flt.ram", RAM_OPTS, ["RAM", "Bellek"], { preferOpen: true }),
        sel("gpu", "flt.gpu", GPU_OPTS, ["Ekran kartı", "GPU"]),
        sel("storage", "post.storage", STORAGES, ["Hafıza", "Storage", "SSD"]),
        sel("screen", "flt.screen", SCREEN_OPTS, ["Ekran", "İnç"]),
        sel("os", "flt.os", OS_OPTS, ["İşletim sistemi", "OS"]),
        warranty,
        color,
      ];
    }
    if (hid(id, "watch", "jewel", "mucevher", "taki")) {
      return [...core, color, warranty];
    }
    if (hid(id, "camera", "lens")) {
      return [
        ...core,
        sel("camType", "flt.camType", CAMERA_TYPES, ["Kamera", "Tip"], { preferOpen: true }),
        warranty,
        color,
      ];
    }
    if (hid(id, "home-el") || hid(id, "goruntu") || hid(id, "tech") || hid(id, "elektronik")) {
      return [
        ...core,
        sel("tvSize", "flt.tvSize", TV_SIZES, ["Ekran boyutu", "İnç"], { preferOpen: true }),
        sel("tvRes", "flt.tvRes", TV_RES, ["Çözünürlük", "Panel"]),
        warranty,
      ];
    }
    if (hid(id, "appliance") || hid(id, "alet") || hid(id, "beyaz")) {
      return [...core, warranty];
    }
    if (hid(id, "fashion") || hid(id, "giyim") || hid(id, "ayakkabi")) {
      return [
        ...core,
        sel("gender", "flt.gender", FASHION_GENDER, ["Cinsiyet", "Gender"], { preferOpen: true }),
        sel("size", "flt.size", FASHION_SIZES, ["Beden", "Size"]),
        color,
      ];
    }
    if (hid(id, "gamer") || hid(id, "konsol")) {
      return [...core, sel("console", "flt.console", CONSOLE_GEN, ["Konsol", "Platform"], { preferOpen: true }), warranty];
    }
    if (hid(id, "book") || hid(id, "kitap") || hid(id, "dergi")) {
      return [...core, sel("bookLang", "flt.bookLang", BOOK_LANG, ["Dil", "Language"])];
    }
    if (hid(id, "music") || hid(id, "muzik")) {
      return [...core, sel("musicType", "flt.musicType", MUSIC_TYPE, ["Tür", "Enstrüman"]), color];
    }
    if (hid(id, "sport") || hid(id, "fitness") || hid(id, "kamp")) {
      return [...core, sel("size", "flt.size", SPORT_SIZE, ["Beden", "Size"]), color];
    }
    if (hid(id, "baby") || hid(id, "bebek") || hid(id, "anne")) {
      return [...core, sel("babyAge", "flt.babyAge", BABY_AGE, ["Yaş", "Age"], { preferOpen: true }), color];
    }
    if (hid(id, "antique") || hid(id, "antika") || hid(id, "koleksiyon") || hid(id, "collect")) {
      return [...core, sel("era", "flt.era", ANTIQUE_ERA, ["Dönem", "Çağ"])];
    }
    return [...core, color, warranty];
  }

  if (root === "machines") {
    const brands = extraBrandsFor(cat);
    const base = [
      sel("brand", "post.brand", brands.length ? brands : MACHINE_BRANDS, ["Marka", "Brand"], {
        searchable: true,
        preferOpen: true,
        catalogId: cat.id,
      }),
      {
        key: "model",
        kind: "select" as const,
        labelKey: "post.model",
        specKeys: ["Model", "Tip"],
        dependsOn: "brand",
        optionSource: "catalogModels" as const,
        catalogId: cat.id,
        searchable: true,
        preferOpen: true,
      },
      ...range("yearMin", "yearMax", "post.year", ["Yıl", "Year"], undefined, true),
      ...range("hoursMin", "hoursMax", "post.hours", ["Çalışma saati", "Saat", "Hours"]),
      sel("fuel", "post.fuel", MACHINE_FUEL, ["Yakıt", "Fuel"], { preferOpen: true }),
      sel("cond", "post.cond", PRODUCT_CONDITIONS, ["Durum", "Condition"]),
      sel("kimden", "flt.kimden", kimdenOptionsForRoot("machines"), ["Kimden"]),
    ];
    if (hid(id, "farm") || hid(id, "traktor") || hid(id, "tractor")) {
      return [...base, sel("tractor", "flt.tractor", TRACTOR_TYPES, ["Tür", "Tip"])];
    }
    return base;
  }

  if (root === "parts") {
    if (isSeaEquipCategoryId(id)) {
      const products = seaEquipProductsFor(id);
      const shop = classifiedShopFilters();
      return [
        ...shop,
        sel("product", "flt.partProduct", products.length ? products : seaEquipProductsFor("parts-sea"), ["Ürün"], {
          preferOpen: true,
          kind: "multi",
        }),
        sel("kimden", "flt.kimden", PART_FROM, ["Kimden"]),
        sel("posted", "flt.posted", [...JOB_POSTED_WITHIN], []),
        { key: "hasVideo", kind: "toggle", labelKey: "flt.video" },
        { key: "hasPhoto", kind: "toggle", labelKey: "flt.photo" },
      ];
    }
    if (id.startsWith("parts-moto")) {
      const shop = classifiedShopFilters();
      const product = motoGearProductFromId(id);
      const isGear = id.includes("gear") || id.includes("kask") || Boolean(product);
      if (isGear) {
        const isHelmet = product === "Kask" || id.includes("helmet") || id.includes("kask");
        const isBoots = product === "Ayakkabı & Bot";
        const extra: FilterField[] = [];
        if (id === "parts-moto-gear") {
          extra.push(
            sel(
              "product",
              "flt.partProduct",
              ["Ayakkabı & Bot", "Kask", "Mont", "Pantolon", "Sweatshirt", "Tişört", "Tulum", "Yağmurluk"],
              ["Ürün"],
              { preferOpen: true, searchable: true },
            ),
          );
        }
        if (isHelmet || id === "parts-moto-gear") {
          extra.push(sel("kind", "list.fact.kind", HELMET_TYPES, ["Türü"]));
        }
        extra.push(
          sel("brand", "post.brand", isHelmet ? HELMET_BRANDS : MOTO_GEAR_BRANDS, ["Marka", "Brand"], {
            searchable: true,
            preferOpen: true,
          }),
          sel("size", "flt.size", isBoots ? MOTO_BOOT_SIZES : FASHION_SIZES, ["Ölçü", "Beden", "Size"]),
        );
        return [...shop, ...extra];
      }
      if (hid(id, "spare")) {
        return [
          ...shop,
          sel("brand", "post.brand", brandNamesForSegment("moto"), ["Marka", "Brand"], { searchable: true, preferOpen: true }),
        ];
      }
      if (hid(id, "elec")) {
        return [
          ...shop,
          sel("brand", "post.brand", ["Sena", "Cardo", "Garmin", ...HELMET_BRANDS], ["Marka", "Brand"], {
            searchable: true,
            preferOpen: true,
          }),
        ];
      }
      if (hid(id, "tire")) {
        return [
          ...shop,
          sel("brand", "post.brand", TIRE_BRANDS, ["Marka", "Brand"], { searchable: true, preferOpen: true }),
          sel("tireSize", "flt.tireSize", TIRE_SIZES, ["Ebat", "Lastik", "Size"]),
        ];
      }
      return [
        ...shop,
        sel("brand", "post.brand", AUTO_ACC_BRANDS, ["Marka", "Brand"], { searchable: true, preferOpen: true }),
      ];
    }
    const cond = sel("cond", "post.cond", PRODUCT_CONDITIONS, ["Durum", "Condition"], { preferOpen: true });
    if (hid(id, "moto-gear") || hid(id, "kask") || id.includes("gear")) {
      return [
        sel("brand", "post.brand", HELMET_BRANDS, ["Marka", "Brand"], { searchable: true, preferOpen: true }),
        sel("size", "flt.size", FASHION_SIZES, ["Beden", "Size"]),
        cond,
      ];
    }
    if (hid(id, "moto") && hid(id, "acc")) {
      return [
        sel("brand", "post.brand", AUTO_ACC_BRANDS, ["Marka", "Brand"], { searchable: true, preferOpen: true }),
        cond,
      ];
    }
    if (hid(id, "moto") && hid(id, "spare")) {
      return [
        sel("brand", "post.brand", brandNamesForSegment("moto"), ["Marka", "Brand"], { searchable: true, preferOpen: true }),
        cond,
      ];
    }
    if (hid(id, "moto")) {
      return [cond];
    }
    if (hid(id, "sea-nav") || (hid(id, "sea") && hid(id, "nav"))) {
      return [
        sel("brand", "post.brand", SEA_NAV_BRANDS, ["Marka", "Brand"], { searchable: true, preferOpen: true }),
        sel("connect", "flt.connectivity", CONNECTIVITY, ["Bağlantı", "Wi-Fi", "GPS"]),
        cond,
      ];
    }
    if (hid(id, "sea")) {
      return [sel("cond", "post.cond", PRODUCT_CONDITIONS, ["Durum", "Condition"], { preferOpen: true })];
    }
    if (hid(id, "cam")) {
      return [
        sel("brand", "post.brand", DASHCAM_BRANDS, ["Marka", "Brand"], { searchable: true, preferOpen: true }),
        sel("resolution", "flt.resolution", DASHCAM_RES, ["Çözünürlük", "Resolution"]),
        sel("channels", "flt.channels", DASHCAM_CH, ["Kanal", "Channel"]),
        sel("connect", "flt.connectivity", CONNECTIVITY, ["Bağlantı", "Wi-Fi", "GPS"]),
        cond,
      ];
    }
    if (hid(id, "audio") || hid(id, "media") || hid(id, "amp")) {
      return [
        sel("brand", "post.brand", AUDIO_BRANDS, ["Marka", "Brand"], { searchable: true, preferOpen: true }),
        cond,
        sel("color", "post.color", COLORS, ["Renk", "Color"]),
      ];
    }
    if (hid(id, "tire")) {
      return [
        sel("brand", "post.brand", TIRE_BRANDS, ["Marka", "Brand"], { searchable: true, preferOpen: true }),
        sel("tireSize", "flt.tireSize", TIRE_SIZES, ["Ebat", "Lastik", "Size"]),
        cond,
      ];
    }
    if (hid(id, "acc")) {
      return [
        sel("brand", "post.brand", AUTO_ACC_BRANDS, ["Marka", "Brand"], { searchable: true, preferOpen: true }),
        cond,
        sel("color", "post.color", COLORS, ["Renk", "Color"]),
      ];
    }
    if (hid(id, "spare")) {
      const spareFields: FilterField[] = [];
      if (id === "parts-auto-spare") {
        spareFields.push(
          sel("vehicleType", "list.fact.type", AUTO_PART_VEHICLE_TYPES, ["Tipi"], { preferOpen: true }),
        );
      }
      spareFields.push(
        sel("product", "flt.partProduct", AUTO_PART_PRODUCTS, ["Ürün"], { preferOpen: true, searchable: true }),
        sel("brand", "flt.fitBrand", brandNamesForSegment("auto"), ["Araç Markası", "Uyumlu", "Marka"], {
          searchable: true,
          preferOpen: true,
          catalogKind: "auto",
        }),
        {
          key: "model",
          kind: "select",
          labelKey: "flt.fitSeries",
          specKeys: ["Araç Serisi", "Seri"],
          dependsOn: "brand",
          optionSource: "vehicleModels",
          catalogKind: "auto",
          searchable: true,
        },
        sel("partBrand", "flt.partBrand", PART_BRANDS, ["Ürün Markası"]),
        sel("kimden", "flt.kimden", PART_FROM, ["Kimden"]),
        sel("usedPart", "flt.usedPart", USED_PART, ["Çıkma Yedek Parça", "Çıkma"]),
        sel("cond", "post.cond", ["Sıfır", "İkinci El"], ["Durumu", "Durum"], { preferOpen: true }),
      );
      return spareFields;
    }
    return [cond, sel("kimden", "flt.kimden", PART_FROM, ["Kimden"])];
  }
  if (root === "services") {
    const pack: FilterField[] = [
      ...range("priceMin", "priceMax", "flt.price", [], "₺", true),
      sel("place", "flt.servicePlace", SERVICE_PLACE, ["Hizmet yeri", "Yer"], { preferOpen: true }),
      sel("exp", "flt.serviceExp", SERVICE_EXP, ["Deneyim", "Experience"]),
      sel("warranty", "flt.warranty", WARRANTY_OPTS, ["Garanti"]),
      { key: "keyword", kind: "text", labelKey: "flt.inResults", preferOpen: true },
      sel("kimden", "flt.kimden", kimdenOptionsForRoot("services"), ["Kimden"]),
    ];
    if (isRenoCategory(cat)) {
      return [sel("service", "flt.service", SERVICE_TYPES, ["Hizmet", "Tür", "Service"], { preferOpen: true }), ...pack];
    }
    return pack;
  }
  if (root === "tutors") {
    const subjects = tutorSubjectsFor(id);
    const levels = tutorLevelsFor(id);
    return [
      sel("subject", "flt.subject", subjects, ["Ders", "Branş", "Konu", "Dil", "Subject"], {
        preferOpen: true,
        ui: "chips",
        chipKind: "tutorSubject",
      }),
      sel("level", "flt.level", levels, ["Seviye", "Sınıf", "Level"], {
        preferOpen: true,
        ui: "chips",
        chipKind: "tutorLevel",
      }),
      sel("place", "flt.lessonPlace", [...TUTOR_PLACES], ["Yer", "Mekan", "Format", "Ders yeri", "Online"], {
        preferOpen: true,
        ui: "chips",
        chipKind: "tutorPlace",
      }),
      sel("kimden", "flt.kimden", kimdenOptionsForRoot("tutors"), ["Kimden"]),
    ];
  }
  if (root === "jobs") {
    return [
      sel("jobType", "flt.jobType", [...JOB_WORK_MODES], ["Çalışma", "Çalışma şekli", "Pozisyon", "Type"], {
        preferOpen: true,
      }),
      sel("sector", "flt.jobSector", JOB_SECTOR, ["Sektör", "Alan"]),
      sel("education", "flt.education", [...JOB_EDUCATION], ["Eğitim", "Eğitim durumu", "Education"]),
      sel("exp", "flt.exp", [...JOB_EXPERIENCE_LEVELS], ["Deneyim", "Experience"]),
      sel("place", "flt.place", JOB_PLACES, ["Lokasyon", "Çalışma yeri"]),
      sel("posted", "flt.posted", [...JOB_POSTED_WITHIN], []),
      sel("kimden", "flt.kimden", kimdenOptionsForRoot("jobs"), ["Kimden"]),
      { key: "keyword", kind: "text", labelKey: "flt.keyword", preferOpen: true },
    ];
  }
  if (root === "pets") {
    const brands = extraBrandsFor(cat);
    const species = extraModelsFor(cat, "marka");
    const food = cat.id === "pets-food" || cat.id.startsWith("pets-food-");
    const leaf = !visibleChildren(cat).length;
    const out: FilterField[] = [];
    if (!leaf) {
      out.push(sel("petKind", "flt.petKind", PET_KINDS, ["Tür", "Ürün"], { preferOpen: true }));
    }
    out.push(
      sel("species", "flt.petSpecies", species.length ? species : ["Kedi", "Köpek", "Kuş", "Balık", "Kemirgen"], ["Tür", "Hayvan"], {
        preferOpen: true,
      }),
      sel("brand", "post.brand", brands.length ? brands : PET_FOOD_BRANDS, ["Marka", "Brand"], {
        searchable: true,
        preferOpen: true,
        catalogId: cat.id,
      }),
    );
    if (food) {
      out.push(sel("qty", "flt.qty", PET_QTY, ["Miktar", "Kg", "Ağırlık", "Paket"], { preferOpen: true }));
    } else {
      out.push(sel("cond", "post.cond", PRODUCT_CONDITIONS, ["Durum", "Condition"], { preferOpen: true }));
    }
    out.push(sel("kimden", "flt.kimden", kimdenOptionsForRoot("pets"), ["Kimden"]));
    return out;
  }
  if (root === "helpers") {
    return [
      sel("helpType", "flt.helpType", HELP_TYPES, ["Çalışma", "Tür"], { preferOpen: true }),
      sel("helpGender", "flt.helpGender", HELP_GENDER, ["Cinsiyet"]),
      sel("helpLang", "flt.helpLang", HELP_LANG, ["Dil"]),
      sel("exp", "flt.exp", HELP_EXP, ["Deneyim"]),
      sel("kimden", "flt.kimden", kimdenOptionsForRoot("helpers"), ["Kimden"]),
      { key: "keyword", kind: "text", labelKey: "flt.keyword", preferOpen: true },
    ];
  }
  return [
    sel("brand", "post.brand", extraBrandsFor(cat).length ? extraBrandsFor(cat) : GENERIC_SHOP_BRANDS, ["Marka", "Brand"], {
      searchable: true,
      preferOpen: true,
    }),
    sel("cond", "post.cond", PRODUCT_CONDITIONS, ["Durum", "Condition"], { preferOpen: true }),
    sel("kimden", "flt.kimden", kimdenOptionsForRoot(rootOf(cat).id), ["Kimden"]),
  ];
}

export function filterFieldsForCategory(cat?: Category | null): FilterField[] {
  const common = commonFilterFields();
  if (!cat) return common;
  if (cat.filter === "oto360" || cat.filter === "expertise") {
    const proxy = findCategory("vasita-otomobil");
    if (proxy && proxy.id !== cat.id) return filterFieldsForCategory(proxy);
  }
  if (cat.filter === "emlak360" || cat.filter === "realtor") {
    const proxy = findCategory("emlak-konut-satilik");
    if (proxy && proxy.id !== cat.id) return filterFieldsForCategory(proxy);
  }
  if (cat.filter === "refurbished") {
    const proxy = findCategory("shopping-phone-handset") ?? findCategory("shopping-phone");
    if (proxy && proxy.id !== cat.id) return filterFieldsForCategory(proxy);
  }
  const extra = fieldsForCategoryNode(cat);
  if (rootOf(cat).id === "emlak") {
    return extra;
  }
  if (cat.id.startsWith("parts-moto") || isSeaEquipCategoryId(cat.id)) {
    return extra;
  }
  if (isBeautyJobsCategory(cat) || isServiceTreeCategory(cat)) {
    const address = common.filter((f) => f.key === "city" || f.key === "district");
    if (isServiceTreeCategory(cat)) {
      return [...address, ...extra];
    }
    const rest = common.filter((f) => f.key !== "city" && f.key !== "district");
    return [...address, ...extra, ...rest];
  }
  return [...common, ...extra];
}

export function emptyFilterState(): FilterState {
  return {};
}

export type FilterNavItem = {
  id: string;
  label: string;
  href?: string;
  facet?: { key: string; value: string };
  active?: boolean;
};

export type FilterNav = {
  crumbs: FilterNavItem[];
  items: FilterNavItem[];
  treeKeys: string[];
};

export function catalogBrandsForCategory(cat?: Category | null): string[] {
  if (!cat) return [];
  if (visibleChildren(cat).length) return [];
  const root = rootOf(cat).id;
  if (root === "vasita") {
    if (vehicleProfileFromCategoryId(cat.id) === "air") return [];
    return brandNamesForSegment(vehicleSegmentFromCategoryId(cat.id));
  }
  if (cat.brands?.length) return [...cat.brands];
  return extraBrandsFor(cat);
}

export function filterNavFor(cat?: Category | null, state: FilterState = {}): FilterNav {
  const crumbs: FilterNavItem[] = [];
  if (!cat) {
    return { crumbs, items: [], treeKeys: [] };
  }
  const parent = parentOf(cat);
  if (parent) {
    crumbs.push({ id: parent.id, label: parent.name, href: hrefForCategory(parent) });
  }
  crumbs.push({
    id: cat.id,
    label: cat.name,
    href: hrefForCategory(cat),
    facet: state.brand ? { key: "brand", value: "" } : undefined,
    active: !state.brand,
  });

  const kids = visibleChildren(cat);
  if (kids.length) {
    return {
      crumbs,
      items: kids.map((ch) => ({
        id: ch.id,
        label: ch.name,
        href: hrefForCategory(ch),
        active: false,
      })),
      treeKeys: [],
    };
  }

  const brands = catalogBrandsForCategory(cat);
  const root = rootOf(cat).id;
  const segment = vehicleSegmentFromCategoryId(cat.id);
  const vasitaModels = root === "vasita" && state.brand ? modelsOfBrand(state.brand, segment) : [];
  const catalogModels = root !== "vasita" && state.brand ? extraModelsFor(cat, state.brand) : [];
  const models = vasitaModels.length ? vasitaModels : catalogModels;
  const vasitaTrims =
    root === "vasita" && state.brand && state.model ? packagesOfModel(state.brand, state.model, segment) : [];
  const catalogTrims =
    root !== "vasita" && state.brand && state.model ? extraTrimsFor(cat, state.brand, state.model) : [];
  const trims = vasitaTrims.length ? vasitaTrims : catalogTrims;
  const rooms = extraNavRooms(cat);

  if (brands.length && state.brand && models.length && state.model && trims.length > 1) {
    crumbs.push({
      id: `brand:${state.brand}`,
      label: state.brand,
      facet: { key: "model", value: "" },
    });
    crumbs.push({
      id: `model:${state.model}`,
      label: state.model,
      active: !state.trim,
      facet: { key: "trim", value: "" },
    });
    return {
      crumbs,
      items: trims.map((name) => ({
        id: `trim:${name}`,
        label: name,
        facet: { key: "trim", value: state.trim === name ? "" : name },
        active: state.trim === name,
      })),
      treeKeys: ["brand", "model", "trim"],
    };
  }

  if (brands.length && state.brand && models.length) {
    crumbs.push({
      id: `brand:${state.brand}`,
      label: state.brand,
      active: !state.model,
      facet: { key: "model", value: "" },
    });
    return {
      crumbs,
      items: models.map((name) => ({
        id: `model:${name}`,
        label: name,
        facet: { key: "model", value: state.model === name ? "" : name },
        active: state.model === name,
      })),
      treeKeys: ["brand", "model"],
    };
  }

  if (brands.length) {
    return {
      crumbs,
      items: brands.map((name) => ({
        id: `brand:${name}`,
        label: name,
        facet: { key: "brand", value: state.brand === name ? "" : name },
        active: state.brand === name,
      })),
      treeKeys: ["brand"],
    };
  }

  if (rooms.length) {
    return {
      crumbs,
      items: rooms.map((name) => ({
        id: `rooms:${name}`,
        label: name,
        facet: { key: "rooms", value: state.rooms === name ? "" : name },
        active: state.rooms === name,
      })),
      treeKeys: ["rooms"],
    };
  }

  if (root === "tutors") {
    const subjects = tutorSubjectsFor(cat.id);
    if (subjects.length) {
      return {
        crumbs,
        items: subjects.map((name) => ({
          id: `subject:${name}`,
          label: name,
          facet: { key: "subject", value: state.subject === name ? "" : name },
          active: state.subject === name,
        })),
        treeKeys: ["subject"],
      };
    }
  }

  return { crumbs, items: [], treeKeys: [] };
}

export function countNavItem(
  listings: Listing[],
  fields: FilterField[],
  state: FilterState,
  item: FilterNavItem,
): number {
  if (item.href) {
    const node = findCategory(item.id);
    if (!node) return 0;
    return listings.filter((l) => listingMatchesDynamicFilters(l, state, fields) && listingMatchesCategory(l, node)).length;
  }
  if (!item.facet) return 0;
  const next = applyFilterChange(state, item.facet.key, item.facet.value);
  return listings.filter((l) => listingMatchesDynamicFilters(l, next, fields)).length;
}

export function countActiveFilters(state: FilterState) {
  return Object.values(state).filter((v) => v && v !== "all").length;
}

const FACET_CAP = 800;

export function countFilterOption(
  listings: Listing[],
  fields: FilterField[],
  state: FilterState,
  key: string,
  value: string,
) {
  if (listings.length > FACET_CAP) return undefined;
  const next = applyFilterChange(state, key, value);
  return listings.filter((l) => listingMatchesDynamicFilters(l, next, fields)).length;
}

function norm(s: string) {
  return s.toLocaleLowerCase("tr").replace(/\s+/g, "").replace("m²", "m2");
}

export function specOf(listing: Listing, keys?: string[]) {
  if (!keys?.length) return undefined;
  const set = new Set(keys.map(norm));
  const hit = listing.specs.find((s) => set.has(norm(s.label)));
  return hit?.value;
}

function digits(raw?: string) {
  if (!raw) return undefined;
  const d = raw.replace(/[^\d]/g, "");
  if (!d) return undefined;
  return Number(d);
}

function listingYear(listing: Listing) {
  const fromSpec = digits(specOf(listing, ["Yıl", "Year"]));
  if (fromSpec && fromSpec > 1900) return fromSpec;
  const m = listing.subtitle.match(/(19|20)\d{2}/);
  return m ? Number(m[0]) : undefined;
}

function listingKm(listing: Listing) {
  const fromSpec = digits(specOf(listing, ["Km", "Kilometre"]));
  if (fromSpec !== undefined) return fromSpec;
  const m = listing.subtitle.match(/([\d.]+)\s*km/i);
  return m ? digits(m[1]) : undefined;
}

function inRange(value: number | undefined, min?: string, max?: string) {
  if (value === undefined) return !(min || max);
  if (min && value < Number(min)) return false;
  if (max && value > Number(max)) return false;
  return true;
}

function textMatch(hay?: string, needle?: string) {
  if (!needle) return true;
  if (!hay) return false;
  return norm(hay).includes(norm(needle)) || norm(needle).includes(norm(hay));
}

export function resolvedOptions(field: FilterField, state: FilterState) {
  const kind = field.catalogKind ?? "auto";
  if (field.optionSource === "vehicleModels") return modelsOfBrand(state.brand, kind);
  if (field.optionSource === "vehiclePackages") return packagesOfModel(state.brand, state.model, kind);
  if (field.optionSource === "vehicleEngines") return enginesOfModel(state.brand, state.model, kind);
  if (field.optionSource === "vehicleBodies") return bodiesOfModel(state.brand, state.model, kind);
  if (field.optionSource === "vehicleRanges") return rangesOfModel(state.brand, state.model, kind);
  if (field.optionSource === "neighborhoods") return mahallelerOf(state.city, state.district);
  if (field.optionSource === "catalogModels") {
    return extraModelsFor({ id: field.catalogId ?? "" }, state.brand);
  }
  if (field.optionSource === "catalogTrims") {
    return extraTrimsFor({ id: field.catalogId ?? "" }, state.brand, state.model);
  }
  if (field.kind === "district") return districtOptions(state.city);
  return field.options ?? [];
}

export function applyFilterChange(prev: FilterState, key: string, value: string): FilterState {
  const next = { ...prev, [key]: value };
  if (key === "brand") {
    next.model = "";
    next.trim = "";
    next.engine = "";
    next.body = "";
    next.series = "";
    next.range = "";
    next.gear = "";
    next.drive = "";
    next.power = "";
  }
  if (key === "model" || key === "trim") {
    next.trim = key === "model" ? "" : next.trim;
    next.engine = "";
    next.body = "";
    next.range = "";
    next.gear = "";
    next.drive = "";
    next.power = "";
  }
  if (key === "engine") {
    next.body = "";
    next.range = "";
    next.gear = "";
    next.drive = "";
  }
  if (key === "body") {
    next.drive = "";
  }
  if (key === "city") {
    next.district = "";
    next.neighborhood = "";
  }
  if (key === "district") next.neighborhood = "";
  return next;
}

export function listingMatchesDynamicFilters(listing: Listing, state: FilterState, fields: FilterField[]) {
  if (state.city && listing.city !== state.city) return false;
  if (state.district && listing.district !== state.district) return false;
  if (state.mappedOnly === "1" && !(listing.city && listing.district)) return false;
  const postedHours = postedFilterHours(state.posted);
  if (postedHours && Date.now() - listingPostedAt(listing) > postedHours * 3_600_000) return false;
  if (state.keyword) {
    const ok =
      state.includeDesc === "1"
        ? listingMatchesTextQuery(listing, state.keyword)
        : listingMatchesTitleQuery(listing, state.keyword);
    if (!ok) return false;
  }
  if (state.neighborhood) {
    const got = listing.neighborhood || specOf(listing, ["Mahalle"]);
    if (!textMatch(got, state.neighborhood) && !textMatch(listing.title, state.neighborhood)) return false;
  }
  if (!inRange(listing.price, state.priceMin, state.priceMax)) return false;
  if (state.urgent === "1" && !listing.urgent) return false;
  if (state.seller === "Bireysel" && listing.sellerBusiness) return false;
  if (state.seller === "Kurumsal" && !listing.sellerBusiness) return false;
  if (state.renoSub) {
    const ids = state.renoSub.split(",").filter(Boolean);
    if (ids.length && !ids.includes(listing.categoryId)) return false;
  }
  if (state.hours24 === "1") {
    const bag = listing.features ?? [];
    const ok = bag.some((f) => f.includes("7/24") || f.toLocaleLowerCase("tr").includes("24/7"));
    if (!ok) return false;
  }

  for (const field of fields) {
    if (field.kind === "text") {
      if (field.key === "keyword") continue;
      const wanted = state[field.key];
      if (wanted && !listingMatchesTextQuery(listing, wanted)) return false;
    }
    if (field.key === "posted") continue;
    if (field.kind === "select") {
      const wanted = state[field.key];
      if (!wanted) continue;
      const specKeys = field.specKeys?.length
        ? field.specKeys
        : [field.key, "Marka", "Brand", "Model", "Ürün"];
      const got = specOf(listing, specKeys);
      const blob = [got, listing.title, listing.subtitle, ...listing.specs.map((s) => `${s.label} ${s.value}`)]
        .filter(Boolean)
        .join(" ");
      if (field.optionSource === "vehicleModels") {
        if (textMatch(blob, wanted)) continue;
        if (packagesOfModel(state.brand, wanted).some((p) => textMatch(blob, p))) continue;
        return false;
      }
      if (field.key === "furnished") {
        const evet = wanted === "Evet";
        const hayir = wanted === "Hayır";
        if (evet && (textMatch(got, "Evet") || textMatch(got, "Eşyalı") || textMatch(blob, "Eşyalı"))) continue;
        if (hayir && (textMatch(got, "Hayır") || textMatch(got, "Eşyasız") || textMatch(blob, "Eşyasız"))) continue;
        if (!evet && !hayir && textMatch(blob, wanted)) continue;
        return false;
      }
      if (!wanted.split(",").filter(Boolean).some((w) => textMatch(blob, w))) return false;
    }
    if (field.kind === "multi") {
      const wanted = (state[field.key] ?? "").split(",").filter(Boolean);
      if (!wanted.length) continue;
      if (field.key === "product") {
        const got = specOf(listing, field.specKeys?.length ? field.specKeys : ["Ürün"]);
        const blob = [got, listing.title, listing.subtitle].filter(Boolean).join(" ");
        if (!wanted.some((w) => textMatch(blob, w))) return false;
        continue;
      }
      const bag = new Set((listing.features ?? []).map((x) => x.toLocaleLowerCase("tr")));
      const ok = wanted.every((w) => bag.has(w.toLocaleLowerCase("tr")) || textMatch(listing.specs.map((s) => s.label).join(" "), w));
      if (!ok) return false;
    }
    if (field.key === "hasVideo" && state.hasVideo === "1") {
      const bag = listing.features ?? [];
      if (!bag.some((f) => f.toLocaleLowerCase("tr") === "video")) return false;
    }
    if (field.key === "hasPhoto" && state.hasPhoto === "1") {
      if (!listing.images?.length) return false;
    }
    if (field.kind === "range" && field.pairKey && field.key.endsWith("Min")) {
      const min = state[field.key];
      const max = state[field.pairKey];
      if (!min && !max) continue;
      let value: number | undefined;
      if (field.key.startsWith("year")) value = listingYear(listing);
      else if (field.key.startsWith("km")) value = listingKm(listing);
      else if (field.key.startsWith("hours")) value = digits(specOf(listing, field.specKeys));
      else if (field.key.startsWith("sqm")) value = digits(specOf(listing, field.specKeys));
      else if (field.key.startsWith("price")) value = listing.price;
      else value = digits(specOf(listing, field.specKeys));
      if (!inRange(value, min, max)) return false;
    }
  }
  return true;
}

export function districtOptions(city?: string) {
  if (!city) return [];
  return districtsOf(city);
}

export const YEAR_OPTIONS = YEARS;
export const KM_PRESETS = ["25000", "50000", "100000", "150000", "200000"];
export const PRICE_PRESETS = ["5000", "25000", "100000", "500000", "1000000"];
export const SQM_PRESETS = ["50", "80", "100", "150", "200"];
export const HOURS_PRESETS = ["500", "1000", "2500", "5000", "10000"];
