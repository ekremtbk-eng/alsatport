import { brandsForCategory, lookupCategory, rootOf } from "@/data/categories";
import {
  APPLIANCE_BRANDS,
  AUDIO_BRANDS,
  AUTO_ACC_BRANDS,
  AUTO_PART_PRODUCTS,
  AUTO_PART_VEHICLE_TYPES,
  BATHS,
  BUILDING_AGES,
  brandNamesForSegment,
  CAMERA_BRANDS,
  CAMERA_TYPES,
  COLORS,
  COMPUTER_BRANDS,
  CONNECTIVITY,
  DEAL_TYPES,
  DEAL_TYPES_HOME,
  DEAL_TYPES_OFFICE,
  DEED_STATUS,
  FLOOR_COUNTS,
  FURNISHED_YN,
  LISTING_FROM,
  USAGE_STATUS,
  DASHCAM_BRANDS,
  DASHCAM_CH,
  DASHCAM_RES,
  FUELS,
  GEARS,
  HEATING,
  HELMET_BRANDS,
  HELMET_FEATURES,
  HELMET_TYPES,
  MOTO_BOOT_SIZES,
  MOTO_GEAR_BRANDS,
  MOTO_JACKET_FEATURES,
  MACHINE_BRANDS,
  PART_BRANDS,
  PART_FROM,
  PHONE_BRANDS,
  PRODUCT_CONDITIONS,
  RENT_PERIODS,
  ROOMS,
  SEA_NAV_BRANDS,
  SEA_EQUIP_BRANDS,
  SEA_EQUIP_FEATURES,
  isSeaEquipCategoryId,
  seaEquipProductsFor,
  STORAGES,
  TIRE_BRANDS,
  TIRE_SIZES,
  TV_BRANDS,
  SWAP_YN,
  USED_PART,
  JOB_WORK_MODES,
  JOB_EDUCATION,
  JOB_EXPERIENCE_LEVELS,
  JOB_PLACES,
  vehicleSegmentFromCategoryId,
  vehicleProfileFromCategoryId,
  type VehicleSegment,
  type VehicleProfile,
  WATCH_BRANDS,
  YEARS,
  CLASSIC_YEARS,
  CYLINDERS,
  COOLING_TYPES,
  MOTO_GEARS,
  FAST_CHARGE,
  PAYLOADS,
  GVW,
  AIRCRAFT_TYPES,
  DAMAGE_KINDS,
  DISABLED_KITS,
  BERTHS,
  COMMERCIAL_BODIES,
  ZONING,
  kimdenOptionsForRoot,
  VEHICLE_FROM,
} from "@/data/listingOptions";
import { TUTOR_PLACES, tutorLevelsFor, tutorSubjectsFor } from "@/data/tutorOptions";

export type AttrKind = "text" | "number" | "select" | "search" | "cascade";
export type CascadeSource = "vehicleModels" | "vehiclePackages" | "vehicleEngines" | "vehicleBodies" | "vehicleRanges";

export type AttrField = {
  key: string;
  label: string;
  specLabel: string;
  kind: AttrKind;
  options?: string[];
  required?: boolean;
  dependsOn?: string;
  optionSource?: CascadeSource;
  catalogKind?: VehicleSegment;
  searchable?: boolean;
};

export type FeatureGroup = {
  id: string;
  title: string;
  items: string[];
};

export type ListingSchema = {
  family: "vasita" | "emlak" | "urun" | "makine" | "hizmet" | "diger";
  chassis: boolean;
  fields: AttrField[];
  groups: FeatureGroup[];
  catalogKind?: VehicleSegment;
};

export type ChassisStatus = "original" | "painted" | "changed" | "local";

export const CHASSIS_CYCLE: ChassisStatus[] = ["original", "painted", "changed", "local"];

export const CHASSIS_PARTS: { id: string; label: string }[] = [
  { id: "frontBumper", label: "Ön Tampon" },
  { id: "hood", label: "Kaput" },
  { id: "roof", label: "Tavan" },
  { id: "trunk", label: "Bagaj Kapağı" },
  { id: "rearBumper", label: "Arka Tampon" },
  { id: "lfFender", label: "Sol Ön Çamurluk" },
  { id: "lfDoor", label: "Sol Ön Kapı" },
  { id: "lrDoor", label: "Sol Arka Kapı" },
  { id: "lrQuarter", label: "Sol Arka Çamurluk" },
  { id: "rfFender", label: "Sağ Ön Çamurluk" },
  { id: "rfDoor", label: "Sağ Ön Kapı" },
  { id: "rrDoor", label: "Sağ Arka Kapı" },
  { id: "rrQuarter", label: "Sağ Arka Çamurluk" },
];

export const ENGINE_POWERS = [
  "75 hp",
  "90 hp",
  "110 hp",
  "136 hp",
  "150 hp",
  "184 hp",
  "190 hp",
  "245 hp",
  "306 hp",
  "340+ hp",
];
export const DRIVES = ["Önden çekiş", "Arkadan itiş", "4WD", "AWD"];
export const PROPERTY_TYPES = [
  "Daire",
  "Rezidans",
  "Müstakil Ev",
  "Villa",
  "Çiftlik Evi",
  "Köşk & Konak",
  "Yalı",
  "Yalı Dairesi",
  "Yazlık",
];
export const FACADES = [
  "Kuzey",
  "Güney",
  "Doğu",
  "Batı",
  "Kuzey-Doğu",
  "Kuzey-Batı",
  "Güney-Doğu",
  "Güney-Batı",
];
export const YES_NO = ["Var", "Yok"];
export const PARKING = ["Açık Otopark", "Kapalı Otopark", "Açık & Kapalı", "Yok"];
export const CREDIT = ["Evet", "Hayır"];
export const BALCONY = ["Var", "Yok", "Fransız", "Teras"];
export const FLOORS = [
  "Bodrum",
  "Zemin",
  "Giriş",
  "Bahçe",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10+",
  "Çatı",
];

export const VEHICLE_SAFETY = [
  "ABS",
  "ESP",
  "ASR",
  "Hava Yastığı (Sürücü)",
  "Hava Yastığı (Yolcu)",
  "Hava Yastığı (Yan)",
  "Hava Yastığı (Perde)",
  "Isofix",
  "Çocuk Kilidi",
  "Yokuş Kalkış Desteği",
  "Yokuş İniş Desteği",
  "Şerit Takip Sistemi",
  "Şerit Değiştirme Asistanı",
  "Kör Nokta Uyarı",
  "Yorgunluk Tespiti",
  "Hız Sabitleyici",
  "Adaptif Cruise Control",
  "Çarpışma Önleyici",
  "Park Asistanı",
  "Geri Görüş Kamerası",
  "Ön Radar",
  "Arka Radar",
  "360° Kamera",
  "Immobilizer",
  "Alarm",
  "Merkezi Kilit",
];

export const VEHICLE_INTERIOR = [
  "Deri Koltuk",
  "Kumaş Koltuk",
  "Alcantara",
  "Elektrikli Koltuk",
  "Isıtmalı Koltuk",
  "Havalandırmalı Koltuk",
  "Bellekli Koltuk",
  "Masajlı Koltuk",
  "Deri Direksiyon",
  "Isıtmalı Direksiyon",
  "Ahşap Kaplama",
  "Kumaş / Deri Mix",
  "Elektrikli Camlar",
  "Otomatik Klima",
  "Klima",
  "Start-Stop",
  "Keyless Go",
  "Yağmur Sensörü",
  "Far Sensörü",
  "Head-Up Display",
  "Kol Dayama",
  "Arka Kol Dayama",
  "Katlanır Koltuk",
  "3. Sıra Koltuk",
];

export const VEHICLE_EXTERIOR = [
  "Xenon Far",
  "LED Far",
  "LED Stop",
  "Sis Farı",
  "Adaptif Far",
  "Alaşım Jant",
  "Çelik Jant",
  "Sunroof",
  "Panoramik Cam Tavan",
  "Elektrikli Ayna",
  "Isıtmalı Ayna",
  "Katlanır Ayna",
  "Park Sensörü (Ön)",
  "Park Sensörü (Arka)",
  "Çeki Demiri",
  "Spoiler",
  "Cam Tavan",
  "Gündüz Farı",
];

export const VEHICLE_MEDIA = [
  "Dokunmatik Ekran",
  "Navigasyon",
  "Bluetooth",
  "USB",
  "AUX",
  "Apple CarPlay",
  "Android Auto",
  "CD Çalar",
  "DVD",
  "TV",
  "Hoparlör Sistemi",
  "Harman Kardon",
  "Bang & Olufsen",
  "Kablosuz Şarj",
];

export const ESTATE_INTERIOR = [
  "ADSL",
  "Fiber İnternet",
  "Wi-Fi",
  "Asansör",
  "Balkon",
  "Teras",
  "Beyaz Eşya",
  "Ankastre Mutfak",
  "Laminat Mutfak",
  "Duşakabin",
  "Hilton Banyo",
  "Jakuzi",
  "Ebeveyn Banyosu",
  "Giyinme Odası",
  "Çamaşır Odası",
  "Vestiyer",
  "Şömine",
  "Kartonpiyer",
  "Isıcam",
  "Spot Aydınlatma",
  "Panjur",
  "Ahşap Doğrama",
  "PVC Doğrama",
  "Mobilya",
  "Set Üstü Ocak",
];

export const ESTATE_EXTERIOR = [
  "Site İçerisinde",
  "Güvenlik",
  "Kamera Sistemi",
  "Kapıcı",
  "Otopark",
  "Kapalı Otopark",
  "Açık Otopark",
  "Yüzme Havuzu",
  "Çocuk Parkı",
  "Tenis Kortu",
  "Fitness",
  "Sauna",
  "Jeneratör",
  "Su Deposu",
  "Yangın Merdiveni",
  "Isı Yalıtımı",
  "Ses Yalıtımı",
  "Hidrofor",
];

export const ESTATE_NEIGHBORHOOD = [
  "Alışveriş Merkezi",
  "Belediye",
  "Cami",
  "Cemevi",
  "Eczane",
  "Hastane",
  "Market",
  "Park",
  "Polis Merkezi",
  "Sağlık Ocağı",
  "Semt Pazarı",
  "Spor Salonu",
  "Üniversite",
];

export const ESTATE_TRANSPORT = [
  "Anayol",
  "Cadde",
  "Deniz Otobüsü",
  "E-5",
  "TEM",
  "Metro",
  "Metrobüs",
  "Minibüs",
  "Otobüs Durağı",
  "Tramvay",
  "Tren İstasyonu",
  "Marmaray",
  "İskele",
  "Havalimanı",
];

export const ESTATE_VIEW = ["Boğaz", "Deniz", "Doğa", "Göl", "Havuz", "Park", "Şehir"];

export const ESTATE_HOUSING = [
  "Ara Kat",
  "Ara Kat Dubleks",
  "Bahçe Dublex",
  "Bahçe Katı",
  "Çatı Dubleks",
  "Ters Dubleks",
  "Tripleks",
  "En Üst Kat",
];

export const ESTATE_ACCESS = ["Engelliye Uygun", "Asansörlü", "Rampa", "Geniş Koridor"];

function f(
  key: string,
  label: string,
  kind: AttrKind,
  extra: Partial<AttrField> = {},
): AttrField {
  return { key, label, specLabel: extra.specLabel ?? label, kind, ...extra };
}

function vehicleFields(segment: VehicleSegment = "auto", profile: VehicleProfile = "auto"): AttrField[] {
  const brands = brandNamesForSegment(segment);
  const isAir = profile === "air";
  const isMotoLike = profile === "moto" || profile === "atv" || profile === "utv";
  const isEv = profile === "ev";
  const isDeniz = profile === "deniz";
  const isFleet = profile === "van" || profile === "ticari" || profile === "caravan";
  const skipTrim = isMotoLike || isDeniz || isAir;
  const skipKm = isDeniz || isAir;
  const skipFuel = isEv || isDeniz || isAir || isMotoLike;
  const skipGear = isDeniz || isAir;
  const skipPower = isEv || isMotoLike || isDeniz || isFleet || isAir;
  const skipDrive = isMotoLike || isDeniz || isEv || isAir || isFleet;
  const skipBody = isMotoLike || isAir;
  const years = profile === "classic" ? CLASSIC_YEARS : YEARS;
  const engineLabel = isEv
    ? "Batarya kapasitesi"
    : isMotoLike
      ? "Motor hacmi"
      : isFleet || isDeniz
        ? "Motor gücü"
        : "Motor hacmi";
  const bodyLabel = isDeniz ? "Tekne tipi" : "Kasa tipi";
  const engineParent = skipTrim ? "model" : "trim";

  if (isAir) {
    return [
      f("craft", "Hava aracı tipi", "select", { options: AIRCRAFT_TYPES, required: true, specLabel: "Tip" }),
      f("brand", "Marka", "text", { required: true }),
      f("model", "Model", "text", { required: true }),
      f("year", "Yıl", "select", { options: years, required: true }),
      f("hours", "Uçuş saati", "number", { specLabel: "Saat" }),
      f("color", "Renk", "select", { options: COLORS, required: true }),
    ];
  }

  const fields: AttrField[] = [
    f("brand", "Marka", "search", { options: brands, required: true, searchable: true, catalogKind: segment }),
    f("model", "Model", "cascade", {
      required: true,
      dependsOn: "brand",
      optionSource: "vehicleModels",
      searchable: true,
      catalogKind: segment,
    }),
  ];
  if (!skipTrim) {
    fields.push(
      f("trim", "Seri / Paket", "cascade", {
        required: true,
        dependsOn: "model",
        optionSource: "vehiclePackages",
        specLabel: "Paket",
        searchable: true,
        catalogKind: segment,
      }),
    );
  }
  fields.push(
    f("engine", engineLabel, "cascade", {
      dependsOn: engineParent,
      optionSource: "vehicleEngines",
      specLabel: isEv ? "Batarya" : isMotoLike ? "Motor hacmi" : "Motor",
      catalogKind: segment,
      searchable: true,
    }),
  );
  if (!skipBody) {
    fields.push(
      f("body", bodyLabel, isFleet ? "select" : "cascade", {
        ...(isFleet
          ? { options: COMMERCIAL_BODIES }
          : { dependsOn: "engine", optionSource: "vehicleBodies" as const }),
        specLabel: isDeniz ? "Tekne" : "Kasa",
        catalogKind: segment,
        required: isFleet,
      }),
    );
  }
  if (isEv) {
    fields.push(
      f("range", "Menzil (km)", "cascade", {
        dependsOn: "engine",
        optionSource: "vehicleRanges",
        specLabel: "Menzil",
        catalogKind: segment,
        searchable: true,
        required: true,
      }),
      f("charge", "Hızlı şarj süresi", "select", { options: FAST_CHARGE, specLabel: "Şarj" }),
    );
  }
  fields.push(f("year", "Yıl", "select", {
    options: years,
    required: true,
    dependsOn: skipBody ? "engine" : "body",
  }));
  if (!skipKm) fields.push(f("km", "Kilometre", "number", { required: true, specLabel: "Km" }));
  if (!skipGear) {
    fields.push(
      f("gear", "Vites", "select", {
        options: isMotoLike ? MOTO_GEARS : GEARS,
        required: true,
        specLabel: "Vites",
      }),
    );
  }
  if (!skipFuel) fields.push(f("fuel", "Yakıt", "select", { options: FUELS, required: true }));
  if (!skipPower) fields.push(f("power", "Motor gücü", "select", { options: ENGINE_POWERS, specLabel: "Motor gücü" }));
  if (!skipDrive) {
    fields.push(f("drive", "Çekiş", "select", { options: DRIVES }));
  }
  if (isMotoLike) {
    fields.push(
      f("cylinders", "Silindir sayısı", "select", { options: CYLINDERS, specLabel: "Silindir" }),
      f("cooling", "Soğutma tipi", "select", { options: COOLING_TYPES, specLabel: "Soğutma" }),
    );
  }
  if (isFleet) {
    fields.push(
      f("payload", "İstihap Haddi / Taşıma Kapasitesi", "select", {
        options: PAYLOADS,
        required: true,
        specLabel: "İstihap Haddi",
      }),
      f("gvw", "Azami Yüklü Ağırlık", "select", { options: GVW, specLabel: "Azami Yüklü Ağırlık" }),
    );
  }
  if (profile === "caravan") {
    fields.push(f("berths", "Yatak sayısı", "select", { options: BERTHS, specLabel: "Yatak" }));
  }
  if (profile === "rental") {
    fields.push(f("rentPeriod", "Kiralama süresi", "select", { options: RENT_PERIODS, specLabel: "Süre", required: true }));
  }
  if (profile === "damaged") {
    fields.push(
      f("damageKind", "Hasar türü", "select", { options: DAMAGE_KINDS, required: true, specLabel: "Hasar türü" }),
    );
  }
  if (profile === "disabled") {
    fields.push(f("kit", "Engelli donanımı", "select", { options: DISABLED_KITS, specLabel: "Donanım" }));
  }
  fields.push(f("color", "Renk", "select", { options: COLORS, required: true }));
  fields.push(
    f("kimden", "Kimden", "select", {
      options: VEHICLE_FROM,
      required: true,
      specLabel: "Kimden",
    }),
  );
  if (!isAir) {
    fields.push(
      f("damage", "Hasar kaydı", "select", {
        options: ["Yok", "Var", "Tramer sorgulanmadı"],
        required: profile === "damaged",
      }),
    );
  }
  return fields;
}

export function estateDealFromCategoryId(id: string): string | undefined {
  if (id.includes("gunluk")) return "Turistik Günlük Kiralık";
  if (id.includes("emlak-konut-devren") || id.includes("devren-satilik")) return "Devren Satılık Konut";
  if (id.includes("devren") && id.includes("kiralik")) return "Devren Kiralık";
  if (id.includes("devren")) return "Devren Satılık";
  if (id.includes("kiralik")) return "Kiralık";
  if (id.includes("satilik")) return "Satılık";
  return undefined;
}

export function estateHomeTypeFromCategoryId(id: string): string | undefined {
  if (id.includes("yali-dairesi")) return "Yalı Dairesi";
  if (id.endsWith("-yali") || id.includes("-yali-")) return "Yalı";
  if (id.includes("kosk")) return "Köşk & Konak";
  if (id.includes("ciftlik")) return "Çiftlik Evi";
  if (id.includes("mustakil")) return "Müstakil Ev";
  if (id.includes("yazlik")) return "Yazlık";
  if (id.includes("villa")) return "Villa";
  if (id.includes("residence") || id.includes("rezidans")) return "Rezidans";
  if (id.includes("daire")) return "Daire";
  return undefined;
}

function estateFields(kind: "home" | "land" | "office", categoryId = ""): AttrField[] {
  const inferredDeal = estateDealFromCategoryId(categoryId);
  const inferredType = estateHomeTypeFromCategoryId(categoryId);
  const dealOpts = kind === "home" ? DEAL_TYPES_HOME : DEAL_TYPES_OFFICE;
  const deal = inferredDeal
    ? []
    : [f("deal", "İlan tipi", "select", { options: kind === "land" ? DEAL_TYPES : dealOpts, required: true })];
  const kimden = f("kimden", "Kimden", "select", { options: LISTING_FROM, specLabel: "Kimden" });
  if (kind === "land") {
    return [
      ...deal,
      f("sqm", "m²", "number", { required: true }),
      f("zoning", "İmar durumu", "select", { options: ZONING }),
      kimden,
    ];
  }
  const core: AttrField[] = [
    ...deal,
    ...(inferredType
      ? []
      : [f("homeType", "Emlak tipi", "select", { options: PROPERTY_TYPES, required: true, specLabel: "Emlak tipi" })]),
    f("sqm", "Brüt m²", "number", { required: true, specLabel: "m²" }),
    f("sqmNet", "Net m²", "number", { specLabel: "Net m²" }),
    f("rooms", "Oda sayısı", "select", { options: ROOMS, required: true, specLabel: "Oda" }),
    f("age", "Bina yaşı", "select", { options: BUILDING_AGES, required: true, specLabel: "Bina yaşı" }),
    f("floorCount", "Kat sayısı", "select", { options: FLOOR_COUNTS, specLabel: "Kat sayısı" }),
    f("floor", "Bulunduğu kat", "select", { options: FLOORS, specLabel: "Kat" }),
    f("heating", "Isıtma", "select", { options: HEATING }),
    f("bath", "Banyo sayısı", "select", { options: BATHS, specLabel: "Banyo" }),
    f("balcony", "Balkon", "select", { options: BALCONY }),
    f("elevator", "Asansör", "select", { options: YES_NO }),
    f("parking", "Otopark", "select", { options: PARKING }),
    f("furnished", "Eşyalı", "select", { options: FURNISHED_YN, specLabel: "Eşyalı" }),
    f("usage", "Kullanım durumu", "select", { options: USAGE_STATUS, specLabel: "Kullanım durumu" }),
    f("site", "Site içerisinde", "select", { options: CREDIT, specLabel: "Site içerisinde" }),
    f("credit", "Krediye uygun", "select", { options: CREDIT }),
    f("deed", "Tapu durumu", "select", { options: DEED_STATUS, specLabel: "Tapu durumu" }),
    kimden,
    f("facade", "Cephe", "select", { options: FACADES }),
  ];
  if (kind === "office") {
    return core.filter((x) => !["rooms", "furnished", "usage"].includes(x.key));
  }
  return core;
}

type ServiceHub = "reno" | "move" | "auto" | "repair" | "event" | "other" | "";

function serviceHubOf(id: string): ServiceHub {
  if (id.includes("services-reno")) return "reno";
  if (id.includes("services-move")) return "move";
  if (id.includes("services-auto")) return "auto";
  if (id.includes("services-repair")) return "repair";
  if (id.includes("services-event")) return "event";
  if (id.includes("services-other")) return "other";
  return "";
}

function serviceFields(id: string): AttrField[] {
  const hub = serviceHubOf(id);
  const fields: AttrField[] = [
    f("place", "Yerinde hizmet / İş yeri", "select", {
      options: ["Yerinde hizmet", "İş yeri", "Her ikisi", "Uzaktan / Online"],
      specLabel: "Hizmet yeri",
      required: true,
    }),
    f("hours", "Çalışma saatleri", "select", {
      options: ["Mesai (09–18)", "Esnek saat", "Akşam", "Hafta sonu", "7/24", "Randevu ile"],
      specLabel: "Çalışma",
      required: true,
    }),
    f("duration", "Hizmet süresi", "select", {
      options: ["1 saatten az", "1–3 saat", "Yarım gün", "1 gün", "Birkaç gün", "Keşif sonrası netleşir"],
      specLabel: "Süre",
    }),
    f("warranty", "Garanti veriliyor mu?", "select", {
      options: ["Evet", "Hayır", "İşçilik garantisi", "Parça + işçilik"],
      specLabel: "Garanti",
    }),
    f("exp", "Deneyim yılı", "select", {
      options: ["1 yıldan az", "1–3 yıl", "3–5 yıl", "5–10 yıl", "10+ yıl"],
      specLabel: "Deneyim",
    }),
    f("invoice", "Fatura", "select", {
      options: ["Kesilir", "Kesilmez", "İsteğe bağlı"],
      specLabel: "Fatura",
    }),
  ];

  if (hub === "reno") {
    fields.push(
      f("material", "Malzeme", "select", {
        options: ["Müşteri karşılar", "Usta karşılar", "Keşifte netleşir"],
        specLabel: "Malzeme",
      }),
      f("survey", "Keşif", "select", {
        options: ["Ücretsiz keşif", "Keşif ücretli", "Keşif yok"],
        specLabel: "Keşif",
      }),
    );
  }
  if (hub === "move") {
    fields.push(
      f("vehicle", "Araç tipi", "select", {
        options: ["Kamyonet", "Kamyon", "Tır", "Asansörlü kamyon"],
        specLabel: "Araç",
      }),
      f("pack", "Paketleme", "select", {
        options: ["Dahil", "Ücretli", "Müşteri yapar"],
        specLabel: "Paketleme",
      }),
    );
  }
  if (hub === "auto") {
    fields.push(
      f("auth", "Servis türü", "select", {
        options: ["Yetkili servis", "Özel servis", "Mobil servis"],
        specLabel: "Servis",
      }),
      f("appt", "Randevu", "select", {
        options: ["Randevusuz", "Randevu gerekli", "Aynı gün"],
        specLabel: "Randevu",
      }),
    );
  }
  if (hub === "repair") {
    fields.push(
      f("onsite", "Tamir yeri", "select", {
        options: ["Yerinde tamir", "Atölyede", "Her ikisi"],
        specLabel: "Tamir yeri",
      }),
      f("spare", "Yedek parça", "select", {
        options: ["Orijinal", "Muadil", "Müşteri getirir", "Keşifte netleşir"],
        specLabel: "Parça",
      }),
    );
  }
  if (hub === "event") {
    fields.push(
      f("capacity", "Kapasite", "select", {
        options: ["0–50 kişi", "50–150 kişi", "150–500 kişi", "500+ kişi"],
        specLabel: "Kapasite",
      }),
      f("venue", "Mekan", "select", {
        options: ["Müşteri mekânı", "Tesis / salon", "Açık alan", "Hibrit"],
        specLabel: "Mekan",
      }),
    );
  }
  return fields;
}

function serviceGroups(id: string): FeatureGroup[] {
  const hub = serviceHubOf(id);
  const groups: FeatureGroup[] = [
    {
      id: "offer",
      title: "Hizmet özellikleri",
      items: [
        "7/24 hizmet",
        "Keşif ücretsiz",
        "Fatura kesilir",
        "KDV dahil",
        "Sigortalı ekip",
        "Acil servis",
        "Kurumsal müşteri",
        "Online randevu",
        "Referans verilir",
      ],
    },
  ];
  if (hub === "reno") {
    groups.push({
      id: "reno",
      title: "Tadilat",
      items: ["Anahtar teslim", "Boya badana", "Su tesisatı", "Elektrik", "Alçıpan", "Parke", "Mutfak dolabı", "Banyo renovasyon"],
    });
  }
  if (hub === "move") {
    groups.push({
      id: "move",
      title: "Nakliye",
      items: ["Asansörlü araç", "Şehirler arası", "Eşya depolama", "Montaj / demontaj", "Sigortalı taşıma", "Ambalaj malzemesi"],
    });
  }
  if (hub === "auto") {
    groups.push({
      id: "auto",
      title: "Araç servis",
      items: ["Yedek araç", "Yol yardım", "Periyodik bakım", "Diagnostik", "Kaporta", "Lastik otel", "Klima gazı", "Yıkama"],
    });
  }
  if (hub === "repair") {
    groups.push({
      id: "repair",
      title: "Tamirat",
      items: ["Yerinde tamir", "Aynı gün teslim", "Orijinal parça", "Garantili işçilik", "Cihaz kargo ile"],
    });
  }
  if (hub === "event") {
    groups.push({
      id: "event",
      title: "Etkinlik",
      items: ["Mekan dekorasyonu", "Ses & ışık", "Fotoğraf / video", "Catering", "DJ", "Canlı müzik", "Nikah şekeri", "Organizasyon ekibi"],
    });
  }
  return groups;
}

function helperFields(id: string): AttrField[] {
  const fields: AttrField[] = [
    f("hours", "Çalışma düzeni", "select", {
      options: ["Tam gün", "Yarı zamanlı", "Saatlik", "Yatılı", "Günlük"],
      specLabel: "Çalışma",
      required: true,
    }),
    f("place", "Çalışma yeri", "select", {
      options: ["Evde", "İş yerinde", "Esnek"],
      specLabel: "Yer",
      required: true,
    }),
    f("exp", "Deneyim yılı", "select", {
      options: ["Deneyimsiz", "1–3 yıl", "3–5 yıl", "5+ yıl"],
      specLabel: "Deneyim",
    }),
  ];
  if (id.includes("child") || id.includes("elder")) {
    fields.push(
      f("livein", "Yatılı", "select", {
        options: ["Evet", "Hayır", "Görüşülür"],
        specLabel: "Yatılı",
      }),
    );
  }
  return fields;
}

const HELPER_GROUPS: FeatureGroup[] = [
  {
    id: "helper",
    title: "Nitelikler",
    items: ["Referanslı", "Sigara içmez", "Ehliyet var", "Yabancı dil", "İlk yardım", "Çocuk bakımı belgesi"],
  },
];

const TUTOR_GROUPS: FeatureGroup[] = [
  {
    id: "tutor",
    title: "Ders özellikleri",
    items: ["Deneme dersi", "Materyal dahil", "Ödev takibi", "Sınav koçluğu", "Sertifikalı eğitmen", "Grup dersi"],
  },
];

const JOB_GROUPS: FeatureGroup[] = [
  {
    id: "job",
    title: "Yan haklar",
    items: ["SGK", "Yemek", "Yol", "Servis", "Prim", "Uzaktan çalışma"],
  },
];

const VEHICLE_GROUPS: FeatureGroup[] = [
  { id: "safety", title: "Güvenlik", items: VEHICLE_SAFETY },
  { id: "interior", title: "İç Donanım", items: VEHICLE_INTERIOR },
  { id: "exterior", title: "Dış Donanım", items: VEHICLE_EXTERIOR },
  { id: "media", title: "Multimedya", items: VEHICLE_MEDIA },
];

const ESTATE_GROUPS: FeatureGroup[] = [
  { id: "in", title: "İç Özellikler", items: ESTATE_INTERIOR },
  { id: "out", title: "Dış Özellikler", items: ESTATE_EXTERIOR },
  { id: "hood", title: "Muhit", items: ESTATE_NEIGHBORHOOD },
  { id: "transit", title: "Ulaşım", items: ESTATE_TRANSPORT },
  { id: "view", title: "Manzara", items: ESTATE_VIEW },
  { id: "housing", title: "Konut Tipi", items: ESTATE_HOUSING },
  { id: "access", title: "Engelliye / Yaşlıya Uygun", items: ESTATE_ACCESS },
];

export const FILTER_VEHICLE_FEATURES = [
  "ABS",
  "ESP",
  "ASR",
  "Sunroof",
  "Navigasyon",
  "Deri Koltuk",
  "Geri Görüş Kamerası",
  "Apple CarPlay",
];

export const FILTER_ESTATE_FEATURES = [
  "Asansör",
  "Otopark",
  "Balkon",
  "Site İçerisinde",
  "Yüzme Havuzu",
  "Güvenlik",
  "Fiber İnternet",
];

export function partsVehicleTypeFromId(id: string): string | undefined {
  if (id.includes("gokart") || id.includes("go-kart")) return "Go Kart";
  if (id.includes("spare-karavan") || id.includes("yedek-karavan")) return "Karavan";
  if (id.includes("spare-ticari") || id.includes("yedek-ticari")) return "Ticari Araçlar";
  if (id.includes("spare-van") || id.includes("yedek-minivan")) return "Minivan & Panelvan";
  if (id.includes("spare-auto") || id.includes("yedek-otomobil")) return "Otomobil & Arazi Aracı";
  return undefined;
}

export function motoGearProductFromId(id: string): string | undefined {
  if (id.includes("gear-boots") || id.includes("ayakkabi")) return "Ayakkabı & Bot";
  if (id.includes("gear-helmet") || id.includes("moto-kask")) return "Kask";
  if (id.includes("gear-jacket") || id.includes("moto-mont")) return "Mont";
  if (id.includes("gear-pants") || id.includes("pantolon")) return "Pantolon";
  if (id.includes("gear-sweat") || id.includes("sweat")) return "Sweatshirt";
  if (id.includes("gear-tee") || id.includes("tisort")) return "Tişört";
  if (id.includes("gear-suit") || id.includes("tulum")) return "Tulum";
  if (id.includes("gear-rain") || id.includes("yagmurluk")) return "Yağmurluk";
  return undefined;
}

function seaEquipmentSchema(id: string): ListingSchema {
  const products = seaEquipProductsFor(id);
  const cond = f("cond", "Durumu", "select", { options: ["Sıfır", "İkinci El"], required: true, specLabel: "Durumu" });
  const kimden = f("kimden", "Kimden", "select", { options: PART_FROM, required: true, specLabel: "Kimden" });
  const swap = f("swap", "Takas", "select", { options: SWAP_YN, specLabel: "Takas" });
  return {
    family: "urun",
    chassis: false,
    fields: [
      f("product", "Ürün", "select", {
        options: products.length ? products : seaEquipProductsFor("parts-sea"),
        required: true,
        specLabel: "Ürün",
      }),
      f("brand", "Marka", "search", { options: SEA_EQUIP_BRANDS, searchable: true, specLabel: "Marka" }),
      kimden,
      swap,
      cond,
    ],
    groups: [{ id: "sea", title: "Detay Bilgisi", items: [...SEA_EQUIP_FEATURES] }],
  };
}

function motoGearFeatureGroup(product?: string): FeatureGroup {
  if (product === "Kask") return { id: "helmet", title: "Detay Bilgisi", items: [...HELMET_FEATURES] };
  if (product === "Mont" || product === "Tulum" || product === "Yağmurluk") {
    return { id: "jacket", title: "Detay Bilgisi", items: [...MOTO_JACKET_FEATURES] };
  }
  return { id: "gear", title: "Detay Bilgisi", items: ["Reflektör", "Su Geçirmez", "Kışlık"] };
}

function motoEquipmentSchema(id: string): ListingSchema {
  const cond = f("cond", "Durumu", "select", { options: ["Sıfır", "İkinci El"], required: true, specLabel: "Durumu" });
  const kimden = f("kimden", "Kimden", "select", { options: PART_FROM, required: true, specLabel: "Kimden" });
  const swap = f("swap", "Takas", "select", { options: SWAP_YN, specLabel: "Takas" });
  const product = motoGearProductFromId(id);
  const isHelmet = product === "Kask" || id.includes("helmet") || id.includes("kask");
  const isBoots = product === "Ayakkabı & Bot";
  const isGear = id.includes("gear") || id.includes("kask") || Boolean(product);

  if (isGear) {
    const fields: AttrField[] = [];
    if (!product) {
      fields.push(
        f("product", "Ürün", "select", {
          options: [
            "Ayakkabı & Bot",
            "Kask",
            "Mont",
            "Pantolon",
            "Sweatshirt",
            "Tişört",
            "Tulum",
            "Yağmurluk",
          ],
          required: true,
          specLabel: "Ürün",
        }),
      );
    }
    if (isHelmet || !product) {
      fields.push(f("kind", "Türü", "select", { options: HELMET_TYPES, specLabel: "Türü" }));
    }
    fields.push(
      f("brand", "Marka", "search", {
        options: isHelmet || !product ? HELMET_BRANDS : MOTO_GEAR_BRANDS,
        searchable: true,
        required: true,
        specLabel: "Marka",
      }),
      f("size", "Ölçü", "select", {
        options: isBoots ? MOTO_BOOT_SIZES : ["XS", "S", "M", "L", "XL", "XXL"],
        specLabel: "Ölçü",
      }),
      kimden,
      swap,
      cond,
    );
    return {
      family: "urun",
      chassis: false,
      fields,
      groups: [motoGearFeatureGroup(product)],
    };
  }
  if (id.includes("elec")) {
    return {
      family: "urun",
      chassis: false,
      fields: [
        f("brand", "Marka", "search", { options: [...HELMET_BRANDS, "Garmin", "Sena", "Cardo"], searchable: true }),
        kimden,
        swap,
        cond,
      ],
      groups: [],
    };
  }
  if (id.includes("tire")) {
    return {
      family: "urun",
      chassis: false,
      fields: [
        f("brand", "Marka", "search", { options: TIRE_BRANDS, searchable: true }),
        f("tireSize", "Ebat", "select", { options: TIRE_SIZES, specLabel: "Lastik" }),
        kimden,
        swap,
        cond,
      ],
      groups: [],
    };
  }
  if (id.includes("spare")) {
    return {
      family: "urun",
      chassis: false,
      fields: [
        f("brand", "Marka", "search", { options: brandNamesForSegment("moto"), searchable: true }),
        kimden,
        swap,
        cond,
      ],
      groups: [],
    };
  }
  return {
    family: "urun",
    chassis: false,
    fields: [f("brand", "Marka", "search", { options: AUTO_ACC_BRANDS, searchable: true }), kimden, swap, cond],
    groups: [],
  };
}

function autoSpareFields(categoryId: string): AttrField[] {
  const inferredType = partsVehicleTypeFromId(categoryId);
  const fields: AttrField[] = [];
  if (!inferredType) {
    fields.push(
      f("vehicleType", "Tipi", "select", {
        options: AUTO_PART_VEHICLE_TYPES,
        required: true,
        specLabel: "Tipi",
      }),
    );
  }
  fields.push(
    f("product", "Ürün", "select", { options: AUTO_PART_PRODUCTS, required: true, specLabel: "Ürün" }),
    f("brand", "Araç Markası", "search", {
      options: brandNamesForSegment("auto"),
      searchable: true,
      required: true,
      specLabel: "Araç Markası",
      catalogKind: "auto",
    }),
    f("model", "Araç Serisi", "cascade", {
      optionSource: "vehicleModels",
      dependsOn: "brand",
      specLabel: "Araç Serisi",
      catalogKind: "auto",
    }),
    f("partBrand", "Ürün Markası", "select", { options: PART_BRANDS, specLabel: "Ürün Markası" }),
    f("kimden", "Kimden", "select", { options: PART_FROM, required: true, specLabel: "Kimden" }),
    f("usedPart", "Çıkma Yedek Parça", "select", { options: USED_PART, required: true, specLabel: "Çıkma Yedek Parça" }),
    f("cond", "Durumu", "select", { options: ["Sıfır", "İkinci El"], required: true, specLabel: "Durumu" }),
  );
  return fields;
}

function withKimden(schema: ListingSchema, root: string): ListingSchema {
  if (schema.fields.some((field) => field.key === "kimden")) return schema;
  return {
    ...schema,
    fields: [
      ...schema.fields,
      f("kimden", "Kimden", "select", {
        options: kimdenOptionsForRoot(root),
        required: root === "vasita",
        specLabel: "Kimden",
      }),
    ],
  };
}

export function schemaForCategoryId(categoryId: string): ListingSchema {
  const cat = lookupCategory(categoryId);
  return withKimden(buildSchemaForCategoryId(categoryId), cat ? rootOf(cat).id : categoryId);
}

function buildSchemaForCategoryId(categoryId: string): ListingSchema {
  const cat = lookupCategory(categoryId);
  const root = cat ? rootOf(cat).id : categoryId;
  const id = cat?.id ?? categoryId;

  if (root === "vasita") {
    const segment = vehicleSegmentFromCategoryId(id);
    const profile = vehicleProfileFromCategoryId(id);
    const chassis = !["moto", "atv", "utv", "deniz", "air"].includes(profile);
    const groups =
      profile === "deniz" || profile === "air"
        ? []
        : profile === "moto" || profile === "atv" || profile === "utv"
          ? VEHICLE_GROUPS.filter((g) => g.id === "safety" || g.id === "media")
          : VEHICLE_GROUPS;
    return { family: "vasita", chassis, fields: vehicleFields(segment, profile), groups, catalogKind: segment };
  }

  if (root === "emlak" || id === "estate") {
    if (id.includes("arsa")) {
      return { family: "emlak", chassis: false, fields: estateFields("land", id), groups: ESTATE_GROUPS.filter((g) => g.id === "hood" || g.id === "transit") };
    }
    if (id.includes("isyeri") || id.includes("turistik") || (id.includes("emlak-bina") && !id.includes("konut"))) {
      return { family: "emlak", chassis: false, fields: estateFields("office", id), groups: ESTATE_GROUPS };
    }
    return { family: "emlak", chassis: false, fields: estateFields("home", id), groups: ESTATE_GROUPS };
  }

  if (root === "machines") {
    return {
      family: "makine",
      chassis: false,
      fields: [
        f("brand", "Marka", "search", { options: MACHINE_BRANDS, searchable: true }),
        f("year", "Yıl", "select", { options: YEARS }),
        f("hours", "Çalışma saati", "number"),
        f("fuel", "Yakıt", "select", { options: ["Dizel", "Elektrik", "Hibrit", "LPG", "Benzin"], specLabel: "Yakıt" }),
        f("cond", "Durum", "select", { options: PRODUCT_CONDITIONS }),
      ],
      groups: [],
    };
  }

  const cond = f("cond", "Durum", "select", { options: PRODUCT_CONDITIONS });
  const color = f("color", "Renk", "select", { options: COLORS });

  if (root === "parts") {
    if (isSeaEquipCategoryId(id)) {
      return seaEquipmentSchema(id);
    }
    if (id.startsWith("parts-moto")) {
      return motoEquipmentSchema(id);
    }
    if (id.includes("gear") || id.includes("kask")) {
      return motoEquipmentSchema(id);
    }
    if (id.includes("cam")) {
      return {
        family: "urun",
        chassis: false,
        fields: [
          f("brand", "Marka", "search", { options: DASHCAM_BRANDS, searchable: true }),
          f("resolution", "Çözünürlük", "select", { options: DASHCAM_RES }),
          f("channels", "Kanal", "select", { options: DASHCAM_CH }),
          f("connect", "Bağlantı", "select", { options: CONNECTIVITY }),
          cond,
        ],
        groups: [],
      };
    }
    if (id.includes("audio") || id.includes("media") || id.includes("amp")) {
      return {
        family: "urun",
        chassis: false,
        fields: [f("brand", "Marka", "search", { options: AUDIO_BRANDS, searchable: true }), cond, color],
        groups: [],
      };
    }
    if (id.includes("tire")) {
      return {
        family: "urun",
        chassis: false,
        fields: [
          f("brand", "Marka", "search", { options: TIRE_BRANDS, searchable: true }),
          f("tireSize", "Ebat", "select", { options: TIRE_SIZES, specLabel: "Lastik" }),
          cond,
        ],
        groups: [],
      };
    }
    if (id.includes("acc")) {
      return {
        family: "urun",
        chassis: false,
        fields: [f("brand", "Marka", "search", { options: AUTO_ACC_BRANDS, searchable: true }), cond, color],
        groups: [],
      };
    }
    if (id.includes("sea") && id.includes("nav")) {
      return {
        family: "urun",
        chassis: false,
        fields: [
          f("brand", "Marka", "search", { options: SEA_NAV_BRANDS, searchable: true }),
          f("connect", "Bağlantı", "select", { options: CONNECTIVITY }),
          cond,
        ],
        groups: [],
      };
    }
    if (id.includes("spare") && id.includes("moto")) {
      return {
        family: "urun",
        chassis: false,
        fields: [f("brand", "Marka", "search", { options: brandNamesForSegment("moto"), searchable: true }), cond],
        groups: [],
      };
    }
    if (id.includes("spare")) {
      return {
        family: "urun",
        chassis: false,
        fields: autoSpareFields(id),
        groups: [],
        catalogKind: "auto",
      };
    }
    return { family: "urun", chassis: false, fields: [cond], groups: [] };
  }

  if (root === "shopping") {
    const catalogBrands = cat ? brandsForCategory(cat) : [];
    const brandField = catalogBrands.length
      ? f("brand", "Marka", "search", { options: catalogBrands, searchable: true, required: true })
      : null;
    if (id.includes("phone") || id === "phones") {
      return {
        family: "urun",
        chassis: false,
        fields: [
          brandField ?? f("brand", "Marka", "search", { options: PHONE_BRANDS, searchable: true }),
          f("model", "Model", "text"),
          cond,
          f("storage", "Hafıza", "select", { options: STORAGES }),
          color,
        ],
        groups: [],
      };
    }
    if (id.includes("computer") || id.includes("gamer")) {
      return {
        family: "urun",
        chassis: false,
        fields: [
          brandField ?? f("brand", "Marka", "search", { options: COMPUTER_BRANDS, searchable: true }),
          f("model", "Model", "text"),
          cond,
          f("cpu", "İşlemci", "select", { options: ["Intel i3", "Intel i5", "Intel i7", "Intel i9", "AMD Ryzen 5", "AMD Ryzen 7", "AMD Ryzen 9", "Apple M3", "Apple M4"], specLabel: "İşlemci" }),
          f("ram", "RAM", "select", { options: ["8 GB", "16 GB", "32 GB", "64 GB"], specLabel: "RAM" }),
          f("gpu", "Ekran kartı", "select", { options: ["Entegre", "NVIDIA RTX 4050", "NVIDIA RTX 4060", "NVIDIA RTX 4070", "NVIDIA RTX 4080", "AMD Radeon"], specLabel: "Ekran kartı" }),
          f("storage", "Hafıza", "select", { options: STORAGES }),
          color,
        ],
        groups: [],
      };
    }
    if (id.includes("watch") || id.includes("jewel") || id.includes("mucevher")) {
      return {
        family: "urun",
        chassis: false,
        fields: [
          brandField ?? f("brand", "Marka", "search", { options: WATCH_BRANDS, searchable: true }),
          cond,
          color,
        ],
        groups: [],
      };
    }
    if (id.includes("camera") || id.includes("lens")) {
      return {
        family: "urun",
        chassis: false,
        fields: [
          brandField ?? f("brand", "Marka", "search", { options: CAMERA_BRANDS, searchable: true }),
          f("camType", "Kamera tipi", "select", { options: CAMERA_TYPES, specLabel: "Kamera tipi" }),
          cond,
          color,
        ],
        groups: [],
      };
    }
    if (id.includes("home-el") || id.includes("tech") || id.includes("elektronik") || id.includes("goruntu")) {
      return {
        family: "urun",
        chassis: false,
        fields: [brandField ?? f("brand", "Marka", "search", { options: TV_BRANDS, searchable: true }), cond],
        groups: [],
      };
    }
    if (id.includes("appliance") || id.includes("alet") || id.includes("beyaz") || id.includes("kucuk-ev")) {
      return {
        family: "urun",
        chassis: false,
        fields: [brandField ?? f("brand", "Marka", "search", { options: APPLIANCE_BRANDS, searchable: true }), cond],
        groups: [],
      };
    }
    if (id.includes("mobilya") || id.includes("decor") || id.includes("fashion") || id.includes("baby") || id.includes("giyim")) {
      return {
        family: "urun",
        chassis: false,
        fields: [...(brandField ? [brandField] : []), cond, color],
        groups: [],
      };
    }
    return {
      family: "urun",
      chassis: false,
      fields: [...(brandField ? [brandField] : []), cond, color],
      groups: [],
    };
  }

  if (root === "services" || id === "services" || id.startsWith("services-")) {
    return {
      family: "hizmet",
      chassis: false,
      fields: serviceFields(id),
      groups: serviceGroups(id),
    };
  }

  if (root === "helpers" || id.startsWith("helpers")) {
    return {
      family: "hizmet",
      chassis: false,
      fields: helperFields(id),
      groups: HELPER_GROUPS,
    };
  }

  if (root === "pets") {
    return {
      family: "urun",
      chassis: false,
      fields: [
        f("species", "Hayvan", "select", {
          options: ["Kedi", "Köpek", "Kuş", "Balık", "Kemirgen", "Sürüngen", "At", "Diğer"],
          specLabel: "Hayvan",
        }),
        f("petKind", "Ürün türü", "select", {
          options: ["Yem & Mama", "Kafes & Kulübe", "Tasma & Gezdirme", "Akvaryum", "Bakım & Hijyen", "Aksesuar"],
          specLabel: "Ürün",
        }),
        cond,
      ],
      groups: [],
    };
  }

  if (root === "tutors") {
    return {
      family: "diger",
      chassis: false,
      fields: [
        f("subject", "Ders / Branş", "select", {
          options: tutorSubjectsFor(id),
          specLabel: "Ders",
          required: true,
        }),
        f("level", "Seviye / Sınıf", "select", {
          options: tutorLevelsFor(id),
          specLabel: "Seviye",
          required: true,
        }),
        f("place", "Dersin işleneceği yer", "select", {
          options: [...TUTOR_PLACES],
          specLabel: "Yer",
          required: true,
        }),
      ],
      groups: TUTOR_GROUPS,
    };
  }

  if (root === "jobs") {
    if (id === "jobs-beauty" || id.startsWith("jobs-beauty-")) {
      return {
        family: "diger",
        chassis: false,
        fields: [
          f("jobType", "Çalışma Şekli", "select", { options: [...JOB_WORK_MODES], specLabel: "Çalışma Şekli", required: true }),
          f("education", "Eğitim durumu", "select", { options: [...JOB_EDUCATION], specLabel: "Eğitim" }),
          f("exp", "Deneyim", "select", { options: [...JOB_EXPERIENCE_LEVELS], specLabel: "Deneyim" }),
        ],
        groups: JOB_GROUPS,
      };
    }
    return {
      family: "diger",
      chassis: false,
      fields: [
        f("jobType", "Çalışma Şekli", "select", { options: [...JOB_WORK_MODES], specLabel: "Çalışma Şekli", required: true }),
        f("education", "Eğitim durumu", "select", { options: [...JOB_EDUCATION], specLabel: "Eğitim" }),
        f("exp", "Deneyim", "select", { options: [...JOB_EXPERIENCE_LEVELS], specLabel: "Deneyim" }),
        f("place", "Çalışma yeri", "select", { options: [...JOB_PLACES], specLabel: "Lokasyon" }),
      ],
      groups: JOB_GROUPS,
    };
  }

  return { family: "urun", chassis: false, fields: [cond], groups: [] };
}

export function emptyChassis(): Record<string, ChassisStatus> {
  return Object.fromEntries(CHASSIS_PARTS.map((p) => [p.id, "original" as ChassisStatus]));
}

export function nextChassisStatus(current?: ChassisStatus): ChassisStatus {
  const i = CHASSIS_CYCLE.indexOf(current ?? "original");
  return CHASSIS_CYCLE[(i + 1) % CHASSIS_CYCLE.length];
}

export function chassisSummary(map?: Record<string, ChassisStatus>) {
  if (!map) return { painted: 0, changed: 0, local: 0 };
  let painted = 0;
  let changed = 0;
  let local = 0;
  for (const status of Object.values(map)) {
    if (status === "painted") painted += 1;
    if (status === "changed") changed += 1;
    if (status === "local") local += 1;
  }
  return { painted, changed, local };
}

export function specsFromAttrs(schema: ListingSchema, attrs: Record<string, string>) {
  const specs: { label: string; value: string }[] = [];
  for (const field of schema.fields) {
    const raw = attrs[field.key]?.trim();
    if (!raw) continue;
    const kmDigits = field.key === "km" ? raw.replace(/\D/g, "") : "";
    const value = kmDigits ? `${Number(kmDigits).toLocaleString("tr-TR")} km` : raw;
    specs.push({ label: field.specLabel, value });
  }
  return specs;
}

export function specsWithChassis(
  schema: ListingSchema,
  attrs: Record<string, string>,
  chassis?: Record<string, ChassisStatus>,
) {
  const specs = specsFromAttrs(schema, attrs);
  if (schema.chassis && chassis) {
    const s = chassisSummary(chassis);
    specs.push({ label: "Boyalı parça", value: String(s.painted) });
    specs.push({ label: "Değişen parça", value: String(s.changed) });
    if (s.local) specs.push({ label: "Lokal boya", value: String(s.local) });
  }
  return specs;
}

export function highlightSpecs(specs: { label: string; value: string }[], family: ListingSchema["family"]) {
  const order =
    family === "vasita"
      ? ["Yıl", "Km", "Yakıt", "Vites", "Motor gücü", "Motor", "Motor hacmi", "Menzil", "Batarya", "Şarj", "Yük", "Kimden"]
        : family === "emlak"
          ? ["m²", "Oda", "Kat", "Isıtma", "Bina yaşı", "Cephe", "Kimden"]
        : family === "hizmet"
          ? ["Hizmet yeri", "Çalışma", "Garanti", "Deneyim", "Süre", "Fatura"]
          : specs.map((s) => s.label);
  const map = new Map(specs.map((s) => [s.label, s]));
  const picked = order.map((l) => map.get(l)).filter(Boolean) as { label: string; value: string }[];
  return picked.length ? picked : specs.slice(0, 6);
}
