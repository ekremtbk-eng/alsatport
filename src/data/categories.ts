import { isBannedLiveAnimalCategory, isBannedLiveAnimalSlug } from "@/lib/liveAnimalPolicy";
import { otherCategories, shoppingCategories } from "@/data/shoppingCatalog";
import { SEA_EQUIP_GROUPS } from "@/data/seaEquip";
import { VEHICLE_BRANDS } from "@/data/vehicleCatalog";
import { isListingFilterEnabled } from "@/lib/listingQuery";

export type ListingFilter =
  | "urgent"
  | "h48"
  | "w1"
  | "m1"
  | "refurbished"
  | "oto360"
  | "expertise"
  | "emlak360"
  | "realtor"
  | "picks"
  | "story"
  | "legend"
  | "odd"
  | "circular";

export type Category = {
  id: string;
  slug: string;
  name: string;
  icon: string;
  count?: number;
  circular?: boolean;
  badge?: "new";
  filter?: ListingFilter;
  parentId?: string;
  children?: Category[];
  aliases?: string[];
  seeAll?: boolean;
  relatedIds?: string[];
  navHidden?: boolean;
  brands?: string[];
  cover?: string;
  hubFeatured?: boolean;
  /** Hub yerine ilan listesi; çocuklar sol menüde alt kırılım olarak kalır. */
  browse?: boolean;
};

function node(
  id: string,
  slug: string,
  name: string,
  icon: string,
  extra: Partial<Category> = {},
): Category {
  return { id, slug, name, icon, ...extra };
}

const KONUT_HOUSING: { key: string; name: string; icon: string; count: number; oldId?: string; oldSlug?: string }[] = [
  { key: "daire", name: "Daire", icon: "home", count: 412_000, oldId: "emlak-konut-daire", oldSlug: "daire" },
  { key: "residence", name: "Rezidans", icon: "buildings", count: 38_200, oldId: "emlak-konut-residence", oldSlug: "residence" },
  { key: "mustakil-ev", name: "Müstakil Ev", icon: "home", count: 71_000, oldId: "emlak-konut-mustakil", oldSlug: "mustakil-ev" },
  { key: "villa", name: "Villa", icon: "hotel", count: 48_100, oldId: "emlak-konut-villa", oldSlug: "villa" },
  { key: "ciftlik-evi", name: "Çiftlik Evi", icon: "trees", count: 8_400 },
  { key: "kosk-konak", name: "Köşk & Konak", icon: "landmark", count: 2_180 },
  { key: "yali", name: "Yalı", icon: "palmtree", count: 1_140 },
  { key: "yali-dairesi", name: "Yalı Dairesi", icon: "home", count: 890 },
  { key: "yazlik", name: "Yazlık", icon: "palmtree", count: 42_100, oldId: "emlak-konut-yazlik", oldSlug: "yazlik" },
];

function konutHousingNodes(parentId: string, slugPrefix: string, attachLegacy: boolean): Category[] {
  return KONUT_HOUSING.map((t) => {
    const aliases = [t.key];
    if (attachLegacy) {
      if (t.oldId) aliases.push(t.oldId);
      if (t.oldSlug) aliases.push(t.oldSlug);
    }
    return node(`${parentId}-${t.key}`, `${slugPrefix}-${t.key}`, t.name, t.icon, {
      parentId,
      count: t.count,
      aliases,
    });
  });
}

const SHOP_ID: Record<string, string> = {
  bilgisayar: "shopping-computer",
  dizustu: "shopping-computer-laptop",
  masaustu: "shopping-computer-desk",
  tablet: "shopping-computer-tablet",
  "parca-donanim": "shopping-computer-parts",
  "cep-telefonu-aksesuar": "shopping-phone",
  "akilli-telefon": "shopping-phone-handset",
  "giyilebilir-teknoloji": "shopping-phone-wearable",
  "telefon-aksesuarlari": "shopping-phone-acc",
  "fotograf-kamera": "shopping-camera",
  kameralar: "shopping-camera-body",
  "lens-ekipman": "shopping-camera-lens",
  "ev-dekorasyon": "shopping-decor",
  "mobilya-aksesuar": "shopping-decor-mobilya",
  "ev-tekstili-aydinlatma": "shopping-decor-textile",
  "ev-elektronigi": "shopping-home-el",
  "goruntu-ses": "shopping-home-el-av",
  "elektrikli-ev-aletleri": "shopping-appliance",
  "beyaz-esya": "shopping-appliance-white",
  "kucuk-ev-aletleri": "shopping-appliance-small",
  "giyim-aksesuar": "shopping-fashion",
  giyim: "shopping-fashion-apparel",
  "ayakkabi-canta": "shopping-fashion-bags",
  saat: "shopping-watch",
  "kol-saati": "shopping-watch-wrist",
  "mucevher-taki": "shopping-watch-jewel",
  "anne-bebek": "shopping-baby",
  "bebek-arabasi-oto-koltugu": "shopping-baby-stroller",
  "bebek-bakim-beslenme": "shopping-baby-care",
  "kisisel-bakim": "shopping-beauty",
  "sac-bakim": "shopping-beauty-hair",
  "tiras-epilasyon": "shopping-beauty-shave",
  "parfum-kozmetik": "shopping-beauty-perfume",
  "hobi-oyuncak": "shopping-hobby",
  "oyuncak-figur": "shopping-hobby-toys",
  "model-maket": "shopping-hobby-model",
  "kutu-oyunlari-puzzle": "shopping-hobby-games",
  "oyunculara-ozel": "shopping-gamer",
  "oyuncu-ekipmanlari": "shopping-gamer-gear",
  "konsol-oyun": "shopping-gamer-console",
  "kitap-dergi-film": "shopping-book",
  kitap: "shopping-book-books",
  "film-muzik": "shopping-book-media",
  muzik: "shopping-music",
  "muzik-aletleri": "shopping-music-instruments",
  "yayli-telli": "shopping-music-strings",
  spor: "shopping-sport",
  "fitness-kondisyon": "shopping-sport-fitness",
  "outdoor-kamp": "shopping-sport-outdoor",
  "takim-bireysel": "shopping-sport-team",
  taki: "shopping-jewel",
  mucevher: "shopping-jewel-gem",
  bijuteri: "shopping-jewel-fashion",
  koleksiyon: "shopping-collect",
  "koleksiyon-urunleri": "shopping-collect-items",
  antika: "shopping-antique",
  "antika-esyalar": "shopping-antique-items",
  "bahçe-yapi-market": "shopping-garden",
  "bahce-bakim": "shopping-garden-care",
  "el-aletleri-hirdavat": "shopping-garden-tools",
  "teknik-elektronik": "shopping-tech",
  "olcum-test": "shopping-tech-measure",
  "elektronik-bilesenler": "shopping-tech-parts",
  "ofis-kirtasiye": "shopping-office",
  "ofis-malzemeleri": "shopping-office-supplies",
  "yiyecek-icecek": "shopping-food",
  "gurme-organik": "shopping-food-gourmet",
};

const SHOP_ICON: Record<string, string> = {
  bilgisayar: "laptop",
  dizustu: "laptop",
  masaustu: "monitor",
  tablet: "tablet",
  "parca-donanim": "cog",
  "cep-telefonu-aksesuar": "smartphone",
  "akilli-telefon": "smartphone",
  "giyilebilir-teknoloji": "watch",
  "telefon-aksesuarlari": "sparkles",
  "fotograf-kamera": "camera",
  kameralar: "camera",
  "lens-ekipman": "camera",
  "ev-dekorasyon": "sofa",
  "mobilya-aksesuar": "sofa",
  "ev-tekstili-aydinlatma": "home",
  "ev-elektronigi": "tv",
  "goruntu-ses": "tv",
  "elektrikli-ev-aletleri": "plug",
  "beyaz-esya": "plug",
  "kucuk-ev-aletleri": "plug",
  "giyim-aksesuar": "shirt",
  giyim: "shirt",
  "ayakkabi-canta": "bag",
  saat: "watch",
  "kol-saati": "watch",
  "mucevher-taki": "gem",
  "anne-bebek": "baby",
  "bebek-arabasi-oto-koltugu": "baby",
  "bebek-bakim-beslenme": "baby",
  "kisisel-bakim": "sparkles",
  "sac-bakim": "sparkles",
  "tiras-epilasyon": "sparkles",
  "parfum-kozmetik": "sparkles",
  "hobi-oyuncak": "gamepad",
  "oyuncak-figur": "gamepad",
  "model-maket": "gamepad",
  "kutu-oyunlari-puzzle": "gamepad",
  "oyunculara-ozel": "gamepad",
  "oyuncu-ekipmanlari": "gamepad",
  "konsol-oyun": "gamepad",
  "kitap-dergi-film": "book",
  kitap: "book",
  "film-muzik": "music",
  muzik: "music",
  "muzik-aletleri": "music",
  "yayli-telli": "music",
  spor: "bike",
  "fitness-kondisyon": "bike",
  "outdoor-kamp": "trees",
  "takim-bireysel": "bike",
  taki: "gem",
  mucevher: "gem",
  bijuteri: "gem",
  koleksiyon: "archive",
  "koleksiyon-urunleri": "archive",
  antika: "landmark",
  "antika-esyalar": "landmark",
  "bahçe-yapi-market": "trees",
  "bahce-bakim": "trees",
  "el-aletleri-hirdavat": "wrench",
  "teknik-elektronik": "cpu",
  "olcum-test": "cpu",
  "elektronik-bilesenler": "cpu",
  "ofis-kirtasiye": "briefcase",
  "ofis-malzemeleri": "briefcase",
  "yiyecek-icecek": "utensils",
  "gurme-organik": "utensils",
};

const SHOP_ALIAS: Record<string, string[]> = {
  "shopping-computer": ["computer"],
  "shopping-computer-parts": ["bilgisayar-parca"],
  "shopping-phone": ["phones", "cep-telefonu"],
  "shopping-phone-handset": ["telefon"],
  "shopping-phone-wearable": ["telefon-yedek"],
  "shopping-phone-acc": ["kilif-aksesuar"],
  "shopping-fashion": ["fashion"],
  "shopping-fashion-apparel": ["kadin-giyim", "erkek-giyim", "cocuk-giyim"],
  "shopping-fashion-bags": ["ayakkabi"],
  "shopping-hobby": ["hobby"],
  "shopping-sport": ["sport"],
  "shopping-jewel": ["taki-mucevher"],
  "shopping-garden": ["home", "yard"],
  "shopping-tech": ["electronics"],
};

function shopPublicSlug(slug: string) {
  if (slug === "cep-telefonu-aksesuar") return "cep-telefonu";
  if (slug === "bahçe-yapi-market") return "bahce-yapi-market";
  return slug;
}

function shoppingTree(): Category[] {
  return [...shoppingCategories, ...otherCategories].map((group) => {
    const id = SHOP_ID[group.slug] ?? `shopping-${group.slug}`;
    const children = group.subCategories.map((sub) => {
      const sid = SHOP_ID[sub.slug] ?? `${id}-${sub.slug}`;
      return node(sid, sub.slug, sub.name, SHOP_ICON[sub.slug] ?? "bag", {
        parentId: id,
        brands: sub.brands,
        aliases: SHOP_ALIAS[sid],
      });
    });
    return node(id, shopPublicSlug(group.slug), group.name, SHOP_ICON[group.slug] ?? "bag", {
      parentId: "shopping",
      aliases: SHOP_ALIAS[id],
      brands: [...new Set(children.flatMap((c) => c.brands ?? []))],
      children,
    });
  });
}

export function brandsForCategory(cat: Category): string[] {
  const nested = (cat.children ?? []).flatMap(brandsForCategory);
  return [...new Set([...(cat.brands ?? []), ...nested])];
}

export const categoryShortcuts: Category[] = [
  node("filter-urgent", "acil", "Acil Acil", "zap", { filter: "urgent" }),
  node("filter-48h", "son-48-saat", "Son 48 Saat", "clock", { filter: "h48" }),
  node("hub-picks", "sectiklerimiz", "Seçtiklerimiz", "sparkles", { filter: "picks" }),
  node("hub-story", "hikayeni-paylas", "Hikayeni Paylaş", "megaphone", { filter: "story" }),
  node("hub-legend", "efsane-ilanlar", "Efsane İlanlar", "star", { filter: "legend" }),
  node("hub-odd", "ilginc-ilanlar", "İlginç İlanlar", "flame", { filter: "odd" }),
].filter((c) => isListingFilterEnabled(c.filter));

export const categories: Category[] = [
  node("emlak", "emlak", "Emlak", "building", {
    count: 1_189_745,
    children: [
      node("emlak-konut", "konut", "Konut", "home", {
        count: 776_713,
        parentId: "emlak",
        aliases: ["estate"],
        children: [
          node("emlak-konut-satilik", "satilik-konut", "Satılık", "key", {
            count: 528_700,
            parentId: "emlak-konut",
            browse: true,
            children: konutHousingNodes("emlak-konut-satilik", "satilik", true),
          }),
          node("emlak-konut-kiralik", "kiralik-konut", "Kiralık", "key", {
            count: 201_790,
            parentId: "emlak-konut",
            browse: true,
            children: konutHousingNodes("emlak-konut-kiralik", "kiralik", false),
          }),
          node("emlak-konut-gunluk", "turistik-gunluk-kiralik", "Turistik Günlük Kiralık", "palmtree", {
            count: 38_510,
            parentId: "emlak-konut",
            browse: true,
            children: konutHousingNodes("emlak-konut-gunluk", "gunluk-kiralik", false),
          }),
          node("emlak-konut-devren", "devren-satilik-konut", "Devren Satılık Konut", "store", {
            count: 7_713,
            parentId: "emlak-konut",
            browse: true,
            children: konutHousingNodes("emlak-konut-devren", "devren-satilik", false),
          }),
        ],
      }),
      node("emlak-isyeri", "is-yeri", "İş Yeri", "store", {
        count: 151_192,
        parentId: "emlak",
        children: [
          node("emlak-isyeri-ofis", "ofis", "Ofis", "briefcase", { count: 54_210, parentId: "emlak-isyeri" }),
          node("emlak-isyeri-dukkan", "dukkan", "Dükkan & Mağaza", "store", { count: 61_880, parentId: "emlak-isyeri" }),
          node("emlak-isyeri-depo", "depo", "Depo & Antrepo", "warehouse", { count: 22_410, parentId: "emlak-isyeri" }),
          node("emlak-isyeri-plaza", "plaza", "Plaza", "buildings", { count: 12_692, parentId: "emlak-isyeri" }),
        ],
      }),
      node("emlak-arsa", "arsa", "Arsa", "land", {
        count: 249_492,
        parentId: "emlak",
        children: [
          node("emlak-arsa-konut", "konut-imarli", "Konut İmarlı", "land", { count: 148_200, parentId: "emlak-arsa" }),
          node("emlak-arsa-ticari", "ticari-imarli", "Ticari İmarlı", "store", { count: 41_110, parentId: "emlak-arsa" }),
          node("emlak-arsa-tarla", "tarla", "Tarla", "trees", { count: 60_182, parentId: "emlak-arsa" }),
        ],
      }),
      node("emlak-proje", "konut-projeleri", "Konut Projeleri", "buildings", { count: 1_333, parentId: "emlak" }),
      node("emlak-bina", "bina", "Bina", "building", { count: 8_601, parentId: "emlak" }),
      node("emlak-devre", "devre-mulk", "Devre Mülk", "key", { count: 2_328, parentId: "emlak" }),
      node("emlak-turistik", "turistik-tesis", "Turistik Tesis", "palmtree", { count: 1_417, parentId: "emlak" }),
    ],
  }),
  node("vasita", "vasita", "Vasıta", "car", {
    count: 788_867,
    seeAll: true,
    children: [
      node("vasita-otomobil", "otomobil", "Otomobil", "car", {
        count: 376_575,
        parentId: "vasita",
        aliases: ["auto"],
      }),
      node("vasita-suv", "arazi-suv-pickup", "Arazi, SUV & Pickup", "suv", { count: 114_477, parentId: "vasita" }),
      node("vasita-ev", "elektrikli-araclar", "Elektrikli Araçlar", "zap", {
        count: 10_306,
        parentId: "vasita",
        circular: true,
      }),
      node("vasita-moto", "motosiklet", "Motosiklet", "bike", { count: 122_201, parentId: "vasita" }),
      node("vasita-van", "minivan-panelvan", "Minivan & Panelvan", "van", { count: 77_055, parentId: "vasita" }),
      node("vasita-ticari", "ticari-araclar", "Ticari Araçlar", "truck", { count: 47_372, parentId: "vasita" }),
      node("vasita-kiralik", "kiralik-araclar", "Kiralık Araçlar", "key", { count: 10_893, parentId: "vasita" }),
      node("vasita-deniz", "deniz-araclari", "Deniz Araçları", "sail", { count: 9_982, parentId: "vasita" }),
      node("vasita-hasarli", "hasarli-araclar", "Hasarlı Araçlar", "wrench", { count: 4_241, parentId: "vasita" }),
      node("vasita-karavan", "karavan", "Karavan", "tent", { count: 5_336, parentId: "vasita" }),
      node("vasita-klasik", "klasik-araclar", "Klasik Araçlar", "crown", { count: 1_792, parentId: "vasita" }),
      node("vasita-hava", "hava-araclari", "Hava Araçları", "plane", { count: 16, parentId: "vasita" }),
      node("vasita-atv", "atv", "ATV", "bike", { count: 3_227, parentId: "vasita" }),
      node("vasita-utv", "utv", "UTV", "bike", { count: 445, parentId: "vasita" }),
      node("vasita-engelli", "engelli-plakali-araclar", "Engelli Plakalı Araçlar", "access", { count: 106, parentId: "vasita" }),
    ],
  }),
  node("parts", "yedek-parca", "Yedek Parça, Aksesuar, Donanım & Tuning", "cog", {
    count: 3_446_708,
    children: [
      node("parts-auto", "otomotiv-ekipmanlari", "Otomotiv Ekipmanları", "wrench", {
        count: 3_246_798,
        parentId: "parts",
        relatedIds: ["parts-auto-cam", "parts-auto-media", "parts-auto-amp"],
        children: [
          node("parts-auto-spare", "yedek-parca-oto", "Yedek Parça", "cog", {
            count: 2_648_720,
            parentId: "parts-auto",
            browse: true,
            children: [
              node("parts-auto-spare-auto", "yedek-otomobil-arazi", "Otomobil & Arazi Aracı", "car", {
                count: 2_065_348,
                parentId: "parts-auto-spare",
              }),
              node("parts-auto-spare-van", "yedek-minivan-panelvan", "Minivan & Panelvan", "van", {
                count: 268_410,
                parentId: "parts-auto-spare",
              }),
              node("parts-auto-spare-ticari", "yedek-ticari-arac", "Ticari Araçlar", "truck", {
                count: 198_640,
                parentId: "parts-auto-spare",
              }),
              node("parts-auto-spare-karavan", "yedek-karavan", "Karavan", "tent", {
                count: 21_880,
                parentId: "parts-auto-spare",
              }),
              node("parts-auto-spare-gokart", "yedek-go-kart", "Go Kart", "flag", {
                count: 1_318,
                parentId: "parts-auto-spare",
              }),
            ],
          }),
          node("parts-auto-acc", "aksesuar-tuning", "Aksesuar & Tuning", "sparkles", {
            count: 194_380,
            parentId: "parts-auto",
            browse: true,
            children: [
              node("parts-auto-acc-ic", "ic-aksesuar", "İç Aksesuar", "sparkles", { count: 62_400, parentId: "parts-auto-acc" }),
              node("parts-auto-acc-dis", "dis-aksesuar", "Dış Aksesuar", "sparkles", { count: 54_180, parentId: "parts-auto-acc" }),
              node("parts-auto-acc-light", "aydinlatma-tuning", "Aydınlatma & Xenon", "zap", { count: 38_210, parentId: "parts-auto-acc" }),
              node("parts-auto-acc-perf", "performans-tuning", "Performans & Tuning", "flame", { count: 39_590, parentId: "parts-auto-acc" }),
            ],
          }),
          node("parts-auto-tire", "jant-lastik", "Jant & Lastik", "circle", { count: 327_219, parentId: "parts-auto" }),
          node("parts-auto-audio", "ses-goruntu", "Ses & Görüntü Sistemleri", "music", {
            count: 76_479,
            parentId: "parts-auto",
          }),
          node("parts-auto-cam", "arac-ici-kamera", "Araç İçi Kamera", "camera", {
            count: 1_223,
            parentId: "parts-auto",
          }),
          node("parts-auto-media", "multimedya-oynatici", "Multimedya Oynatıcı", "tv", {
            count: 45_540,
            parentId: "parts-auto",
          }),
          node("parts-auto-amp", "amfi", "Amfi", "music", { count: 3_788, parentId: "parts-auto" }),
        ],
      }),
      node("parts-moto", "motosiklet-ekipmanlari", "Motosiklet Ekipmanları", "bike", {
        count: 181_028,
        parentId: "parts",
        relatedIds: ["parts-moto-gear-helmet", "parts-moto-gear-jacket", "parts-moto-gear-boots"],
        children: [
          node("parts-moto-gear", "kask-kiyafet-ekipman", "Kask, Kıyafet & Ekipman", "shield", {
            count: 32_043,
            parentId: "parts-moto",
            browse: true,
            aliases: ["kask-mont"],
            children: [
              node("parts-moto-gear-boots", "moto-ayakkabi-bot", "Ayakkabı & Bot", "footprints", {
                count: 1_393,
                parentId: "parts-moto-gear",
              }),
              node("parts-moto-gear-helmet", "moto-kask", "Kask", "shield", {
                count: 16_656,
                parentId: "parts-moto-gear",
              }),
              node("parts-moto-gear-jacket", "moto-mont", "Mont", "shirt", {
                count: 7_405,
                parentId: "parts-moto-gear",
              }),
              node("parts-moto-gear-pants", "moto-pantolon", "Pantolon", "shirt", {
                count: 1_349,
                parentId: "parts-moto-gear",
              }),
              node("parts-moto-gear-sweat", "moto-sweatshirt", "Sweatshirt", "shirt", {
                count: 286,
                parentId: "parts-moto-gear",
              }),
              node("parts-moto-gear-tee", "moto-tisort", "Tişört", "shirt", {
                count: 441,
                parentId: "parts-moto-gear",
              }),
              node("parts-moto-gear-suit", "moto-tulum", "Tulum", "shirt", {
                count: 235,
                parentId: "parts-moto-gear",
              }),
              node("parts-moto-gear-rain", "moto-yagmurluk", "Yağmurluk", "cloud", {
                count: 278,
                parentId: "parts-moto-gear",
              }),
            ],
          }),
          node("parts-moto-spare", "moto-yedek-parca", "Yedek Parça", "cog", { count: 113_006, parentId: "parts-moto" }),
          node("parts-moto-acc", "moto-aksesuar", "Aksesuar & Tuning", "sparkles", {
            count: 25_178,
            parentId: "parts-moto",
          }),
          node("parts-moto-elec", "moto-elektronik", "Elektronik Ekipman", "cpu", {
            count: 1_582,
            parentId: "parts-moto",
          }),
          node("parts-moto-tire", "moto-jant-lastik", "Jant & Lastik", "circle", {
            count: 10_322,
            parentId: "parts-moto",
          }),
        ],
      }),
      node("parts-sea", "deniz-araci-ekipmanlari", "Deniz Aracı Ekipmanları", "ship", {
        count: 18_887,
        parentId: "parts",
        children: SEA_EQUIP_GROUPS.map((g) =>
          node(g.id, g.slug, g.name, g.icon, {
            count: g.count,
            parentId: "parts-sea",
            browse: true,
            aliases: g.aliases,
          }),
        ),
      }),
    ],
  }),
  node("shopping", "ikinci-el", "İkinci El ve Sıfır Alışveriş", "bag", {
    count: 3_059_694,
    circular: true,
    seeAll: true,
    children: [
      ...shoppingTree(),
      node("shopping-other", "diger-her-sey", "Diğer Her Şey", "grid", {
        count: 16_195,
        parentId: "shopping",
        aliases: ["other"],
      }),
      node("shopping-yepy", "yepy", "Yepy", "refresh", {
        count: 222,
        parentId: "shopping",
        circular: true,
      }),
    ],
  }),
  node("machines", "is-makineleri-sanayi", "İş Makineleri & Sanayi", "truck", {
    count: 132_221,
    children: [
      node("machines-work", "is-makineleri", "İş Makineleri", "truck", {
        count: 23_725,
        parentId: "machines",
        children: [
          node("machines-work-excavator", "ekskavator", "Ekskavatör", "truck", { count: 8_210, parentId: "machines-work" }),
          node("machines-work-loader", "loder", "Loder", "truck", { count: 6_440, parentId: "machines-work" }),
          node("machines-work-crane", "vinc", "Vinç", "factory", { count: 4_180, parentId: "machines-work" }),
          node("machines-work-forklift", "forklift", "Forklift", "truck", { count: 4_895, parentId: "machines-work" }),
        ],
      }),
      node("machines-farm", "tarim-makineleri", "Tarım Makineleri", "tractor", {
        count: 40_296,
        parentId: "machines",
        children: [
          node("machines-farm-tractor", "traktor", "Traktör", "tractor", { count: 22_410, parentId: "machines-farm" }),
          node("machines-farm-harvest", "bicerdoover", "Biçerdöver", "tractor", { count: 8_220, parentId: "machines-farm" }),
          node("machines-farm-trailer", "romork", "Römork & Ekipman", "truck", { count: 9_666, parentId: "machines-farm" }),
        ],
      }),
      node("machines-industry", "sanayi", "Sanayi Ekipmanları", "factory", {
        count: 64_222,
        parentId: "machines",
        children: [
          node("machines-industry-gen", "jenerator", "Jeneratör", "zap", { count: 18_440, parentId: "machines-industry" }),
          node("machines-industry-cnc", "cnc", "CNC & Tezgah", "cog", { count: 21_180, parentId: "machines-industry" }),
          node("machines-industry-comp", "kompresor", "Kompresör", "factory", { count: 24_602, parentId: "machines-industry" }),
        ],
      }),
      node("machines-energy", "elektrik-enerji", "Elektrik & Enerji", "zap", {
        count: 3_979,
        parentId: "machines",
        children: [
          node("machines-energy-solar", "gunes-enerjisi", "Güneş Enerjisi", "zap", { count: 1_640, parentId: "machines-energy" }),
          node("machines-energy-ups", "ups-kesintisiz", "UPS & Kesintisiz Güç", "zap", { count: 1_120, parentId: "machines-energy" }),
          node("machines-energy-panel", "pano-trafo", "Pano & Trafo", "factory", { count: 1_219, parentId: "machines-energy" }),
        ],
      }),
    ],
  }),
  node("services", "ustalar-hizmetler", "Ustalar ve Hizmetler", "hammer", {
    count: 10_000,
    seeAll: true,
    children: [
      node("services-reno", "ev-tadilat", "Ev Tadilat & Dekorasyon", "paint", {
        parentId: "services",
        aliases: ["ev-tadilat-dekorasyon"],
        count: 15_300,
        children: [
          node("services-reno-paint", "boyaci", "Boyacı", "paint", {
            count: 2_833,
            parentId: "services-reno",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=900&q=80",
            children: [
              node("services-reno-paint-ext", "dis-cephe-boya", "Dış Cephe Boya", "paint", { count: 2_177, parentId: "services-reno-paint" }),
              node("services-reno-paint-wall", "duvar-kagidi", "Duvar Kağıdı", "paint", { count: 1_913, parentId: "services-reno-paint" }),
              node("services-reno-paint-int", "ic-cephe-boya", "İç Cephe Boya", "paint", { count: 2_511, parentId: "services-reno-paint" }),
            ],
          }),
          node("services-reno-elec", "elektrik-aydinlatma", "Elektrik & Aydınlatma", "zap", {
            count: 2_083,
            parentId: "services-reno",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1565814329452-e1efa11c5b89?auto=format&fit=crop&w=900&q=80",
            children: [
              node("services-reno-elec-garden", "bahce-aydinlatma", "Bahçe Aydınlatma", "zap", { count: 544, parentId: "services-reno-elec" }),
              node("services-reno-elec-cable", "elektrik-kablo-doseme", "Elektrik Kablo Döşeme", "zap", { count: 1_780, parentId: "services-reno-elec" }),
              node("services-reno-elec-install", "elektrik-tesisati-doseme-tamiri", "Elektrik Tesisatı Döşeme / Tamiri", "zap", { count: 1_787, parentId: "services-reno-elec" }),
              node("services-reno-elec-hidden", "gizli-isik", "Gizli Işık", "zap", { count: 1_031, parentId: "services-reno-elec" }),
              node("services-reno-elec-indoor", "ic-mekan-aydinlatma", "İç Mekan Aydınlatma", "zap", { count: 1_769, parentId: "services-reno-elec" }),
            ],
          }),
          node("services-reno-arch", "mimarlik-muhendislik", "Mimarlık & Mühendislik", "landmark", {
            count: 2_529,
            parentId: "services-reno",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=900&q=80",
            children: [
              node("services-reno-arch-int", "ic-mimari", "İç Mimari", "landmark", { count: 1_412, parentId: "services-reno-arch" }),
              node("services-reno-arch-arch", "mimarlik-hizmeti", "Mimarlık Hizmeti", "landmark", { count: 1_406, parentId: "services-reno-arch" }),
              node("services-reno-arch-eng", "muhendislik-hizmeti", "Mühendislik Hizmeti", "landmark", { count: 1_428, parentId: "services-reno-arch" }),
              node("services-reno-arch-prj", "proje-hizmetleri", "Proje Hizmetleri", "landmark", { count: 1_305, parentId: "services-reno-arch" }),
            ],
          }),
          node("services-reno-furn", "mobilya-ve-doseme", "Mobilya ve Döşeme", "sofa", {
            count: 1_912,
            parentId: "services-reno",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=900&q=80",
            children: [
              node("services-reno-furn-shelf", "dolap-raf", "Dolap & Raf", "sofa", { count: 1_333, parentId: "services-reno-furn" }),
              node("services-reno-furn-home", "ev-mobilyasi", "Ev Mobilyası", "sofa", { count: 1_290, parentId: "services-reno-furn" }),
              node("services-reno-furn-sofa", "koltuk-kaplama-doseme", "Koltuk Kaplama, Döşeme", "sofa", { count: 1_396, parentId: "services-reno-furn" }),
              node("services-reno-furn-polish", "mobilya-cila-lake", "Mobilya Cila & Lake İşleri", "sofa", { count: 1_333, parentId: "services-reno-furn" }),
              node("services-reno-furn-office", "ofis-mobilyasi", "Ofis Mobilyası", "sofa", { count: 1_224, parentId: "services-reno-furn" }),
            ],
          }),
          node("services-reno-plumb", "su-tesisati", "Su Tesisatı", "wrench", {
            count: 1_908,
            parentId: "services-reno",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=900&q=80",
            children: [
              node("services-reno-plumb-hydro", "hidrofor-tesisati", "Hidrofor Tesisatı Kurulum & Değişim", "wrench", { count: 254, parentId: "services-reno-plumb" }),
              node("services-reno-plumb-filter", "su-aritma-sistemleri", "Su Arıtma Sistemleri", "wrench", { count: 537, parentId: "services-reno-plumb" }),
              node("services-reno-plumb-tank", "su-deposu-temizlik", "Su Deposu Temizlik & Yalıtım", "wrench", { count: 837, parentId: "services-reno-plumb" }),
              node("services-reno-plumb-leak", "su-kacak-tespiti", "Su Kaçak Tespiti", "wrench", { count: 992, parentId: "services-reno-plumb" }),
              node("services-reno-plumb-clog", "tikali-boru-acma", "Tıkalı Boru Açma", "wrench", { count: 74, parentId: "services-reno-plumb" }),
            ],
          }),
          node("services-reno-insul", "yalitim-ve-mantolama", "Yalıtım ve Mantolama", "home", {
            count: 2_368,
            parentId: "services-reno",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=900&q=80",
            children: [
              node("services-reno-insul-roof", "cati-tamiri-yalitimi", "Çatı Tamiri / Yalıtımı", "home", { count: 1_172, parentId: "services-reno-insul" }),
              node("services-reno-insul-heat", "isi-yalitimi", "Isı Yalıtımı", "home", { count: 1_535, parentId: "services-reno-insul" }),
              node("services-reno-insul-wrap", "mantolama", "Mantolama", "home", { count: 1_547, parentId: "services-reno-insul" }),
              node("services-reno-insul-sound", "ses-yalitimi", "Ses Yalıtımı", "home", { count: 1_047, parentId: "services-reno-insul" }),
              node("services-reno-insul-water", "su-yalitimi", "Su Yalıtımı", "home", { count: 1_210, parentId: "services-reno-insul" }),
            ],
          }),
          node("services-reno-surface", "yuzey-doseme", "Yüzey Döşeme", "grid", {
            count: 1_829,
            parentId: "services-reno",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1502005097973-6a7084991d45?auto=format&fit=crop&w=900&q=80",
            children: [
              node("services-reno-surface-mosaic", "cam-mozaik", "Cam Mozaik", "grid", { count: 410, parentId: "services-reno-surface" }),
              node("services-reno-surface-tile", "fayans", "Fayans", "grid", { count: 890, parentId: "services-reno-surface" }),
              node("services-reno-surface-granite", "granit", "Granit", "grid", { count: 640, parentId: "services-reno-surface" }),
              node("services-reno-surface-chini", "karo-cini", "Karo Çini", "grid", { count: 380, parentId: "services-reno-surface" }),
              node("services-reno-surface-marble", "mermer", "Mermer", "grid", { count: 720, parentId: "services-reno-surface" }),
              node("services-reno-surface-ceramic", "seramik", "Seramik", "grid", { count: 980, parentId: "services-reno-surface" }),
            ],
          }),
          node("services-reno-floor", "zemin-kaplama", "Zemin Kaplama", "grid", {
            count: 1_895,
            parentId: "services-reno",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1615874959471-b3d8b85e7b41?auto=format&fit=crop&w=900&q=80",
            children: [
              node("services-reno-floor-ind", "endustriyel-zemin", "Endüstriyel Zemin", "grid", { count: 290, parentId: "services-reno-floor" }),
              node("services-reno-floor-epoxy", "epoksi", "Epoksi", "grid", { count: 410, parentId: "services-reno-floor" }),
              node("services-reno-floor-carpet", "hali-kaplama", "Halı Kaplama", "grid", { count: 520, parentId: "services-reno-floor" }),
              node("services-reno-floor-laminate", "laminat-parke", "Laminat Parke", "grid", { count: 780, parentId: "services-reno-floor" }),
              node("services-reno-floor-engineered", "lamine-parke", "Lamine Parke", "grid", { count: 610, parentId: "services-reno-floor" }),
              node("services-reno-floor-solid", "masif-parke", "Masif Parke", "grid", { count: 440, parentId: "services-reno-floor" }),
              node("services-reno-floor-polish", "siste-cila", "Siste Cila", "grid", { count: 355, parentId: "services-reno-floor" }),
            ],
          }),
          node("services-reno-alarm", "alarm-guvenlik", "Alarm & Güvenlik", "shield", { count: 849, parentId: "services-reno" }),
          node("services-reno-plaster", "alci-kartonpiyer", "Alçı & Kartonpiyer", "paint", { count: 2_732, parentId: "services-reno" }),
          node("services-reno-garden", "bahce-ve-peyzaj", "Bahçe ve Peyzaj", "trees", { count: 1_049, parentId: "services-reno" }),
          node("services-reno-bath", "banyo-mutfak-dekorasyonu", "Banyo ve Mutfak Dekorasyonu", "sparkles", { count: 3_360, parentId: "services-reno" }),
          node("services-reno-lock", "cilingir", "Çilingir", "key", { count: 338, parentId: "services-reno" }),
          node("services-reno-iron", "demir-ferforje", "Demir & Ferforje", "wrench", { count: 1_044, parentId: "services-reno" }),
          node("services-reno-gas", "dogalgaz-tesisati", "Doğalgaz Tesisatı", "flame", { count: 1_164, parentId: "services-reno" }),
          node("services-reno-hvac", "isitma-sogutma", "Isıtma, Soğutma", "zap", { count: 1_270, parentId: "services-reno" }),
          node("services-reno-build", "insaat-hafriyat", "İnşaat & Hafriyat", "truck", { count: 1_922, parentId: "services-reno" }),
          node("services-reno-door", "kapi-pencere-cam", "Kapı, Pencere, Cam & Cam Balkon", "home", { count: 1_989, parentId: "services-reno" }),
          node("services-reno-wood", "marangoz", "Marangoz", "hammer", { count: 1_374, parentId: "services-reno" }),
          node("services-reno-stone", "tas-beton-doseme", "Taş & Beton Döşeme", "landmark", { count: 717, parentId: "services-reno" }),
          node("services-reno-clean", "temizlik-ilaclama", "Temizlik & İlaçlama", "sparkles", { count: 787, parentId: "services-reno" }),
        ],
      }),
      node("services-move", "nakliye", "Nakliye", "truck", {
        parentId: "services",
        count: 3_300,
        children: [
          node("services-move-home", "evden-eve-nakliyat", "Evden Eve Nakliyat", "truck", {
            count: 2_265,
            parentId: "services-move",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1600518464441-9154a4dea21b?auto=format&fit=crop&w=900&q=80",
            children: [
              node("services-move-home-lift", "asansorlu-tasima", "Asansörlü Taşıma", "truck", { count: 1_374, parentId: "services-move-home" }),
              node("services-move-home-city", "sehirici-evden-eve-nakliyat", "Şehiriçi Evden Eve Nakliyat", "truck", { count: 2_185, parentId: "services-move-home" }),
              node("services-move-home-intercity", "sehirlerarasi-evden-eve-nakliyat", "Şehirlerarası Evden Eve Nakliyat", "truck", { count: 2_165, parentId: "services-move-home" }),
              node("services-move-home-intl", "uluslararasi-nakliyat", "Uluslararası Nakliyat", "truck", { count: 298, parentId: "services-move-home" }),
            ],
          }),
          node("services-move-fair", "fuar-fabrika-banka-tasimaciligi", "Fuar, Fabrika & Banka Taşımacılığı", "building", {
            count: 1_164,
            parentId: "services-move",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=900&q=80",
            children: [
              node("services-move-fair-pack", "ambalajlama", "Ambalajlama", "archive", { count: 752, parentId: "services-move-fair" }),
              node("services-move-fair-machine", "makina-tasima", "Makina Taşıma", "factory", { count: 730, parentId: "services-move-fair" }),
              node("services-move-fair-office", "ofis-tasima", "Ofis Taşıma", "building", { count: 1_006, parentId: "services-move-fair" }),
              node("services-move-fair-stand", "stant-sokme-kurma", "Stant Sökme & Kurma", "store", { count: 276, parentId: "services-move-fair" }),
            ],
          }),
          node("services-move-customs", "gumrukleme", "Gümrükleme", "landmark", {
            count: 98,
            parentId: "services-move",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=900&q=80",
            children: [
              node("services-move-customs-broker", "gumruk-musavirligi", "Gümrük Müşavirliği", "scale", { count: 73, parentId: "services-move-customs" }),
            ],
          }),
          node("services-move-courier", "kurye-kargo", "Kurye, Kargo", "bike", {
            count: 599,
            parentId: "services-move",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1616401784845-180882ba9ba8?auto=format&fit=crop&w=900&q=80",
            children: [
              node("services-move-courier-car", "aracli-kurye", "Araçlı Kurye", "car", { count: 182, parentId: "services-move-courier" }),
              node("services-move-courier-express", "express-kurye", "Express Kurye", "zap", { count: 281, parentId: "services-move-courier" }),
              node("services-move-courier-cargo", "kargo", "Kargo", "archive", { count: 397, parentId: "services-move-courier" }),
              node("services-move-courier-moto", "motorlu-kurye", "Motorlu Kurye", "bike", { count: 140, parentId: "services-move-courier" }),
              node("services-move-courier-intercity", "sehirlerarasi-kurye", "Şehirlerarası Kurye", "truck", { count: 149, parentId: "services-move-courier" }),
              node("services-move-courier-bulk", "toplu-gonderi-hizmetleri", "Toplu Gönderi Hizmetleri", "archive", { count: 327, parentId: "services-move-courier" }),
            ],
          }),
          node("services-move-logistics", "lojistik-depolama-paketleme", "Lojistik, Depolama & Paketleme", "warehouse", {
            count: 1_105,
            parentId: "services-move",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=900&q=80",
            children: [
              node("services-move-logistics-pack", "ambalaj-paketleme", "Ambalaj & Paketleme", "archive", { count: 651, parentId: "services-move-logistics" }),
              node("services-move-logistics-bond", "antrepo", "Antrepo", "warehouse", { count: 245, parentId: "services-move-logistics" }),
              node("services-move-logistics-sea", "denizyolu-lojistik", "Denizyolu Lojistik", "ship", { count: 134, parentId: "services-move-logistics" }),
              node("services-move-logistics-store", "depolama", "Depolama", "warehouse", { count: 509, parentId: "services-move-logistics" }),
              node("services-move-logistics-intl", "uluslararasi-lojistik", "Uluslararası Lojistik", "ship", { count: 239, parentId: "services-move-logistics" }),
              node("services-move-logistics-dom", "yurtici-lojistik", "Yurtiçi Lojistik", "truck", { count: 702, parentId: "services-move-logistics" }),
            ],
          }),
          node("services-move-depot", "nakliye-ambarlari-kooperatifleri", "Nakliye Ambarları & Kooperatifleri", "store", {
            count: 553,
            parentId: "services-move",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?auto=format&fit=crop&w=900&q=80",
            children: [
              node("services-move-depot-yard", "nakliye-ambarlari", "Nakliye Ambarları", "warehouse", { count: 462, parentId: "services-move-depot" }),
              node("services-move-depot-coop", "nakliye-kooperatifleri", "Nakliye Kooperatifleri", "users", { count: 286, parentId: "services-move-depot" }),
            ],
          }),
          node("services-move-driver", "soforlu-arac-transfer", "Şoförlü Araç & Transfer", "car", {
            count: 320,
            parentId: "services-move",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=900&q=80",
            children: [
              node("services-move-driver-wedding", "dugun-arabasi-kiralama", "Düğün Arabası Kiralama", "car", { count: 100, parentId: "services-move-driver" }),
              node("services-move-driver-limo", "limuzin-kiralama", "Limuzin Kiralama", "car", { count: 33, parentId: "services-move-driver" }),
              node("services-move-driver-staff", "personel-servisi-tasimaciligi", "Personel Servisi Taşımacılığı", "van", { count: 70, parentId: "services-move-driver" }),
              node("services-move-driver-city", "sehirici-transfer", "Şehiriçi Transfer", "car", { count: 244, parentId: "services-move-driver" }),
              node("services-move-driver-intercity", "sehirlerarasi-transfer", "Şehirlerarası Transfer", "car", { count: 220, parentId: "services-move-driver" }),
              node("services-move-driver-hire", "soforlu-arac-kiralama", "Şoförlü Araç Kiralama", "car", { count: 192, parentId: "services-move-driver" }),
            ],
          }),
          node("services-move-freight", "yuk-tasima", "Yük Taşıma", "truck", {
            count: 2_066,
            parentId: "services-move",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=900&q=80",
            children: [
              node("services-move-freight-ftl", "komple-tasima", "Komple Taşıma", "truck", { count: 1_867, parentId: "services-move-freight" }),
              node("services-move-freight-ltl", "parsiyel-tasima", "Parsiyel Taşıma", "truck", { count: 1_588, parentId: "services-move-freight" }),
            ],
          }),
        ],
      }),
      node("services-auto", "arac-servis-bakim", "Araç Servis & Bakım", "wrench", {
        parentId: "services",
        aliases: ["arac-servis"],
        count: 3_900,
        children: [
          node("services-auto-tow", "cekici-yol-yardim", "Çekici & Yol Yardım", "truck", {
            count: 887,
            parentId: "services-auto",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=900&q=80",
            children: [
              node("services-auto-tow-haul", "arac-tasima", "Araç Taşıma", "truck", { count: 588, parentId: "services-auto-tow" }),
              node("services-auto-tow-moto", "motosiklet-yol-yardim", "Motosiklet Yol Yardım", "bike", { count: 220, parentId: "services-auto-tow" }),
              node("services-auto-tow-rescue", "oto-kurtarma", "Oto Kurtarma", "truck", { count: 256, parentId: "services-auto-tow" }),
              node("services-auto-tow-road", "yol-yardim", "Yol Yardım", "car", { count: 216, parentId: "services-auto-tow" }),
            ],
          }),
          node("services-auto-marina", "marina-liman-hizmetleri", "Marina & Liman Hizmetleri", "ship", {
            count: 41,
            parentId: "services-auto",
            children: [
              node("services-auto-marina-dock", "kiralik-liman-iskele", "Kiralık Liman & İskele", "ship", { count: 18, parentId: "services-auto-marina" }),
              node("services-auto-marina-yard", "marina", "Marina", "ship", { count: 14, parentId: "services-auto-marina" }),
              node("services-auto-marina-captain", "yat-kaptani", "Yat Kaptanı", "ship", { count: 12, parentId: "services-auto-marina" }),
            ],
          }),
          node("services-auto-upholstery", "oto-doseme", "Oto Döşeme", "sofa", {
            count: 187,
            parentId: "services-auto",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=80",
            children: [
              node("services-auto-upholstery-wheel", "direksiyon-kaplama", "Direksiyon Kaplama", "car", { count: 131, parentId: "services-auto-upholstery" }),
              node("services-auto-upholstery-leather", "hakiki-deri-doseme", "Hakiki Deri Döşeme", "sofa", { count: 121, parentId: "services-auto-upholstery" }),
              node("services-auto-upholstery-mat", "oto-paspaslari", "Oto Paspasları", "car", { count: 93, parentId: "services-auto-upholstery" }),
              node("services-auto-upholstery-vinyl", "suni-deri-doseme", "Suni Deri Döşeme", "sofa", { count: 123, parentId: "services-auto-upholstery" }),
              node("services-auto-upholstery-roof", "tavan-doseme", "Tavan Döşeme", "sofa", { count: 126, parentId: "services-auto-upholstery" }),
            ],
          }),
          node("services-auto-inspect", "oto-ekspertiz", "Oto Ekspertiz", "wrench", {
            count: 1_091,
            parentId: "services-auto",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1487754180451-dcf98d98d4b6?auto=format&fit=crop&w=900&q=80",
            children: [
              node("services-auto-inspect-under", "alt-kontrol", "Alt Kontrol", "wrench", { count: 943, parentId: "services-auto-inspect" }),
              node("services-auto-inspect-fault", "ariza-tespit", "Arıza Tespit", "zap", { count: 1_002, parentId: "services-auto-inspect" }),
              node("services-auto-inspect-light", "far-ayar-testi", "Far Ayar Testi", "zap", { count: 676, parentId: "services-auto-inspect" }),
              node("services-auto-inspect-brake", "fren-testi", "Fren Testi", "car", { count: 840, parentId: "services-auto-inspect" }),
              node("services-auto-inspect-paint", "kaporta-boya-testi", "Kaporta & Boya Testi", "paint", { count: 930, parentId: "services-auto-inspect" }),
              node("services-auto-inspect-leg", "leg-testi", "Leg Testi", "car", { count: 411, parentId: "services-auto-inspect" }),
              node("services-auto-inspect-perf", "motor-performance-testi", "Motor Performance Testi", "zap", { count: 804, parentId: "services-auto-inspect" }),
              node("services-auto-inspect-susp", "suspansiyon-testi", "Süspansiyon Testi", "car", { count: 806, parentId: "services-auto-inspect" }),
              node("services-auto-inspect-slip", "yanal-kayma-testi", "Yanal Kayma Testi", "car", { count: 682, parentId: "services-auto-inspect" }),
            ],
          }),
          node("services-auto-elec", "oto-elektrik-ses", "Oto Elektrik & Ses", "zap", {
            count: 804,
            parentId: "services-auto",
            children: [
              node("services-auto-elec-battery", "aku", "Akü", "zap", { count: 310, parentId: "services-auto-elec" }),
              node("services-auto-elec-wire", "oto-elektrik", "Oto Elektrik", "zap", { count: 420, parentId: "services-auto-elec" }),
              node("services-auto-elec-video", "oto-goruntu", "Oto Görüntü", "tv", { count: 180, parentId: "services-auto-elec" }),
              node("services-auto-elec-nav", "oto-navigasyon", "Oto Navigasyon", "car", { count: 165, parentId: "services-auto-elec" }),
              node("services-auto-elec-audio", "oto-ses", "Oto Ses", "tv", { count: 248, parentId: "services-auto-elec" }),
              node("services-auto-elec-track", "oto-takip", "Oto Takip", "car", { count: 142, parentId: "services-auto-elec" }),
            ],
          }),
          node("services-auto-body", "oto-kaporta-boya", "Oto Kaporta & Boya", "paint", {
            count: 897,
            parentId: "services-auto",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1565043666747-69f6646db940?auto=format&fit=crop&w=900&q=80",
            children: [
              node("services-auto-body-pdr", "boyasiz-gocuk-duzeltme", "Boyasız Göçük Düzeltme", "paint", { count: 571, parentId: "services-auto-body" }),
              node("services-auto-body-dent", "gocuk-duzeltme", "Göçük Düzeltme", "paint", { count: 294, parentId: "services-auto-body" }),
              node("services-auto-body-paint", "kaporta-boya", "Kaporta Boya", "paint", { count: 327, parentId: "services-auto-body" }),
              node("services-auto-body-repair", "kaporta-tamiri", "Kaporta Tamiri", "wrench", { count: 343, parentId: "services-auto-body" }),
              node("services-auto-body-spot", "yama-boya", "Yama Boya", "paint", { count: 668, parentId: "services-auto-body" }),
            ],
          }),
          node("services-auto-tire", "oto-lastik-tamiri", "Oto Lastik Tamiri", "car", {
            count: 719,
            parentId: "services-auto",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=900&q=80",
            children: [
              node("services-auto-tire-rim-paint", "jant-boyama", "Jant Boyama", "paint", { count: 359, parentId: "services-auto-tire" }),
              node("services-auto-tire-rim", "jant-duzeltme-kaynak", "Jant Düzeltme & Kaynak", "wrench", { count: 318, parentId: "services-auto-tire" }),
              node("services-auto-tire-fix", "lastik-tamiri", "Lastik Tamiri", "car", { count: 514, parentId: "services-auto-tire" }),
            ],
          }),
          node("services-auto-mod", "oto-modifiye", "Oto Modifiye", "sparkles", {
            count: 1_372,
            parentId: "services-auto",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=900&q=80",
            children: [
              node("services-auto-mod-design", "arac-dizayn", "Araç Dizayn", "sparkles", { count: 382, parentId: "services-auto-mod" }),
              node("services-auto-mod-wrap", "arac-kaplama", "Araç Kaplama", "paint", { count: 144, parentId: "services-auto-mod" }),
              node("services-auto-mod-tune", "modifye", "Modifye", "sparkles", { count: 155, parentId: "services-auto-mod" }),
            ],
          }),
          node("services-auto-plate", "oto-plaka", "Oto Plaka", "car", {
            count: 90,
            parentId: "services-auto",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=900&q=80",
            children: [
              node("services-auto-plate-aso", "aso-plaka", "Aso Plaka", "car", { count: 38, parentId: "services-auto-plate" }),
              node("services-auto-plate-custom", "ozel-plaka", "Özel Plaka", "car", { count: 24, parentId: "services-auto-plate" }),
              node("services-auto-plate-official", "resmi-plaka", "Resmi Plaka", "car", { count: 29, parentId: "services-auto-plate" }),
              node("services-auto-plate-std", "standart-plaka", "Standart Plaka", "car", { count: 50, parentId: "services-auto-plate" }),
            ],
          }),
          node("services-auto-repair", "oto-tamir-servis", "Oto Tamir & Servis", "wrench", {
            count: 2_069,
            parentId: "services-auto",
            children: [
              node("services-auto-repair-car", "arac-tamiri", "Araç Tamiri", "wrench", { count: 820, parentId: "services-auto-repair" }),
              node("services-auto-repair-ecu", "elektronik-ariza", "Elektronik Arıza", "zap", { count: 410, parentId: "services-auto-repair" }),
              node("services-auto-repair-lpg", "lpg-montaj-donusum", "LPG Montaj & Dönüşüm", "flame", { count: 268, parentId: "services-auto-repair" }),
              node("services-auto-repair-mech", "mekanik-ariza", "Mekanik Arıza", "cog", { count: 540, parentId: "services-auto-repair" }),
              node("services-auto-repair-moto", "motosiklet-tamir", "Motosiklet Tamir", "bike", { count: 190, parentId: "services-auto-repair" }),
              node("services-auto-repair-glass", "oto-cam", "Oto Cam", "car", { count: 225, parentId: "services-auto-repair" }),
              node("services-auto-repair-exhaust", "oto-egzoz", "Oto Egzoz", "car", { count: 176, parentId: "services-auto-repair" }),
              node("services-auto-repair-ac", "oto-isitma-klima", "Oto Isıtma & Klima", "zap", { count: 298, parentId: "services-auto-repair" }),
              node("services-auto-repair-periodic", "periyodik-bakim", "Periyodik Bakım", "wrench", { count: 610, parentId: "services-auto-repair" }),
            ],
          }),
          node("services-auto-wash", "oto-temizlik", "Oto Temizlik", "sparkles", {
            count: 683,
            parentId: "services-auto",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&w=900&q=80",
            children: [
              node("services-auto-wash-antibac", "antibakteriyel-ic-temizlik", "Antibakteriyel İç Temizlik", "sparkles", { count: 304, parentId: "services-auto-wash" }),
              node("services-auto-wash-protect", "boya-koruma", "Boya Koruma", "paint", { count: 373, parentId: "services-auto-wash" }),
              node("services-auto-wash-paint", "boya-temizligi", "Boya Temizliği", "paint", { count: 352, parentId: "services-auto-wash" }),
              node("services-auto-wash-ext", "dis-yikama", "Dış Yıkama", "sparkles", { count: 336, parentId: "services-auto-wash" }),
              node("services-auto-wash-int", "ic-temizlik", "İç Temizlik", "sparkles", { count: 574, parentId: "services-auto-wash" }),
              node("services-auto-wash-rim", "jant-temizligi", "Jant Temizliği", "sparkles", { count: 541, parentId: "services-auto-wash" }),
              node("services-auto-wash-engine", "motor-temizligi", "Motor Temizliği", "sparkles", { count: 363, parentId: "services-auto-wash" }),
              node("services-auto-wash-polish", "pasta-cila", "Pasta Cila", "sparkles", { count: 504, parentId: "services-auto-wash" }),
            ],
          }),
          node("services-auto-boat", "tekne-yat-tamiri", "Tekne & Yat Tamiri", "ship", {
            count: 136,
            parentId: "services-auto",
            children: [
              node("services-auto-boat-mirror", "tekne-ayna", "Ayna", "ship", { count: 22, parentId: "services-auto-boat" }),
              node("services-auto-boat-paintjob", "tekne-boya", "Boya", "paint", { count: 48, parentId: "services-auto-boat" }),
              node("services-auto-boat-chrome", "krom-nikelaj-isleri", "Krom Nikelaj İşleri", "sparkles", { count: 31, parentId: "services-auto-boat" }),
              node("services-auto-boat-paint", "tekne-boyama", "Tekne Boyama", "paint", { count: 44, parentId: "services-auto-boat" }),
              node("services-auto-boat-build", "tekne-imalati", "Tekne İmalatı", "ship", { count: 28, parentId: "services-auto-boat" }),
              node("services-auto-boat-fix", "tekne-tamiri", "Tekne Tamiri", "wrench", { count: 52, parentId: "services-auto-boat" }),
              node("services-auto-boat-yacht", "yat-tamiri", "Yat Tamiri", "ship", { count: 39, parentId: "services-auto-boat" }),
            ],
          }),
          node("services-auto-traffic", "trafik-musavirligi", "Trafik Müşavirliği", "scale", {
            count: 97,
            parentId: "services-auto",
            children: [
              node("services-auto-traffic-inspect", "arac-muayenesi-oncesi-kontrol", "Araç Muayenesi Öncesi Kontrol", "wrench", { count: 41, parentId: "services-auto-traffic" }),
              node("services-auto-traffic-plate", "plaka-islemleri", "Plaka İşlemleri", "car", { count: 28, parentId: "services-auto-traffic" }),
              node("services-auto-traffic-sale", "satis-devir-islemleri", "Satış Devir İşlemleri", "scale", { count: 33, parentId: "services-auto-traffic" }),
              node("services-auto-traffic-reg", "tescil-islemleri", "Tescil İşlemleri", "scale", { count: 36, parentId: "services-auto-traffic" }),
            ],
          }),
        ],
      }),
      node("services-repair", "tamirat-teknik-servis", "Tamirat & Teknik Servis", "wrench", {
        parentId: "services",
        aliases: ["tamirat"],
        count: 8_600,
        children: [
          node("services-repair-gold", "altin-gumus-tamiri", "Altın & Gümüş Tamiri", "sparkles", { count: 14, parentId: "services-repair" }),
          node("services-repair-lift", "asansor-tamiri", "Asansör Tamiri", "wrench", { count: 132, parentId: "services-repair" }),
          node("services-repair-appliance", "beyaz-esya-servisi", "Beyaz Eşya Servisi", "home", {
            count: 650,
            parentId: "services-repair",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=900&q=80",
          }),
          node("services-repair-pc", "bilgisayar-teknik-servisi", "Bilgisayar Teknik Servisi", "cpu", {
            count: 750,
            parentId: "services-repair",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=900&q=80",
          }),
          node("services-repair-bike", "bisiklet-tamiri", "Bisiklet Tamiri", "bike", { count: 33, parentId: "services-repair" }),
          node("services-repair-phone", "cep-telefonu-tamiri", "Cep Telefonu Tamiri", "smartphone", {
            count: 617,
            parentId: "services-repair",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&w=900&q=80",
          }),
          node("services-repair-roof", "cati-tamiri", "Çatı Tamiri", "home", {
            count: 1_378,
            parentId: "services-repair",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1632778149955-e80f8ceca2e8?auto=format&fit=crop&w=900&q=80",
          }),
          node("services-repair-elec", "elektrik-tesisati-tamiri", "Elektrik Tesisatı Tamiri", "zap", {
            count: 1_798,
            parentId: "services-repair",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=900&q=80",
          }),
          node("services-repair-gadget", "elektronik-cihaz-tamiri", "Elektronik Cihaz Tamiri", "cpu", { count: 1_388, parentId: "services-repair" }),
          node("services-repair-instrument", "enstruman-tamiri", "Enstrüman Tamiri", "headphones", { count: 39, parentId: "services-repair" }),
          node("services-repair-home", "ev-aletleri-tamiri", "Ev Aletleri Tamiri", "wrench", {
            count: 612,
            parentId: "services-repair",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1556912173-46c336c7fd55?auto=format&fit=crop&w=900&q=80",
          }),
          node("services-repair-copy", "fotokopi-makinesi-tamiri", "Fotokopi Makinesi Tamiri", "cpu", { count: 238, parentId: "services-repair" }),
          node("services-repair-jacuzzi", "jakuzi-tamiri", "Jakuzi Tamiri", "sparkles", { count: 744, parentId: "services-repair" }),
          node("services-repair-gen", "jenerator-tamiri", "Jeneratör Tamiri", "zap", { count: 179, parentId: "services-repair" }),
          node("services-repair-ac", "klima-servisi", "Klima Servisi", "zap", {
            count: 503,
            parentId: "services-repair",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1631549916767-1e687116858a?auto=format&fit=crop&w=900&q=80",
          }),
          node("services-repair-lock", "kontak-tamiri-anahtar-yedegi", "Kontak Tamiri & Anahtar Yedeği", "key", { count: 203, parentId: "services-repair" }),
          node("services-repair-shoe", "lostra-ayakkabi-tamiri", "Lostra & Ayakkabı Tamiri", "sparkles", { count: 16, parentId: "services-repair" }),
          node("services-repair-carlock", "oto-acma-oto-kilit-tamiri", "Oto Açma & Oto Kilit Tamiri", "key", { count: 243, parentId: "services-repair" }),
          node("services-repair-overlock", "overlok-hali-onarimi", "Overlok & Halı Onarımı", "sparkles", { count: 5, parentId: "services-repair" }),
          node("services-repair-piano", "piyano-akort", "Piyano Akort", "headphones", { count: 14, parentId: "services-repair" }),
          node("services-repair-tv", "radyo-televizyon-tamiri", "Radyo Televizyon Tamiri", "tv", { count: 346, parentId: "services-repair" }),
          node("services-repair-watch", "saat-tamiri", "Saat Tamiri", "watch", { count: 45, parentId: "services-repair" }),
          node("services-repair-sport", "spor-ekipmanlari-bakim-onarimi", "Spor Ekipmanları Bakım & Onarımı", "sparkles", { count: 53, parentId: "services-repair" }),
          node("services-repair-plumb", "su-tesisati-tamiri", "Su Tesisatı Tamiri", "wrench", {
            count: 1_633,
            parentId: "services-repair",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=900&q=80",
          }),
          node("services-repair-sign", "tabela-tamiri", "Tabela Tamiri", "megaphone", { count: 134, parentId: "services-repair" }),
          node("services-repair-tektit", "tektit-tadilati", "Tektit Tadilatı", "paint", { count: 81, parentId: "services-repair" }),
          node("services-repair-pbx", "telefon-santrali-servisi", "Telefon Santrali Servisi", "smartphone", { count: 292, parentId: "services-repair" }),
          node("services-repair-sat", "uydu-sistemleri-kurulum-onarim", "Uydu Sistemleri Kurulum & Onarım", "tv", { count: 945, parentId: "services-repair" }),
          node("services-repair-fire", "yangin-guvenlik-sistemleri-servisi", "Yangın & Güvenlik Sistemleri Servisi", "shield", { count: 492, parentId: "services-repair" }),
          node("services-repair-printer", "yazici-tamiri", "Yazıcı Tamiri", "cpu", { count: 413, parentId: "services-repair" }),
        ],
      }),
      node("services-event", "dugun-etkinlik", "Düğün & Etkinlik", "ticket", {
        parentId: "services",
        count: 1_400,
        children: [
          node("services-event-dance", "dans-etkinlikleri", "Dans Etkinlikleri", "sparkles", {
            count: 65,
            parentId: "services-event",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1547153760-18fc86324498?auto=format&fit=crop&w=900&q=80",
            children: [
              node("services-event-dance-pro", "dansci-dansoz", "Dansçı & Dansöz", "sparkles", { count: 43, parentId: "services-event-dance" }),
              node("services-event-dance-wed", "dugun-dansi", "Düğün Dansı", "sparkles", { count: 44, parentId: "services-event-dance" }),
            ],
          }),
          node("services-event-wedding", "dugun-nisan-davet-organizasyonlari", "Düğün, Nişan & Davet Organizasyonları", "ticket", {
            count: 653,
            parentId: "services-event",
            aliases: ["dugun-organizasyonu", "services-event-org"],
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=900&q=80",
            children: [
              node("services-event-wedding-invite", "davet", "Davet", "ticket", { count: 322, parentId: "services-event-wedding" }),
              node("services-event-wedding-day", "dugun", "Düğün", "ticket", { count: 353, parentId: "services-event-wedding" }),
              node("services-event-wedding-evt", "etkinlik", "Etkinlik", "ticket", { count: 350, parentId: "services-event-wedding" }),
              node("services-event-wedding-garden", "kir-dugunu", "Kır Düğünü", "trees", { count: 224, parentId: "services-event-wedding" }),
              node("services-event-wedding-engage", "nisan", "Nişan", "heart", { count: 256, parentId: "services-event-wedding" }),
              node("services-event-wedding-boat", "tekne-dugunu", "Tekne Düğünü", "ship", { count: 283, parentId: "services-event-wedding" }),
            ],
          }),
          node("services-event-photo", "fotograf-kamera", "Fotoğraf & Kamera", "camera", {
            count: 717,
            parentId: "services-event",
            aliases: ["dugun-fotograf-video"],
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=80",
            children: [
              node("services-event-photo-out", "dis-mekan-cekimi", "Dış Mekan Çekimi", "camera", { count: 330, parentId: "services-event-photo" }),
              node("services-event-photo-baby", "dogum-bebek-fotografi", "Doğum & Bebek Fotoğrafı", "baby", { count: 465, parentId: "services-event-photo" }),
              node("services-event-photo-catalog", "dugun-katalog-cekimi", "Düğün Katalog Çekimi", "camera", { count: 349, parentId: "services-event-photo" }),
              node("services-event-photo-home", "evde-ozel-cekim", "Evde Özel Çekim", "home", { count: 341, parentId: "services-event-photo" }),
              node("services-event-photo-still", "fotograf-cekimi", "Fotoğraf Çekimi", "camera", { count: 343, parentId: "services-event-photo" }),
              node("services-event-photo-air", "hava-cekimi", "Hava Çekimi", "camera", { count: 353, parentId: "services-event-photo" }),
              node("services-event-photo-studio", "studiyo-cekimi", "Stüdyo Çekimi", "camera", { count: 330, parentId: "services-event-photo" }),
              node("services-event-photo-video", "video-cekimi", "Video Çekimi", "camera", { count: 336, parentId: "services-event-photo" }),
            ],
          }),
          node("services-event-fair", "fuar-organizasyonlari", "Fuar Organizasyonları", "building", {
            count: 213,
            parentId: "services-event",
            children: [
              node("services-event-fair-stand", "fuar-standi-yapimi", "Fuar Standı Yapımı", "building", { count: 80, parentId: "services-event-fair" }),
              node("services-event-fair-svc", "fuarcilik-hizmetleri", "Fuarcılık Hizmetleri", "briefcase", { count: 70, parentId: "services-event-fair" }),
              node("services-event-fair-host", "hostes-fuar-elemanlari", "Hostes & Fuar Elemanları", "users", { count: 63, parentId: "services-event-fair" }),
            ],
          }),
          node("services-event-congress", "kongre-seminer-toplanti", "Kongre, Seminer & Toplantı", "briefcase", {
            count: 280,
            parentId: "services-event",
            children: [
              node("services-event-congress-cong", "kongre-organizasyonu", "Kongre Organizasyonu", "briefcase", { count: 95, parentId: "services-event-congress" }),
              node("services-event-congress-sem", "seminer-organizasyonu", "Seminer Organizasyonu", "book", { count: 95, parentId: "services-event-congress" }),
              node("services-event-congress-meet", "toplanti-organizasyonu", "Toplantı Organizasyonu", "users", { count: 90, parentId: "services-event-congress" }),
            ],
          }),
          node("services-event-music", "muzik-organizasyonu", "Müzik Organizasyonu", "music", {
            count: 325,
            parentId: "services-event",
            aliases: ["dj-ses-sistemi"],
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1571875257727-256c39da42af?auto=format&fit=crop&w=900&q=80",
            children: [
              node("services-event-music-dj", "dj", "Dj", "headphones", { count: 136, parentId: "services-event-music" }),
              node("services-event-music-band", "dugun-orkestrasi", "Düğün Orkestrası", "music", { count: 253, parentId: "services-event-music" }),
              node("services-event-music-concert", "konser", "Konser", "music", { count: 135, parentId: "services-event-music" }),
            ],
          }),
          node("services-event-party", "ozel-gun-parti-organizasyonlari", "Özel Gün & Parti Organizasyonları", "sparkles", {
            count: 478,
            parentId: "services-event",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1492684223066-81342eea348d?auto=format&fit=crop&w=900&q=80",
            children: [
              node("services-event-party-anim", "animasyon", "Animasyon", "sparkles", { count: 244, parentId: "services-event-party" }),
              node("services-event-party-bday", "dogum-gunu-organizasyonlari", "Doğum Günü Organizasyonları", "cake", { count: 411, parentId: "services-event-party" }),
              node("services-event-party-celeb", "ozel-gun-kutlamalari", "Özel Gün Kutlamaları", "sparkles", { count: 342, parentId: "services-event-party" }),
              node("services-event-party-clown", "palyaco", "Palyaço", "sparkles", { count: 235, parentId: "services-event-party" }),
              node("services-event-party-venue", "parti-evi", "Parti Evi", "home", {
                count: 218,
                parentId: "services-event-party",
                aliases: ["dugun-salonu", "services-event-hall"],
                hubFeatured: true,
                cover: "https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?auto=format&fit=crop&w=900&q=80",
              }),
            ],
          }),
          node("services-event-catering", "pasta-yemek-catering", "Pasta, Yemek & Catering", "utensils", {
            count: 418,
            parentId: "services-event",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=900&q=80",
            children: [
              node("services-event-catering-chef", "asci", "Aşçı", "utensils", { count: 147, parentId: "services-event-catering" }),
              node("services-event-catering-cake", "butik-pasta", "Butik Pasta", "cake", { count: 70, parentId: "services-event-catering" }),
              node("services-event-catering-svc", "catering", "Catering", "utensils", { count: 220, parentId: "services-event-catering" }),
              node("services-event-catering-wed", "dugun-pastasi", "Düğün Pastası", "cake", { count: 135, parentId: "services-event-catering" }),
              node("services-event-catering-cock", "kokteyl", "Kokteyl", "utensils", { count: 245, parentId: "services-event-catering" }),
              node("services-event-catering-site", "yerinde-yemek", "Yerinde Yemek", "utensils", { count: 206, parentId: "services-event-catering" }),
            ],
          }),
          node("services-event-av", "ses-isik-goruntu-sistemleri", "Ses, Işık & Görüntü Sistemleri", "headphones", {
            count: 327,
            parentId: "services-event",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=900&q=80",
            children: [
              node("services-event-av-video", "goruntu-sistemleri", "Görüntü Sistemleri", "tv", { count: 180, parentId: "services-event-av" }),
              node("services-event-av-light", "isik-duzenleme", "Işık Düzenleme", "zap", { count: 253, parentId: "services-event-av" }),
              node("services-event-av-sound", "ses-sistemleri", "Ses Sistemleri", "headphones", { count: 258, parentId: "services-event-av" }),
            ],
          }),
        ],
      }),
      node("services-other", "diger", "Diğer", "grid", {
        parentId: "services",
        count: 6_300,
        children: [
          node("services-other-preschool", "anaokulu", "Anaokulu", "baby", {
            count: 73,
            parentId: "services-other",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=900&q=80",
            children: [
              node("services-other-preschool-kg", "anaokulu-hizmeti", "Anaokulu", "baby", { count: 44, parentId: "services-other-preschool" }),
              node("services-other-preschool-mom", "anne-cocuk-oyun-grubu", "Anne Çocuk Oyun Grubu", "baby", { count: 23, parentId: "services-other-preschool" }),
              node("services-other-preschool-play", "cocuk-oyun-grubu", "Çocuk Oyun Grubu", "baby", { count: 31, parentId: "services-other-preschool" }),
              node("services-other-preschool-day", "gunduz-bakimevi", "Gündüz Bakımevi", "home", { count: 34, parentId: "services-other-preschool" }),
              node("services-other-preschool-creche", "kres", "Kreş", "baby", { count: 42, parentId: "services-other-preschool" }),
            ],
          }),
          node("services-other-print", "baski-hizmetleri", "Baskı Hizmetleri", "printer", {
            count: 447,
            parentId: "services-other",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1562654501-a0ccc0fc3fb1?auto=format&fit=crop&w=900&q=80",
            children: [
              node("services-other-print-copy", "fotokopi-baski-hizmetleri", "Fotokopi & Baskı Hizmetleri", "printer", { count: 334, parentId: "services-other-print" }),
              node("services-other-print-screen", "serigraf-baski", "Serigraf Baskı", "printer", { count: 87, parentId: "services-other-print" }),
              node("services-other-print-textile", "tekstil-baski-hizmetleri", "Tekstil Baskı Hizmetleri", "shirt", { count: 149, parentId: "services-other-print" }),
              node("services-other-print-toner", "toner-kartus-dolum", "Toner & Kartuş Dolum", "printer", { count: 94, parentId: "services-other-print" }),
            ],
          }),
          node("services-other-franchise", "bayilik-verenler-franchise", "Bayilik Verenler & Franchise", "store", {
            count: 363,
            parentId: "services-other",
            children: [
              node("services-other-franchise-deal", "bayilik", "Bayilik", "store", { count: 200, parentId: "services-other-franchise" }),
              node("services-other-franchise-brand", "franchise", "Franchise", "store", { count: 163, parentId: "services-other-franchise" }),
            ],
          }),
          node("services-other-funeral", "cenaze-isleri", "Cenaze İşleri", "landmark", {
            count: 38,
            parentId: "services-other",
            children: [
              node("services-other-funeral-care", "mezar-bakim-onarim", "Mezar Bakım & Onarım", "landmark", { count: 18, parentId: "services-other-funeral" }),
              node("services-other-funeral-build", "mezar-yapimi", "Mezar Yapımı", "landmark", { count: 12, parentId: "services-other-funeral" }),
              node("services-other-funeral-coffin", "tabut-yapimi", "Tabut Yapımı", "archive", { count: 8, parentId: "services-other-funeral" }),
            ],
          }),
          node("services-other-consult", "danismanlik", "Danışmanlık", "briefcase", {
            count: 1_511,
            parentId: "services-other",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=900&q=80",
            children: [
              node("services-other-consult-rd", "arastirma-gelistirme-hizmeti", "Araştırma & Geliştirme Hizmeti", "briefcase", { count: 350, parentId: "services-other-consult" }),
              node("services-other-consult-audit", "audit-belgelendirme", "Audit & Belgelendirme", "shield", { count: 73, parentId: "services-other-consult" }),
              node("services-other-consult-iso", "bilgi-guvenligi-yonetim-sistemi", "Bilgi Güvenliği Yönetim Sistemi", "shield", { count: 142, parentId: "services-other-consult" }),
              node("services-other-consult-env", "cevre-yonetim-sistemi", "Çevre Yönetim Sistemi", "trees", { count: 140, parentId: "services-other-consult" }),
              node("services-other-consult-edit", "editorluk-yazarlik", "Editörlük & Yazarlık", "book", { count: 74, parentId: "services-other-consult" }),
              node("services-other-consult-food", "gida-danismanligi", "Gıda", "utensils", { count: 73, parentId: "services-other-consult" }),
              node("services-other-consult-sec", "guvenlik-danismanligi", "Güvenlik", "shield", { count: 338, parentId: "services-other-consult" }),
              node("services-other-consult-law", "hukuki-danismanlik", "Hukuki Danışmanlık", "scale", { count: 178, parentId: "services-other-consult" }),
              node("services-other-consult-ohs", "is-sagligi-guvenligi", "İş Sağlığı & Güvenliği", "shield", { count: 219, parentId: "services-other-consult" }),
              node("services-other-consult-qms", "kalite-yonetim-sistemi", "Kalite Yönetim Sistemi", "star", { count: 219, parentId: "services-other-consult" }),
              node("services-other-consult-dev", "kisisel-gelisim", "Kişisel Gelişim", "sparkles", { count: 180, parentId: "services-other-consult" }),
              node("services-other-consult-coach", "kocluk", "Koçluk", "users", { count: 332, parentId: "services-other-consult" }),
              node("services-other-consult-brand", "marka-patent", "Marka & Patent", "scale", { count: 180, parentId: "services-other-consult" }),
              node("services-other-consult-post", "montaj-post-produksiyon", "Montaj & Post Prodüksiyon", "camera", { count: 89, parentId: "services-other-consult" }),
              node("services-other-consult-design", "proje-tasarim-hizmeti", "Proje & Tasarım Hizmeti", "sparkles", { count: 313, parentId: "services-other-consult" }),
              node("services-other-consult-pension", "sigorta-emeklilik-danismanligi", "Sigorta & Emeklilik Danışmanlığı", "shield", { count: 350, parentId: "services-other-consult" }),
              node("services-other-consult-csr", "sosyal-sorumluluk-yonetimi", "Sosyal Sorumluluk Yönetimi", "heart", { count: 73, parentId: "services-other-consult" }),
              node("services-other-consult-deed", "tapu-isleri", "Tapu İşleri", "landmark", { count: 196, parentId: "services-other-consult" }),
              node("services-other-consult-agri", "tarimsal-zirai-danismanlik", "Tarımsal (Zirai) Danışmanlık", "trees", { count: 123, parentId: "services-other-consult" }),
              node("services-other-consult-visa", "vize-danismanligi", "Vize Danışmanlığı", "briefcase", { count: 356, parentId: "services-other-consult" }),
              node("services-other-consult-invest", "yatirim-tesvik", "Yatırım Teşvik", "star", { count: 196, parentId: "services-other-consult" }),
              node("services-other-consult-mgmt", "yonetim-sistemleri", "Yönetim Sistemleri", "cog", { count: 322, parentId: "services-other-consult" }),
            ],
          }),
          node("services-other-course", "dershane-etud-merkezleri-kurslar", "Dershane, Etüd Merkezleri & Kurslar", "book", {
            count: 311,
            parentId: "services-other",
            children: [
              node("services-other-course-abacus", "abakus-mental-aritmetik", "Abaküs, Mental Aritmetik", "book", { count: 40, parentId: "services-other-course" }),
              node("services-other-course-aof", "aof", "AÖF", "graduation", { count: 28, parentId: "services-other-course" }),
              node("services-other-course-pc", "bilgisayar-kurslari", "Bilgisayar Kursları", "laptop", { count: 45, parentId: "services-other-course" }),
              node("services-other-course-glass", "cam-sanatlari", "Cam Sanatları", "sparkles", { count: 12, parentId: "services-other-course" }),
              node("services-other-course-tattoo", "dovme-yapimi", "Dövme Yapımı", "sparkles", { count: 18, parentId: "services-other-course" }),
              node("services-other-course-trad", "geleneksel-turk-sanatlari", "Geleneksel Türk Sanatları", "paint", { count: 16, parentId: "services-other-course" }),
              node("services-other-course-art", "guzel-sanatlar", "Güzel Sanatlar", "paint", { count: 22, parentId: "services-other-course" }),
              node("services-other-course-callig", "hat-sanati", "Hat Sanatı", "book", { count: 14, parentId: "services-other-course" }),
              node("services-other-course-kpss", "kpss", "KPSS", "book", { count: 36, parentId: "services-other-course" }),
              node("services-other-course-corp", "kurum-sinavlari", "Kurum Sınavları", "briefcase", { count: 20, parentId: "services-other-course" }),
              node("services-other-course-job", "mesleki-kurslar", "Mesleki Kurslar", "wrench", { count: 30, parentId: "services-other-course" }),
              node("services-other-course-music", "kurs-muzik", "Müzik", "music", { count: 24, parentId: "services-other-course" }),
              node("services-other-course-draw", "resim-cizimi", "Resim Çizimi", "paint", { count: 22, parentId: "services-other-course" }),
              node("services-other-course-exam", "sinav-hazirlik-lise-universite", "Sınav Hazırlık (Lise, Üniversite)", "graduation", { count: 40, parentId: "services-other-course" }),
              node("services-other-course-spk", "spk", "SPK", "briefcase", { count: 14, parentId: "services-other-course" }),
              node("services-other-course-sport", "spor-okullari", "Spor Okulları", "bike", { count: 18, parentId: "services-other-course" }),
              node("services-other-course-lang", "kurs-yabanci-dil", "Yabancı Dil", "languages", { count: 32, parentId: "services-other-course" }),
            ],
          }),
          node("services-other-craft", "el-sanatlari", "El Sanatları", "sparkles", {
            count: 132,
            parentId: "services-other",
            children: [
              node("services-other-craft-weave", "dokuma", "Dokuma", "shirt", { count: 30, parentId: "services-other-craft" }),
              node("services-other-craft-knit", "el-orgusu", "El Örgüsü", "sparkles", { count: 34, parentId: "services-other-craft" }),
              node("services-other-craft-paint", "el-sanatlari-resim", "Resim", "paint", { count: 36, parentId: "services-other-craft" }),
              node("services-other-craft-decor", "sus-esyasi", "Süs Eşyası", "gem", { count: 32, parentId: "services-other-craft" }),
            ],
          }),
          node("services-other-pet", "evcil-hayvan-hizmetleri", "Evcil Hayvanlar", "paw", {
            count: 81,
            parentId: "services-other",
            children: [
              node("services-other-pet-act", "evcil-hayvan-aktivite", "Aktivite", "paw", { count: 10, parentId: "services-other-pet" }),
              node("services-other-pet-shelter", "barinak-yapim-onarim", "Barınak Yapım & Onarım", "home", { count: 8, parentId: "services-other-pet" }),
              node("services-other-pet-train", "evcil-hayvan-egitim", "Eğitim", "paw", { count: 12, parentId: "services-other-pet" }),
              node("services-other-pet-wear", "evcil-hayvan-giyim", "Giyim", "shirt", { count: 7, parentId: "services-other-pet" }),
              node("services-other-pet-walk", "kopek-gezdirme", "Köpek Gezdirme", "paw", { count: 11, parentId: "services-other-pet" }),
              node("services-other-pet-groom", "evcil-hayvan-kuafor-bakim", "Kuaför & Bakım", "sparkles", { count: 12, parentId: "services-other-pet" }),
              node("services-other-pet-hotel", "pet-pansiyonu", "Pet Pansiyonu", "home", { count: 9, parentId: "services-other-pet" }),
              node("services-other-pet-move", "evcil-hayvan-ulastirma", "Ulaştırma", "truck", { count: 6, parentId: "services-other-pet" }),
              node("services-other-pet-vet", "veteriner-hizmeti", "Veteriner", "stethoscope", { count: 6, parentId: "services-other-pet" }),
            ],
          }),
          node("services-other-textile", "giyim-tekstil-hizmetleri", "Giyim & Tekstil", "shirt", {
            count: 283,
            parentId: "services-other",
            children: [
              node("services-other-textile-shoe", "ayakkabi-tasarimi", "Ayakkabı Tasarımı", "footprints", { count: 40, parentId: "services-other-textile" }),
              node("services-other-textile-home", "ev-tekstil-urunleri", "Ev Tekstil Ürünleri", "sofa", { count: 38, parentId: "services-other-textile" }),
              node("services-other-textile-sew", "kiyafet-tasarim-dikim", "Kıyafet Tasarım & Dikim", "shirt", { count: 55, parentId: "services-other-textile" }),
              node("services-other-textile-clean", "kuru-temizleme", "Kuru Temizleme", "sparkles", { count: 48, parentId: "services-other-textile" }),
              node("services-other-textile-fix", "tekstil-tadilati", "Tekstil Tadilatı", "wrench", { count: 42, parentId: "services-other-textile" }),
              node("services-other-textile-tailor", "terzilik", "Terzilik", "scissors", { count: 40, parentId: "services-other-textile" }),
              node("services-other-textile-iron", "utu", "Ütü", "sparkles", { count: 20, parentId: "services-other-textile" }),
            ],
          }),
          node("services-other-scrap", "hurda-atik", "Hurda & Atık", "recycle", {
            count: 107,
            parentId: "services-other",
            children: [
              node("services-other-scrap-waste", "atik-degerlendirme", "Atık Değerlendirme", "recycle", { count: 40, parentId: "services-other-scrap" }),
              node("services-other-scrap-recycle", "geri-kazanim", "Geri Kazanım", "recycle", { count: 35, parentId: "services-other-scrap" }),
              node("services-other-scrap-metal", "hurda-degerlendirme", "Hurda Değerlendirme", "recycle", { count: 32, parentId: "services-other-scrap" }),
            ],
          }),
          node("services-other-rent", "kiralik-urunler", "Kiralık Ürünler", "clock", {
            count: 80,
            parentId: "services-other",
            children: [
              node("services-other-rent-pc", "kiralik-bilgisayar", "Kiralık Bilgisayar", "laptop", { count: 12, parentId: "services-other-rent" }),
              node("services-other-rent-groom", "kiralik-damatlik", "Kiralık Damatlık", "shirt", { count: 8, parentId: "services-other-rent" }),
              node("services-other-rent-cam", "kiralik-fotograf-makinesi", "Kiralık Fotoğraf Makinesi", "camera", { count: 10, parentId: "services-other-rent" }),
              node("services-other-rent-bride", "kiralik-gelinlik", "Kiralık Gelinlik", "sparkles", { count: 9, parentId: "services-other-rent" }),
              node("services-other-rent-gen", "kiralik-jenerator", "Kiralık Jeneratör", "zap", { count: 8, parentId: "services-other-rent" }),
              node("services-other-rent-ac", "kiralik-klima", "Kiralık Klima", "zap", { count: 9, parentId: "services-other-rent" }),
              node("services-other-rent-costume", "kiralik-kostum", "Kiralık Kostüm", "shirt", { count: 8, parentId: "services-other-rent" }),
              node("services-other-rent-metal", "kiralik-metal-dedektoru", "Kiralık Metal Dedektörü", "search", { count: 7, parentId: "services-other-rent" }),
              node("services-other-rent-proj", "kiralik-projeksiyon", "Kiralık Projeksiyon", "tv", { count: 9, parentId: "services-other-rent" }),
            ],
          }),
          node("services-other-dorm", "ogrenci-yurtlari", "Öğrenci Yurtları", "hotel", {
            count: 44,
            parentId: "services-other",
            children: [
              node("services-other-dorm-stay", "pansiyon-yurt-hizmeti", "Pansiyon & Yurt Hizmeti", "hotel", { count: 44, parentId: "services-other-dorm" }),
            ],
          }),
          node("services-other-ads", "reklam-promosyon-urun", "Reklam & Promosyon Ürün", "megaphone", {
            count: 1_119,
            parentId: "services-other",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=900&q=80",
            children: [
              node("services-other-ads-pack", "ambalaj-paket", "Ambalaj & Paket", "archive", { count: 204, parentId: "services-other-ads" }),
              node("services-other-ads-wrap", "arac-bina-giydirme", "Araç & Bina Giydirme", "car", { count: 180, parentId: "services-other-ads" }),
              node("services-other-ads-survey", "arastirma-anket", "Araştırma & Anket", "briefcase", { count: 114, parentId: "services-other-ads" }),
              node("services-other-ads-press", "basim-yayin-matbaacilik", "Basım Yayın & Matbaacılık", "book", { count: 149, parentId: "services-other-ads" }),
              node("services-other-ads-flag", "bayrak-bez-afis-serigrafi", "Bayrak & Bez Afiş & Serigrafi", "flag", { count: 332, parentId: "services-other-ads" }),
              node("services-other-ads-digital", "dijital-baski-kopyalama", "Dijital Baskı & Kopyalama", "printer", { count: 214, parentId: "services-other-ads" }),
              node("services-other-ads-event", "etkinlik-organizasyon-tasarim", "Etkinlik & Organizasyon Tasarım", "ticket", { count: 180, parentId: "services-other-ads" }),
              node("services-other-ads-model", "mimari-maket", "Mimari Maket", "building", { count: 205, parentId: "services-other-ads" }),
              node("services-other-ads-mobile", "mobil-pazarlama", "Mobil Pazarlama", "smartphone", { count: 212, parentId: "services-other-ads" }),
              node("services-other-ads-promo", "promosyon-urunleri", "Promosyon Ürünleri", "bag", { count: 338, parentId: "services-other-ads" }),
              node("services-other-ads-pr", "reklam-tanitim", "Reklam & Tanıtım", "megaphone", { count: 248, parentId: "services-other-ads" }),
              node("services-other-ads-board", "reklam-panolari", "Reklam Panoları", "megaphone", { count: 180, parentId: "services-other-ads" }),
              node("services-other-ads-filmout", "renk-ayrimi-film-cikisi", "Renk Ayrımı & Film Çıkışı", "camera", { count: 74, parentId: "services-other-ads" }),
              node("services-other-ads-sign", "tabela-yapim-tasarim", "Tabela Yapım & Tasarım", "store", { count: 307, parentId: "services-other-ads" }),
              node("services-other-ads-video", "tanitim-filmleri-produksiyon", "Tanıtım Filmleri & Prodüksiyon", "camera", { count: 349, parentId: "services-other-ads" }),
              node("services-other-ads-local", "yerel-yayinlar", "Yerel Yayınlar", "tv", { count: 196, parentId: "services-other-ads" }),
            ],
          }),
          node("services-other-travel", "seyahat-turizm", "Seyahat & Turizm", "palmtree", {
            count: 375,
            parentId: "services-other",
            children: [
              node("services-other-travel-agency", "seyahat-acentasi", "Seyahat Acentası", "palmtree", { count: 220, parentId: "services-other-travel" }),
              node("services-other-travel-tour", "turistik-tur", "Turistik Tur", "palmtree", { count: 155, parentId: "services-other-travel" }),
            ],
          }),
          node("services-other-insurance", "sigorta-acenteligi", "Sigorta Acenteliği", "shield", {
            count: 281,
            parentId: "services-other",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=900&q=80",
            children: [
              node("services-other-insurance-fin", "sigorta-finans-acenteligi", "Sigorta & Finans Acenteliği", "shield", { count: 281, parentId: "services-other-insurance" }),
            ],
          }),
          node("services-other-drive", "surucu-kurslari", "Sürücü Kursları", "car", {
            count: 103,
            parentId: "services-other",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=900&q=80",
            children: [
              node("services-other-drive-lesson", "direksiyon-dersi", "Direksiyon Dersi", "car", { count: 98, parentId: "services-other-drive" }),
              node("services-other-drive-disabled", "engelli-ehliyet", "Engelli Ehliyet", "car", { count: 25, parentId: "services-other-drive" }),
              node("services-other-drive-adv", "ileri-surus-teknikleri", "İleri Sürüş Teknikleri", "car", { count: 32, parentId: "services-other-drive" }),
              node("services-other-drive-moto", "motosiklet-ehliyeti", "Motosiklet Ehliyeti", "bike", { count: 28, parentId: "services-other-drive" }),
              node("services-other-drive-bus", "otobus-ehliyeti", "Otobüs Ehliyeti", "van", { count: 14, parentId: "services-other-drive" }),
              node("services-other-drive-car", "otomobil-ehliyeti", "Otomobil Ehliyeti", "car", { count: 85, parentId: "services-other-drive" }),
              node("services-other-drive-truck", "tir-cekici-ehliyet", "Tır Çekici Ehliyet", "truck", { count: 18, parentId: "services-other-drive" }),
            ],
          }),
          node("services-other-subcon", "taseron-hizmetleri", "Taşeron Hizmetleri", "users", {
            count: 609,
            parentId: "services-other",
            children: [
              node("services-other-subcon-sec", "guvenlik-personeli-taseronluk", "Güvenlik Personeli Taşeronluk", "shield", { count: 220, parentId: "services-other-subcon" }),
              node("services-other-subcon-staff", "personel-taseronluk-firmalari", "Personel Taşeronluk Firmaları", "users", { count: 210, parentId: "services-other-subcon" }),
              node("services-other-subcon-tech", "teknik-taseronluk-firmalari", "Teknik Taşeronluk Firmaları", "wrench", { count: 179, parentId: "services-other-subcon" }),
            ],
          }),
          node("services-other-translate", "tercume", "Tercüme", "languages", {
            count: 170,
            parentId: "services-other",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1456513080867-f41d7dfe9141?auto=format&fit=crop&w=900&q=80",
            children: [
              node("services-other-translate-notary", "noter-tasdikli-tercume", "Noter Tasdikli Tercüme", "scale", { count: 101, parentId: "services-other-translate" }),
              node("services-other-translate-sim", "simultane-ceviri", "Simültane Çeviri", "headphones", { count: 33, parentId: "services-other-translate" }),
              node("services-other-translate-tech", "teknik-ceviri", "Teknik Çeviri", "cog", { count: 103, parentId: "services-other-translate" }),
              node("services-other-translate-write", "yazili-ceviri", "Yazılı Çeviri", "book", { count: 103, parentId: "services-other-translate" }),
              node("services-other-translate-sworn", "yeminli-tercume", "Yeminli Tercüme", "scale", { count: 136, parentId: "services-other-translate" }),
            ],
          }),
          node("services-other-it", "yazilim-bilgi-islem", "Yazılım Bilgi İşlem", "cpu", {
            count: 1_515,
            parentId: "services-other",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=900&q=80",
            children: [
              node("services-other-it-net", "ag-baglantisi", "Ağ Bağlantısı", "cpu", { count: 644, parentId: "services-other-it" }),
              node("services-other-it-repair", "bilgisayar-teknik-servisi-hizmet", "Bilgisayar Teknik Servisi", "laptop", { count: 753, parentId: "services-other-it" }),
              node("services-other-it-isp", "internet-baglantisi", "İnternet Bağlantısı", "cpu", { count: 735, parentId: "services-other-it" }),
              node("services-other-it-cable", "kablolama", "Kablolama", "plug", { count: 179, parentId: "services-other-it" }),
              node("services-other-it-app", "mobil-uygulamalar", "Mobil Uygulamalar", "smartphone", { count: 639, parentId: "services-other-it" }),
              node("services-other-it-sec", "network-guvenlik", "Network Güvenlik", "shield", { count: 635, parentId: "services-other-it" }),
              node("services-other-it-server", "sunucu", "Sunucu", "cpu", { count: 754, parentId: "services-other-it" }),
              node("services-other-it-recover", "veri-kurtarma", "Veri Kurtarma", "archive", { count: 540, parentId: "services-other-it" }),
              node("services-other-it-backup", "veri-yedekleme-hizmetleri", "Veri Yedekleme Hizmetleri", "archive", { count: 573, parentId: "services-other-it" }),
              node("services-other-it-web", "web-sitesi-tasarimi", "Web Sitesi Tasarımı", "monitor", { count: 1_136, parentId: "services-other-it" }),
              node("services-other-it-soft", "yazilim-ve-uygulamalar", "Yazılım Ve Uygulamalar", "cpu", { count: 1_109, parentId: "services-other-it" }),
            ],
          }),
        ],
      }),
    ],
  }),
  node("tutors", "ozel-ders", "Özel Ders Verenler", "book", {
    count: 21_423,
    seeAll: true,
    children: [
      node("tutors-uni", "lise-universite", "Lise & Üniversite", "graduation", { count: 4_605, parentId: "tutors" }),
      node("tutors-school", "ilkokul-ortaokul", "İlkokul & Ortaokul", "book", { count: 10_097, parentId: "tutors" }),
      node("tutors-lang", "yabanci-dil", "Yabancı Dil", "languages", { count: 3_754, parentId: "tutors" }),
    ],
  }),
  node("jobs", "is-ilanlari", "İş İlanları", "briefcase", {
    count: 33_816,
    seeAll: true,
    children: [
      node("jobs-law", "avukatlik", "Hukuki", "scale", { count: 27, parentId: "jobs", aliases: ["hukuki"] }),
      node("jobs-edu", "egitim-is", "Eğitim", "book", { count: 443, parentId: "jobs" }),
      node("jobs-fun", "eglence-aktivite", "Eğlence & Aktivite", "ticket", { count: 203, parentId: "jobs" }),
      node("jobs-beauty", "guzellik-bakim-is", "Güzellik & Bakım", "sparkles", {
        count: 1_991,
        parentId: "jobs",
        aliases: ["guzellik-bakim"],
        children: [
          node("jobs-beauty-women-hair", "kadin-kuaforu", "Kadın Kuaförü", "scissors", { count: 420, parentId: "jobs-beauty" }),
          node("jobs-beauty-men-hair", "erkek-kuaforu", "Erkek Kuaförü", "scissors", { count: 280, parentId: "jobs-beauty" }),
          node("jobs-beauty-specialist", "guzellik-uzmani", "Güzellik Uzmanı", "sparkles", { count: 310, parentId: "jobs-beauty" }),
          node("jobs-beauty-makeup", "makyoz", "Makyöz", "sparkles", { count: 145, parentId: "jobs-beauty" }),
          node("jobs-beauty-tattoo", "dovmeci", "Dövmeci", "sparkles", { count: 88, parentId: "jobs-beauty" }),
          node("jobs-beauty-pm", "kalici-makyaj-uzmani", "Kalıcı Makyaj Uzmanı", "sparkles", { count: 96, parentId: "jobs-beauty" }),
          node("jobs-beauty-lash", "kas-kirpik-uzmani", "Kaş & Kirpik Uzmanı", "sparkles", { count: 174, parentId: "jobs-beauty" }),
          node("jobs-beauty-nail", "manikur-pedikur-uzmani", "Manikür & Pedikür Uzmanı", "scissors", { count: 190, parentId: "jobs-beauty" }),
          node("jobs-beauty-massage", "masor-masoz", "Masör & Masöz", "heart", { count: 162, parentId: "jobs-beauty" }),
          node("jobs-beauty-pet", "kedi-kopek-kuaforu", "Kedi & Köpek Kuaförü", "paw", { count: 126, parentId: "jobs-beauty" }),
        ],
      }),
      node("jobs-it", "it-yazilim", "IT & Yazılım Geliştirme", "cpu", { count: 42, parentId: "jobs" }),
      node("jobs-hr", "insan-kaynaklari-is", "İK", "users", { count: 52, parentId: "jobs", aliases: ["ik", "insan-kaynaklari"] }),
      node("jobs-sales", "satis-pazarlama", "Satış & Pazarlama", "store", { count: 4_810, parentId: "jobs" }),
      node("jobs-finance", "muhasebe-finans", "Muhasebe & Finans", "briefcase", { count: 2_240, parentId: "jobs" }),
      node("jobs-health", "saglik-is", "Sağlık", "heart", { count: 1_180, parentId: "jobs" }),
      node("jobs-log", "lojistik-is", "Lojistik & Depo", "truck", { count: 3_420, parentId: "jobs" }),
      node("jobs-sec", "guvenlik-is", "Güvenlik", "shield", { count: 2_010, parentId: "jobs" }),
      node("jobs-tourism", "turizm-otel", "Turizm & Otel", "palmtree", { count: 1_560, parentId: "jobs" }),
      node("jobs-build", "insaat-is", "İnşaat", "hammer", { count: 4_330, parentId: "jobs" }),
      node("jobs-prod", "uretim-is", "Üretim & Fabrika", "factory", { count: 3_880, parentId: "jobs" }),
      node("jobs-store", "magaza-perakende", "Mağaza & Perakende", "bag", { count: 5_120, parentId: "jobs" }),
    ],
  }),
  node("pets", "hayvanlar-alemi", "Hayvanlar Alemi", "paw", {
    count: 30_333,
    seeAll: true,
    children: [
      node("pets-food", "yem-mama", "Yem & Mama", "utensils", {
        count: 1_305,
        parentId: "pets",
        browse: true,
        children: [
          node("pets-food-cat", "kedi-mamasi", "Kedi", "paw", { count: 420, parentId: "pets-food" }),
          node("pets-food-dog", "kopek-mamasi", "Köpek", "paw", { count: 510, parentId: "pets-food" }),
          node("pets-food-bird", "kus-yemi", "Kuş", "paw", { count: 180, parentId: "pets-food" }),
          node("pets-food-fish", "balik-yemi", "Balık", "fish", { count: 195, parentId: "pets-food" }),
        ],
      }),
      node("pets-cage", "kafes-kulube", "Kafes & Kulübe", "home", {
        count: 4_120,
        parentId: "pets",
        browse: true,
        children: [
          node("pets-cage-cat", "kedi-evi", "Kedi", "home", { count: 980, parentId: "pets-cage" }),
          node("pets-cage-dog", "kopek-kulube", "Köpek", "home", { count: 1_640, parentId: "pets-cage" }),
          node("pets-cage-bird", "kus-kafesi", "Kuş", "home", { count: 1_500, parentId: "pets-cage" }),
        ],
      }),
      node("pets-leash", "tasma-gezdirme", "Tasma & Gezdirme", "bone", { count: 6_840, parentId: "pets" }),
      node("pets-tank", "akvaryum-ekipman", "Akvaryum & Ekipman", "fish", { count: 5_210, parentId: "pets" }),
      node("pets-care", "bakim-hijyen", "Bakım & Hijyen", "sparkles", { count: 3_830, parentId: "pets" }),
      node("pets-acc", "hayvan-aksesuar", "Aksesuar & Ekipman", "bone", { count: 9_028, parentId: "pets" }),
    ],
  }),
  node("helpers", "yardimci-arayanlar", "Yardımcı Arayanlar", "heart-handshake", {
    count: 1_649,
    children: [
      node("helpers-child", "bebek-cocuk-bakicisi", "Bebek & Çocuk Bakıcısı", "baby", {
        count: 571,
        parentId: "helpers",
      }),
      node("helpers-elder", "yasli-hasta-bakicisi", "Yaşlı & Hasta Bakıcısı", "heart", {
        count: 228,
        parentId: "helpers",
      }),
      node("helpers-clean", "temizlikci", "Temizlikçi & Ev İşlerine Yardımcı", "sparkles", {
        count: 850,
        parentId: "helpers",
      }),
    ],
  }),
];

export const mobileHomeCategories = [
  { id: "shopping-phone", name: "Cep Telefonu", icon: "smartphone", slug: "cep-telefonu" },
  { id: "shopping-computer", name: "Bilgisayar", icon: "laptop", slug: "bilgisayar" },
  { id: "emlak", name: "Emlak", icon: "building", slug: "emlak" },
  { id: "vasita", name: "Vasıta", icon: "car", slug: "vasita" },
  { id: "shopping-fashion", name: "Moda", icon: "shirt", slug: "giyim-aksesuar" },
  { id: "shopping-decor", name: "Ev", icon: "sofa", slug: "ev-dekorasyon" },
  { id: "jobs", name: "İş", icon: "briefcase", slug: "is-ilanlari" },
  { id: "pets", name: "Hayvanlar", icon: "paw", slug: "hayvanlar-alemi" },
];

export function catalogCount(cat: Category): number {
  if (typeof cat.count === "number") return cat.count;
  return (cat.children ?? []).reduce((sum, ch) => sum + catalogCount(ch), 0);
}

export function walkCategories(list: Category[], visit: (c: Category, depth: number) => void, depth = 0) {
  for (const c of list) {
    visit(c, depth);
    if (c.children) walkCategories(c.children, visit, depth + 1);
  }
}

export function allCategoryNodes(): Category[] {
  const out: Category[] = [];
  walkCategories(categoryShortcuts, (c) => out.push(c));
  walkCategories(categories, (c) => out.push(c));
  return out;
}

/** Exact id/slug/alias lookup. Does not remap banned live-animal nodes. */
export function lookupCategory(idOrSlug: string): Category | undefined {
  const raw = idOrSlug.trim();
  if (!raw) return undefined;
  let found: Category | undefined;
  walkCategories([...categoryShortcuts, ...categories], (c) => {
    if (found) return;
    if (c.id === raw || c.slug === raw || c.aliases?.includes(raw)) found = c;
  });
  return found;
}

export function findCategory(idOrSlug: string): Category | undefined {
  if (isBannedLiveAnimalSlug(idOrSlug) || isBannedLiveAnimalCategory(idOrSlug)) {
    return lookupCategory("pets");
  }
  return lookupCategory(idOrSlug);
}

export function flattenCategories(): Category[] {
  return allCategoryNodes();
}

export function parentOf(cat: Category): Category | undefined {
  if (!cat.parentId) {
    return categories.find((r) => r.children?.some((ch) => ch.id === cat.id));
  }
  return findCategory(cat.parentId);
}

export function categoryPath(cat?: Category | null): Category[] {
  const path: Category[] = [];
  let cur = cat ?? undefined;
  const seen = new Set<string>();
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    path.unshift(cur);
    cur = parentOf(cur);
  }
  return path;
}

function collectIds(cat: Category): string[] {
  const ids = [cat.id, ...(cat.aliases ?? [])];
  for (const ch of cat.children ?? []) ids.push(...collectIds(ch));
  return ids;
}

/** Slug veya id → ilan `categoryId` eşlemesi (tüm alt düğümler). Filtre kısayolları boş döner. */
export function categoryQueryIds(idOrSlug: string): string[] {
  const raw = idOrSlug.trim();
  if (!raw) return [];
  const cat = lookupCategory(raw);
  if (!cat) return [raw];
  if (cat.filter) return [];
  return [...new Set(collectIds(cat))];
}

export function listingMatchesCategory(
  listing: { categoryId: string },
  cat: Category,
): boolean {
  return collectIds(cat).includes(listing.categoryId);
}

export function countListingsInCategory(
  listings: { categoryId: string; status?: string }[],
  cat: Category,
): number {
  return listings.filter((l) => l.status === "active" && listingMatchesCategory(l, cat)).length;
}

export function countListingsByCategoryId(
  listings: { categoryId: string; status?: string }[],
  categoryId: string,
): number {
  const cat = findCategory(categoryId);
  if (!cat) return listings.filter((l) => l.status === "active" && l.categoryId === categoryId).length;
  return countListingsInCategory(listings, cat);
}

export function formatListingCount(n: number, locale = "tr-TR") {
  return n.toLocaleString(locale);
}

export function searchCategories(query: string): Category[] {
  const q = query.trim().toLocaleLowerCase("tr");
  if (!q) return [];
  return allCategoryNodes().filter((c) => {
    if (c.filter) return false;
    const hay = [c.name, c.slug, c.id, ...(c.aliases ?? [])].join(" ").toLocaleLowerCase("tr");
    return hay.includes(q) || c.slug.includes(q.replaceAll(" ", "-"));
  });
}

export function searchBrands(query: string): string[] {
  const q = query.trim().toLocaleLowerCase("tr");
  if (q.length < 2) return [];
  const hits: string[] = [];
  const seen = new Set<string>();
  const push = (label: string) => {
    const key = label.toLocaleLowerCase("tr");
    if (seen.has(key) || !label.toLocaleLowerCase("tr").includes(q)) return;
    seen.add(key);
    hits.push(label);
  };
  for (const c of allCategoryNodes()) {
    for (const brand of c.brands ?? []) push(brand);
    if (hits.length >= 6) return hits;
  }
  for (const brand of VEHICLE_BRANDS) {
    push(brand.name);
    for (const model of brand.models) {
      push(model.name);
      if (q.length >= 3 && model.name.toLocaleLowerCase("tr").includes(q)) {
        push(`${brand.name} ${model.name}`);
      }
    }
    if (hits.length >= 6) return hits;
  }
  return hits.slice(0, 6);
}

export function inferCategoryFromQuery(query: string): Category | undefined {
  const q = query.trim().toLocaleLowerCase("tr");
  if (q.length < 3) return undefined;
  const nodes = allCategoryNodes().filter((c) => !c.filter);
  const exact = nodes.find(
    (c) =>
      c.name.toLocaleLowerCase("tr") === q ||
      c.slug === q.replaceAll(" ", "-") ||
      (c.aliases ?? []).some((a) => a.toLocaleLowerCase("tr") === q),
  );
  if (exact) return exact;
  const starts = nodes.filter(
    (c) => c.name.toLocaleLowerCase("tr").startsWith(q) || c.slug.startsWith(q.replaceAll(" ", "-")),
  );
  return starts.length === 1 ? starts[0] : undefined;
}

export function visibleChildren(cat?: Category | null): Category[] {
  return (cat?.children ?? []).filter((c) => !c.navHidden);
}

export function relatedCategories(cat: Category): Category[] {
  if (cat.relatedIds?.length) {
    return cat.relatedIds.map(findCategory).filter((c): c is Category => Boolean(c));
  }
  const p = parentOf(cat);
  return visibleChildren(p).filter((c) => c.id !== cat.id).slice(0, 8);
}

export function hrefForCategoryListings(cat: Category) {
  if (cat.filter === "urgent") return "/acil";
  if (cat.filter === "h48") return "/son-48-saat";
  if (cat.filter) return `/ara?filter=${cat.filter}`;
  const full = findCategory(cat.id) ?? cat;
  if (isBeautyJobsCategory(full)) return hrefForJobCategory(full);
  if (isServiceTreeCategory(full) && !isServiceTreeLanding(full)) return hrefForRenoCategory(full);
  return `/ara?kategori=${encodeURIComponent(full.slug)}`;
}

export function hrefForCategory(cat: Category) {
  if (cat.filter === "urgent") return "/acil";
  if (cat.filter === "h48") return "/son-48-saat";
  if (cat.filter) return `/ara?filter=${cat.filter}`;
  const full = findCategory(cat.id) ?? cat;
  if (isBeautyJobsCategory(full)) return hrefForJobCategory(full);
  if (isServiceTreeCategory(full) && !isServiceTreeLanding(full)) return hrefForRenoCategory(full);
  if (visibleChildren(full).length && !full.browse) {
    return `/kategoriler/${encodeURIComponent(full.slug)}`;
  }
  return hrefForCategoryListings(full);
}

export function isCategoryOnPath(cat: Category, current?: Category | null) {
  if (!current) return false;
  if (cat.id === current.id || cat.slug === current.slug) return true;
  let walk: Category | undefined = current;
  for (let i = 0; i < 8; i++) {
    walk = parentOf(walk);
    if (!walk) break;
    if (walk.id === cat.id) return true;
  }
  return false;
}

export function rootOf(cat: Category): Category {
  if (cat.filter === "oto360" || cat.filter === "expertise") {
    return findCategory("vasita") ?? cat;
  }
  if (cat.filter === "emlak360" || cat.filter === "realtor") {
    return findCategory("emlak") ?? cat;
  }
  if (cat.filter === "refurbished") {
    return findCategory("shopping-phone") ?? findCategory("shopping") ?? cat;
  }
  let cur = cat;
  for (let i = 0; i < 8; i++) {
    const p = parentOf(cur);
    if (!p) break;
    cur = p;
  }
  return cur;
}

export function isBeautyJobsCategory(cat?: Category | null) {
  if (!cat) return false;
  return cat.id === "jobs-beauty" || cat.parentId === "jobs-beauty" || cat.id.startsWith("jobs-beauty-");
}

const SERVICE_HUB_IDS = ["services-reno", "services-move", "services-auto", "services-repair", "services-event", "services-other"] as const;

export function isRenoCategory(cat?: Category | null) {
  if (!cat) return false;
  return cat.id === "services-reno" || cat.id.startsWith("services-reno-");
}

export function isMoveCategory(cat?: Category | null) {
  if (!cat) return false;
  return cat.id === "services-move" || cat.id.startsWith("services-move-");
}

export function isAutoServiceCategory(cat?: Category | null) {
  if (!cat) return false;
  return cat.id === "services-auto" || cat.id.startsWith("services-auto-");
}

export function isEventCategory(cat?: Category | null) {
  if (!cat) return false;
  return cat.id === "services-event" || cat.id.startsWith("services-event-");
}

export function isOtherServiceCategory(cat?: Category | null) {
  if (!cat) return false;
  return cat.id === "services-other" || cat.id.startsWith("services-other-");
}

export function isServiceTreeCategory(cat?: Category | null) {
  if (!cat) return false;
  return SERVICE_HUB_IDS.some((h) => cat.id === h || cat.id.startsWith(`${h}-`));
}

export function isServiceTreeLanding(cat?: Category | null) {
  return Boolean(cat && (SERVICE_HUB_IDS as readonly string[]).includes(cat.id));
}

export function serviceHubOf(cat?: Category | null): Category | undefined {
  if (!cat) return undefined;
  for (const hubId of SERVICE_HUB_IDS) {
    if (cat.id === hubId) return findCategory(hubId) ?? cat;
    if (cat.id.startsWith(`${hubId}-`)) return findCategory(hubId);
  }
  return undefined;
}

export function renoBranchOf(cat: Category): Category | undefined {
  return serviceBranchOf(cat);
}

export function serviceBranchOf(cat: Category): Category | undefined {
  const hub = serviceHubOf(cat);
  const full = findCategory(cat.id) ?? cat;
  if (!hub || full.id === hub.id) return undefined;
  if (full.parentId === hub.id) return full;
  const p = parentOf(full);
  if (p?.parentId === hub.id) return p;
  return p && serviceHubOf(p) ? p : full;
}

function jobUrlSlug(cat: Category) {
  if (cat.id === "jobs-beauty" || cat.aliases?.includes("guzellik-bakim")) return "guzellik-bakim";
  return cat.slug;
}

export function jobPathSegments(cat: Category): string[] {
  const full = findCategory(cat.id) ?? cat;
  const segs: string[] = [];
  let cur: Category | undefined = full;
  while (cur && cur.id !== "jobs") {
    segs.unshift(jobUrlSlug(cur));
    cur = parentOf(cur);
  }
  return segs;
}

export function hrefForJobCategory(cat: Category) {
  const segs = jobPathSegments(cat);
  return segs.length ? `/is-ilanlari/${segs.join("/")}` : "/is-ilanlari";
}

export function findCategoryFromJobPath(segments: string[]): Category | undefined {
  if (!segments.length) return findCategory("jobs");
  const last = findCategory(segments[segments.length - 1]);
  if (!last || rootOf(last).id !== "jobs") return undefined;
  const expected = jobPathSegments(last);
  if (expected.join("/") === segments.join("/")) return last;
  if (segments.length === 1) return last;
  return undefined;
}

export function filterSidebarCategories(cat?: Category | null): Category[] | undefined {
  if (!cat) return undefined;
  const kids = visibleChildren(cat);
  if (kids.length) return kids;
  const p = parentOf(cat);
  if (p?.browse) return visibleChildren(p);
  if (p?.id === "parts-moto" || p?.id === "parts-sea") return visibleChildren(p);
  if (p && isBeautyJobsCategory(cat)) return visibleChildren(p);
  const hub = serviceHubOf(cat);
  if (hub && cat.id !== hub.id) {
    return visibleChildren(hub);
  }
  return undefined;
}

export function hrefForRenoCategory(cat: Category) {
  const segs = renoPathSegments(cat);
  return segs.length ? `/ustalar-hizmetler/${segs.join("/")}` : "/ustalar-hizmetler";
}

export function renoPathSegments(cat: Category): string[] {
  const full = findCategory(cat.id) ?? cat;
  const segs: string[] = [];
  let cur: Category | undefined = full;
  while (cur && cur.id !== "services") {
    segs.unshift(cur.slug);
    cur = parentOf(cur);
  }
  return segs;
}

export function findCategoryFromRenoPath(segments: string[]): Category | undefined {
  if (!segments.length) return findCategory("services");
  const last = findCategory(segments[segments.length - 1]);
  if (!last || rootOf(last).id !== "services") return undefined;
  const expected = renoPathSegments(last);
  if (expected.join("/") === segments.join("/")) return last;
  if (segments.length === 1) return last;
  return undefined;
}

