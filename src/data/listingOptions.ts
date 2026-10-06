import { brandNamesForSegment } from "./vehicleIndex";
import { findCategory, rootOf } from "./categories";

export type { VehicleBrand, VehicleModelLine } from "./vehicleCatalog";
export type { VehicleSegment, VehicleProfile } from "./vehicleIndex";
export { VEHICLE_BRANDS } from "./vehicleCatalog";
export {
  bodiesOfModel,
  brandNamesForSegment,
  catalogForSegment,
  enginesOfModel,
  equipmentForVehicleCombo,
  modelsOfBrand,
  modelsOfSeries,
  packagesOfModel,
  rangesOfModel,
  seriesOfBrand,
  vehicleSegmentFromCategoryId,
  vehicleProfileFromCategoryId,
} from "./vehicleIndex";

export const YEARS = Array.from({ length: 2026 - 1985 + 1 }, (_, i) => String(2026 - i));
export const CLASSIC_YEARS = Array.from({ length: 2026 - 1950 + 1 }, (_, i) => String(2026 - i));
export const CYLINDERS = ["1", "2", "3", "4", "6"];
export const COOLING_TYPES = ["Hava soğutmalı", "Sıvı soğutmalı", "Yağ soğutmalı"];
export const MOTO_GEARS = ["Manuel", "Otomatik", "Yarı Otomatik", "CVT"];
export const FAST_CHARGE = ["30 dk altı", "30–45 dk", "45–60 dk", "60+ dk", "Yok"];
export const PAYLOADS = ["500 kg", "750 kg", "1.000 kg", "1.500 kg", "2.000 kg", "3.500 kg", "5.000 kg+"];
export const GVW = ["2.5 ton", "3.5 ton", "5 ton", "7.5 ton", "12 ton", "18 ton+"];
export const AIRCRAFT_TYPES = ["Ultralight", "Piston uçak", "Turboprop", "Helikopter", "Planör", "Drone (ticari)"];
export const DAMAGE_KINDS = ["Kaporta", "Mekanik", "Pert kayıtlı", "Ekspertiz gerekli"];
export const DISABLED_KITS = ["El kumandası", "Rampa / lift", "Döner koltuk", "Özel pedallar", "Komple dönüşüm"];
export const BERTHS = ["2", "3", "4", "5", "6+"];
export const COMMERCIAL_BODIES = ["Panelvan", "Camlı van", "Kamyonet", "Kamyon", "Çekici", "Damperli", "Frigorifik"];
export const FUELS = ["Benzin", "Dizel", "LPG", "Hibrit", "Elektrik"];
export const GEARS = ["Manuel", "Otomatik", "Yarı Otomatik"];
export const COLORS = ["Beyaz", "Siyah", "Gri", "Gümüş", "Kırmızı", "Turuncu", "Mavi", "Lacivert", "Yeşil", "Bej", "Kahverengi"];
export const ROOMS = ["Stüdyo", "1+0", "1+1", "2+1", "3+1", "4+1", "5+1", "6+1", "7+1", "8+"];
export const BUILDING_AGES = ["0 (Sıfır)", "1-5", "6-10", "11-15", "16-20", "21-30", "30+"];
export const HEATING = ["Kombi", "Merkezi", "Yerden Isıtma", "Klima", "Soba", "Yok"];
export const PRODUCT_CONDITIONS = ["Sıfır", "İkinci El", "Az Kullanılmış"];
export const STORAGES = ["32 GB", "64 GB", "128 GB", "256 GB", "512 GB", "1 TB"];
export const PHONE_BRANDS = ["Apple", "Samsung", "Xiaomi", "Huawei", "Oppo", "Honor", "Realme", "Google"];
export const MACHINE_BRANDS = ["Caterpillar", "Komatsu", "JCB", "Volvo", "Hitachi", "Liebherr", "Hidromek"];

export const DAMAGE_RECORDS = ["Yok", "Var", "Tramer sorgulanmadı"];
export const BODY_TYPES = ["Sedan", "Hatchback", "Station Wagon", "Coupe", "Cabrio", "SUV", "Pickup", "MPV"];
export const DEAL_TYPES = [
  "Satılık",
  "Kiralık",
  "Turistik Günlük Kiralık",
  "Devren Satılık Konut",
  "Devren Satılık",
  "Devren Kiralık",
];
export const DEAL_TYPES_HOME = ["Satılık", "Kiralık", "Turistik Günlük Kiralık", "Devren Satılık Konut"];
export const DEAL_TYPES_OFFICE = ["Satılık", "Kiralık", "Devren Satılık", "Devren Kiralık"];
export const FURNISHED = ["Eşyalı", "Eşyasız", "Yarı Eşyalı"];
export const FURNISHED_YN = ["Evet", "Hayır"];
export const FLOOR_COUNTS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10+"];
export const USAGE_STATUS = ["Boş", "Kiracılı", "Mülk Sahibi"];
export const DEED_STATUS = ["Kat Mülkiyeti", "Kat İrtifakı", "Arsa Tapusu", "Hisseli Tapu", "Tahsis"];
export const LISTING_FROM = ["Sahibinden", "Emlak Ofisinden", "İnşaat Firmasından", "Bankadan"];
export const PART_FROM = ["Sahibinden", "Mağazadan"];
export const VEHICLE_FROM = ["Sahibinden", "Galeriden"];

/** Shared “Kimden” options keyed by catalog root — reuse existing vocabularies only. */
export function kimdenOptionsForRoot(root?: string): string[] {
  if (root === "vasita") return VEHICLE_FROM;
  if (root === "emlak") return LISTING_FROM;
  return PART_FROM;
}
export const BATHS = ["1", "2", "3", "4+"];
export const ZONING = ["Konut", "Ticari", "Tarla", "Bağ & Bahçe", "Sanayi", "Turizm"];
export const BOAT_TYPES = ["Motoryat", "Yelkenli", "Sürat Teknesi", "Şişme Bot", "Katamaran", "Gulet", "Jet Ski"];
export const RENT_PERIODS = ["Günlük", "Haftalık", "Aylık", "Yıllık"];
export const MOTO_BRANDS = brandNamesForSegment("moto");
export const COMPUTER_BRANDS = ["Apple", "Asus", "HP", "Lenovo", "Dell", "MSI", "Acer", "Samsung", "Monster"];
export const WATCH_BRANDS = ["Apple", "Samsung", "Casio", "Seiko", "Tissot", "Omega", "Rolex", "Fossil"];
export const CAMERA_TYPES = ["DSLR", "Aynasız (Mirrorless)", "Kompakt", "Aksiyon", "Drone"];
export const CAMERA_BRANDS = ["Canon", "Nikon", "Sony", "Fujifilm", "Panasonic", "Olympus", "GoPro", "DJI", "Leica"];
export const DASHCAM_BRANDS = [
  "70mai",
  "Xiaomi",
  "Nextbase",
  "Vantrue",
  "Viofo",
  "Garmin",
  "Thinkware",
  "BlackVue",
  "FineVu",
  "Pioneer",
];
export const AUDIO_BRANDS = ["Pioneer", "Kenwood", "Sony", "JBL", "Alpine", "JVC", "Focal", "Hertz", "Rockford Fosgate"];
export const TIRE_BRANDS = ["Michelin", "Bridgestone", "Goodyear", "Pirelli", "Continental", "Lassa", "Petlas", "Hankook", "Dunlop"];
export const TIRE_SIZES = ["185/65 R15", "195/65 R15", "205/55 R16", "215/55 R17", "225/45 R17", "235/55 R18", "265/65 R17"];
export const HELMET_BRANDS = ["Shoei", "AGV", "Arai", "HJC", "LS2", "Nolan", "Schuberth", "Bell"];
export const MOTO_GEAR_BRANDS = [
  "Alpinestars",
  "Dainese",
  "Rev'it",
  "TCX",
  "Forma",
  "Held",
  "Spidi",
  "IXS",
  "Macna",
];
export const HELMET_TYPES = ["Kapalı", "Açık"];
export const HELMET_FEATURES = ["Buğulanmaz Cam", "Güneşlik Cam", "Interkom", "Pinlock", "Bluetooth", "Çene Açılır"];
export const MOTO_JACKET_FEATURES = ["Koruma", "Membran", "Yazlık", "Kışlık", "Reflektör"];
export const MOTO_BOOT_SIZES = ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46"];
export const CLASSIFIED_SHOP_OPTS = ["Yüz Yüze Görüşerek", "Kredi Kartıyla", "Ücretsiz Kargo"];
export const SWAP_YN = ["Evet", "Hayır"];
export const AUTO_ACC_BRANDS = ["Bosch", "Philips", "Osram", "3M", "Thule", "Baseus", "Anker", "PIAA"];
export const SEA_NAV_BRANDS = ["Garmin", "Raymarine", "Lowrance", "Humminbird", "Simrad"];
export {
  SEA_EQUIP_BRANDS,
  SEA_EQUIP_FEATURES,
  SEA_EQUIP_GROUPS,
  isSeaEquipCategoryId,
  seaEquipGroupById,
  seaEquipProductsFor,
} from "@/data/seaEquip";
export const APPLIANCE_BRANDS = ["Arçelik", "Beko", "Bosch", "Siemens", "Samsung", "LG", "Vestel"];
export const TV_BRANDS = ["Samsung", "LG", "Sony", "TCL", "Vestel", "Philips"];
export const DASHCAM_RES = ["1080p", "2K", "4K"];
export const DASHCAM_CH = ["Tek kanal", "Ön + arka", "3 kanal"];
export const CONNECTIVITY = ["Wi-Fi", "GPS", "Bluetooth", "USB"];
export const FASHION_GENDER = ["Kadın", "Erkek", "Unisex", "Çocuk"];
export const FASHION_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "36", "38", "40", "42", "44"];
export const JOB_PLACES = ["Ofis", "Uzaktan", "Hibrit", "Saha"];
export const JOB_WORK_MODES = [
  "Dönemsel",
  "Staj",
  "Serbest Çalışma/Freelance",
  "Yarı Zamanlı",
  "Tam Zamanlı",
];
export const JOB_EDUCATION = ["En az İlköğretim", "Lise", "Üniversite Mezunu"];
export const JOB_EXPERIENCE_LEVELS = [
  "Aranmıyor",
  "En az 1 Yıl",
  "En az 2 Yıl",
  "En az 3 Yıl",
  "En az 5 Yıl",
  "En az 10 Yıl",
];
export const JOB_POSTED_WITHIN = ["Son 24 saat", "Son 3 gün", "Son 7 gün", "Son 15 gün", "Son 30 gün"];
export const TRACTOR_TYPES = ["Traktör", "Biçerdöver", "Pulverizatör", "Römork", "Sulama"];
export const AUTO_PART_VEHICLE_TYPES = [
  "Otomobil & Arazi Aracı",
  "Minivan & Panelvan",
  "Ticari Araçlar",
  "Karavan",
  "Go Kart",
];
export const AUTO_PART_PRODUCTS = [
  "Tampon (Ön)",
  "Tampon (Arka)",
  "Panjur",
  "Kaput",
  "Çamurluk",
  "Kapı",
  "Bagaj Kapağı",
  "Far",
  "Stop",
  "Sis Farı",
  "Ayna",
  "Cam",
  "Motor",
  "Şanzıman",
  "Turbo",
  "Enjektör",
  "Radyatör",
  "Egzoz",
  "Marş Motoru",
  "Alternatör",
  "Klima Kompresörü",
  "Amortisör",
  "Fren Diski",
  "Fren Kaliperi",
  "Rotil",
  "Salıncak",
  "Direksiyon Kutusu",
  "Airbag",
  "Gösterge Paneli",
  "Koltuk",
  "Diğer",
];
export const PART_BRANDS = [
  "Fabrikasyon",
  "Orijinal",
  "Bosch",
  "Valeo",
  "Delphi",
  "Mahle",
  "Sachs",
  "TRW",
  "Brembo",
  "Febi",
  "Lemförder",
  "INA",
  "SKF",
  "NGK",
  "Mann Filter",
];
export const USED_PART = ["Evet", "Hayır"];

export function photoLimitForPlan(_plan?: "standart" | "profesyonel" | "vip") {
  return Number.POSITIVE_INFINITY;
}

export function typeToCategory(type: string) {
  if (type === "vasita") return "vasita";
  if (type === "emlak") return "emlak";
  if (type === "makine") return "machines";
  if (type === "parca") return "parts";
  if (type === "hizmet") return "services";
  if (type === "ders") return "tutors";
  if (type === "is") return "jobs";
  if (type === "hayvan") return "pets";
  if (type === "yardim") return "helpers";
  return "shopping";
}

export function typeFromCategoryId(categoryId: string) {
  const cat = findCategory(categoryId);
  const rootId = cat ? rootOf(cat).id : categoryId;
  const map: Record<string, string> = {
    vasita: "vasita",
    emlak: "emlak",
    machines: "makine",
    parts: "parca",
    services: "hizmet",
    tutors: "ders",
    jobs: "is",
    pets: "hayvan",
    helpers: "yardim",
    shopping: "urun",
  };
  if (map[rootId]) return map[rootId];
  if (rootId.startsWith("shopping")) return "urun";
  return "urun";
}
