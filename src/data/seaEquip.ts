export const SEA_EQUIP_BRANDS = [
  "Honda",
  "Yamaha",
  "Mercury",
  "Suzuki",
  "Volvo Penta",
  "Cummins",
  "Tohatsu",
  "Marin",
  "Garmin",
  "Raymarine",
  "Jotun",
  "International",
  "Hempel",
  "Arçelik",
  "Beko",
];

export const SEA_EQUIP_FEATURES = ["Orijinal", "Garantili", "Kutulu", "CE Belgeli", "Kullanılmamış"];

export const SEA_EQUIP_GROUPS: {
  id: string;
  slug: string;
  name: string;
  icon: string;
  count: number;
  aliases?: string[];
  products: string[];
}[] = [
  {
    id: "parts-sea-paint",
    slug: "boya-bakim",
    name: "Boya & Bakım",
    icon: "paint",
    count: 220,
    products: [
      "Bakım Kiti",
      "Epoksi & Fiber Tamir Seti",
      "Fırça & Rulo",
      "Kaymaz Boya",
      "Kova",
      "Macun",
      "Tiner",
      "Vernik & Astar",
      "Yağ",
      "Zehirli Boya",
    ],
  },
  {
    id: "parts-sea-mooring",
    slug: "demirleme-rihtim",
    name: "Demirleme & Rıhtım",
    icon: "anchor",
    count: 919,
    products: ["Demir", "Demir Zinciri", "Halat", "Iskaça", "Rıhtım Takozu", "Şamandıra", "Usturmaça", "Vinç"],
  },
  {
    id: "parts-sea-engine",
    slug: "deniz-motorlari",
    name: "Deniz Motorları",
    icon: "zap",
    count: 4_087,
    aliases: ["deniz-motor"],
    products: ["Dıştan Takma Motor", "İçten Takma Motor", "Saildrive", "Jet Motor", "Çıkma Motor", "Yedek Motor"],
  },
  {
    id: "parts-sea-helm",
    slug: "dumen-kumanda",
    name: "Dümen & Kumanda",
    icon: "compass",
    count: 907,
    products: ["Dümen", "Dümen Pompası", "Kumanda", "Direksiyon Sistemi", "Trim Tab"],
  },
  {
    id: "parts-sea-electric",
    slug: "deniz-elektrik",
    name: "Elektrik",
    icon: "zap",
    count: 2_192,
    products: ["Akü", "Şarj Cihazı", "İnvertör", "Kablo", "Pano", "Aydınlatma"],
  },
  {
    id: "parts-sea-electronic",
    slug: "deniz-elektronik",
    name: "Elektronik",
    icon: "cpu",
    count: 997,
    products: ["Telsiz", "AIS", "Otopilot", "Balık Bulucu", "Sensör"],
  },
  {
    id: "parts-sea-apparel",
    slug: "deniz-giyim",
    name: "Giyim",
    icon: "shirt",
    count: 26,
    products: ["Yağmurluk", "Polar", "Eldiven", "Ayakkabı", "Şapka"],
  },
  {
    id: "parts-sea-safety",
    slug: "deniz-guvenlik",
    name: "Güvenlik",
    icon: "shield",
    count: 692,
    products: ["Can Yeleği", "Can Simidi", "Yangın Söndürücü", "Fişek", "EPIRB", "Can Salı"],
  },
  {
    id: "parts-sea-acc",
    slug: "guverte",
    name: "Güverte",
    icon: "sail",
    count: 1_474,
    aliases: ["deniz-aksesuar"],
    products: ["Kürek", "SUP", "Tente", "Vinç", "Makara", "Olta"],
  },
  {
    id: "parts-sea-vent",
    slug: "havalandirma",
    name: "Havalandırma",
    icon: "wind",
    count: 345,
    products: ["Fan", "Klima", "Havalandırma Kapağı", "Mantar"],
  },
  {
    id: "parts-sea-hardware",
    slug: "hirdavat-tesisat",
    name: "Hırdavat & Tesisat",
    icon: "wrench",
    count: 416,
    products: ["Vana", "Hortum", "Pompa", "Paslanmaz Civata", "Conta"],
  },
  {
    id: "parts-sea-cabin",
    slug: "kabin-kamara",
    name: "Kabin & Kamara",
    icon: "home",
    count: 568,
    products: ["Yatak", "Mutfak", "Buzdolabı", "Koltuk", "Aydınlatma"],
  },
  {
    id: "parts-sea-parts",
    slug: "motor-aksami",
    name: "Motor Aksamı",
    icon: "cog",
    count: 2_783,
    products: ["Pervane", "Şaft", "Impeller", "Yakıt Filtresi", "Devirdaim", "Conta Seti"],
  },
  {
    id: "parts-sea-nav",
    slug: "navigasyon",
    name: "Navigasyon",
    icon: "compass",
    count: 1_111,
    aliases: ["deniz-elektronik-nav"],
    products: ["GPS", "Plotter", "Radar", "Pusula", "Harita"],
  },
];

export function isSeaEquipCategoryId(id: string) {
  return id === "parts-sea" || id.startsWith("parts-sea-");
}

export function seaEquipGroupById(id: string) {
  return SEA_EQUIP_GROUPS.find((g) => g.id === id || id.startsWith(`${g.id}-`));
}

export function seaEquipProductsFor(id: string) {
  if (id === "parts-sea") return [...new Set(SEA_EQUIP_GROUPS.flatMap((g) => g.products))];
  return seaEquipGroupById(id)?.products ?? [];
}
