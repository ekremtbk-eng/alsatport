/** Sol menü hiyerarşisi: marka → model/ürün kırılımları (Vasıta dışı tüm dallar). */

import {
  AUTO_ACC_BRANDS,
  brandNamesForSegment,
  MACHINE_BRANDS,
  PHONE_BRANDS,
  COMPUTER_BRANDS,
  TV_BRANDS,
  CAMERA_BRANDS,
  APPLIANCE_BRANDS,
  WATCH_BRANDS,
  TIRE_BRANDS,
  AUDIO_BRANDS,
  HELMET_BRANDS,
  ROOMS,
} from "@/data/listingOptions";
import {
  CPU_OPTS,
  RAM_OPTS,
  GPU_OPTS,
  SCREEN_OPTS,
  CONSOLE_GEN,
  MACHINE_BRANDS_WORK,
  MACHINE_BRANDS_FARM,
  MACHINE_BRANDS_IND,
  PET_FOOD_BRANDS,
  PET_CAGE_BRANDS,
  GENERIC_SHOP_BRANDS,
} from "@/data/filterCatalog";

export type CatRef = { id: string; slug?: string; brands?: string[] };

function k(s: string) {
  return s.toLocaleLowerCase("tr").replace(/[^a-z0-9ğüşöçı]/gi, "");
}

function brandHit(name: string, ...needles: string[]) {
  const n = k(name);
  return needles.some((x) => n.includes(k(x)));
}

const PHONE_MODELS: Record<string, string[]> = {
  apple: ["iPhone 16 Pro Max", "iPhone 16 Pro", "iPhone 16", "iPhone 15 Pro Max", "iPhone 15", "iPhone 14", "iPhone 13", "iPhone SE"],
  samsung: ["Galaxy S24 Ultra", "Galaxy S24", "Galaxy S23", "Galaxy A55", "Galaxy A35", "Galaxy Z Fold", "Galaxy Z Flip", "Galaxy M"],
  xiaomi: ["Xiaomi 14", "Redmi Note 13", "Redmi Note 12", "Poco X6", "Poco F6", "Mi Mix"],
  huawei: ["Pura 70", "P60", "Nova 12", "Mate 60"],
  oppo: ["Find X7", "Reno 12", "A60"],
  vivo: ["X100", "V30", "Y36"],
  realme: ["GT 6", "12 Pro", "C67"],
  google: ["Pixel 9 Pro", "Pixel 9", "Pixel 8a", "Pixel 8"],
  honor: ["Magic 6", "200 Pro", "X9"],
  oneplus: ["12", "12R", "Nord"],
  nothing: ["Phone (2)", "Phone (2a)"],
  sony: ["Xperia 1", "Xperia 5", "Xperia 10"],
};

const LAPTOP_MODELS: Record<string, string[]> = {
  apple: ["MacBook Air 13", "MacBook Air 15", "MacBook Pro 14", "MacBook Pro 16"],
  asus: ["ROG", "TUF", "Zenbook", "Vivobook", "ExpertBook"],
  lenovo: ["ThinkPad", "Legion", "Yoga", "IdeaPad", "LOQ"],
  hp: ["Pavilion", "Victus", "Omen", "EliteBook", "ProBook", "Envy"],
  msi: ["Stealth", "Katana", "Thin", "Prestige", "Creator"],
  monster: ["Tulpar", "Abra", "Semruk", "Huma"],
  dell: ["XPS", "Alienware", "G Series", "Inspiron", "Latitude"],
  acer: ["Predator", "Nitro", "Aspire", "Swift"],
  huawei: ["MateBook D", "MateBook X"],
  samsung: ["Galaxy Book"],
  microsoft: ["Surface Laptop", "Surface Pro"],
  razer: ["Blade 14", "Blade 16", "Blade 18"],
};

const WATCH_MODELS: Record<string, string[]> = {
  apple: ["Watch Ultra", "Watch Series 10", "Watch SE"],
  samsung: ["Galaxy Watch Ultra", "Galaxy Watch 7", "Galaxy Fit"],
  xiaomi: ["Watch 2", "Redmi Watch", "Smart Band"],
  huawei: ["Watch GT", "Watch Fit"],
  garmin: ["Fenix", "Forerunner", "Venu"],
  casio: ["G-Shock", "Edifice", "Vintage"],
  seiko: ["Presage", "5 Sports", "Prospex"],
  tissot: ["PRX", "Seastar", "Gentleman"],
};

const TV_MODELS: Record<string, string[]> = {
  samsung: ["QLED", "Neo QLED", "OLED", "Crystal UHD", "The Frame"],
  lg: ["OLED C", "OLED G", "QNED", "NanoCell"],
  sony: ["Bravia XR", "OLED A", "LED X"],
  vestel: ["Smart TV", "UHD", "QLED"],
  tcl: ["C-series", "QLED", "MiniLED"],
  philips: ["Ambilight", "OLED", "LED"],
};

const PART_TYPES: Record<string, string[]> = {
  cpu: CPU_OPTS,
  gpu: GPU_OPTS,
  ram: RAM_OPTS,
  ssd: ["256 GB", "512 GB", "1 TB", "2 TB", "4 TB"],
  anakart: ["Intel", "AMD", "B650", "Z790", "X670", "H610"],
  psu: ["500W", "650W", "750W", "850W", "1000W+"],
  kasa: ["Mini ITX", "mATX", "ATX", "Full Tower"],
  monitor: SCREEN_OPTS,
  sogutucu: ["Hava", "Sıvı AIO 240", "Sıvı AIO 360", "Custom loop"],
};

const PET_SPECIES = ["Kedi", "Köpek", "Kuş", "Balık", "Kemirgen", "Sürüngen", "At", "Diğer"];

export const EMLAK_ROOM_NAV = [...ROOMS];

export function extraBrandsFor(cat: CatRef): string[] {
  const id = cat.id;
  if (cat.brands?.length) return [...cat.brands];
  if (id.startsWith("parts-auto-spare")) {
    if (id.includes("karavan")) return brandNamesForSegment("van");
    if (id.includes("van")) return brandNamesForSegment("van");
    if (id.includes("ticari")) return brandNamesForSegment("ticari");
    return brandNamesForSegment("auto");
  }
  if (id.startsWith("parts-moto-spare")) return brandNamesForSegment("moto");
  if (id.includes("parts-auto-acc")) return [...AUTO_ACC_BRANDS];
  if (id.includes("parts-auto-tire") || id.includes("parts-moto-tire")) return [...TIRE_BRANDS];
  if (id.includes("parts-auto-audio") || id.includes("parts-auto-amp") || id.includes("parts-auto-media")) {
    return [...AUDIO_BRANDS];
  }
  if (id.includes("parts-moto-gear-helmet") || id.includes("kask")) return [...HELMET_BRANDS];
  if (id.startsWith("machines-farm")) return [...MACHINE_BRANDS_FARM];
  if (id.startsWith("machines-industry") || id.startsWith("machines-energy")) return [...MACHINE_BRANDS_IND];
  if (id.startsWith("machines-work") || id.startsWith("machines")) return [...MACHINE_BRANDS_WORK, ...MACHINE_BRANDS];
  if (id.startsWith("pets-food")) return [...PET_FOOD_BRANDS];
  if (id.startsWith("pets-cage")) return [...PET_CAGE_BRANDS];
  if (id.startsWith("pets-")) return [...PET_FOOD_BRANDS, ...PET_CAGE_BRANDS];
  if (id.startsWith("shopping-phone")) return [...PHONE_BRANDS];
  if (id.startsWith("shopping-computer")) return [...COMPUTER_BRANDS];
  if (id.startsWith("shopping-home-el") || id.includes("tech")) return [...TV_BRANDS];
  if (id.startsWith("shopping-camera")) return [...CAMERA_BRANDS];
  if (id.startsWith("shopping-appliance")) return [...APPLIANCE_BRANDS];
  if (id.startsWith("shopping-watch")) return [...WATCH_BRANDS];
  if (id.startsWith("shopping-gamer")) return [...CONSOLE_GEN];
  if (id.startsWith("shopping")) return [...GENERIC_SHOP_BRANDS];
  if (id.startsWith("emlak-konut") && !id.includes("satilik") && !id.includes("kiralik") && !id.includes("gunluk") && !id.includes("devren")) {
    return [];
  }
  return [];
}

export function extraModelsFor(cat: CatRef, brand: string): string[] {
  if (!brand) return [];
  const id = cat.id;

  if (id.includes("computer-parts") || id.includes("parca-donanim")) {
    if (brandHit(brand, "işlemci", "cpu")) return PART_TYPES.cpu;
    if (brandHit(brand, "ekran", "gpu")) return PART_TYPES.gpu;
    if (brandHit(brand, "ram", "bellek")) return PART_TYPES.ram;
    if (brandHit(brand, "ssd", "hdd", "depolama")) return PART_TYPES.ssd;
    if (brandHit(brand, "anakart")) return PART_TYPES.anakart;
    if (brandHit(brand, "güç", "psu")) return PART_TYPES.psu;
    if (brandHit(brand, "kasa")) return PART_TYPES.kasa;
    if (brandHit(brand, "monitör", "monitor")) return PART_TYPES.monitor;
    if (brandHit(brand, "soğut", "sogut")) return PART_TYPES.sogutucu;
    return [];
  }

  if (id.includes("phone") || id.includes("akilli-telefon")) {
    for (const [key, models] of Object.entries(PHONE_MODELS)) {
      if (brandHit(brand, key)) return models;
    }
  }
  if (id.includes("computer") || id.includes("dizustu") || id.includes("laptop")) {
    for (const [key, models] of Object.entries(LAPTOP_MODELS)) {
      if (brandHit(brand, key)) return models;
    }
  }
  if (id.includes("watch")) {
    for (const [key, models] of Object.entries(WATCH_MODELS)) {
      if (brandHit(brand, key)) return models;
    }
  }
  if (id.includes("home-el") || id.includes("goruntu") || id.includes("tv")) {
    for (const [key, models] of Object.entries(TV_MODELS)) {
      if (brandHit(brand, key)) return models;
    }
  }
  if (id.startsWith("pets-")) return PET_SPECIES;
  if (id.startsWith("machines-")) {
    if (id.includes("excavator") || id.includes("ekskavator")) return ["Paletli", "Lastikli", "Mini", "Midi", "Ağır"];
    if (id.includes("loader") || id.includes("loder")) return ["Lastikli", "Kazıcı yükleyici", "Mini"];
    if (id.includes("crane") || id.includes("vinc")) return ["Mobil", "Kule", "Sabit", "Vinç"];
    if (id.includes("forklift")) return ["Dizel", "Elektrik", "LPG", "Reach truck"];
    if (id.includes("tractor") || id.includes("traktor")) return ["Bahçe", "Tarım", "Bahçe+yükleyici", "Paletli"];
    if (id.includes("harvest") || id.includes("bicer")) return ["Buğday", "Mısır", "Pamuk"];
    if (id.includes("cnc")) return ["Torna", "Freze", "Lazer", "Plazma"];
    if (id.includes("gen") || id.includes("jenerator")) return ["Benzinli", "Dizel", "Gaz", "Jeneratör seti"];
    if (id.includes("comp") || id.includes("kompresor")) return ["Pistonlu", "Vidali", "Sessiz"];
    return [];
  }
  return [];
}

export function extraTrimsFor(cat: CatRef, brand: string, model: string): string[] {
  if (!brand || !model) return [];
  const id = cat.id;
  if (id.includes("phone") || id.includes("akilli-telefon")) {
    return ["64 GB", "128 GB", "256 GB", "512 GB", "1 TB"];
  }
  if (id.includes("computer") && !id.includes("parts")) {
    return ["8 GB RAM", "16 GB RAM", "32 GB RAM", "64 GB RAM"];
  }
  return [];
}

export function extraNavRooms(cat: CatRef): string[] {
  const id = cat.id;
  if (!id.startsWith("emlak-konut-")) return [];
  const housing = /daire|residence|mustakil|villa|ciftlik|kosk|yali|yazlik/.test(id);
  return housing ? EMLAK_ROOM_NAV : [];
}
