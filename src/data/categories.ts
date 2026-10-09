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

const KONUT_HOUSING: { key: string; name: string; icon: string; oldId?: string; oldSlug?: string }[] = [
  { key: "daire", name: "Daire", icon: "home", oldId: "emlak-konut-daire", oldSlug: "daire" },
  { key: "residence", name: "Rezidans", icon: "buildings", oldId: "emlak-konut-residence", oldSlug: "residence" },
  { key: "mustakil-ev", name: "Müstakil Ev", icon: "home", oldId: "emlak-konut-mustakil", oldSlug: "mustakil-ev" },
  { key: "villa", name: "Villa", icon: "hotel", oldId: "emlak-konut-villa", oldSlug: "villa" },
  { key: "ciftlik-evi", name: "Çiftlik Evi", icon: "trees" },
  { key: "kosk-konak", name: "Köşk & Konak", icon: "landmark" },
  { key: "yali", name: "Yalı", icon: "palmtree" },
  { key: "yali-dairesi", name: "Yalı Dairesi", icon: "home" },
  { key: "yazlik", name: "Yazlık", icon: "palmtree", oldId: "emlak-konut-yazlik", oldSlug: "yazlik" },
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
    children: [
      node("emlak-konut", "konut", "Konut", "home", {
        parentId: "emlak",
        aliases: ["estate"],
        children: [
          node("emlak-konut-satilik", "satilik-konut", "Satılık", "key", {
            parentId: "emlak-konut",
            browse: true,
            children: konutHousingNodes("emlak-konut-satilik", "satilik", true),
          }),
          node("emlak-konut-kiralik", "kiralik-konut", "Kiralık", "key", {
            parentId: "emlak-konut",
            browse: true,
            children: konutHousingNodes("emlak-konut-kiralik", "kiralik", false),
          }),
          node("emlak-konut-gunluk", "turistik-gunluk-kiralik", "Turistik Günlük Kiralık", "palmtree", {
            parentId: "emlak-konut",
            browse: true,
            children: konutHousingNodes("emlak-konut-gunluk", "gunluk-kiralik", false),
          }),
          node("emlak-konut-devren", "devren-satilik-konut", "Devren Satılık Konut", "store", {
            parentId: "emlak-konut",
            browse: true,
            children: konutHousingNodes("emlak-konut-devren", "devren-satilik", false),
          }),
        ],
      }),
      node("emlak-isyeri", "is-yeri", "İş Yeri", "store", {
        parentId: "emlak",
        children: [
          node("emlak-isyeri-ofis", "ofis", "Ofis", "briefcase", { parentId: "emlak-isyeri" }),
          node("emlak-isyeri-dukkan", "dukkan", "Dükkan & Mağaza", "store", { parentId: "emlak-isyeri" }),
          node("emlak-isyeri-depo", "depo", "Depo & Antrepo", "warehouse", { parentId: "emlak-isyeri" }),
          node("emlak-isyeri-plaza", "plaza", "Plaza", "buildings", { parentId: "emlak-isyeri" }),
        ],
      }),
      node("emlak-arsa", "arsa", "Arsa", "land", {
        parentId: "emlak",
        children: [
          node("emlak-arsa-konut", "konut-imarli", "Konut İmarlı", "land", { parentId: "emlak-arsa" }),
          node("emlak-arsa-ticari", "ticari-imarli", "Ticari İmarlı", "store", { parentId: "emlak-arsa" }),
          node("emlak-arsa-tarla", "tarla", "Tarla", "trees", { parentId: "emlak-arsa" }),
        ],
      }),
      node("emlak-proje", "konut-projeleri", "Konut Projeleri", "buildings", { parentId: "emlak" }),
      node("emlak-bina", "bina", "Bina", "building", { parentId: "emlak" }),
      node("emlak-devre", "devre-mulk", "Devre Mülk", "key", { parentId: "emlak" }),
      node("emlak-turistik", "turistik-tesis", "Turistik Tesis", "palmtree", { parentId: "emlak" }),
    ],
  }),
  node("vasita", "vasita", "Vasıta", "car", {
    seeAll: true,
    children: [
      node("vasita-otomobil", "otomobil", "Otomobil", "car", {
        parentId: "vasita",
        aliases: ["auto"],
      }),
      node("vasita-suv", "arazi-suv-pickup", "Arazi, SUV & Pickup", "suv", { parentId: "vasita" }),
      node("vasita-ev", "elektrikli-araclar", "Elektrikli Araçlar", "zap", {
        parentId: "vasita",
        circular: true,
      }),
      node("vasita-moto", "motosiklet", "Motosiklet", "bike", { parentId: "vasita" }),
      node("vasita-van", "minivan-panelvan", "Minivan & Panelvan", "van", { parentId: "vasita" }),
      node("vasita-ticari", "ticari-araclar", "Ticari Araçlar", "truck", { parentId: "vasita" }),
      node("vasita-kiralik", "kiralik-araclar", "Kiralık Araçlar", "key", { parentId: "vasita" }),
      node("vasita-deniz", "deniz-araclari", "Deniz Araçları", "sail", { parentId: "vasita" }),
      node("vasita-hasarli", "hasarli-araclar", "Hasarlı Araçlar", "wrench", { parentId: "vasita" }),
      node("vasita-karavan", "karavan", "Karavan", "tent", { parentId: "vasita" }),
      node("vasita-klasik", "klasik-araclar", "Klasik Araçlar", "crown", { parentId: "vasita" }),
      node("vasita-hava", "hava-araclari", "Hava Araçları", "plane", { parentId: "vasita" }),
      node("vasita-atv", "atv", "ATV", "bike", { parentId: "vasita" }),
      node("vasita-utv", "utv", "UTV", "bike", { parentId: "vasita" }),
      node("vasita-engelli", "engelli-plakali-araclar", "Engelli Plakalı Araçlar", "access", { parentId: "vasita" }),
    ],
  }),
  node("parts", "yedek-parca", "Yedek Parça, Aksesuar, Donanım & Tuning", "cog", {
    children: [
      node("parts-auto", "otomotiv-ekipmanlari", "Otomotiv Ekipmanları", "wrench", {
        parentId: "parts",
        relatedIds: ["parts-auto-cam", "parts-auto-media", "parts-auto-amp"],
        children: [
          node("parts-auto-spare", "yedek-parca-oto", "Yedek Parça", "cog", {
            parentId: "parts-auto",
            browse: true,
            children: [
              node("parts-auto-spare-auto", "yedek-otomobil-arazi", "Otomobil & Arazi Aracı", "car", {
                parentId: "parts-auto-spare",
              }),
              node("parts-auto-spare-van", "yedek-minivan-panelvan", "Minivan & Panelvan", "van", {
                parentId: "parts-auto-spare",
              }),
              node("parts-auto-spare-ticari", "yedek-ticari-arac", "Ticari Araçlar", "truck", {
                parentId: "parts-auto-spare",
              }),
              node("parts-auto-spare-karavan", "yedek-karavan", "Karavan", "tent", {
                parentId: "parts-auto-spare",
              }),
              node("parts-auto-spare-gokart", "yedek-go-kart", "Go Kart", "flag", {
                parentId: "parts-auto-spare",
              }),
            ],
          }),
          node("parts-auto-acc", "aksesuar-tuning", "Aksesuar & Tuning", "sparkles", {
            parentId: "parts-auto",
            browse: true,
            children: [
              node("parts-auto-acc-ic", "ic-aksesuar", "İç Aksesuar", "sparkles", { parentId: "parts-auto-acc" }),
              node("parts-auto-acc-dis", "dis-aksesuar", "Dış Aksesuar", "sparkles", { parentId: "parts-auto-acc" }),
              node("parts-auto-acc-light", "aydinlatma-tuning", "Aydınlatma & Xenon", "zap", { parentId: "parts-auto-acc" }),
              node("parts-auto-acc-perf", "performans-tuning", "Performans & Tuning", "flame", { parentId: "parts-auto-acc" }),
            ],
          }),
          node("parts-auto-tire", "jant-lastik", "Jant & Lastik", "circle", { parentId: "parts-auto" }),
          node("parts-auto-audio", "ses-goruntu", "Ses & Görüntü Sistemleri", "music", {
            parentId: "parts-auto",
          }),
          node("parts-auto-cam", "arac-ici-kamera", "Araç İçi Kamera", "camera", {
            parentId: "parts-auto",
          }),
          node("parts-auto-media", "multimedya-oynatici", "Multimedya Oynatıcı", "tv", {
            parentId: "parts-auto",
          }),
          node("parts-auto-amp", "amfi", "Amfi", "music", { parentId: "parts-auto" }),
        ],
      }),
      node("parts-moto", "motosiklet-ekipmanlari", "Motosiklet Ekipmanları", "bike", {
        parentId: "parts",
        relatedIds: ["parts-moto-gear-helmet", "parts-moto-gear-jacket", "parts-moto-gear-boots"],
        children: [
          node("parts-moto-gear", "kask-kiyafet-ekipman", "Kask, Kıyafet & Ekipman", "shield", {
            parentId: "parts-moto",
            browse: true,
            aliases: ["kask-mont"],
            children: [
              node("parts-moto-gear-boots", "moto-ayakkabi-bot", "Ayakkabı & Bot", "footprints", {
                parentId: "parts-moto-gear",
              }),
              node("parts-moto-gear-helmet", "moto-kask", "Kask", "shield", {
                parentId: "parts-moto-gear",
              }),
              node("parts-moto-gear-jacket", "moto-mont", "Mont", "shirt", {
                parentId: "parts-moto-gear",
              }),
              node("parts-moto-gear-pants", "moto-pantolon", "Pantolon", "shirt", {
                parentId: "parts-moto-gear",
              }),
              node("parts-moto-gear-sweat", "moto-sweatshirt", "Sweatshirt", "shirt", {
                parentId: "parts-moto-gear",
              }),
              node("parts-moto-gear-tee", "moto-tisort", "Tişört", "shirt", {
                parentId: "parts-moto-gear",
              }),
              node("parts-moto-gear-suit", "moto-tulum", "Tulum", "shirt", {
                parentId: "parts-moto-gear",
              }),
              node("parts-moto-gear-rain", "moto-yagmurluk", "Yağmurluk", "cloud", {
                parentId: "parts-moto-gear",
              }),
            ],
          }),
          node("parts-moto-spare", "moto-yedek-parca", "Yedek Parça", "cog", { parentId: "parts-moto" }),
          node("parts-moto-acc", "moto-aksesuar", "Aksesuar & Tuning", "sparkles", {
            parentId: "parts-moto",
          }),
          node("parts-moto-elec", "moto-elektronik", "Elektronik Ekipman", "cpu", {
            parentId: "parts-moto",
          }),
          node("parts-moto-tire", "moto-jant-lastik", "Jant & Lastik", "circle", {
            parentId: "parts-moto",
          }),
        ],
      }),
      node("parts-sea", "deniz-araci-ekipmanlari", "Deniz Aracı Ekipmanları", "ship", {
        parentId: "parts",
        children: SEA_EQUIP_GROUPS.map((g) =>
          node(g.id, g.slug, g.name, g.icon, {
            parentId: "parts-sea",
            browse: true,
            aliases: g.aliases,
          }),
        ),
      }),
    ],
  }),
  node("shopping", "ikinci-el", "İkinci El ve Sıfır Alışveriş", "bag", {
    circular: true,
    seeAll: true,
    // Retired subcategory id/slug: stored listings and old links resolve to this category (old URLs 301 in next.config).
    aliases: ["shopping-yepy", "yepy"],
    children: [
      ...shoppingTree(),
      node("shopping-other", "diger-her-sey", "Diğer Her Şey", "grid", {
        parentId: "shopping",
        aliases: ["other"],
      }),
    ],
  }),
  node("machines", "is-makineleri-sanayi", "İş Makineleri & Sanayi", "truck", {
    children: [
      node("machines-work", "is-makineleri", "İş Makineleri", "truck", {
        parentId: "machines",
        children: [
          node("machines-work-excavator", "ekskavator", "Ekskavatör", "truck", { parentId: "machines-work" }),
          node("machines-work-loader", "loder", "Loder", "truck", { parentId: "machines-work" }),
          node("machines-work-crane", "vinc", "Vinç", "factory", { parentId: "machines-work" }),
          node("machines-work-forklift", "forklift", "Forklift", "truck", { parentId: "machines-work" }),
        ],
      }),
      node("machines-farm", "tarim-makineleri", "Tarım Makineleri", "tractor", {
        parentId: "machines",
        children: [
          node("machines-farm-tractor", "traktor", "Traktör", "tractor", { parentId: "machines-farm" }),
          node("machines-farm-harvest", "bicerdoover", "Biçerdöver", "tractor", { parentId: "machines-farm" }),
          node("machines-farm-trailer", "romork", "Römork & Ekipman", "truck", { parentId: "machines-farm" }),
        ],
      }),
      node("machines-industry", "sanayi", "Sanayi Ekipmanları", "factory", {
        parentId: "machines",
        children: [
          node("machines-industry-gen", "jenerator", "Jeneratör", "zap", { parentId: "machines-industry" }),
          node("machines-industry-cnc", "cnc", "CNC & Tezgah", "cog", { parentId: "machines-industry" }),
          node("machines-industry-comp", "kompresor", "Kompresör", "factory", { parentId: "machines-industry" }),
        ],
      }),
      node("machines-energy", "elektrik-enerji", "Elektrik & Enerji", "zap", {
        parentId: "machines",
        children: [
          node("machines-energy-solar", "gunes-enerjisi", "Güneş Enerjisi", "zap", { parentId: "machines-energy" }),
          node("machines-energy-ups", "ups-kesintisiz", "UPS & Kesintisiz Güç", "zap", { parentId: "machines-energy" }),
          node("machines-energy-panel", "pano-trafo", "Pano & Trafo", "factory", { parentId: "machines-energy" }),
        ],
      }),
    ],
  }),
  node("services", "ustalar-hizmetler", "Ustalar ve Hizmetler", "hammer", {
    seeAll: true,
    children: [
      node("services-reno", "ev-tadilat", "Ev Tadilat & Dekorasyon", "paint", {
        parentId: "services",
        aliases: ["ev-tadilat-dekorasyon"],
        children: [
          node("services-reno-paint", "boyaci", "Boyacı", "paint", {
            parentId: "services-reno",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=900&q=80",
            children: [
              node("services-reno-paint-ext", "dis-cephe-boya", "Dış Cephe Boya", "paint", { parentId: "services-reno-paint" }),
              node("services-reno-paint-wall", "duvar-kagidi", "Duvar Kağıdı", "paint", { parentId: "services-reno-paint" }),
              node("services-reno-paint-int", "ic-cephe-boya", "İç Cephe Boya", "paint", { parentId: "services-reno-paint" }),
            ],
          }),
          node("services-reno-elec", "elektrik-aydinlatma", "Elektrik & Aydınlatma", "zap", {
            parentId: "services-reno",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1565814329452-e1efa11c5b89?auto=format&fit=crop&w=900&q=80",
            children: [
              node("services-reno-elec-garden", "bahce-aydinlatma", "Bahçe Aydınlatma", "zap", { parentId: "services-reno-elec" }),
              node("services-reno-elec-cable", "elektrik-kablo-doseme", "Elektrik Kablo Döşeme", "zap", { parentId: "services-reno-elec" }),
              node("services-reno-elec-install", "elektrik-tesisati-doseme-tamiri", "Elektrik Tesisatı Döşeme / Tamiri", "zap", { parentId: "services-reno-elec" }),
              node("services-reno-elec-hidden", "gizli-isik", "Gizli Işık", "zap", { parentId: "services-reno-elec" }),
              node("services-reno-elec-indoor", "ic-mekan-aydinlatma", "İç Mekan Aydınlatma", "zap", { parentId: "services-reno-elec" }),
            ],
          }),
          node("services-reno-arch", "mimarlik-muhendislik", "Mimarlık & Mühendislik", "landmark", {
            parentId: "services-reno",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=900&q=80",
            children: [
              node("services-reno-arch-int", "ic-mimari", "İç Mimari", "landmark", { parentId: "services-reno-arch" }),
              node("services-reno-arch-arch", "mimarlik-hizmeti", "Mimarlık Hizmeti", "landmark", { parentId: "services-reno-arch" }),
              node("services-reno-arch-eng", "muhendislik-hizmeti", "Mühendislik Hizmeti", "landmark", { parentId: "services-reno-arch" }),
              node("services-reno-arch-prj", "proje-hizmetleri", "Proje Hizmetleri", "landmark", { parentId: "services-reno-arch" }),
            ],
          }),
          node("services-reno-furn", "mobilya-ve-doseme", "Mobilya ve Döşeme", "sofa", {
            parentId: "services-reno",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=900&q=80",
            children: [
              node("services-reno-furn-shelf", "dolap-raf", "Dolap & Raf", "sofa", { parentId: "services-reno-furn" }),
              node("services-reno-furn-home", "ev-mobilyasi", "Ev Mobilyası", "sofa", { parentId: "services-reno-furn" }),
              node("services-reno-furn-sofa", "koltuk-kaplama-doseme", "Koltuk Kaplama, Döşeme", "sofa", { parentId: "services-reno-furn" }),
              node("services-reno-furn-polish", "mobilya-cila-lake", "Mobilya Cila & Lake İşleri", "sofa", { parentId: "services-reno-furn" }),
              node("services-reno-furn-office", "ofis-mobilyasi", "Ofis Mobilyası", "sofa", { parentId: "services-reno-furn" }),
            ],
          }),
          node("services-reno-plumb", "su-tesisati", "Su Tesisatı", "wrench", {
            parentId: "services-reno",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=900&q=80",
            children: [
              node("services-reno-plumb-hydro", "hidrofor-tesisati", "Hidrofor Tesisatı Kurulum & Değişim", "wrench", { parentId: "services-reno-plumb" }),
              node("services-reno-plumb-filter", "su-aritma-sistemleri", "Su Arıtma Sistemleri", "wrench", { parentId: "services-reno-plumb" }),
              node("services-reno-plumb-tank", "su-deposu-temizlik", "Su Deposu Temizlik & Yalıtım", "wrench", { parentId: "services-reno-plumb" }),
              node("services-reno-plumb-leak", "su-kacak-tespiti", "Su Kaçak Tespiti", "wrench", { parentId: "services-reno-plumb" }),
              node("services-reno-plumb-clog", "tikali-boru-acma", "Tıkalı Boru Açma", "wrench", { parentId: "services-reno-plumb" }),
            ],
          }),
          node("services-reno-insul", "yalitim-ve-mantolama", "Yalıtım ve Mantolama", "home", {
            parentId: "services-reno",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=900&q=80",
            children: [
              node("services-reno-insul-roof", "cati-tamiri-yalitimi", "Çatı Tamiri / Yalıtımı", "home", { parentId: "services-reno-insul" }),
              node("services-reno-insul-heat", "isi-yalitimi", "Isı Yalıtımı", "home", { parentId: "services-reno-insul" }),
              node("services-reno-insul-wrap", "mantolama", "Mantolama", "home", { parentId: "services-reno-insul" }),
              node("services-reno-insul-sound", "ses-yalitimi", "Ses Yalıtımı", "home", { parentId: "services-reno-insul" }),
              node("services-reno-insul-water", "su-yalitimi", "Su Yalıtımı", "home", { parentId: "services-reno-insul" }),
            ],
          }),
          node("services-reno-surface", "yuzey-doseme", "Yüzey Döşeme", "grid", {
            parentId: "services-reno",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1502005097973-6a7084991d45?auto=format&fit=crop&w=900&q=80",
            children: [
              node("services-reno-surface-mosaic", "cam-mozaik", "Cam Mozaik", "grid", { parentId: "services-reno-surface" }),
              node("services-reno-surface-tile", "fayans", "Fayans", "grid", { parentId: "services-reno-surface" }),
              node("services-reno-surface-granite", "granit", "Granit", "grid", { parentId: "services-reno-surface" }),
              node("services-reno-surface-chini", "karo-cini", "Karo Çini", "grid", { parentId: "services-reno-surface" }),
              node("services-reno-surface-marble", "mermer", "Mermer", "grid", { parentId: "services-reno-surface" }),
              node("services-reno-surface-ceramic", "seramik", "Seramik", "grid", { parentId: "services-reno-surface" }),
            ],
          }),
          node("services-reno-floor", "zemin-kaplama", "Zemin Kaplama", "grid", {
            parentId: "services-reno",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1615874959471-b3d8b85e7b41?auto=format&fit=crop&w=900&q=80",
            children: [
              node("services-reno-floor-ind", "endustriyel-zemin", "Endüstriyel Zemin", "grid", { parentId: "services-reno-floor" }),
              node("services-reno-floor-epoxy", "epoksi", "Epoksi", "grid", { parentId: "services-reno-floor" }),
              node("services-reno-floor-carpet", "hali-kaplama", "Halı Kaplama", "grid", { parentId: "services-reno-floor" }),
              node("services-reno-floor-laminate", "laminat-parke", "Laminat Parke", "grid", { parentId: "services-reno-floor" }),
              node("services-reno-floor-engineered", "lamine-parke", "Lamine Parke", "grid", { parentId: "services-reno-floor" }),
              node("services-reno-floor-solid", "masif-parke", "Masif Parke", "grid", { parentId: "services-reno-floor" }),
              node("services-reno-floor-polish", "siste-cila", "Siste Cila", "grid", { parentId: "services-reno-floor" }),
            ],
          }),
          node("services-reno-alarm", "alarm-guvenlik", "Alarm & Güvenlik", "shield", { parentId: "services-reno" }),
          node("services-reno-plaster", "alci-kartonpiyer", "Alçı & Kartonpiyer", "paint", { parentId: "services-reno" }),
          node("services-reno-garden", "bahce-ve-peyzaj", "Bahçe ve Peyzaj", "trees", { parentId: "services-reno" }),
          node("services-reno-bath", "banyo-mutfak-dekorasyonu", "Banyo ve Mutfak Dekorasyonu", "sparkles", { parentId: "services-reno" }),
          node("services-reno-lock", "cilingir", "Çilingir", "key", { parentId: "services-reno" }),
          node("services-reno-iron", "demir-ferforje", "Demir & Ferforje", "wrench", { parentId: "services-reno" }),
          node("services-reno-gas", "dogalgaz-tesisati", "Doğalgaz Tesisatı", "flame", { parentId: "services-reno" }),
          node("services-reno-hvac", "isitma-sogutma", "Isıtma, Soğutma", "zap", { parentId: "services-reno" }),
          node("services-reno-build", "insaat-hafriyat", "İnşaat & Hafriyat", "truck", { parentId: "services-reno" }),
          node("services-reno-door", "kapi-pencere-cam", "Kapı, Pencere, Cam & Cam Balkon", "home", { parentId: "services-reno" }),
          node("services-reno-wood", "marangoz", "Marangoz", "hammer", { parentId: "services-reno" }),
          node("services-reno-stone", "tas-beton-doseme", "Taş & Beton Döşeme", "landmark", { parentId: "services-reno" }),
          node("services-reno-clean", "temizlik-ilaclama", "Temizlik & İlaçlama", "sparkles", { parentId: "services-reno" }),
        ],
      }),
      node("services-move", "nakliye", "Nakliye", "truck", {
        parentId: "services",
        children: [
          node("services-move-home", "evden-eve-nakliyat", "Evden Eve Nakliyat", "truck", {
            parentId: "services-move",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1600518464441-9154a4dea21b?auto=format&fit=crop&w=900&q=80",
            children: [
              node("services-move-home-lift", "asansorlu-tasima", "Asansörlü Taşıma", "truck", { parentId: "services-move-home" }),
              node("services-move-home-city", "sehirici-evden-eve-nakliyat", "Şehiriçi Evden Eve Nakliyat", "truck", { parentId: "services-move-home" }),
              node("services-move-home-intercity", "sehirlerarasi-evden-eve-nakliyat", "Şehirlerarası Evden Eve Nakliyat", "truck", { parentId: "services-move-home" }),
              node("services-move-home-intl", "uluslararasi-nakliyat", "Uluslararası Nakliyat", "truck", { parentId: "services-move-home" }),
            ],
          }),
          node("services-move-fair", "fuar-fabrika-banka-tasimaciligi", "Fuar, Fabrika & Banka Taşımacılığı", "building", {
            parentId: "services-move",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=900&q=80",
            children: [
              node("services-move-fair-pack", "ambalajlama", "Ambalajlama", "archive", { parentId: "services-move-fair" }),
              node("services-move-fair-machine", "makina-tasima", "Makina Taşıma", "factory", { parentId: "services-move-fair" }),
              node("services-move-fair-office", "ofis-tasima", "Ofis Taşıma", "building", { parentId: "services-move-fair" }),
              node("services-move-fair-stand", "stant-sokme-kurma", "Stant Sökme & Kurma", "store", { parentId: "services-move-fair" }),
            ],
          }),
          node("services-move-customs", "gumrukleme", "Gümrükleme", "landmark", {
            parentId: "services-move",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=900&q=80",
            children: [
              node("services-move-customs-broker", "gumruk-musavirligi", "Gümrük Müşavirliği", "scale", { parentId: "services-move-customs" }),
            ],
          }),
          node("services-move-courier", "kurye-kargo", "Kurye, Kargo", "bike", {
            parentId: "services-move",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1616401784845-180882ba9ba8?auto=format&fit=crop&w=900&q=80",
            children: [
              node("services-move-courier-car", "aracli-kurye", "Araçlı Kurye", "car", { parentId: "services-move-courier" }),
              node("services-move-courier-express", "express-kurye", "Express Kurye", "zap", { parentId: "services-move-courier" }),
              node("services-move-courier-cargo", "kargo", "Kargo", "archive", { parentId: "services-move-courier" }),
              node("services-move-courier-moto", "motorlu-kurye", "Motorlu Kurye", "bike", { parentId: "services-move-courier" }),
              node("services-move-courier-intercity", "sehirlerarasi-kurye", "Şehirlerarası Kurye", "truck", { parentId: "services-move-courier" }),
              node("services-move-courier-bulk", "toplu-gonderi-hizmetleri", "Toplu Gönderi Hizmetleri", "archive", { parentId: "services-move-courier" }),
            ],
          }),
          node("services-move-logistics", "lojistik-depolama-paketleme", "Lojistik, Depolama & Paketleme", "warehouse", {
            parentId: "services-move",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=900&q=80",
            children: [
              node("services-move-logistics-pack", "ambalaj-paketleme", "Ambalaj & Paketleme", "archive", { parentId: "services-move-logistics" }),
              node("services-move-logistics-bond", "antrepo", "Antrepo", "warehouse", { parentId: "services-move-logistics" }),
              node("services-move-logistics-sea", "denizyolu-lojistik", "Denizyolu Lojistik", "ship", { parentId: "services-move-logistics" }),
              node("services-move-logistics-store", "depolama", "Depolama", "warehouse", { parentId: "services-move-logistics" }),
              node("services-move-logistics-intl", "uluslararasi-lojistik", "Uluslararası Lojistik", "ship", { parentId: "services-move-logistics" }),
              node("services-move-logistics-dom", "yurtici-lojistik", "Yurtiçi Lojistik", "truck", { parentId: "services-move-logistics" }),
            ],
          }),
          node("services-move-depot", "nakliye-ambarlari-kooperatifleri", "Nakliye Ambarları & Kooperatifleri", "store", {
            parentId: "services-move",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?auto=format&fit=crop&w=900&q=80",
            children: [
              node("services-move-depot-yard", "nakliye-ambarlari", "Nakliye Ambarları", "warehouse", { parentId: "services-move-depot" }),
              node("services-move-depot-coop", "nakliye-kooperatifleri", "Nakliye Kooperatifleri", "users", { parentId: "services-move-depot" }),
            ],
          }),
          node("services-move-driver", "soforlu-arac-transfer", "Şoförlü Araç & Transfer", "car", {
            parentId: "services-move",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=900&q=80",
            children: [
              node("services-move-driver-wedding", "dugun-arabasi-kiralama", "Düğün Arabası Kiralama", "car", { parentId: "services-move-driver" }),
              node("services-move-driver-limo", "limuzin-kiralama", "Limuzin Kiralama", "car", { parentId: "services-move-driver" }),
              node("services-move-driver-staff", "personel-servisi-tasimaciligi", "Personel Servisi Taşımacılığı", "van", { parentId: "services-move-driver" }),
              node("services-move-driver-city", "sehirici-transfer", "Şehiriçi Transfer", "car", { parentId: "services-move-driver" }),
              node("services-move-driver-intercity", "sehirlerarasi-transfer", "Şehirlerarası Transfer", "car", { parentId: "services-move-driver" }),
              node("services-move-driver-hire", "soforlu-arac-kiralama", "Şoförlü Araç Kiralama", "car", { parentId: "services-move-driver" }),
            ],
          }),
          node("services-move-freight", "yuk-tasima", "Yük Taşıma", "truck", {
            parentId: "services-move",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=900&q=80",
            children: [
              node("services-move-freight-ftl", "komple-tasima", "Komple Taşıma", "truck", { parentId: "services-move-freight" }),
              node("services-move-freight-ltl", "parsiyel-tasima", "Parsiyel Taşıma", "truck", { parentId: "services-move-freight" }),
            ],
          }),
        ],
      }),
      node("services-auto", "arac-servis-bakim", "Araç Servis & Bakım", "wrench", {
        parentId: "services",
        aliases: ["arac-servis"],
        children: [
          node("services-auto-tow", "cekici-yol-yardim", "Çekici & Yol Yardım", "truck", {
            parentId: "services-auto",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=900&q=80",
            children: [
              node("services-auto-tow-haul", "arac-tasima", "Araç Taşıma", "truck", { parentId: "services-auto-tow" }),
              node("services-auto-tow-moto", "motosiklet-yol-yardim", "Motosiklet Yol Yardım", "bike", { parentId: "services-auto-tow" }),
              node("services-auto-tow-rescue", "oto-kurtarma", "Oto Kurtarma", "truck", { parentId: "services-auto-tow" }),
              node("services-auto-tow-road", "yol-yardim", "Yol Yardım", "car", { parentId: "services-auto-tow" }),
            ],
          }),
          node("services-auto-marina", "marina-liman-hizmetleri", "Marina & Liman Hizmetleri", "ship", {
            parentId: "services-auto",
            children: [
              node("services-auto-marina-dock", "kiralik-liman-iskele", "Kiralık Liman & İskele", "ship", { parentId: "services-auto-marina" }),
              node("services-auto-marina-yard", "marina", "Marina", "ship", { parentId: "services-auto-marina" }),
              node("services-auto-marina-captain", "yat-kaptani", "Yat Kaptanı", "ship", { parentId: "services-auto-marina" }),
            ],
          }),
          node("services-auto-upholstery", "oto-doseme", "Oto Döşeme", "sofa", {
            parentId: "services-auto",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=80",
            children: [
              node("services-auto-upholstery-wheel", "direksiyon-kaplama", "Direksiyon Kaplama", "car", { parentId: "services-auto-upholstery" }),
              node("services-auto-upholstery-leather", "hakiki-deri-doseme", "Hakiki Deri Döşeme", "sofa", { parentId: "services-auto-upholstery" }),
              node("services-auto-upholstery-mat", "oto-paspaslari", "Oto Paspasları", "car", { parentId: "services-auto-upholstery" }),
              node("services-auto-upholstery-vinyl", "suni-deri-doseme", "Suni Deri Döşeme", "sofa", { parentId: "services-auto-upholstery" }),
              node("services-auto-upholstery-roof", "tavan-doseme", "Tavan Döşeme", "sofa", { parentId: "services-auto-upholstery" }),
            ],
          }),
          node("services-auto-inspect", "oto-ekspertiz", "Oto Ekspertiz", "wrench", {
            parentId: "services-auto",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1487754180451-dcf98d98d4b6?auto=format&fit=crop&w=900&q=80",
            children: [
              node("services-auto-inspect-under", "alt-kontrol", "Alt Kontrol", "wrench", { parentId: "services-auto-inspect" }),
              node("services-auto-inspect-fault", "ariza-tespit", "Arıza Tespit", "zap", { parentId: "services-auto-inspect" }),
              node("services-auto-inspect-light", "far-ayar-testi", "Far Ayar Testi", "zap", { parentId: "services-auto-inspect" }),
              node("services-auto-inspect-brake", "fren-testi", "Fren Testi", "car", { parentId: "services-auto-inspect" }),
              node("services-auto-inspect-paint", "kaporta-boya-testi", "Kaporta & Boya Testi", "paint", { parentId: "services-auto-inspect" }),
              node("services-auto-inspect-leg", "leg-testi", "Leg Testi", "car", { parentId: "services-auto-inspect" }),
              node("services-auto-inspect-perf", "motor-performance-testi", "Motor Performance Testi", "zap", { parentId: "services-auto-inspect" }),
              node("services-auto-inspect-susp", "suspansiyon-testi", "Süspansiyon Testi", "car", { parentId: "services-auto-inspect" }),
              node("services-auto-inspect-slip", "yanal-kayma-testi", "Yanal Kayma Testi", "car", { parentId: "services-auto-inspect" }),
            ],
          }),
          node("services-auto-elec", "oto-elektrik-ses", "Oto Elektrik & Ses", "zap", {
            parentId: "services-auto",
            children: [
              node("services-auto-elec-battery", "aku", "Akü", "zap", { parentId: "services-auto-elec" }),
              node("services-auto-elec-wire", "oto-elektrik", "Oto Elektrik", "zap", { parentId: "services-auto-elec" }),
              node("services-auto-elec-video", "oto-goruntu", "Oto Görüntü", "tv", { parentId: "services-auto-elec" }),
              node("services-auto-elec-nav", "oto-navigasyon", "Oto Navigasyon", "car", { parentId: "services-auto-elec" }),
              node("services-auto-elec-audio", "oto-ses", "Oto Ses", "tv", { parentId: "services-auto-elec" }),
              node("services-auto-elec-track", "oto-takip", "Oto Takip", "car", { parentId: "services-auto-elec" }),
            ],
          }),
          node("services-auto-body", "oto-kaporta-boya", "Oto Kaporta & Boya", "paint", {
            parentId: "services-auto",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1565043666747-69f6646db940?auto=format&fit=crop&w=900&q=80",
            children: [
              node("services-auto-body-pdr", "boyasiz-gocuk-duzeltme", "Boyasız Göçük Düzeltme", "paint", { parentId: "services-auto-body" }),
              node("services-auto-body-dent", "gocuk-duzeltme", "Göçük Düzeltme", "paint", { parentId: "services-auto-body" }),
              node("services-auto-body-paint", "kaporta-boya", "Kaporta Boya", "paint", { parentId: "services-auto-body" }),
              node("services-auto-body-repair", "kaporta-tamiri", "Kaporta Tamiri", "wrench", { parentId: "services-auto-body" }),
              node("services-auto-body-spot", "yama-boya", "Yama Boya", "paint", { parentId: "services-auto-body" }),
            ],
          }),
          node("services-auto-tire", "oto-lastik-tamiri", "Oto Lastik Tamiri", "car", {
            parentId: "services-auto",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=900&q=80",
            children: [
              node("services-auto-tire-rim-paint", "jant-boyama", "Jant Boyama", "paint", { parentId: "services-auto-tire" }),
              node("services-auto-tire-rim", "jant-duzeltme-kaynak", "Jant Düzeltme & Kaynak", "wrench", { parentId: "services-auto-tire" }),
              node("services-auto-tire-fix", "lastik-tamiri", "Lastik Tamiri", "car", { parentId: "services-auto-tire" }),
            ],
          }),
          node("services-auto-mod", "oto-modifiye", "Oto Modifiye", "sparkles", {
            parentId: "services-auto",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=900&q=80",
            children: [
              node("services-auto-mod-design", "arac-dizayn", "Araç Dizayn", "sparkles", { parentId: "services-auto-mod" }),
              node("services-auto-mod-wrap", "arac-kaplama", "Araç Kaplama", "paint", { parentId: "services-auto-mod" }),
              node("services-auto-mod-tune", "modifye", "Modifye", "sparkles", { parentId: "services-auto-mod" }),
            ],
          }),
          node("services-auto-plate", "oto-plaka", "Oto Plaka", "car", {
            parentId: "services-auto",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=900&q=80",
            children: [
              node("services-auto-plate-aso", "aso-plaka", "Aso Plaka", "car", { parentId: "services-auto-plate" }),
              node("services-auto-plate-custom", "ozel-plaka", "Özel Plaka", "car", { parentId: "services-auto-plate" }),
              node("services-auto-plate-official", "resmi-plaka", "Resmi Plaka", "car", { parentId: "services-auto-plate" }),
              node("services-auto-plate-std", "standart-plaka", "Standart Plaka", "car", { parentId: "services-auto-plate" }),
            ],
          }),
          node("services-auto-repair", "oto-tamir-servis", "Oto Tamir & Servis", "wrench", {
            parentId: "services-auto",
            children: [
              node("services-auto-repair-car", "arac-tamiri", "Araç Tamiri", "wrench", { parentId: "services-auto-repair" }),
              node("services-auto-repair-ecu", "elektronik-ariza", "Elektronik Arıza", "zap", { parentId: "services-auto-repair" }),
              node("services-auto-repair-lpg", "lpg-montaj-donusum", "LPG Montaj & Dönüşüm", "flame", { parentId: "services-auto-repair" }),
              node("services-auto-repair-mech", "mekanik-ariza", "Mekanik Arıza", "cog", { parentId: "services-auto-repair" }),
              node("services-auto-repair-moto", "motosiklet-tamir", "Motosiklet Tamir", "bike", { parentId: "services-auto-repair" }),
              node("services-auto-repair-glass", "oto-cam", "Oto Cam", "car", { parentId: "services-auto-repair" }),
              node("services-auto-repair-exhaust", "oto-egzoz", "Oto Egzoz", "car", { parentId: "services-auto-repair" }),
              node("services-auto-repair-ac", "oto-isitma-klima", "Oto Isıtma & Klima", "zap", { parentId: "services-auto-repair" }),
              node("services-auto-repair-periodic", "periyodik-bakim", "Periyodik Bakım", "wrench", { parentId: "services-auto-repair" }),
            ],
          }),
          node("services-auto-wash", "oto-temizlik", "Oto Temizlik", "sparkles", {
            parentId: "services-auto",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&w=900&q=80",
            children: [
              node("services-auto-wash-antibac", "antibakteriyel-ic-temizlik", "Antibakteriyel İç Temizlik", "sparkles", { parentId: "services-auto-wash" }),
              node("services-auto-wash-protect", "boya-koruma", "Boya Koruma", "paint", { parentId: "services-auto-wash" }),
              node("services-auto-wash-paint", "boya-temizligi", "Boya Temizliği", "paint", { parentId: "services-auto-wash" }),
              node("services-auto-wash-ext", "dis-yikama", "Dış Yıkama", "sparkles", { parentId: "services-auto-wash" }),
              node("services-auto-wash-int", "ic-temizlik", "İç Temizlik", "sparkles", { parentId: "services-auto-wash" }),
              node("services-auto-wash-rim", "jant-temizligi", "Jant Temizliği", "sparkles", { parentId: "services-auto-wash" }),
              node("services-auto-wash-engine", "motor-temizligi", "Motor Temizliği", "sparkles", { parentId: "services-auto-wash" }),
              node("services-auto-wash-polish", "pasta-cila", "Pasta Cila", "sparkles", { parentId: "services-auto-wash" }),
            ],
          }),
          node("services-auto-boat", "tekne-yat-tamiri", "Tekne & Yat Tamiri", "ship", {
            parentId: "services-auto",
            children: [
              node("services-auto-boat-mirror", "tekne-ayna", "Ayna", "ship", { parentId: "services-auto-boat" }),
              node("services-auto-boat-paintjob", "tekne-boya", "Boya", "paint", { parentId: "services-auto-boat" }),
              node("services-auto-boat-chrome", "krom-nikelaj-isleri", "Krom Nikelaj İşleri", "sparkles", { parentId: "services-auto-boat" }),
              node("services-auto-boat-paint", "tekne-boyama", "Tekne Boyama", "paint", { parentId: "services-auto-boat" }),
              node("services-auto-boat-build", "tekne-imalati", "Tekne İmalatı", "ship", { parentId: "services-auto-boat" }),
              node("services-auto-boat-fix", "tekne-tamiri", "Tekne Tamiri", "wrench", { parentId: "services-auto-boat" }),
              node("services-auto-boat-yacht", "yat-tamiri", "Yat Tamiri", "ship", { parentId: "services-auto-boat" }),
            ],
          }),
          node("services-auto-traffic", "trafik-musavirligi", "Trafik Müşavirliği", "scale", {
            parentId: "services-auto",
            children: [
              node("services-auto-traffic-inspect", "arac-muayenesi-oncesi-kontrol", "Araç Muayenesi Öncesi Kontrol", "wrench", { parentId: "services-auto-traffic" }),
              node("services-auto-traffic-plate", "plaka-islemleri", "Plaka İşlemleri", "car", { parentId: "services-auto-traffic" }),
              node("services-auto-traffic-sale", "satis-devir-islemleri", "Satış Devir İşlemleri", "scale", { parentId: "services-auto-traffic" }),
              node("services-auto-traffic-reg", "tescil-islemleri", "Tescil İşlemleri", "scale", { parentId: "services-auto-traffic" }),
            ],
          }),
        ],
      }),
      node("services-repair", "tamirat-teknik-servis", "Tamirat & Teknik Servis", "wrench", {
        parentId: "services",
        aliases: ["tamirat"],
        children: [
          node("services-repair-gold", "altin-gumus-tamiri", "Altın & Gümüş Tamiri", "sparkles", { parentId: "services-repair" }),
          node("services-repair-lift", "asansor-tamiri", "Asansör Tamiri", "wrench", { parentId: "services-repair" }),
          node("services-repair-appliance", "beyaz-esya-servisi", "Beyaz Eşya Servisi", "home", {
            parentId: "services-repair",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=900&q=80",
          }),
          node("services-repair-pc", "bilgisayar-teknik-servisi", "Bilgisayar Teknik Servisi", "cpu", {
            parentId: "services-repair",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=900&q=80",
          }),
          node("services-repair-bike", "bisiklet-tamiri", "Bisiklet Tamiri", "bike", { parentId: "services-repair" }),
          node("services-repair-phone", "cep-telefonu-tamiri", "Cep Telefonu Tamiri", "smartphone", {
            parentId: "services-repair",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&w=900&q=80",
          }),
          node("services-repair-roof", "cati-tamiri", "Çatı Tamiri", "home", {
            parentId: "services-repair",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1632778149955-e80f8ceca2e8?auto=format&fit=crop&w=900&q=80",
          }),
          node("services-repair-elec", "elektrik-tesisati-tamiri", "Elektrik Tesisatı Tamiri", "zap", {
            parentId: "services-repair",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=900&q=80",
          }),
          node("services-repair-gadget", "elektronik-cihaz-tamiri", "Elektronik Cihaz Tamiri", "cpu", { parentId: "services-repair" }),
          node("services-repair-instrument", "enstruman-tamiri", "Enstrüman Tamiri", "headphones", { parentId: "services-repair" }),
          node("services-repair-home", "ev-aletleri-tamiri", "Ev Aletleri Tamiri", "wrench", {
            parentId: "services-repair",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1556912173-46c336c7fd55?auto=format&fit=crop&w=900&q=80",
          }),
          node("services-repair-copy", "fotokopi-makinesi-tamiri", "Fotokopi Makinesi Tamiri", "cpu", { parentId: "services-repair" }),
          node("services-repair-jacuzzi", "jakuzi-tamiri", "Jakuzi Tamiri", "sparkles", { parentId: "services-repair" }),
          node("services-repair-gen", "jenerator-tamiri", "Jeneratör Tamiri", "zap", { parentId: "services-repair" }),
          node("services-repair-ac", "klima-servisi", "Klima Servisi", "zap", {
            parentId: "services-repair",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1631549916767-1e687116858a?auto=format&fit=crop&w=900&q=80",
          }),
          node("services-repair-lock", "kontak-tamiri-anahtar-yedegi", "Kontak Tamiri & Anahtar Yedeği", "key", { parentId: "services-repair" }),
          node("services-repair-shoe", "lostra-ayakkabi-tamiri", "Lostra & Ayakkabı Tamiri", "sparkles", { parentId: "services-repair" }),
          node("services-repair-carlock", "oto-acma-oto-kilit-tamiri", "Oto Açma & Oto Kilit Tamiri", "key", { parentId: "services-repair" }),
          node("services-repair-overlock", "overlok-hali-onarimi", "Overlok & Halı Onarımı", "sparkles", { parentId: "services-repair" }),
          node("services-repair-piano", "piyano-akort", "Piyano Akort", "headphones", { parentId: "services-repair" }),
          node("services-repair-tv", "radyo-televizyon-tamiri", "Radyo Televizyon Tamiri", "tv", { parentId: "services-repair" }),
          node("services-repair-watch", "saat-tamiri", "Saat Tamiri", "watch", { parentId: "services-repair" }),
          node("services-repair-sport", "spor-ekipmanlari-bakim-onarimi", "Spor Ekipmanları Bakım & Onarımı", "sparkles", { parentId: "services-repair" }),
          node("services-repair-plumb", "su-tesisati-tamiri", "Su Tesisatı Tamiri", "wrench", {
            parentId: "services-repair",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=900&q=80",
          }),
          node("services-repair-sign", "tabela-tamiri", "Tabela Tamiri", "megaphone", { parentId: "services-repair" }),
          node("services-repair-tektit", "tektit-tadilati", "Tektit Tadilatı", "paint", { parentId: "services-repair" }),
          node("services-repair-pbx", "telefon-santrali-servisi", "Telefon Santrali Servisi", "smartphone", { parentId: "services-repair" }),
          node("services-repair-sat", "uydu-sistemleri-kurulum-onarim", "Uydu Sistemleri Kurulum & Onarım", "tv", { parentId: "services-repair" }),
          node("services-repair-fire", "yangin-guvenlik-sistemleri-servisi", "Yangın & Güvenlik Sistemleri Servisi", "shield", { parentId: "services-repair" }),
          node("services-repair-printer", "yazici-tamiri", "Yazıcı Tamiri", "cpu", { parentId: "services-repair" }),
        ],
      }),
      node("services-event", "dugun-etkinlik", "Düğün & Etkinlik", "ticket", {
        parentId: "services",
        children: [
          node("services-event-dance", "dans-etkinlikleri", "Dans Etkinlikleri", "sparkles", {
            parentId: "services-event",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1547153760-18fc86324498?auto=format&fit=crop&w=900&q=80",
            children: [
              node("services-event-dance-pro", "dansci-dansoz", "Dansçı & Dansöz", "sparkles", { parentId: "services-event-dance" }),
              node("services-event-dance-wed", "dugun-dansi", "Düğün Dansı", "sparkles", { parentId: "services-event-dance" }),
            ],
          }),
          node("services-event-wedding", "dugun-nisan-davet-organizasyonlari", "Düğün, Nişan & Davet Organizasyonları", "ticket", {
            parentId: "services-event",
            aliases: ["dugun-organizasyonu", "services-event-org"],
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=900&q=80",
            children: [
              node("services-event-wedding-invite", "davet", "Davet", "ticket", { parentId: "services-event-wedding" }),
              node("services-event-wedding-day", "dugun", "Düğün", "ticket", { parentId: "services-event-wedding" }),
              node("services-event-wedding-evt", "etkinlik", "Etkinlik", "ticket", { parentId: "services-event-wedding" }),
              node("services-event-wedding-garden", "kir-dugunu", "Kır Düğünü", "trees", { parentId: "services-event-wedding" }),
              node("services-event-wedding-engage", "nisan", "Nişan", "heart", { parentId: "services-event-wedding" }),
              node("services-event-wedding-boat", "tekne-dugunu", "Tekne Düğünü", "ship", { parentId: "services-event-wedding" }),
            ],
          }),
          node("services-event-photo", "fotograf-kamera", "Fotoğraf & Kamera", "camera", {
            parentId: "services-event",
            aliases: ["dugun-fotograf-video"],
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=80",
            children: [
              node("services-event-photo-out", "dis-mekan-cekimi", "Dış Mekan Çekimi", "camera", { parentId: "services-event-photo" }),
              node("services-event-photo-baby", "dogum-bebek-fotografi", "Doğum & Bebek Fotoğrafı", "baby", { parentId: "services-event-photo" }),
              node("services-event-photo-catalog", "dugun-katalog-cekimi", "Düğün Katalog Çekimi", "camera", { parentId: "services-event-photo" }),
              node("services-event-photo-home", "evde-ozel-cekim", "Evde Özel Çekim", "home", { parentId: "services-event-photo" }),
              node("services-event-photo-still", "fotograf-cekimi", "Fotoğraf Çekimi", "camera", { parentId: "services-event-photo" }),
              node("services-event-photo-air", "hava-cekimi", "Hava Çekimi", "camera", { parentId: "services-event-photo" }),
              node("services-event-photo-studio", "studiyo-cekimi", "Stüdyo Çekimi", "camera", { parentId: "services-event-photo" }),
              node("services-event-photo-video", "video-cekimi", "Video Çekimi", "camera", { parentId: "services-event-photo" }),
            ],
          }),
          node("services-event-fair", "fuar-organizasyonlari", "Fuar Organizasyonları", "building", {
            parentId: "services-event",
            children: [
              node("services-event-fair-stand", "fuar-standi-yapimi", "Fuar Standı Yapımı", "building", { parentId: "services-event-fair" }),
              node("services-event-fair-svc", "fuarcilik-hizmetleri", "Fuarcılık Hizmetleri", "briefcase", { parentId: "services-event-fair" }),
              node("services-event-fair-host", "hostes-fuar-elemanlari", "Hostes & Fuar Elemanları", "users", { parentId: "services-event-fair" }),
            ],
          }),
          node("services-event-congress", "kongre-seminer-toplanti", "Kongre, Seminer & Toplantı", "briefcase", {
            parentId: "services-event",
            children: [
              node("services-event-congress-cong", "kongre-organizasyonu", "Kongre Organizasyonu", "briefcase", { parentId: "services-event-congress" }),
              node("services-event-congress-sem", "seminer-organizasyonu", "Seminer Organizasyonu", "book", { parentId: "services-event-congress" }),
              node("services-event-congress-meet", "toplanti-organizasyonu", "Toplantı Organizasyonu", "users", { parentId: "services-event-congress" }),
            ],
          }),
          node("services-event-music", "muzik-organizasyonu", "Müzik Organizasyonu", "music", {
            parentId: "services-event",
            aliases: ["dj-ses-sistemi"],
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1571875257727-256c39da42af?auto=format&fit=crop&w=900&q=80",
            children: [
              node("services-event-music-dj", "dj", "Dj", "headphones", { parentId: "services-event-music" }),
              node("services-event-music-band", "dugun-orkestrasi", "Düğün Orkestrası", "music", { parentId: "services-event-music" }),
              node("services-event-music-concert", "konser", "Konser", "music", { parentId: "services-event-music" }),
            ],
          }),
          node("services-event-party", "ozel-gun-parti-organizasyonlari", "Özel Gün & Parti Organizasyonları", "sparkles", {
            parentId: "services-event",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1492684223066-81342eea348d?auto=format&fit=crop&w=900&q=80",
            children: [
              node("services-event-party-anim", "animasyon", "Animasyon", "sparkles", { parentId: "services-event-party" }),
              node("services-event-party-bday", "dogum-gunu-organizasyonlari", "Doğum Günü Organizasyonları", "cake", { parentId: "services-event-party" }),
              node("services-event-party-celeb", "ozel-gun-kutlamalari", "Özel Gün Kutlamaları", "sparkles", { parentId: "services-event-party" }),
              node("services-event-party-clown", "palyaco", "Palyaço", "sparkles", { parentId: "services-event-party" }),
              node("services-event-party-venue", "parti-evi", "Parti Evi", "home", {
                parentId: "services-event-party",
                aliases: ["dugun-salonu", "services-event-hall"],
                hubFeatured: true,
                cover: "https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?auto=format&fit=crop&w=900&q=80",
              }),
            ],
          }),
          node("services-event-catering", "pasta-yemek-catering", "Pasta, Yemek & Catering", "utensils", {
            parentId: "services-event",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=900&q=80",
            children: [
              node("services-event-catering-chef", "asci", "Aşçı", "utensils", { parentId: "services-event-catering" }),
              node("services-event-catering-cake", "butik-pasta", "Butik Pasta", "cake", { parentId: "services-event-catering" }),
              node("services-event-catering-svc", "catering", "Catering", "utensils", { parentId: "services-event-catering" }),
              node("services-event-catering-wed", "dugun-pastasi", "Düğün Pastası", "cake", { parentId: "services-event-catering" }),
              node("services-event-catering-cock", "kokteyl", "Kokteyl", "utensils", { parentId: "services-event-catering" }),
              node("services-event-catering-site", "yerinde-yemek", "Yerinde Yemek", "utensils", { parentId: "services-event-catering" }),
            ],
          }),
          node("services-event-av", "ses-isik-goruntu-sistemleri", "Ses, Işık & Görüntü Sistemleri", "headphones", {
            parentId: "services-event",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=900&q=80",
            children: [
              node("services-event-av-video", "goruntu-sistemleri", "Görüntü Sistemleri", "tv", { parentId: "services-event-av" }),
              node("services-event-av-light", "isik-duzenleme", "Işık Düzenleme", "zap", { parentId: "services-event-av" }),
              node("services-event-av-sound", "ses-sistemleri", "Ses Sistemleri", "headphones", { parentId: "services-event-av" }),
            ],
          }),
        ],
      }),
      node("services-other", "diger", "Diğer", "grid", {
        parentId: "services",
        children: [
          node("services-other-preschool", "anaokulu", "Anaokulu", "baby", {
            parentId: "services-other",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=900&q=80",
            children: [
              node("services-other-preschool-kg", "anaokulu-hizmeti", "Anaokulu", "baby", { parentId: "services-other-preschool" }),
              node("services-other-preschool-mom", "anne-cocuk-oyun-grubu", "Anne Çocuk Oyun Grubu", "baby", { parentId: "services-other-preschool" }),
              node("services-other-preschool-play", "cocuk-oyun-grubu", "Çocuk Oyun Grubu", "baby", { parentId: "services-other-preschool" }),
              node("services-other-preschool-day", "gunduz-bakimevi", "Gündüz Bakımevi", "home", { parentId: "services-other-preschool" }),
              node("services-other-preschool-creche", "kres", "Kreş", "baby", { parentId: "services-other-preschool" }),
            ],
          }),
          node("services-other-print", "baski-hizmetleri", "Baskı Hizmetleri", "printer", {
            parentId: "services-other",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1562654501-a0ccc0fc3fb1?auto=format&fit=crop&w=900&q=80",
            children: [
              node("services-other-print-copy", "fotokopi-baski-hizmetleri", "Fotokopi & Baskı Hizmetleri", "printer", { parentId: "services-other-print" }),
              node("services-other-print-screen", "serigraf-baski", "Serigraf Baskı", "printer", { parentId: "services-other-print" }),
              node("services-other-print-textile", "tekstil-baski-hizmetleri", "Tekstil Baskı Hizmetleri", "shirt", { parentId: "services-other-print" }),
              node("services-other-print-toner", "toner-kartus-dolum", "Toner & Kartuş Dolum", "printer", { parentId: "services-other-print" }),
            ],
          }),
          node("services-other-franchise", "bayilik-verenler-franchise", "Bayilik Verenler & Franchise", "store", {
            parentId: "services-other",
            children: [
              node("services-other-franchise-deal", "bayilik", "Bayilik", "store", { parentId: "services-other-franchise" }),
              node("services-other-franchise-brand", "franchise", "Franchise", "store", { parentId: "services-other-franchise" }),
            ],
          }),
          node("services-other-funeral", "cenaze-isleri", "Cenaze İşleri", "landmark", {
            parentId: "services-other",
            children: [
              node("services-other-funeral-care", "mezar-bakim-onarim", "Mezar Bakım & Onarım", "landmark", { parentId: "services-other-funeral" }),
              node("services-other-funeral-build", "mezar-yapimi", "Mezar Yapımı", "landmark", { parentId: "services-other-funeral" }),
              node("services-other-funeral-coffin", "tabut-yapimi", "Tabut Yapımı", "archive", { parentId: "services-other-funeral" }),
            ],
          }),
          node("services-other-consult", "danismanlik", "Danışmanlık", "briefcase", {
            parentId: "services-other",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=900&q=80",
            children: [
              node("services-other-consult-rd", "arastirma-gelistirme-hizmeti", "Araştırma & Geliştirme Hizmeti", "briefcase", { parentId: "services-other-consult" }),
              node("services-other-consult-audit", "audit-belgelendirme", "Audit & Belgelendirme", "shield", { parentId: "services-other-consult" }),
              node("services-other-consult-iso", "bilgi-guvenligi-yonetim-sistemi", "Bilgi Güvenliği Yönetim Sistemi", "shield", { parentId: "services-other-consult" }),
              node("services-other-consult-env", "cevre-yonetim-sistemi", "Çevre Yönetim Sistemi", "trees", { parentId: "services-other-consult" }),
              node("services-other-consult-edit", "editorluk-yazarlik", "Editörlük & Yazarlık", "book", { parentId: "services-other-consult" }),
              node("services-other-consult-food", "gida-danismanligi", "Gıda", "utensils", { parentId: "services-other-consult" }),
              node("services-other-consult-sec", "guvenlik-danismanligi", "Güvenlik", "shield", { parentId: "services-other-consult" }),
              node("services-other-consult-law", "hukuki-danismanlik", "Hukuki Danışmanlık", "scale", { parentId: "services-other-consult" }),
              node("services-other-consult-ohs", "is-sagligi-guvenligi", "İş Sağlığı & Güvenliği", "shield", { parentId: "services-other-consult" }),
              node("services-other-consult-qms", "kalite-yonetim-sistemi", "Kalite Yönetim Sistemi", "star", { parentId: "services-other-consult" }),
              node("services-other-consult-dev", "kisisel-gelisim", "Kişisel Gelişim", "sparkles", { parentId: "services-other-consult" }),
              node("services-other-consult-coach", "kocluk", "Koçluk", "users", { parentId: "services-other-consult" }),
              node("services-other-consult-brand", "marka-patent", "Marka & Patent", "scale", { parentId: "services-other-consult" }),
              node("services-other-consult-post", "montaj-post-produksiyon", "Montaj & Post Prodüksiyon", "camera", { parentId: "services-other-consult" }),
              node("services-other-consult-design", "proje-tasarim-hizmeti", "Proje & Tasarım Hizmeti", "sparkles", { parentId: "services-other-consult" }),
              node("services-other-consult-pension", "sigorta-emeklilik-danismanligi", "Sigorta & Emeklilik Danışmanlığı", "shield", { parentId: "services-other-consult" }),
              node("services-other-consult-csr", "sosyal-sorumluluk-yonetimi", "Sosyal Sorumluluk Yönetimi", "heart", { parentId: "services-other-consult" }),
              node("services-other-consult-deed", "tapu-isleri", "Tapu İşleri", "landmark", { parentId: "services-other-consult" }),
              node("services-other-consult-agri", "tarimsal-zirai-danismanlik", "Tarımsal (Zirai) Danışmanlık", "trees", { parentId: "services-other-consult" }),
              node("services-other-consult-visa", "vize-danismanligi", "Vize Danışmanlığı", "briefcase", { parentId: "services-other-consult" }),
              node("services-other-consult-invest", "yatirim-tesvik", "Yatırım Teşvik", "star", { parentId: "services-other-consult" }),
              node("services-other-consult-mgmt", "yonetim-sistemleri", "Yönetim Sistemleri", "cog", { parentId: "services-other-consult" }),
            ],
          }),
          node("services-other-course", "dershane-etud-merkezleri-kurslar", "Dershane, Etüd Merkezleri & Kurslar", "book", {
            parentId: "services-other",
            children: [
              node("services-other-course-abacus", "abakus-mental-aritmetik", "Abaküs, Mental Aritmetik", "book", { parentId: "services-other-course" }),
              node("services-other-course-aof", "aof", "AÖF", "graduation", { parentId: "services-other-course" }),
              node("services-other-course-pc", "bilgisayar-kurslari", "Bilgisayar Kursları", "laptop", { parentId: "services-other-course" }),
              node("services-other-course-glass", "cam-sanatlari", "Cam Sanatları", "sparkles", { parentId: "services-other-course" }),
              node("services-other-course-tattoo", "dovme-yapimi", "Dövme Yapımı", "sparkles", { parentId: "services-other-course" }),
              node("services-other-course-trad", "geleneksel-turk-sanatlari", "Geleneksel Türk Sanatları", "paint", { parentId: "services-other-course" }),
              node("services-other-course-art", "guzel-sanatlar", "Güzel Sanatlar", "paint", { parentId: "services-other-course" }),
              node("services-other-course-callig", "hat-sanati", "Hat Sanatı", "book", { parentId: "services-other-course" }),
              node("services-other-course-kpss", "kpss", "KPSS", "book", { parentId: "services-other-course" }),
              node("services-other-course-corp", "kurum-sinavlari", "Kurum Sınavları", "briefcase", { parentId: "services-other-course" }),
              node("services-other-course-job", "mesleki-kurslar", "Mesleki Kurslar", "wrench", { parentId: "services-other-course" }),
              node("services-other-course-music", "kurs-muzik", "Müzik", "music", { parentId: "services-other-course" }),
              node("services-other-course-draw", "resim-cizimi", "Resim Çizimi", "paint", { parentId: "services-other-course" }),
              node("services-other-course-exam", "sinav-hazirlik-lise-universite", "Sınav Hazırlık (Lise, Üniversite)", "graduation", { parentId: "services-other-course" }),
              node("services-other-course-spk", "spk", "SPK", "briefcase", { parentId: "services-other-course" }),
              node("services-other-course-sport", "spor-okullari", "Spor Okulları", "bike", { parentId: "services-other-course" }),
              node("services-other-course-lang", "kurs-yabanci-dil", "Yabancı Dil", "languages", { parentId: "services-other-course" }),
            ],
          }),
          node("services-other-craft", "el-sanatlari", "El Sanatları", "sparkles", {
            parentId: "services-other",
            children: [
              node("services-other-craft-weave", "dokuma", "Dokuma", "shirt", { parentId: "services-other-craft" }),
              node("services-other-craft-knit", "el-orgusu", "El Örgüsü", "sparkles", { parentId: "services-other-craft" }),
              node("services-other-craft-paint", "el-sanatlari-resim", "Resim", "paint", { parentId: "services-other-craft" }),
              node("services-other-craft-decor", "sus-esyasi", "Süs Eşyası", "gem", { parentId: "services-other-craft" }),
            ],
          }),
          node("services-other-pet", "evcil-hayvan-hizmetleri", "Evcil Hayvanlar", "paw", {
            parentId: "services-other",
            children: [
              node("services-other-pet-act", "evcil-hayvan-aktivite", "Aktivite", "paw", { parentId: "services-other-pet" }),
              node("services-other-pet-shelter", "barinak-yapim-onarim", "Barınak Yapım & Onarım", "home", { parentId: "services-other-pet" }),
              node("services-other-pet-train", "evcil-hayvan-egitim", "Eğitim", "paw", { parentId: "services-other-pet" }),
              node("services-other-pet-wear", "evcil-hayvan-giyim", "Giyim", "shirt", { parentId: "services-other-pet" }),
              node("services-other-pet-walk", "kopek-gezdirme", "Köpek Gezdirme", "paw", { parentId: "services-other-pet" }),
              node("services-other-pet-groom", "evcil-hayvan-kuafor-bakim", "Kuaför & Bakım", "sparkles", { parentId: "services-other-pet" }),
              node("services-other-pet-hotel", "pet-pansiyonu", "Pet Pansiyonu", "home", { parentId: "services-other-pet" }),
              node("services-other-pet-move", "evcil-hayvan-ulastirma", "Ulaştırma", "truck", { parentId: "services-other-pet" }),
              node("services-other-pet-vet", "veteriner-hizmeti", "Veteriner", "stethoscope", { parentId: "services-other-pet" }),
            ],
          }),
          node("services-other-textile", "giyim-tekstil-hizmetleri", "Giyim & Tekstil", "shirt", {
            parentId: "services-other",
            children: [
              node("services-other-textile-shoe", "ayakkabi-tasarimi", "Ayakkabı Tasarımı", "footprints", { parentId: "services-other-textile" }),
              node("services-other-textile-home", "ev-tekstil-urunleri", "Ev Tekstil Ürünleri", "sofa", { parentId: "services-other-textile" }),
              node("services-other-textile-sew", "kiyafet-tasarim-dikim", "Kıyafet Tasarım & Dikim", "shirt", { parentId: "services-other-textile" }),
              node("services-other-textile-clean", "kuru-temizleme", "Kuru Temizleme", "sparkles", { parentId: "services-other-textile" }),
              node("services-other-textile-fix", "tekstil-tadilati", "Tekstil Tadilatı", "wrench", { parentId: "services-other-textile" }),
              node("services-other-textile-tailor", "terzilik", "Terzilik", "scissors", { parentId: "services-other-textile" }),
              node("services-other-textile-iron", "utu", "Ütü", "sparkles", { parentId: "services-other-textile" }),
            ],
          }),
          node("services-other-scrap", "hurda-atik", "Hurda & Atık", "recycle", {
            parentId: "services-other",
            children: [
              node("services-other-scrap-waste", "atik-degerlendirme", "Atık Değerlendirme", "recycle", { parentId: "services-other-scrap" }),
              node("services-other-scrap-recycle", "geri-kazanim", "Geri Kazanım", "recycle", { parentId: "services-other-scrap" }),
              node("services-other-scrap-metal", "hurda-degerlendirme", "Hurda Değerlendirme", "recycle", { parentId: "services-other-scrap" }),
            ],
          }),
          node("services-other-rent", "kiralik-urunler", "Kiralık Ürünler", "clock", {
            parentId: "services-other",
            children: [
              node("services-other-rent-pc", "kiralik-bilgisayar", "Kiralık Bilgisayar", "laptop", { parentId: "services-other-rent" }),
              node("services-other-rent-groom", "kiralik-damatlik", "Kiralık Damatlık", "shirt", { parentId: "services-other-rent" }),
              node("services-other-rent-cam", "kiralik-fotograf-makinesi", "Kiralık Fotoğraf Makinesi", "camera", { parentId: "services-other-rent" }),
              node("services-other-rent-bride", "kiralik-gelinlik", "Kiralık Gelinlik", "sparkles", { parentId: "services-other-rent" }),
              node("services-other-rent-gen", "kiralik-jenerator", "Kiralık Jeneratör", "zap", { parentId: "services-other-rent" }),
              node("services-other-rent-ac", "kiralik-klima", "Kiralık Klima", "zap", { parentId: "services-other-rent" }),
              node("services-other-rent-costume", "kiralik-kostum", "Kiralık Kostüm", "shirt", { parentId: "services-other-rent" }),
              node("services-other-rent-metal", "kiralik-metal-dedektoru", "Kiralık Metal Dedektörü", "search", { parentId: "services-other-rent" }),
              node("services-other-rent-proj", "kiralik-projeksiyon", "Kiralık Projeksiyon", "tv", { parentId: "services-other-rent" }),
            ],
          }),
          node("services-other-dorm", "ogrenci-yurtlari", "Öğrenci Yurtları", "hotel", {
            parentId: "services-other",
            children: [
              node("services-other-dorm-stay", "pansiyon-yurt-hizmeti", "Pansiyon & Yurt Hizmeti", "hotel", { parentId: "services-other-dorm" }),
            ],
          }),
          node("services-other-ads", "reklam-promosyon-urun", "Reklam & Promosyon Ürün", "megaphone", {
            parentId: "services-other",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=900&q=80",
            children: [
              node("services-other-ads-pack", "ambalaj-paket", "Ambalaj & Paket", "archive", { parentId: "services-other-ads" }),
              node("services-other-ads-wrap", "arac-bina-giydirme", "Araç & Bina Giydirme", "car", { parentId: "services-other-ads" }),
              node("services-other-ads-survey", "arastirma-anket", "Araştırma & Anket", "briefcase", { parentId: "services-other-ads" }),
              node("services-other-ads-press", "basim-yayin-matbaacilik", "Basım Yayın & Matbaacılık", "book", { parentId: "services-other-ads" }),
              node("services-other-ads-flag", "bayrak-bez-afis-serigrafi", "Bayrak & Bez Afiş & Serigrafi", "flag", { parentId: "services-other-ads" }),
              node("services-other-ads-digital", "dijital-baski-kopyalama", "Dijital Baskı & Kopyalama", "printer", { parentId: "services-other-ads" }),
              node("services-other-ads-event", "etkinlik-organizasyon-tasarim", "Etkinlik & Organizasyon Tasarım", "ticket", { parentId: "services-other-ads" }),
              node("services-other-ads-model", "mimari-maket", "Mimari Maket", "building", { parentId: "services-other-ads" }),
              node("services-other-ads-mobile", "mobil-pazarlama", "Mobil Pazarlama", "smartphone", { parentId: "services-other-ads" }),
              node("services-other-ads-promo", "promosyon-urunleri", "Promosyon Ürünleri", "bag", { parentId: "services-other-ads" }),
              node("services-other-ads-pr", "reklam-tanitim", "Reklam & Tanıtım", "megaphone", { parentId: "services-other-ads" }),
              node("services-other-ads-board", "reklam-panolari", "Reklam Panoları", "megaphone", { parentId: "services-other-ads" }),
              node("services-other-ads-filmout", "renk-ayrimi-film-cikisi", "Renk Ayrımı & Film Çıkışı", "camera", { parentId: "services-other-ads" }),
              node("services-other-ads-sign", "tabela-yapim-tasarim", "Tabela Yapım & Tasarım", "store", { parentId: "services-other-ads" }),
              node("services-other-ads-video", "tanitim-filmleri-produksiyon", "Tanıtım Filmleri & Prodüksiyon", "camera", { parentId: "services-other-ads" }),
              node("services-other-ads-local", "yerel-yayinlar", "Yerel Yayınlar", "tv", { parentId: "services-other-ads" }),
            ],
          }),
          node("services-other-travel", "seyahat-turizm", "Seyahat & Turizm", "palmtree", {
            parentId: "services-other",
            children: [
              node("services-other-travel-agency", "seyahat-acentasi", "Seyahat Acentası", "palmtree", { parentId: "services-other-travel" }),
              node("services-other-travel-tour", "turistik-tur", "Turistik Tur", "palmtree", { parentId: "services-other-travel" }),
            ],
          }),
          node("services-other-insurance", "sigorta-acenteligi", "Sigorta Acenteliği", "shield", {
            parentId: "services-other",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=900&q=80",
            children: [
              node("services-other-insurance-fin", "sigorta-finans-acenteligi", "Sigorta & Finans Acenteliği", "shield", { parentId: "services-other-insurance" }),
            ],
          }),
          node("services-other-drive", "surucu-kurslari", "Sürücü Kursları", "car", {
            parentId: "services-other",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=900&q=80",
            children: [
              node("services-other-drive-lesson", "direksiyon-dersi", "Direksiyon Dersi", "car", { parentId: "services-other-drive" }),
              node("services-other-drive-disabled", "engelli-ehliyet", "Engelli Ehliyet", "car", { parentId: "services-other-drive" }),
              node("services-other-drive-adv", "ileri-surus-teknikleri", "İleri Sürüş Teknikleri", "car", { parentId: "services-other-drive" }),
              node("services-other-drive-moto", "motosiklet-ehliyeti", "Motosiklet Ehliyeti", "bike", { parentId: "services-other-drive" }),
              node("services-other-drive-bus", "otobus-ehliyeti", "Otobüs Ehliyeti", "van", { parentId: "services-other-drive" }),
              node("services-other-drive-car", "otomobil-ehliyeti", "Otomobil Ehliyeti", "car", { parentId: "services-other-drive" }),
              node("services-other-drive-truck", "tir-cekici-ehliyet", "Tır Çekici Ehliyet", "truck", { parentId: "services-other-drive" }),
            ],
          }),
          node("services-other-subcon", "taseron-hizmetleri", "Taşeron Hizmetleri", "users", {
            parentId: "services-other",
            children: [
              node("services-other-subcon-sec", "guvenlik-personeli-taseronluk", "Güvenlik Personeli Taşeronluk", "shield", { parentId: "services-other-subcon" }),
              node("services-other-subcon-staff", "personel-taseronluk-firmalari", "Personel Taşeronluk Firmaları", "users", { parentId: "services-other-subcon" }),
              node("services-other-subcon-tech", "teknik-taseronluk-firmalari", "Teknik Taşeronluk Firmaları", "wrench", { parentId: "services-other-subcon" }),
            ],
          }),
          node("services-other-translate", "tercume", "Tercüme", "languages", {
            parentId: "services-other",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1456513080867-f41d7dfe9141?auto=format&fit=crop&w=900&q=80",
            children: [
              node("services-other-translate-notary", "noter-tasdikli-tercume", "Noter Tasdikli Tercüme", "scale", { parentId: "services-other-translate" }),
              node("services-other-translate-sim", "simultane-ceviri", "Simültane Çeviri", "headphones", { parentId: "services-other-translate" }),
              node("services-other-translate-tech", "teknik-ceviri", "Teknik Çeviri", "cog", { parentId: "services-other-translate" }),
              node("services-other-translate-write", "yazili-ceviri", "Yazılı Çeviri", "book", { parentId: "services-other-translate" }),
              node("services-other-translate-sworn", "yeminli-tercume", "Yeminli Tercüme", "scale", { parentId: "services-other-translate" }),
            ],
          }),
          node("services-other-it", "yazilim-bilgi-islem", "Yazılım Bilgi İşlem", "cpu", {
            parentId: "services-other",
            hubFeatured: true,
            cover: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=900&q=80",
            children: [
              node("services-other-it-net", "ag-baglantisi", "Ağ Bağlantısı", "cpu", { parentId: "services-other-it" }),
              node("services-other-it-repair", "bilgisayar-teknik-servisi-hizmet", "Bilgisayar Teknik Servisi", "laptop", { parentId: "services-other-it" }),
              node("services-other-it-isp", "internet-baglantisi", "İnternet Bağlantısı", "cpu", { parentId: "services-other-it" }),
              node("services-other-it-cable", "kablolama", "Kablolama", "plug", { parentId: "services-other-it" }),
              node("services-other-it-app", "mobil-uygulamalar", "Mobil Uygulamalar", "smartphone", { parentId: "services-other-it" }),
              node("services-other-it-sec", "network-guvenlik", "Network Güvenlik", "shield", { parentId: "services-other-it" }),
              node("services-other-it-server", "sunucu", "Sunucu", "cpu", { parentId: "services-other-it" }),
              node("services-other-it-recover", "veri-kurtarma", "Veri Kurtarma", "archive", { parentId: "services-other-it" }),
              node("services-other-it-backup", "veri-yedekleme-hizmetleri", "Veri Yedekleme Hizmetleri", "archive", { parentId: "services-other-it" }),
              node("services-other-it-web", "web-sitesi-tasarimi", "Web Sitesi Tasarımı", "monitor", { parentId: "services-other-it" }),
              node("services-other-it-soft", "yazilim-ve-uygulamalar", "Yazılım Ve Uygulamalar", "cpu", { parentId: "services-other-it" }),
            ],
          }),
        ],
      }),
    ],
  }),
  node("tutors", "ozel-ders", "Özel Ders Verenler", "book", {
    seeAll: true,
    children: [
      node("tutors-uni", "lise-universite", "Lise & Üniversite", "graduation", { parentId: "tutors" }),
      node("tutors-school", "ilkokul-ortaokul", "İlkokul & Ortaokul", "book", { parentId: "tutors" }),
      node("tutors-lang", "yabanci-dil", "Yabancı Dil", "languages", { parentId: "tutors" }),
    ],
  }),
  node("jobs", "is-ilanlari", "İş İlanları", "briefcase", {
    seeAll: true,
    children: [
      node("jobs-law", "avukatlik", "Hukuki", "scale", { parentId: "jobs", aliases: ["hukuki"] }),
      node("jobs-edu", "egitim-is", "Eğitim", "book", { parentId: "jobs" }),
      node("jobs-fun", "eglence-aktivite", "Eğlence & Aktivite", "ticket", { parentId: "jobs" }),
      node("jobs-beauty", "guzellik-bakim-is", "Güzellik & Bakım", "sparkles", {
        parentId: "jobs",
        aliases: ["guzellik-bakim"],
        children: [
          node("jobs-beauty-women-hair", "kadin-kuaforu", "Kadın Kuaförü", "scissors", { parentId: "jobs-beauty" }),
          node("jobs-beauty-men-hair", "erkek-kuaforu", "Erkek Kuaförü", "scissors", { parentId: "jobs-beauty" }),
          node("jobs-beauty-specialist", "guzellik-uzmani", "Güzellik Uzmanı", "sparkles", { parentId: "jobs-beauty" }),
          node("jobs-beauty-makeup", "makyoz", "Makyöz", "sparkles", { parentId: "jobs-beauty" }),
          node("jobs-beauty-tattoo", "dovmeci", "Dövmeci", "sparkles", { parentId: "jobs-beauty" }),
          node("jobs-beauty-pm", "kalici-makyaj-uzmani", "Kalıcı Makyaj Uzmanı", "sparkles", { parentId: "jobs-beauty" }),
          node("jobs-beauty-lash", "kas-kirpik-uzmani", "Kaş & Kirpik Uzmanı", "sparkles", { parentId: "jobs-beauty" }),
          node("jobs-beauty-nail", "manikur-pedikur-uzmani", "Manikür & Pedikür Uzmanı", "scissors", { parentId: "jobs-beauty" }),
          node("jobs-beauty-massage", "masor-masoz", "Masör & Masöz", "heart", { parentId: "jobs-beauty" }),
          node("jobs-beauty-pet", "kedi-kopek-kuaforu", "Kedi & Köpek Kuaförü", "paw", { parentId: "jobs-beauty" }),
        ],
      }),
      node("jobs-it", "it-yazilim", "IT & Yazılım Geliştirme", "cpu", { parentId: "jobs" }),
      node("jobs-hr", "insan-kaynaklari-is", "İK", "users", { parentId: "jobs", aliases: ["ik", "insan-kaynaklari"] }),
      node("jobs-sales", "satis-pazarlama", "Satış & Pazarlama", "store", { parentId: "jobs" }),
      node("jobs-finance", "muhasebe-finans", "Muhasebe & Finans", "briefcase", { parentId: "jobs" }),
      node("jobs-health", "saglik-is", "Sağlık", "heart", { parentId: "jobs" }),
      node("jobs-log", "lojistik-is", "Lojistik & Depo", "truck", { parentId: "jobs" }),
      node("jobs-sec", "guvenlik-is", "Güvenlik", "shield", { parentId: "jobs" }),
      node("jobs-tourism", "turizm-otel", "Turizm & Otel", "palmtree", { parentId: "jobs" }),
      node("jobs-build", "insaat-is", "İnşaat", "hammer", { parentId: "jobs" }),
      node("jobs-prod", "uretim-is", "Üretim & Fabrika", "factory", { parentId: "jobs" }),
      node("jobs-store", "magaza-perakende", "Mağaza & Perakende", "bag", { parentId: "jobs" }),
    ],
  }),
  node("pets", "hayvanlar-alemi", "Hayvanlar Alemi", "paw", {
    seeAll: true,
    children: [
      node("pets-farm", "ciftlik-hayvanlari", "Çiftlik Hayvanları", "paw", {
        parentId: "pets",
        browse: true,
        children: [
          node("pets-farm-cattle", "buyukbas-hayvan", "Büyükbaş", "paw", { parentId: "pets-farm" }),
          node("pets-farm-sheep", "kucukbas-hayvan", "Küçükbaş", "paw", { parentId: "pets-farm" }),
          node("pets-farm-poultry", "kumes-hayvani", "Kümes Hayvanları", "paw", { parentId: "pets-farm" }),
        ],
      }),
      node("pets-food", "yem-mama", "Yem & Mama", "utensils", {
        parentId: "pets",
        browse: true,
        children: [
          node("pets-food-cat", "kedi-mamasi", "Kedi", "paw", { parentId: "pets-food" }),
          node("pets-food-dog", "kopek-mamasi", "Köpek", "paw", { parentId: "pets-food" }),
          node("pets-food-bird", "kus-yemi", "Kuş", "paw", { parentId: "pets-food" }),
          node("pets-food-fish", "balik-yemi", "Balık", "fish", { parentId: "pets-food" }),
        ],
      }),
      node("pets-cage", "kafes-kulube", "Kafes & Kulübe", "home", {
        parentId: "pets",
        browse: true,
        children: [
          node("pets-cage-cat", "kedi-evi", "Kedi", "home", { parentId: "pets-cage" }),
          node("pets-cage-dog", "kopek-kulube", "Köpek", "home", { parentId: "pets-cage" }),
          node("pets-cage-bird", "kus-kafesi", "Kuş", "home", { parentId: "pets-cage" }),
        ],
      }),
      node("pets-leash", "tasma-gezdirme", "Tasma & Gezdirme", "bone", { parentId: "pets" }),
      node("pets-tank", "akvaryum-ekipman", "Akvaryum & Ekipman", "fish", { parentId: "pets" }),
      node("pets-care", "bakim-hijyen", "Bakım & Hijyen", "sparkles", { parentId: "pets" }),
      node("pets-acc", "hayvan-aksesuar", "Aksesuar & Ekipman", "bone", { parentId: "pets" }),
    ],
  }),
  node("helpers", "yardimci-arayanlar", "Yardımcı Arayanlar", "heart-handshake", {
    children: [
      node("helpers-child", "bebek-cocuk-bakicisi", "Bebek & Çocuk Bakıcısı", "baby", {
        parentId: "helpers",
      }),
      node("helpers-elder", "yasli-hasta-bakicisi", "Yaşlı & Hasta Bakıcısı", "heart", {
        parentId: "helpers",
      }),
      node("helpers-clean", "temizlikci", "Temizlikçi & Ev İşlerine Yardımcı", "sparkles", {
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

