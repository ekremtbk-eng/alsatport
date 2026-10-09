/**
 * Single source for the vasıta sub-categories (everything except Otomobil): each entry drives the "İlan Ver" field,
 * the stored spec label and, when `filter` is set, the matching backend filter. Brand/model lists come from
 * `catalogForSegment` so the form and the filters share the same data.
 */
import {
  CLASSIC_YEARS,
  COLORS,
  COMMERCIAL_BODIES,
  COOLING_TYPES,
  CYLINDERS,
  DAMAGE_KINDS,
  DAMAGE_RECORDS,
  DISABLED_KITS,
  FAST_CHARGE,
  FUELS,
  GEARS,
  GVW,
  MOTO_GEARS,
  PAYLOADS,
  RENT_PERIODS,
  SWAP_YN,
  VEHICLE_FROM,
  YEARS,
} from "./listingOptions";
import { VEHICLE_EXTERIOR, VEHICLE_INTERIOR, VEHICLE_MEDIA, VEHICLE_SAFETY } from "./vehicleEquipment";
import { brandNamesForSegment, catalogForSegment, type VehicleProfile, type VehicleSegment } from "./vehicleIndex";

export type VehicleFilterGroup =
  | "basic"
  | "vehicle"
  | "tech"
  | "special"
  | "condition"
  | "location"
  | "safety"
  | "assist"
  | "vInterior"
  | "vExterior"
  | "media"
  | "comfort"
  | "equip"
  | "nav"
  | "deck"
  | "avionics"
  | "cabin"
  | "delivery"
  | "other";

export type VehicleCascade = "vehicleModels" | "vehiclePackages" | "vehicleEngines" | "vehicleBodies";

export type VehicleSpecFilter = {
  group: VehicleFilterGroup;
  primary?: boolean;
  /** Number fields filter as a min/max pair; selects as a multi-pick list; text as "contains". */
  mode?: "range" | "select" | "text";
  /** Filter key when it must differ from the form key (keeps otomobil's URL vocabulary). */
  key?: string;
  /** i18n key with an existing translation; otherwise the Turkish `label` is shown. */
  labelKey?: string;
};

export type VehicleSpecDef = {
  key: string;
  label: string;
  specLabel: string;
  /** Older spec labels written for the same value; filters accept them so existing listings stay findable. */
  aliases?: string[];
  kind: "select" | "number" | "text" | "search" | "cascade";
  options?: string[];
  required?: boolean;
  dependsOn?: string;
  optionSource?: VehicleCascade;
  unit?: string;
  decimal?: boolean;
  filter?: VehicleSpecFilter;
};

export type VehicleFeatureGroup = { id: VehicleFilterGroup; title: string; items: string[] };

export type VehicleProfileSpec = {
  segment: VehicleSegment;
  chassis: boolean;
  fields: VehicleSpecDef[];
  groups: VehicleFeatureGroup[];
};

const YN = ["Var", "Yok"];
const EH = ["Evet", "Hayır"];

export const PLATE_STATES = ["TR plakalı", "Yabancı plakalı", "Plakasız"];
export const EV_CHARGE_TYPES = ["Type 2 + CCS2", "Type 2 + CHAdeMO", "Sadece Type 2 (AC)", "GB/T", "Tesla (NACS)"];
/** Filter values travel comma-separated in the URL, so option labels must not contain a comma. */
export const EV_AC_POWER = ["3.7 kW", "7.4 kW", "11 kW", "22 kW"];
export const EV_WARRANTY = ["Devam ediyor", "Sona erdi", "Bilinmiyor"];
export const PICKUP_CABINS = ["Tek kabin", "Buçuk kabin", "Çift kabin"];
export const MOTO_ENGINE_TYPES = ["4 zamanlı", "2 zamanlı", "Elektrikli"];
export const MOTO_LICENSE = ["Ruhsatlı", "Ruhsat işlemde", "Ruhsatsız (hurda / yedek parça)"];
export const MOTO_LICENSE_CLASS = ["B (125 cc'ye kadar)", "A1", "A2", "A"];
export const VAN_LENGTHS = ["L1 (Kısa)", "L2 (Orta)", "L3 (Uzun)", "L4 (Ekstra uzun)"];
export const VAN_ROOFS = ["H1 (Normal tavan)", "H2 (Yüksek tavan)", "H3 (Ekstra yüksek tavan)"];
export const VAN_SEATS = ["2", "3", "5", "6", "7", "8", "9", "9+1", "12+1", "14+1", "16+1", "19+1", "27+1", "30+"];
export const COMMERCIAL_USES = [
  "Yük taşıma",
  "Yolcu taşıma",
  "Servis (okul / personel)",
  "Kargo / dağıtım",
  "Frigorifik",
  "Ambulans",
  "Mobil atölye",
  "Diğer",
];
export const WHEELBASES = ["Kısa", "Orta", "Uzun", "Ekstra uzun"];
export const COMMERCIAL_DRIVES = ["Önden çekiş", "Arkadan itiş", "4x4", "4x2", "6x2", "6x4", "8x4"];
export const RENT_MIN = ["1 gün", "2 gün", "3 gün", "1 hafta", "2 hafta", "1 ay", "3 ay ve üzeri"];
export const RENT_KM_LIMIT = ["Sınırsız", "Günlük 200 km", "Günlük 300 km", "Günlük 500 km", "Aylık 3.000 km", "Aylık 5.000 km"];
export const RENT_FUEL_POLICY = ["Dolu al - dolu teslim et", "Aynı seviyede teslim et", "Ön ödemeli yakıt"];
export const RENT_MIN_AGE = ["18+", "21+", "23+", "25+", "27+", "30+"];
export const RENT_LICENSE_YEARS = ["1 yıl ve üzeri", "2 yıl ve üzeri", "3 yıl ve üzeri", "5 yıl ve üzeri"];
export const RENT_DELIVERY = ["Ofiste teslim", "Havalimanında teslim", "Adrese teslim", "Otelde teslim"];
export const BOAT_TYPES = [
  "Motoryat",
  "Yelkenli",
  "Gulet",
  "Katamaran",
  "Sürat teknesi",
  "Balıkçı teknesi",
  "Şişme bot (RIB)",
  "Jet ski",
  "Kano / kayak",
  "Diğer",
];
export const HULL_MATERIALS = ["Fiberglas (CTP)", "Ahşap", "Alüminyum", "Çelik", "Karbon", "Şişme (PVC / Hypalon)"];
export const MARINE_ENGINE_BRANDS = [
  "Yamaha",
  "Mercury",
  "Suzuki",
  "Honda",
  "Tohatsu",
  "Evinrude",
  "Volvo Penta",
  "MerCruiser",
  "Yanmar",
  "Caterpillar",
  "MAN",
  "Cummins",
  "Selva",
  "Motorsuz",
  "Diğer",
];
export const BOAT_ENGINE_COUNTS = ["Motorsuz", "1", "2", "3", "4+"];
export const BOAT_FUELS = ["Benzin", "Dizel", "Elektrik", "Hibrit", "Motorsuz (yelken / kürek)"];
export const BOAT_CABINS = ["Yok", "1", "2", "3", "4", "5+"];
export const BOAT_BERTHS = ["Yok", "1-2", "3-4", "5-6", "7-8", "9-12", "12+"];
export const BOAT_FLAGS = ["Türk bayraklı - ruhsatlı", "Türk bayraklı - ruhsat işlemde", "Yabancı bayraklı", "Ruhsatsız"];
export const DAMAGE_AREAS = ["Ön", "Arka", "Sağ yan", "Sol yan", "Tavan", "Alt takım", "Motor", "Şanzıman", "Birden fazla bölge"];
export const PERT_STATES = ["Pert kaydı yok", "Pert kayıtlı", "Çekme belgeli"];
export const RUN_STATES = ["Çalışır ve yürür", "Çalışır ama yürümez", "Çalışmıyor"];
export const AIRBAG_STATES = ["Patlamamış", "Patlamış", "Eksik"];
export const CARAVAN_TYPES = ["Motokaravan", "Çekme karavan", "Kampervan", "Off-road / overland karavan"];
export const CARAVAN_BASES = ["Fiat", "Mercedes-Benz", "Ford", "Volkswagen", "Citroën", "Peugeot", "Iveco", "Renault", "MAN", "Diğer", "Yok (çekme karavan)"];
export const CARAVAN_BATTERY = ["Standart (kurşun asit)", "AGM", "Jel", "Lityum (LiFePO4)", "Yok"];
export const CARAVAN_HEATING = ["Gazlı ısıtıcı", "Dizel ısıtıcı", "Elektrikli ısıtıcı", "Yok"];
export const CARAVAN_WC = ["Duş + WC", "Sadece WC", "Sadece duş", "Yok"];
export const CARAVAN_LICENSE = ["Motokaravan (özel amaçlı) ruhsatlı", "Römork ruhsatlı", "Kamyonet ruhsatlı", "Ruhsatsız"];
export const CARAVAN_BERTHS = ["1", "2", "3", "4", "5", "6+"];
export const CLASSIC_ORIGINALITY = ["Tamamen orijinal", "Orijinal (küçük değişiklikler)", "Modifiyeli", "Restomod"];
export const CLASSIC_RESTORATION = ["Restorasyon yapılmadı", "Kısmi restorasyon", "Tam restorasyon", "Restorasyon gerekli"];
export const AIRCRAFT_TYPES_ALL = [
  "Piston uçak",
  "Turboprop",
  "Jet uçak",
  "Helikopter",
  "Ultralight",
  "Planör",
  "Gyrocopter",
  "Drone (ticari)",
];
export const AIR_ENGINE_COUNTS = ["Motorsuz", "1", "2", "3", "4"];
export const AIR_ENGINE_TYPES = ["Pistonlu", "Turboprop", "Jet (turbofan)", "Turboşaft", "Elektrik", "Motorsuz"];
export const AIR_REGISTRY = ["TC tescilli", "Yabancı tescilli", "Tescilsiz (ultralight / drone)"];
export const AIR_MAINTENANCE = ["Bakımları güncel", "Yıllık bakım yaklaşıyor", "Bakım gerekli", "Bilinmiyor"];
export const ATV_GEARS = ["CVT otomatik", "Manuel", "Yarı otomatik"];
export const ATV_DRIVES = ["2x4", "4x4", "2x4 / 4x4 seçilebilir"];
export const ATV_ROAD = ["Trafik ruhsatlı", "Ruhsatsız (arazi kullanımı)"];
export const ATV_USE = ["Hobi / gezinti", "Tarım / iş", "Spor / yarış", "Av / doğa"];
export const ATV_FUELS = ["Benzin", "Dizel", "Elektrik"];
export const UTV_SEATS = ["1", "2", "3", "4", "5+"];
export const DISABLED_RESTRICTION = ["Kısıt yok", "ÖTV satış kısıtı devam ediyor", "Kısıt süresi doldu"];

/** Car equipment split as on Otomobil, with driver-assist items in their own group (same item strings). */
export const CAR_ASSIST = [
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
];

function carGroups(safety: string[], interior: string[], exterior: string[], media: string[]): VehicleFeatureGroup[] {
  const assist = new Set(CAR_ASSIST);
  return [
    { id: "safety", title: "Güvenlik", items: safety.filter((i) => !assist.has(i)) },
    { id: "assist", title: "Sürüş Destek", items: CAR_ASSIST },
    { id: "vInterior", title: "İç Donanım", items: interior },
    { id: "vExterior", title: "Dış Donanım", items: exterior },
    { id: "media", title: "Multimedya", items: media },
  ];
}

const MOTO_GROUPS: VehicleFeatureGroup[] = [
  { id: "safety", title: "Güvenlik", items: ["Viraj ABS", "Wheelie Kontrolü", "Lastik Basınç Sensörü", "Acil Fren Lambası", "Alarm", "Immobilizer"] },
  { id: "assist", title: "Sürüş Destek", items: ["Quickshifter", "Cruise Control", "Sürüş Modları", "Elektronik Süspansiyon", "Kayar Debriyaj", "Yokuş Kalkış Desteği"] },
  {
    id: "comfort",
    title: "Konfor & Donanım",
    items: ["Elcik Isıtma", "Sele Isıtma", "Ayarlanabilir Rüzgarlık", "Anahtarsız Çalıştırma", "Yan Çanta", "Arka Çanta", "Koruma Demiri", "Orta Sehpa", "LED Far"],
  },
  { id: "media", title: "Multimedya", items: ["TFT Ekran", "Bluetooth", "Navigasyon", "USB Şarj", "Telefon Bağlantısı"] },
];

const OFFROAD_GROUPS: VehicleFeatureGroup[] = [
  { id: "safety", title: "Güvenlik", items: ["Emniyet Kemeri", "Koruma Kafesi (ROPS)", "Park Freni", "Alarm"] },
  {
    id: "equip",
    title: "Ekipman",
    items: ["Vinç", "Çeki Demiri", "Elektronik Direksiyon (EPS)", "LED Far", "Ön Cam", "Tavan", "Kapı", "Kar Küreği", "Yük Kasası", "Damperli Kasa", "Koruma Demiri", "Bagaj Kutusu"],
  },
];

const COMMERCIAL_EQUIP: VehicleFeatureGroup = {
  id: "equip",
  title: "Ticari Donanım",
  items: ["Sağ Sürgülü Kapı", "Sol Sürgülü Kapı", "Çift Kanat Arka Kapı", "Yük Bölmesi Kaplama", "Bölme Duvarı", "Takograf", "Retarder", "Hidrolik Lift", "Soğutucu Ünite"],
};

const BOAT_GROUPS: VehicleFeatureGroup[] = [
  { id: "nav", title: "Navigasyon & Elektronik", items: ["GPS / Plotter", "Sonar / Balık Bulucu", "Radar", "VHF Telsiz", "Otopilot", "AIS"] },
  { id: "comfort", title: "Konfor", items: ["Jeneratör", "Klima", "Isıtma", "Buzdolabı", "Sıcak Su", "Bimini Tente", "TV", "Ses Sistemi"] },
  { id: "safety", title: "Güvenlik", items: ["Can Yeleği", "Can Salı", "Yangın Söndürme Sistemi", "Sintine Pompası", "EPIRB"] },
  { id: "deck", title: "Güverte", items: ["Baş Pervane", "Kıç Pervane", "Irgat", "Tik Güverte", "Yüzme Platformu", "Hidrolik Platform", "Tender Bot"] },
];

const AIR_GROUPS: VehicleFeatureGroup[] = [
  { id: "avionics", title: "Aviyonik", items: ["Glass Cockpit", "Otopilot", "ADS-B Out", "GPS / GNSS", "IFR Donanımlı", "Hava Radarı", "TCAS"] },
  { id: "cabin", title: "Kabin", items: ["Klima", "Kabin Isıtma", "Oksijen Sistemi", "Basınçlı Kabin", "Deri Koltuk"] },
  { id: "safety", title: "Güvenlik", items: ["Paraşüt Sistemi (CAPS)", "ELT", "Buzlanma Koruma", "Yangın Söndürme Sistemi"] },
];

const CARAVAN_GROUPS: VehicleFeatureGroup[] = [
  {
    id: "comfort",
    title: "Yaşam Alanı",
    items: ["Buzdolabı", "Ocak", "Fırın", "Mikrodalga", "Sıcak Su", "TV", "Uydu Anteni", "İnverter", "Tente", "Bisiklet Taşıyıcı", "Sineklik", "Karartma Perde"],
  },
  { id: "safety", title: "Güvenlik", items: ["Geri Görüş Kamerası", "Alarm", "Gaz Dedektörü", "Duman Dedektörü", "Yangın Söndürücü"] },
];

const RENT_DELIVERY_GROUP: VehicleFeatureGroup = { id: "delivery", title: "Teslim Yeri", items: RENT_DELIVERY };

function catalogBodies(segment: VehicleSegment) {
  const seen = new Set<string>();
  for (const b of catalogForSegment(segment)) for (const m of b.models) for (const x of m.bodies) if (x.trim()) seen.add(x.trim());
  return [...seen];
}

function d(key: string, label: string, kind: VehicleSpecDef["kind"], extra: Partial<VehicleSpecDef> = {}): VehicleSpecDef {
  return { key, label, specLabel: extra.specLabel ?? label, kind, ...extra };
}

const pick = (group: VehicleFilterGroup, primary = false, labelKey?: string): VehicleSpecFilter => ({
  group,
  ...(primary ? { primary: true } : {}),
  ...(labelKey ? { labelKey } : {}),
});

function brandModel(segment: VehicleSegment, opts: { trim: boolean; trimRequired?: boolean }): VehicleSpecDef[] {
  const out: VehicleSpecDef[] = [
    d("brand", "Marka", "search", {
      options: brandNamesForSegment(segment),
      required: true,
      aliases: ["Brand"],
      filter: pick("vehicle", true, "post.brand"),
    }),
    d("model", "Model", "cascade", { dependsOn: "brand", optionSource: "vehicleModels", required: true, filter: pick("vehicle", true, "post.model") }),
  ];
  if (opts.trim) {
    out.push(
      d("trim", "Seri / Paket", "cascade", {
        specLabel: "Paket",
        aliases: ["Seri", "Trim"],
        dependsOn: "model",
        optionSource: "vehiclePackages",
        required: opts.trimRequired ?? true,
        filter: pick("vehicle", true, "flt.trim"),
      }),
    );
  }
  return out;
}

const year = (years = YEARS) =>
  d("year", "Yıl", "select", { options: years, required: true, aliases: ["Year"], filter: { group: "basic", primary: true, mode: "range", labelKey: "post.year" } });
const km = (required = true) =>
  d("km", "Kilometre", "number", { specLabel: "Km", aliases: ["Kilometre"], required, filter: { group: "basic", primary: true, mode: "range", labelKey: "post.km" } });
const gear = (options = GEARS, required = true) =>
  d("gear", "Vites", "select", { options, required, aliases: ["Gearbox"], filter: pick("tech", true, "post.gear") });
const fuel = (options = FUELS, required = true) =>
  d("fuel", "Yakıt", "select", { options, required, aliases: ["Fuel"], filter: pick("tech", true, "post.fuel") });
const color = (required = true) => d("color", "Renk", "select", { options: COLORS, required, aliases: ["Color"], filter: pick("vehicle", false, "post.color") });
const plate = () => d("plate", "Plaka durumu", "select", { options: PLATE_STATES, filter: pick("vehicle") });
const kimden = () => d("kimden", "Kimden", "select", { options: VEHICLE_FROM, required: true, filter: pick("basic", true, "flt.kimden") });
const swap = () => d("swap", "Takas", "select", { options: SWAP_YN, filter: pick("basic", false, "flt.swap") });
const damage = (required = false) =>
  d("damage", "Hasar kaydı", "select", {
    options: DAMAGE_RECORDS,
    required,
    aliases: ["Hasar", "Tramer"],
    filter: pick("condition", false, "flt.damage"),
  });
const yn = (key: string, label: string, group: VehicleFilterGroup = "special", options = YN) => d(key, label, "select", { options, filter: pick(group) });
const sel = (key: string, label: string, options: string[], group: VehicleFilterGroup = "special", extra: Partial<VehicleSpecDef> = {}) =>
  d(key, label, "select", { options, filter: pick(group), ...extra });
const num = (key: string, label: string, unit: string, group: VehicleFilterGroup = "special", extra: Partial<VehicleSpecDef> = {}) =>
  d(key, label, "number", { unit, filter: { group, mode: "range" }, ...extra });

/** Brand → model → paket → motor → kasa chain plus the shared car fields, for car-based sub-categories. */
function carBase(segment: VehicleSegment, opts: { years?: string[]; trimRequired?: boolean; kmRequired?: boolean } = {}): VehicleSpecDef[] {
  return [
    ...brandModel(segment, { trim: true, trimRequired: opts.trimRequired }),
    d("engine", "Motor", "cascade", {
      aliases: ["Motor hacmi", "Engine"],
      dependsOn: "trim",
      optionSource: "vehicleEngines",
      filter: pick("tech", true, "flt.engine"),
    }),
    d("body", "Kasa tipi", "cascade", {
      specLabel: "Kasa",
      aliases: ["Kasa tipi", "Body"],
      dependsOn: "engine",
      optionSource: "vehicleBodies",
      options: catalogBodies(segment),
      filter: { group: "vehicle", primary: true, key: "bodyType", labelKey: "flt.body" },
    }),
    year(opts.years),
    km(opts.kmRequired ?? true),
    gear(),
    fuel(),
    d("power", "Motor gücü", "select", {
      options: ["75 hp", "90 hp", "110 hp", "136 hp", "150 hp", "184 hp", "190 hp", "245 hp", "306 hp", "340+ hp"],
      aliases: ["Güç"],
      filter: pick("tech", false, "flt.power"),
    }),
    d("drive", "Çekiş", "select", { options: ["Önden çekiş", "Arkadan itiş", "4WD", "AWD"], aliases: ["Drive"], filter: pick("tech", false, "flt.drive") }),
    color(),
    plate(),
  ];
}

const tail = (damageRequired = false) => [kimden(), swap(), damage(damageRequired)];

const SPEC_CACHE = new Map<VehicleProfile, VehicleProfileSpec | null>();

export function vehicleProfileSpec(profile: VehicleProfile): VehicleProfileSpec | null {
  if (!SPEC_CACHE.has(profile)) SPEC_CACHE.set(profile, buildProfileSpec(profile));
  return SPEC_CACHE.get(profile) ?? null;
}

function buildProfileSpec(profile: VehicleProfile): VehicleProfileSpec | null {
  switch (profile) {
    case "suv":
      return {
        segment: "suv",
        chassis: true,
        fields: [
          ...carBase("suv"),
          sel("cabin", "Kabin tipi (Pickup)", PICKUP_CABINS),
          yn("lowRange", "Redüktör (4L)"),
          yn("diffLock", "Diferansiyel kilidi"),
          ...tail(),
        ],
        groups: carGroupsAll(),
      };
    case "ev": {
      const base = carBase("ev").filter((f) => f.key !== "fuel" && f.key !== "engine");
      const body = base.find((f) => f.key === "body");
      if (body) body.dependsOn = "trim";
      return {
        segment: "ev",
        chassis: true,
        fields: [
          ...base,
          num("batteryKwh", "Batarya kapasitesi", "kWh", "special", {
            required: true,
            specLabel: "Batarya kapasitesi",
            aliases: ["Batarya", "kWh", "Battery"],
            decimal: true,
            filter: { group: "special", primary: true, mode: "range" },
          }),
          num("rangeKm", "Tahmini menzil", "km", "special", {
            required: true,
            specLabel: "Menzil",
            aliases: ["Range"],
            filter: { group: "special", primary: true, mode: "range" },
          }),
          sel("chargeType", "Şarj tipi", EV_CHARGE_TYPES),
          num("dcKw", "DC hızlı şarj gücü", "kW"),
          sel("acKw", "AC şarj gücü", EV_AC_POWER),
          sel("charge", "Hızlı şarj süresi (%10-80)", FAST_CHARGE, "special", { specLabel: "Şarj", aliases: ["Hızlı şarj"] }),
          sel("batteryWarranty", "Batarya garantisi", EV_WARRANTY),
          num("batterySoh", "Batarya sağlık durumu (SOH)", "%"),
          ...tail(),
        ],
        groups: carGroupsAll(),
      };
    }
    case "moto":
      return {
        segment: "moto",
        chassis: false,
        fields: [
          ...brandModel("moto", { trim: true, trimRequired: false }),
          d("engine", "Motor hacmi", "cascade", {
            specLabel: "Motor hacmi",
            aliases: ["Motor", "cc"],
            dependsOn: "model",
            optionSource: "vehicleEngines",
            required: true,
            filter: pick("tech", true, "flt.engine"),
          }),
          d("body", "Motosiklet tipi", "cascade", {
            specLabel: "Motosiklet tipi",
            dependsOn: "model",
            optionSource: "vehicleBodies",
            options: catalogBodies("moto"),
            filter: { group: "vehicle", primary: true, key: "bodyType" },
          }),
          sel("engineType", "Motor tipi", MOTO_ENGINE_TYPES, "tech"),
          year(),
          km(),
          gear(MOTO_GEARS),
          sel("cooling", "Soğutma", COOLING_TYPES, "tech", { specLabel: "Soğutma", aliases: ["Soğutma tipi"] }),
          sel("cylinders", "Silindir sayısı", CYLINDERS, "tech", { specLabel: "Silindir" }),
          yn("abs", "ABS", "special"),
          yn("tractionControl", "Çekiş kontrolü", "special"),
          sel("license", "Ruhsat durumu", MOTO_LICENSE),
          sel("licenseClass", "Ehliyet sınıfı", MOTO_LICENSE_CLASS),
          color(),
          plate(),
          ...tail(),
        ],
        groups: MOTO_GROUPS,
      };
    case "atv":
    case "utv": {
      const segment: VehicleSegment = profile;
      return {
        segment,
        chassis: false,
        fields: [
          ...brandModel(segment, { trim: true, trimRequired: false }),
          d("engine", "Motor hacmi", "cascade", {
            specLabel: "Motor hacmi",
            aliases: ["Motor", "cc"],
            dependsOn: "model",
            optionSource: "vehicleEngines",
            required: true,
            filter: pick("tech", true, "flt.engine"),
          }),
          year(),
          km(false),
          gear(ATV_GEARS),
          fuel(ATV_FUELS, false),
          d("drive", "Çekiş", "select", { options: ATV_DRIVES, required: true, filter: pick("tech", true, "flt.drive") }),
          yn("diffLock", "Diferansiyel kilidi", "tech"),
          sel("cylinders", "Silindir sayısı", CYLINDERS, "tech", { specLabel: "Silindir" }),
          sel("cooling", "Soğutma", COOLING_TYPES, "tech", { specLabel: "Soğutma", aliases: ["Soğutma tipi"] }),
          ...(profile === "utv" ? [sel("seats", "Koltuk sayısı", UTV_SEATS)] : []),
          sel("roadLegal", "Yol ruhsatı", ATV_ROAD),
          sel("usage", "Kullanım tipi", ATV_USE),
          color(),
          ...tail(),
        ],
        groups: OFFROAD_GROUPS,
      };
    }
    case "van":
    case "ticari": {
      const segment: VehicleSegment = profile;
      return {
        segment,
        chassis: true,
        fields: [
          ...brandModel(segment, { trim: true }),
          d("engine", "Motor gücü", "cascade", {
            specLabel: "Motor",
            aliases: ["Motor gücü"],
            dependsOn: "trim",
            optionSource: "vehicleEngines",
            filter: pick("tech", true, "flt.power"),
          }),
          d("body", "Kasa tipi", "select", {
            specLabel: "Kasa",
            aliases: ["Kasa tipi"],
            options: COMMERCIAL_BODIES,
            required: true,
            filter: { group: "vehicle", primary: true, key: "bodyType", labelKey: "flt.body" },
          }),
          year(),
          km(),
          gear(),
          fuel(),
          d("drive", "Çekiş", "select", { options: COMMERCIAL_DRIVES, filter: pick("tech", false, "flt.drive") }),
          sel("payload", "Yük kapasitesi (istihap haddi)", PAYLOADS, "special", { specLabel: "İstihap Haddi", aliases: ["Yük", "Kapasite"], required: true }),
          sel("gvw", "Azami yüklü ağırlık", GVW, "special", { specLabel: "Azami Yüklü Ağırlık", aliases: ["Ağırlık", "GVW"] }),
          sel("length", "Uzunluk", VAN_LENGTHS),
          sel("roof", "Tavan tipi", VAN_ROOFS),
          sel("seats", "Koltuk sayısı", VAN_SEATS),
          sel("usage", "Ticari kullanım tipi", COMMERCIAL_USES),
          sel("wheelbase", "Dingil mesafesi", WHEELBASES),
          color(),
          plate(),
          ...tail(),
        ],
        groups: [...carGroupsAll(), COMMERCIAL_EQUIP],
      };
    }
    case "rental":
      return {
        segment: "auto",
        chassis: true,
        fields: [
          ...carBase("auto", { kmRequired: false }),
          num("dailyPrice", "Günlük fiyat", "₺", "special", { required: true, filter: { group: "special", primary: true, mode: "range" } }),
          num("weeklyPrice", "Haftalık fiyat", "₺"),
          num("monthlyPrice", "Aylık fiyat", "₺"),
          sel("rentPeriod", "Kiralama dönemi", RENT_PERIODS, "special", { specLabel: "Süre", aliases: ["Dönem"] }),
          sel("minRent", "Minimum kiralama süresi", RENT_MIN),
          num("deposit", "Depozito", "₺"),
          sel("kmLimit", "Kilometre limiti", RENT_KM_LIMIT),
          sel("fuelPolicy", "Yakıt politikası", RENT_FUEL_POLICY),
          sel("minAge", "Yaş sınırı", RENT_MIN_AGE),
          sel("licenseYears", "Ehliyet süresi şartı", RENT_LICENSE_YEARS),
          kimden(),
        ],
        groups: [RENT_DELIVERY_GROUP, ...carGroupsAll()],
      };
    case "damaged":
      return {
        segment: "auto",
        chassis: true,
        fields: [
          ...carBase("auto"),
          sel("damageKind", "Hasar tipi", DAMAGE_KINDS, "special", { specLabel: "Hasar türü", required: true, filter: { group: "special", primary: true } }),
          sel("damageArea", "Hasar bölgesi", DAMAGE_AREAS),
          yn("heavyDamage", "Ağır hasar kaydı"),
          sel("pert", "Pert durumu", PERT_STATES),
          sel("runs", "Çalışır durumda mı", RUN_STATES),
          sel("airbag", "Airbag durumu", AIRBAG_STATES),
          yn("missingParts", "Eksik parça"),
          num("tramer", "Tramer tutarı", "₺"),
          ...tail(true),
        ],
        groups: carGroupsAll(),
      };
    case "caravan":
      return {
        segment: "caravan",
        chassis: false,
        fields: [
          sel("caravanType", "Karavan tipi", CARAVAN_TYPES, "vehicle", { required: true, filter: { group: "vehicle", primary: true } }),
          ...brandModel("caravan", { trim: true, trimRequired: false }),
          sel("baseVehicle", "Baz araç (şasi)", CARAVAN_BASES, "vehicle"),
          year(),
          km(false),
          gear(GEARS, false),
          fuel(FUELS, false),
          sel("berths", "Yatak kapasitesi", CARAVAN_BERTHS, "special", { specLabel: "Yatak", filter: { group: "special", primary: true } }),
          yn("solar", "Güneş paneli"),
          sel("battery", "Akü sistemi", CARAVAN_BATTERY),
          sel("heating", "Isıtma", CARAVAN_HEATING),
          yn("ac", "Klima"),
          sel("wc", "Duş / WC", CARAVAN_WC),
          num("freshWater", "Temiz su tankı", "L"),
          num("greyWater", "Kirli su tankı", "L"),
          sel("caravanLicense", "Ruhsat tipi", CARAVAN_LICENSE),
          color(false),
          ...tail(),
        ],
        groups: CARAVAN_GROUPS,
      };
    case "classic":
      return {
        segment: "classic",
        chassis: true,
        fields: [
          ...carBase("classic", { years: CLASSIC_YEARS, trimRequired: false }),
          sel("originality", "Orijinallik durumu", CLASSIC_ORIGINALITY, "special", { filter: { group: "special", primary: true } }),
          sel("restoration", "Restorasyon durumu", CLASSIC_RESTORATION),
          num("restorationYear", "Restorasyon yılı", "", "special", { specLabel: "Restorasyon yılı" }),
          yn("collectionDoc", "Koleksiyon / klasik araç belgesi"),
          d("series", "Üretim adedi / özel seri", "text", { filter: { group: "special", mode: "text" } }),
          ...tail(),
        ],
        groups: carGroupsAll(),
      };
    case "disabled":
      return {
        segment: "auto",
        chassis: true,
        fields: [
          ...carBase("auto"),
          sel("otvExempt", "ÖTV muafiyetli", EH, "special", { filter: { group: "special", primary: true } }),
          sel("adapted", "Tertibatlı", EH),
          sel("kit", "Tertibat türü", DISABLED_KITS, "special", { specLabel: "Donanım", aliases: ["Engelli donanımı"] }),
          sel("kitRemovable", "Tertibat sökülebilir", EH),
          sel("restriction", "Kullanım / satış kısıtı", DISABLED_RESTRICTION),
          ...tail(),
        ],
        groups: carGroupsAll(),
      };
    case "deniz":
      return {
        segment: "deniz",
        chassis: false,
        fields: [
          sel("boatType", "Tekne tipi", BOAT_TYPES, "vehicle", { specLabel: "Tekne", aliases: ["Tekne tipi"], required: true, filter: { group: "vehicle", primary: true } }),
          ...brandModel("deniz", { trim: true, trimRequired: false }),
          year(),
          num("lengthM", "Uzunluk", "m", "special", { required: true, decimal: true, filter: { group: "special", primary: true, mode: "range" } }),
          sel("hull", "Gövde malzemesi", HULL_MATERIALS),
          sel("engineBrand", "Motor markası", MARINE_ENGINE_BRANDS, "tech"),
          num("hp", "Motor gücü", "hp", "tech", { specLabel: "Motor gücü", aliases: ["Motor"], filter: { group: "tech", primary: true, mode: "range" } }),
          sel("engineCount", "Motor sayısı", BOAT_ENGINE_COUNTS, "tech"),
          fuel(BOAT_FUELS, false),
          num("engineHours", "Motor çalışma saati", "saat", "tech"),
          sel("cabins", "Kabin sayısı", BOAT_CABINS),
          sel("berths", "Yatak kapasitesi", BOAT_BERTHS, "special", { specLabel: "Yatak" }),
          sel("flag", "Bayrak / ruhsat", BOAT_FLAGS),
          kimden(),
          swap(),
        ],
        groups: BOAT_GROUPS,
      };
    case "air":
      return {
        segment: "air",
        chassis: false,
        fields: [
          sel("craft", "Hava aracı tipi", AIRCRAFT_TYPES_ALL, "vehicle", { specLabel: "Tip", aliases: ["Hava aracı"], required: true, filter: { group: "vehicle", primary: true } }),
          d("brand", "Üretici", "search", { specLabel: "Marka", options: brandNamesForSegment("air"), required: true, filter: pick("vehicle", true) }),
          d("model", "Model", "cascade", { dependsOn: "brand", optionSource: "vehicleModels", required: true, filter: pick("vehicle", true, "post.model") }),
          d("trim", "Versiyon", "cascade", { specLabel: "Paket", aliases: ["Seri"], dependsOn: "model", optionSource: "vehiclePackages", filter: pick("vehicle") }),
          year(),
          num("hours", "Uçuş saati", "saat", "tech", { specLabel: "Saat", aliases: ["Uçuş saati"], filter: { group: "tech", primary: true, mode: "range" } }),
          sel("engineCount", "Motor sayısı", AIR_ENGINE_COUNTS, "tech"),
          sel("engineType", "Motor tipi", AIR_ENGINE_TYPES, "tech"),
          num("mtow", "Maksimum kalkış ağırlığı (MTOW)", "kg", "tech"),
          sel("registry", "Ruhsat / tescil", AIR_REGISTRY),
          sel("maintenance", "Bakım durumu", AIR_MAINTENANCE),
          color(false),
          kimden(),
          swap(),
        ],
        groups: AIR_GROUPS,
      };
    default:
      return null;
  }
}

function carGroupsAll(): VehicleFeatureGroup[] {
  return carGroups(VEHICLE_SAFETY, VEHICLE_INTERIOR, VEHICLE_EXTERIOR, VEHICLE_MEDIA);
}
