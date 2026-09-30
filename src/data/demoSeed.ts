import type { Category } from "@/data/categories";
import { categories, walkCategories } from "@/data/categories";
import { isBannedLiveAnimalCategory } from "@/lib/liveAnimalPolicy";
import type { Listing } from "@/data/store";
import { TUTOR_PLACES, tutorLevelsFor, tutorSubjectsFor } from "@/data/tutorOptions";
import {
  AUTO_PART_PRODUCTS,
  BATHS,
  BUILDING_AGES,
  brandNamesForSegment,
  DEED_STATUS,
  FLOOR_COUNTS,
  FURNISHED_YN,
  HEATING,
  JOB_EDUCATION,
  JOB_EXPERIENCE_LEVELS,
  JOB_WORK_MODES,
  LISTING_FROM,
  HELMET_BRANDS,
  HELMET_FEATURES,
  HELMET_TYPES,
  MOTO_BOOT_SIZES,
  MOTO_GEAR_BRANDS,
  MOTO_JACKET_FEATURES,
  CLASSIFIED_SHOP_OPTS,
  SWAP_YN,
  PART_BRANDS,
  PART_FROM,
  SEA_EQUIP_BRANDS,
  SEA_EQUIP_FEATURES,
  seaEquipProductsFor,
  seaEquipGroupById,
  ROOMS,
  USAGE_STATUS,
  USED_PART,
} from "@/data/listingOptions";
import { motoGearProductFromId, partsVehicleTypeFromId } from "@/data/listingSchema";
import { isSeaEquipCategoryId } from "@/data/seaEquip";
import { mahalleFor } from "@/data/regionProfiles";

export const DEMO_PER_CATEGORY = 23;

const U = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=80`;

const PHOTOS = {
  car: [
    U("photo-1555215695-3004980ad54e"),
    U("photo-1494976388531-d1058494cdd8"),
    U("photo-1503376780353-7e6692767b70"),
    U("photo-1549317661-bd32c8ce0db2"),
    U("photo-1542362567-b07e54358753"),
  ],
  suv: [
    U("photo-1519641471654-76ce0107ad1b"),
    U("photo-1533473359331-0135ef1b58bf"),
    U("photo-1544636331-e26879cd4d9b"),
    U("photo-1511919884226-fd3cad34687c"),
  ],
  moto: [
    U("photo-1558981852-426c6c22a060"),
    U("photo-1568772585407-9361f9bf3a87"),
  ],
  helmet: [
    U("photo-1558981852-426c6c22a060"),
    U("photo-1568772585407-9361f9bf3a87"),
    U("photo-1591637333184-19aa32be3f4f"),
    U("photo-1558618666-fcd25c85cd64"),
    U("photo-1486262715619-67b85e0b08d3"),
    U("photo-1503376780353-7e6692767b70"),
    U("photo-1571068316344-75bc76f77890"),
  ],
  boat: [
    U("photo-1507525428034-b723cf961d3e"),
    U("photo-1544551763-46a013bb70d5"),
  ],
  seaEquip: [
    U("photo-1544551763-46a013bb70d5"),
    U("photo-1567899378494-47b22a2ae96a"),
    U("photo-1500375592092-40eb2168fd21"),
    U("photo-1473186578142-bd0d5e4b0b6d"),
    U("photo-1439066615861-d1af74d74000"),
    U("photo-1500375592092-40eb2168fd21"),
    U("photo-1483683804023-6ccdb62f86ef"),
  ],
  home: [
    U("photo-1502672260266-1c1ef2d93688"),
    U("photo-1560448204-e02f11c3d0e2"),
    U("photo-1600596542815-ffad4c1539a9"),
    U("photo-1512917774080-9991f1c4c750"),
    U("photo-1570129477492-45c003edd2be"),
    U("photo-1564013799919-ab600027ffc6"),
    U("photo-1600607687939-ce8a6c25118c"),
  ],
  land: [
    U("photo-1500382017468-9049fed747ef"),
    U("photo-1464226184884-fa280b87c399"),
    U("photo-1625246333195-78d9c38ad449"),
  ],
  office: [
    U("photo-1497366216548-37526070297c"),
    U("photo-1524758631624-e2822e304c36"),
    U("photo-1497215728101-856f4ea42174"),
  ],
  phone: [
    U("photo-1695048133142-1a20484d2569"),
    U("photo-1511707171634-5f897ff02aa9"),
    U("photo-1592899677977-9c10ca588bbd"),
  ],
  laptop: [
    U("photo-1517336714731-489689fd1ca8"),
    U("photo-1496181133206-80ce9b88a853"),
    U("photo-1518770660439-4636190af475"),
    U("photo-1498050108023-c5249f4df085"),
  ],
  camera: [
    U("photo-1516035069371-29a1b244cc32"),
    U("photo-1502920917128-1aa500764cbd"),
  ],
  sofa: [
    U("photo-1555041469-a586c61ea9bc"),
    U("photo-1493663284031-b7e3aefcae8e"),
    U("photo-1556228453-efd6c1ff04f6"),
  ],
  fashion: [
    U("photo-1483985988355-763728e1935b"),
    U("photo-1445205170230-053b83016050"),
    U("photo-1490481651871-ab68de25d43d"),
  ],
  watch: [
    U("photo-1523275335684-37898b6baf30"),
    U("photo-1524592094714-0f0654e20314"),
    U("photo-1522312346375-d1a52e2b99b3"),
  ],
  sport: [
    U("photo-1517836357463-d25dfeac3438"),
    U("photo-1571019614242-c5c5dee9f50b"),
  ],
  parts: [
    U("photo-1486262715619-67b85e0b08d3"),
    U("photo-1487754180451-c456f719a1fc"),
    U("photo-1492144534655-ae79c964c9d7"),
    U("photo-1489824904134-891ab64532f1"),
    U("photo-1503376780353-7e6692767b70"),
    U("photo-1552519507-da3b142c6e3d"),
    U("photo-1542362567-b07e54358753"),
  ],
  machine: [
    U("photo-1504917595217-d4dc5ebe6122"),
    U("photo-1581091226825-a6a2a5aee158"),
    U("photo-1581092918056-0c4c3acd3789"),
  ],
  job: [
    U("photo-1521737604893-d14cc237f11d"),
    U("photo-1454165804606-c3d57bc86b40"),
    U("photo-1522071820081-009f0129c71c"),
  ],
  service: [
    U("photo-1581578731548-c64695cc6952"),
    U("photo-1504148455328-c376907d081c"),
    U("photo-1621905251189-08b45d6a269e"),
  ],
  event: [
    U("photo-1519225421980-715cb0215aed"),
    U("photo-1516035069371-29a1b244cc32"),
    U("photo-1470229722913-7c0e2dbbafd3"),
    U("photo-1530103862676-de8c9debad84"),
    U("photo-1555244162-803834f70033"),
    U("photo-1547153760-18fc86324498"),
  ],
  truck: [
    U("photo-1600518464441-9154a4dea21b"),
    U("photo-1601584115197-04ecc1def5a0"),
    U("photo-1586528116311-ad8dd3c8310d"),
    U("photo-1619642751034-765dfdf7c58e"),
  ],
  pet: [
    U("photo-1589923188900-85dae523342b"),
    U("photo-1556228720-195a672e8a03"),
    U("photo-1600880292203-757bb62b4baf"),
  ],
  book: [
    U("photo-1512820790803-83ca734da794"),
    U("photo-1495446815901-a7297e633e8d"),
  ],
  food: [
    U("photo-1540189549336-e6e99c3679fe"),
    U("photo-1504674900247-0877df9cc836"),
  ],
  jewel: [
    U("photo-1515562141207-7a88fb7ce338"),
    U("photo-1599643478518-a784e5dc4c8f"),
  ],
  default: [
    U("photo-1441986300917-64674bd600d8"),
    U("photo-1472851294608-062f824d29cc"),
    U("photo-1556740749-887f6717d7e4"),
  ],
};

const PLACES: [string, string][] = [
  ["İstanbul", "Kadıköy"],
  ["İstanbul", "Beşiktaş"],
  ["İstanbul", "Şişli"],
  ["Ankara", "Çankaya"],
  ["Ankara", "Keçiören"],
  ["İzmir", "Konak"],
  ["İzmir", "Karşıyaka"],
  ["Bursa", "Nilüfer"],
  ["Antalya", "Muratpaşa"],
  ["Adana", "Seyhan"],
  ["Konya", "Selçuklu"],
  ["Gaziantep", "Şehitkamil"],
  ["Kayseri", "Melikgazi"],
  ["Mersin", "Yenişehir"],
  ["Eskişehir", "Tepebaşı"],
  ["Samsun", "Atakum"],
  ["Trabzon", "Ortahisar"],
  ["Diyarbakır", "Bağlar"],
  ["Kocaeli", "İzmit"],
  ["Muğla", "Bodrum"],
  ["Aydın", "Kuşadası"],
  ["Balıkesir", "Edremit"],
  ["Tekirdağ", "Çorlu"],
];

const SELLERS = [
  {
    id: "u-selim",
    name: "Selim Demir",
    avatar: U("photo-1507003211169-0a1dd7228f2d").replace("w=1200", "w=200"),
    verified: true,
  },
  {
    id: "u-ayse",
    name: "Ayşe Koç",
    avatar: U("photo-1544005313-94ddf0286df2").replace("w=1200", "w=200"),
    verified: true,
  },
  {
    id: "u-burak",
    name: "Burak Çelik",
    avatar: U("photo-1500648767791-00dcc994a43e").replace("w=1200", "w=200"),
    verified: false,
  },
  {
    id: "u-ahmet",
    name: "Ahmet Yılmaz",
    avatar: U("photo-1506794778202-cad84cf45f1d").replace("w=1200", "w=200"),
    verified: true,
  },
  {
    id: "u-merve",
    name: "Merve Kaya",
    avatar: U("photo-1534528741775-53994a69daeb").replace("w=1200", "w=200"),
    verified: true,
  },
  {
    id: "u-fatma",
    name: "Fatma Şahin",
    avatar: U("photo-1438761681033-6461ffad8d80").replace("w=1200", "w=200"),
    verified: false,
  },
  {
    id: "u-demo-1",
    name: "Caner Aydın",
    avatar: U("photo-1472099645785-5658abf4ff4e").replace("w=1200", "w=200"),
    verified: true,
  },
  {
    id: "u-demo-2",
    name: "Elif Aksoy",
    avatar: U("photo-1487412720507-e7ab37603c6f").replace("w=1200", "w=200"),
    verified: true,
  },
];

function photosFor(id: string): string[] {
  if (id.startsWith("services-move")) return PHOTOS.truck;
  if (id.startsWith("services-auto")) return PHOTOS.car;
  if (id.startsWith("services-repair")) return PHOTOS.service;
  if (id.startsWith("services-event-photo")) return PHOTOS.camera;
  if (id.startsWith("services-event-catering")) return PHOTOS.food;
  if (id.startsWith("services-event")) return PHOTOS.event;
  if (id.startsWith("services-other-preschool")) return PHOTOS.job;
  if (id.startsWith("services-other-print") || id.startsWith("services-other-ads")) return PHOTOS.book;
  if (id.startsWith("services-other-it")) return PHOTOS.laptop;
  if (id.startsWith("services-other-drive")) return PHOTOS.car;
  if (id.startsWith("services-other-pet")) return PHOTOS.pet;
  if (id.startsWith("services-other")) return PHOTOS.job;
  if (id.includes("gear-helmet") || id.includes("moto-kask")) return PHOTOS.helmet;
  if (id.startsWith("parts-moto-gear")) return PHOTOS.fashion;
  if (id.startsWith("vasita-moto") || id.includes("moto") || id.startsWith("vasita-atv") || id.startsWith("vasita-utv")) return PHOTOS.moto;
  if (id.startsWith("vasita-suv")) return PHOTOS.suv;
  if (id.startsWith("vasita-deniz")) return PHOTOS.boat;
  if (id.startsWith("parts-sea")) return PHOTOS.seaEquip;
  if (id.startsWith("vasita") || id === "auto") return PHOTOS.car;
  if (id.startsWith("emlak-arsa") || id.includes("tarla")) return PHOTOS.land;
  if (id.startsWith("emlak-isyeri") || id.includes("ofis")) return PHOTOS.office;
  if (id.startsWith("emlak")) return PHOTOS.home;
  if (id.includes("phone") || id === "phones") return PHOTOS.phone;
  if (id.includes("computer") || id.includes("laptop") || id.includes("gamer")) return PHOTOS.laptop;
  if (id.includes("camera") || id.includes("fotograf")) return PHOTOS.camera;
  if (id.includes("decor") || id.includes("mobilya")) return PHOTOS.sofa;
  if (id.includes("fashion") || id.includes("giyim") || id.includes("ayakkabi")) return PHOTOS.fashion;
  if (id.includes("watch") || id.includes("saat")) return PHOTOS.watch;
  if (id.includes("sport") || id.includes("spor")) return PHOTOS.sport;
  if (id.startsWith("parts")) return PHOTOS.parts;
  if (id.startsWith("machines")) return PHOTOS.machine;
  if (id.startsWith("jobs") || id.startsWith("tutors") || id.startsWith("helpers")) return PHOTOS.job;
  if (id.startsWith("services")) return PHOTOS.service;
  if (id.startsWith("pets")) return PHOTOS.pet;
  if (id.includes("book") || id.includes("kitap")) return PHOTOS.book;
  if (id.includes("food") || id.includes("yiyecek")) return PHOTOS.food;
  if (id.includes("jewel") || id.includes("taki")) return PHOTOS.jewel;
  return PHOTOS.default;
}

function priceFor(id: string, i: number) {
  const bump = (i % 9) * 1_250;
  if (id.startsWith("emlak-arsa")) return 2_150_000 + i * 95_000;
  if (id.startsWith("emlak")) return 1_850_000 + i * 78_000;
  if (id.startsWith("vasita-moto")) return 185_000 + i * 12_500;
  if (id.startsWith("vasita")) return 620_000 + i * 41_000;
  if (id.startsWith("machines")) return 410_000 + i * 22_000;
  if (id.startsWith("jobs") || id.startsWith("helpers") || id.startsWith("tutors") || id.startsWith("services")) {
    return 22_000 + i * 1_750;
  }
  if (id.includes("phone")) return 18_500 + i * 1_150 + bump;
  if (id.includes("computer")) return 24_900 + i * 1_400;
  if (id.startsWith("parts")) return 2_450 + i * 380;
  if (id.startsWith("pets")) return 350 + i * 85;
  return 4_750 + i * 620 + bump;
}

const MOVE_FIRMS = [
  "Yılmaz Evden Eve Nakliyat",
  "Ankara Özişmek Nakliyat",
  "Anarlar Evden Eve Nakliyat",
  "Damla Nakliyat A.Ş",
  "Evden Eve Süleyman Nakliyat",
  "Şimşekoğlu Evden Eve Nakliyat",
  "Sincap Nakliyat Ltd. Şti. Aş",
  "Merkez Evden Eve Nakliyat",
  "İrkin Nakliyat",
  "Süvarikurye",
  "Bişey Kurye",
  "Güldür Nakliyat",
  "Ulaş Taşımacılık",
  "Ankara Kurye",
  "Time Kurye",
  "AlPaşa Nakliyat",
  "Aydoğan Evden Eve Nakliyat",
  "Sartaş Nakliyat",
  "Global Evden Eve Nakliyat",
];

const AUTO_FIRMS = [
  "Vip Oto Paspas",
  "Mert Oto Döşeme",
  "Konfor Oto Döşeme",
  "Beylikdüzü Oto Çekici Yol Yardım",
  "Öztürk Oto Kurtarma",
  "Kurtargo",
  "Jet Oto Kurtarma",
  "Burda Çekici Murat Teker",
  "Otorapor Pendik Güzelyalı",
  "Corlu Pilot Garage Oto Ekspertiz",
  "Antalya Computest Oto Ekspertiz",
  "Ars Boyasız Göçük Düzeltme",
  "Akbulut Otomotiv",
  "Güder Auto Kaporta",
  "İstanbul Rotbalans Lastik",
  "Lastikgelsin",
  "Volkan Rot Balans",
  "Ayhan Usta Oto Deri Döşeme",
  "Swat Garage",
  "Auto Clinic",
  "Ataköylüm Oto Kuaför",
  "Garantili Arabam Oto Ekspertiz",
];

const REPAIR_FIRMS = [
  "Morgül Teknik Beyaz Eşya Servisi",
  "Küç Teknik Servis Kombi Servis",
  "İstanbul Servis",
  "Beyaz Eşya Servis - Elit Servis",
  "Küçükçekmece Tv Tamircisi",
  "Artuklu Soft",
  "Alan Bilgisayar Kazandıran Tekni",
  "Cepuzman",
  "Cepmoda Teknik Servis",
  "Global Bilişim",
  "Acar Mimarlık",
  "Doğan Oluk-Alum Tadilat",
  "Çakır Elektrik",
  "Eroğlu Elektrik",
  "Uzmanelektrik.Net",
  "Coşkun Su Tesisat",
  "Mert Tesisat",
  "Boğaziçi Tesisat",
  "Selçuklu İklimlendirme Teknik",
  "Sunaz Kombi Klima",
  "Buru Klima",
  "Acil Klima Servis",
];

const EVENT_FIRMS = [
  "Studyo Drone",
  "Fors Sahne",
  "Pro Ses Antif Mikrofon Hoparlör",
  "Cadde Tv Mobil Sahne Dev Ekran",
  "Media City",
  "Kraft Müzik Aletleri",
  "Piasound Ses ve Işık",
  "Bukaremor Studio",
  "Aynura Aliyeva Academy",
  "Dans Kampüsü",
  "KadrAj Ajans",
  "Echo Organizasyon",
  "Aytaç Organizasyon",
  "Atılım Dans Müzik Organizasyon",
  "Sahra Sultan Düğün Sarayı",
  "Erhan Kaya Kuafor",
  "Hasbahçe Düğün-Davet Organizyon",
  "Evlenme Teklifleri 34",
  "Mersin Kına Organizasyon",
  "Kıyak Organizasyon-Mekan Süsleme",
  "Film Rulosu",
  "Artı90 Stüdyo",
  "Şark Fotoğrafçılık",
  "Düğün Çatısı",
  "Lodos Fotoğrafçılık",
  "Berkant Sezer Tanıtım Hiz.",
  "Foto Kemal",
  "Grup Tuana Olcay Müzik",
  "Aydın Müzik Evi",
  "Windband Orkestrası",
  "Dj Cemil Aysema Müzik Hizmetleri",
  "Karadağ Müzik",
  "Kids Point Parti Evi",
  "Bulut Parti",
  "İstanbul Balon Evi",
  "Gülen Yüz Organizasyon Parti Evi",
  "Rüzgarın Evi",
  "Chippolino Oyun ve Parti Evi",
  "Kidspo Parti Evi",
  "Öz-Aş Catering",
  "Odak Yemek Hizmetleri",
  "Yıldız Şofbası",
  "Yadem Yemek Catering",
  "Sweetros Cake Bakery",
  "Annenin Mutfağı",
];

const OTHER_FIRMS = [
  "Tatlı Çocuklar Anaokulu",
  "Özel Kaptan Çocuk Akademisi",
  "Özel Minikuzum Çocuk Yuva",
  "Feyza Çiçek Anaokulları",
  "Uluslararası Montessori Anaokulu",
  "Özel Meltem Kreş ve Çocuk Kulübü",
  "İncik Anaokulu",
  "Tılkı Kitap Yayınevi",
  "Şehin 3D Tasarım 3D Baskı",
  "Dijital Bilgi Baskı",
  "Karaca Design",
  "Testudo Labs",
  "Kartuş-Cu",
  "Max Profesyonel Site Yönetimi",
  "Komet Kariyer",
  "Nilpro Profesyonel Site Yönetimi",
  "Özgüdanışmanları",
  "Csr Profesyonel Koçluk",
  "Çözoğlu Mimarlık ve Mühendislik",
  "Ank Danışmanlık Yurtdışı Vize",
  "Wn Internet Hizmetleri",
  "Kaleağzı Elektrik-Mühendislik",
  "Pasart Design",
  "Fer Danışmanlık",
  "Özşahinler Sigorta",
  "Akın Grup Sigorta Acenteliği",
  "Çankaya Araç Sigortası - Kapen",
  "Capital Sigorta",
  "Acık Yatırım Danışmanlık",
  "100.Yıl Sigorta Hizmetleri",
  "Destek 724 Sigorta",
  "Dinamik Sigorta Ltd. Şti.",
  "Reverans Sigorta",
  "Logo Tasarlat",
  "Yazıcıo Firm",
  "Mersin Deniz Reklam",
  "Adap Lazer",
  "Mutu Medya",
  "11evenads",
  "Elka Bayrak",
  "Mislina Promosyon",
  "Sarıdoray Reklam",
  "Fidanes Model Maket",
  "Yiğenoğlu Sürücü Kursu Gökgören",
  "Direm Direksiyon Eğitim Merkezi",
  "İstanbul Ray Sürücü ve Psikoteknik",
  "Özel Hür-Şen Sürücü Kursu",
  "Dünya Sürücü Kursu Kayseri",
  "Florya Sürücü Kursu",
  "Demir Direksiyon Eğitim Merkezi",
  "İşin Sürücü Kursu",
  "E Tercüme Bürosu Limited Şirketi",
  "Lisan Tercüme",
  "Elvior Global Ltd",
  "Toza Tercüme",
  "Uludağ Tercüme",
  "Prasis Tercüme",
  "Gümüş Danışmanlık ve Tercüme",
  "Artuklu Soft",
  "Web Tasarım ve Logo Tasarım",
  "G-Soft Eticaret Sistemleri",
  "Mc Mib",
  "Crea Bilgi Teknolojileri",
  "Clove Yazılım ve Ticaret",
  "Garasoft Bilişim Teknolojileri",
  "Alak Bilgisayar Kazandıran Tekni",
];

function titleFor(cat: Category, i: number) {
  const n = cat.name;
  if (cat.id.startsWith("tutors")) {
    const subjects = tutorSubjectsFor(cat.id);
    const levels = tutorLevelsFor(cat.id);
    const subject = subjects[i % subjects.length];
    const level = levels[i % levels.length];
    return `${subject} özel ders · ${level}`;
  }
  if (cat.id.startsWith("jobs-beauty")) {
    return `${cat.name} aranıyor · ${i + 1}`;
  }
  if (cat.id.startsWith("services-reno")) {
    return `${cat.name} hizmeti · ${i + 1}`;
  }
  if (cat.id.startsWith("services-move")) {
    return `${MOVE_FIRMS[(hash(cat.id) + i) % MOVE_FIRMS.length]}`;
  }
  if (cat.id.startsWith("services-auto")) {
    return `${AUTO_FIRMS[(hash(cat.id) + i) % AUTO_FIRMS.length]}`;
  }
  if (cat.id.startsWith("services-repair")) {
    return `${REPAIR_FIRMS[(hash(cat.id) + i) % REPAIR_FIRMS.length]}`;
  }
  if (cat.id.startsWith("services-event")) {
    return `${EVENT_FIRMS[(hash(cat.id) + i) % EVENT_FIRMS.length]}`;
  }
  if (cat.id.startsWith("services-other")) {
    return `${OTHER_FIRMS[(hash(cat.id) + i) % OTHER_FIRMS.length]}`;
  }
  if (cat.id.startsWith("parts-sea")) {
    const group = seaEquipGroupById(cat.id);
    const products = seaEquipProductsFor(cat.id);
    const product = products[i % Math.max(1, products.length)] ?? group?.name ?? cat.name;
    const brand = SEA_EQUIP_BRANDS[i % SEA_EQUIP_BRANDS.length];
    return `${brand} ${product}${i % 4 === 0 ? " CE Belgeli" : ""}`;
  }
  if (cat.id.startsWith("parts-auto-spare")) {
    const product = AUTO_PART_PRODUCTS[i % AUTO_PART_PRODUCTS.length];
    const brands = brandNamesForSegment("auto");
    const brand = brands[i % brands.length];
    return `${brand} ${product} ${i % 2 === 0 ? "Sıfır" : "Çıkma"}`;
  }
  if (cat.id.startsWith("parts-moto-gear-helmet") || cat.id.includes("moto-kask")) {
    return `${HELMET_BRANDS[i % HELMET_BRANDS.length]} ${["X-SPR Pro Marc Marquez Edition", "GT-Air II", "K6 S", "RPHA 12"][i % 4]}`;
  }
  if (cat.id.startsWith("parts-moto-gear")) {
    const product = motoGearProductFromId(cat.id) ?? cat.name;
    return `${MOTO_GEAR_BRANDS[i % MOTO_GEAR_BRANDS.length]} ${product}`;
  }
  if (cat.id.startsWith("pets-food") || cat.id === "pets") {
    return [`Premium kedi maması 15 kg`, `Yavru köpek yemi 8 kg`, `Kuru mama ve mama kabı seti`][i % 3] + ` · ${i + 1}`;
  }
  if (cat.id.startsWith("pets-cage")) return `Metal kafes & kulübe takımı · ${i + 1}`;
  if (cat.id.startsWith("pets-leash")) return `Tasma ve gezdirme kayışı seti · ${i + 1}`;
  if (cat.id.startsWith("pets-tank")) return `Akvaryum filtre ve ısıtıcı ekipmanı · ${i + 1}`;
  if (cat.id.startsWith("pets-care")) return `Bakım şampuanı ve hijyen seti · ${i + 1}`;
  if (cat.id.startsWith("emlak-konut")) {
    const rooms = ROOMS[i % ROOMS.length];
    return `${rooms} ${cat.name} · ${80 + i * 4} m²`;
  }
  if (cat.id.startsWith("emlak")) {
    return `${cat.name} · ${80 + i * 4} m²`;
  }
  const styles = [
    `Sahibinden ${n}`,
    `${n} — bakımlı, acil`,
    `Az kullanılmış ${n}`,
    `${n} · faturalı`,
    `Temiz ${n}, pazarlıklı`,
    `${n} / hemen teslim`,
    `Güncel ${n} ilanı`,
    `${n} — ikinci el`,
    `Sıfır ayarında ${n}`,
    `${n} fırsat`,
  ];
  return `${styles[i % styles.length]} ${i + 1}`;
}

function subtitleFor(cat: Category, i: number) {
  if (cat.id.startsWith("vasita")) return `${2012 + (i % 12)} · ${(i + 2) * 12_000} km`;
  if (cat.id.startsWith("parts")) return i % 2 ? "Sıfır · fabrikasyon" : "Çıkma yedek · garantili";
  if (cat.id.startsWith("emlak")) return `${(i % 4) + 1}+1 · ${80 + i * 3} m²`;
  if (cat.id.includes("phone")) return `${64 * (2 ** (i % 4))} GB · kutulu`;
  if (cat.id.startsWith("jobs-beauty")) return JOB_WORK_MODES[i % JOB_WORK_MODES.length];
  if (cat.id.startsWith("jobs") || cat.id.startsWith("helpers")) return "Tam zamanlı · sigortalı";
  if (cat.id.startsWith("tutors")) return TUTOR_PLACES[i % TUTOR_PLACES.length];
  return i % 2 ? "İkinci el · temiz" : "Az kullanılmış";
}

function descFor(cat: Category, city: string, district: string, listingId: string) {
  if (cat.id.startsWith("pets")) {
    return `${cat.name} ürünü orijinal ve hijyeniktir. Canlı hayvan satışı yoktur; yalnızca mama, kafes, tasma, akvaryum ekipmanı veya aksesuar. ${city} / ${district} teslim.`;
  }
  if (cat.id.startsWith("services-move")) {
    return `${city} ${district} bölgesinde ${cat.name.toLocaleLowerCase("tr")} hizmeti sunar. Ambalaj, sigorta ve 7/24 operasyon seçenekleriyle kurumsal ve bireysel taşımalarda deneyimli ekip.`;
  }
  if (cat.id.startsWith("services-auto")) {
    return `${city} / ${district} konumunda ${cat.name.toLocaleLowerCase("tr")} hizmeti. Periyodik bakım, 7/24 yol yardım ve uzman ekip seçenekleriyle araç bakımını AlsatPort üzerinden karşılaştırın.`;
  }
  if (cat.id.startsWith("services-repair")) {
    return `${city} / ${district} bölgesinde ${cat.name.toLocaleLowerCase("tr")}. Yetkili servis, yerinde tamir ve 7/24 arıza desteği seçenekleriyle teknik servisleri karşılaştırın.`;
  }
  if (cat.id.startsWith("services-event")) {
    return `${city} / ${district} konumunda ${cat.name.toLocaleLowerCase("tr")} hizmeti. Düğün, nişan, parti ve kurumsal etkinliklerde deneyimli ekip; 7/24 organizasyon desteği seçenekleriyle AlsatPort üzerinden karşılaştırın.`;
  }
  if (cat.id.startsWith("services-other")) {
    return `${city} / ${district} konumunda ${cat.name.toLocaleLowerCase("tr")} hizmeti. Kurumsal ve bireysel müşterilere 7/24 destek seçenekleriyle AlsatPort üzerinden karşılaştırın.`;
  }
  if (cat.id.startsWith("parts-moto")) {
    return `${cat.name} ürünü. ${city} / ${district} teslim, stoktan gönderim. Tanıtım videosu amaçlı 1 kez giyilmiştir.`;
  }
  if (cat.id.startsWith("parts")) {
    return `Model fiyat bilgisi için arayınız.\nStoktan hemen teslim.\nAynı gün kargo.\n${city} / ${district} konumunda yedek parça. Honda kaporta ve mekanik parçalar için uygun.`;
  }
  if (cat.id.startsWith("emlak")) {
    const hood = mahalleFor(city, district, listingId);
    return `${city} / ${district} / ${hood}. ${cat.name} ilanıdır. Oda düzeni, aidat ve site özelliklerini yerinde görün.`;
  }
  return `${cat.name} kategorisinde sahibinden ilandır. Ürün/hizmet açıklaması gerçeğe uygundur, yerinde gösterilir. Konum: ${city} ${district}. Ciddi alıcılar için fiyat değerlendirilir.`;
}

function pick<T>(arr: T[], n: number, offset: number) {
  return Array.from({ length: Math.min(n, Math.max(arr.length, n)) }, (_, i) => arr[(offset + i) % arr.length]!);
}

function estateSpecs(cat: Category, i: number, city: string, district: string, hood: string) {
  const deal = cat.id.includes("gunluk")
    ? "Turistik Günlük Kiralık"
    : cat.id.includes("devren")
      ? "Devren Satılık Konut"
      : cat.id.includes("kiralik")
        ? "Kiralık"
        : "Satılık";
  return [
    { label: "Kategori", value: cat.name },
    { label: "İlan tipi", value: deal },
    { label: "Emlak tipi", value: cat.name },
    { label: "Oda", value: ROOMS[i % ROOMS.length] },
    { label: "m²", value: String(85 + i * 6) },
    { label: "Net m²", value: String(72 + i * 5) },
    { label: "Bina yaşı", value: BUILDING_AGES[i % BUILDING_AGES.length] },
    { label: "Kat sayısı", value: FLOOR_COUNTS[i % FLOOR_COUNTS.length] },
    { label: "Kat", value: String((i % 9) + 1) },
    { label: "Isıtma", value: HEATING[i % HEATING.length] },
    { label: "Banyo", value: BATHS[i % BATHS.length] },
    { label: "Balkon", value: i % 4 === 0 ? "Yok" : "Var" },
    { label: "Asansör", value: i % 3 === 0 ? "Yok" : "Var" },
    { label: "Otopark", value: i % 5 === 0 ? "Yok" : "Kapalı Otopark" },
    { label: "Eşyalı", value: FURNISHED_YN[i % FURNISHED_YN.length] },
    { label: "Kullanım durumu", value: USAGE_STATUS[i % USAGE_STATUS.length] },
    { label: "Site içerisinde", value: i % 2 === 0 ? "Evet" : "Hayır" },
    { label: "Krediye uygun", value: i % 3 === 0 ? "Hayır" : "Evet" },
    { label: "Tapu durumu", value: DEED_STATUS[i % DEED_STATUS.length] },
    { label: "Kimden", value: LISTING_FROM[i % LISTING_FROM.length] },
    { label: "Mahalle", value: hood },
    { label: "Konum", value: `${city} / ${district} / ${hood}` },
  ];
}

function motoSpecs(cat: Category, i: number) {
  const product = motoGearProductFromId(cat.id) ?? (cat.parentId === "parts-moto-gear" ? cat.name : undefined);
  const isHelmet = product === "Kask";
  const isBoots = product === "Ayakkabı & Bot";
  const rows = [
    { label: "Ürün Grubu", value: cat.id.includes("gear") ? "Kask, Kıyafet & Ekipman" : cat.name },
  ];
  if (product) rows.push({ label: "Ürün", value: product });
  if (isHelmet) rows.push({ label: "Türü", value: HELMET_TYPES[i % HELMET_TYPES.length] });
  rows.push({
    label: "Marka",
    value: isHelmet ? HELMET_BRANDS[i % HELMET_BRANDS.length] : MOTO_GEAR_BRANDS[i % MOTO_GEAR_BRANDS.length],
  });
  rows.push({
    label: "Ölçü",
    value: isBoots ? MOTO_BOOT_SIZES[i % MOTO_BOOT_SIZES.length] : ["XS", "S", "M", "L", "XL", "XXL"][i % 6],
  });
  rows.push({ label: "Kimden", value: PART_FROM[i % PART_FROM.length] });
  rows.push({ label: "Takas", value: SWAP_YN[i % SWAP_YN.length] });
  rows.push({ label: "Durumu", value: i % 3 === 0 ? "Sıfır" : "İkinci El" });
  return rows;
}

function seaSpecs(cat: Category, i: number) {
  const products = seaEquipProductsFor(cat.id);
  const product = products[i % Math.max(1, products.length)] ?? cat.name;
  const group = seaEquipGroupById(cat.id);
  return [
    { label: "Ürün Grubu", value: group?.name ?? "Deniz Aracı Ekipmanları" },
    { label: "Ürün", value: product },
    { label: "Marka", value: SEA_EQUIP_BRANDS[i % SEA_EQUIP_BRANDS.length] },
    { label: "Kimden", value: PART_FROM[i % PART_FROM.length] },
    { label: "Takas", value: SWAP_YN[i % SWAP_YN.length] },
    { label: "Durumu", value: i % 3 === 0 ? "Sıfır" : "İkinci El" },
  ];
}

function seaFeatures(i: number) {
  const shop = CLASSIFIED_SHOP_OPTS.filter((_, idx) => (i + idx) % 2 === 0);
  const extras = SEA_EQUIP_FEATURES.filter((_, idx) => (i + idx) % 2 === 0);
  return [...extras, ...shop, ...(i % 5 === 0 ? ["Video"] : [])];
}

function motoFeatures(cat: Category, i: number) {
  const shop = CLASSIFIED_SHOP_OPTS.filter((_, idx) => (i + idx) % 2 === 0);
  const product = motoGearProductFromId(cat.id);
  const extras =
    product === "Kask"
      ? HELMET_FEATURES.filter((_, idx) => idx < 3 || i % 2 === 0)
      : product === "Mont" || product === "Tulum"
        ? MOTO_JACKET_FEATURES.filter((_, idx) => (i + idx) % 2 === 0)
        : [];
  return [...extras, ...shop];
}

function partsSpecs(cat: Category, i: number) {
  const brands = brandNamesForSegment("auto");
  const tipi = partsVehicleTypeFromId(cat.id) || cat.name;
  return [
    { label: "Tipi", value: tipi },
    { label: "Ürün", value: AUTO_PART_PRODUCTS[i % AUTO_PART_PRODUCTS.length] },
    { label: "Araç Markası", value: brands[i % brands.length] },
    { label: "Araç Serisi", value: ["Civic", "Focus", "Golf", "Corolla", "Megane"][i % 5] },
    { label: "Ürün Markası", value: PART_BRANDS[i % PART_BRANDS.length] },
    { label: "Kimden", value: PART_FROM[i % PART_FROM.length] },
    { label: "Çıkma Yedek Parça", value: USED_PART[i % USED_PART.length] },
    { label: "Durumu", value: i % 3 === 0 ? "Sıfır" : "İkinci El" },
  ];
}

export function buildDemoListings(): Listing[] {
  const nodes: Category[] = [];
  walkCategories(categories, (c) => {
    if (isBannedLiveAnimalCategory(c.id)) return;
    nodes.push(c);
  });

  const out: Listing[] = [];
  const now = Date.now();

  for (const cat of nodes) {
    const pool = photosFor(cat.id);
    for (let i = 0; i < DEMO_PER_CATEGORY; i++) {
      const seller = SELLERS[(hash(cat.id) + i) % SELLERS.length];
      const [city, district] = PLACES[(hash(cat.id) + i * 3) % PLACES.length];
      const hood = mahalleFor(city, district, `d-${cat.id}-${i + 1}`);
      const imgs = pick(pool, cat.id.startsWith("parts") ? 7 : 3, hash(cat.id) + i);
      const postedAt = now - (i % 18) * 2.4 * 3_600_000;
      out.push({
        id: `d-${cat.id}-${i + 1}`,
        title: titleFor(cat, i),
        subtitle: subtitleFor(cat, i),
        price: priceFor(cat.id, i),
        categoryId: cat.id,
        city,
        district,
        neighborhood: hood,
        images: imgs,
        description: descFor(cat, city, district, `d-${cat.id}-${i + 1}`),
        features:
          isSeaEquipCategoryId(cat.id)
            ? seaFeatures(i)
            : cat.id.startsWith("parts-moto")
            ? motoFeatures(cat, i)
            : (cat.id.startsWith("services-move") ||
            cat.id.startsWith("services-auto") ||
            cat.id.startsWith("services-repair") ||
            cat.id.startsWith("services-event") ||
            cat.id.startsWith("services-other")) &&
          i % 3 === 0
            ? ["7/24"]
            : cat.id.startsWith("services-reno") && i % 4 === 0
              ? ["7/24"]
              : cat.id.startsWith("emlak") && i % 2 === 0
                ? ["Site İçerisinde"]
                : undefined,
        sellerId: seller.id,
        sellerName: seller.name,
        sellerAvatar: seller.avatar,
        sellerVerified: seller.verified,
        createdAt:
          cat.id.startsWith("parts-auto-spare") || cat.id.startsWith("parts-moto") || isSeaEquipCategoryId(cat.id)
          ? new Date(postedAt).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })
          : i < 3
            ? `${i + 1} saat önce`
            : `${Math.min(i, 20)} gün önce`,
        views: 40 + ((hash(cat.id) + i * 17) % 900),
        featured: i % 8 === 0,
        vip: i % 11 === 0,
        status: "active",
        specs: cat.id.startsWith("tutors")
          ? [
              { label: "Kategori", value: cat.name },
              { label: "Ders", value: tutorSubjectsFor(cat.id)[i % tutorSubjectsFor(cat.id).length] },
              { label: "Seviye", value: tutorLevelsFor(cat.id)[i % tutorLevelsFor(cat.id).length] },
              { label: "Yer", value: TUTOR_PLACES[i % TUTOR_PLACES.length] },
              { label: "Konum", value: `${city} / ${district}` },
            ]
          : cat.id.startsWith("jobs-beauty")
            ? [
                { label: "Kategori", value: cat.name },
                { label: "Çalışma", value: JOB_WORK_MODES[i % JOB_WORK_MODES.length] },
                { label: "Eğitim", value: JOB_EDUCATION[i % JOB_EDUCATION.length] },
                { label: "Deneyim", value: JOB_EXPERIENCE_LEVELS[i % JOB_EXPERIENCE_LEVELS.length] },
                { label: "Konum", value: `${city} / ${district}` },
              ]
            : cat.id.startsWith("emlak")
              ? estateSpecs(cat, i, city, district, hood)
              : isSeaEquipCategoryId(cat.id)
                ? seaSpecs(cat, i)
              : cat.id.startsWith("parts-moto")
                ? motoSpecs(cat, i)
              : cat.id.startsWith("parts-auto-spare")
                ? partsSpecs(cat, i)
                : cat.id.startsWith("parts")
                ? [
                    { label: "Kategori", value: cat.name },
                    { label: "Durum", value: i % 3 === 0 ? "Sıfır" : "İkinci El" },
                    { label: "Konum", value: `${city} / ${district}` },
                  ]
                : [
                  { label: "Kategori", value: cat.name },
                  { label: "Durum", value: i % 3 === 0 ? "Sıfır" : "İkinci el" },
                  { label: "Konum", value: `${city} / ${district}` },
                ],
        listingNo: `${(hash(cat.id) % 90) + 10}${String(i + 1).padStart(6, "0")}`,
        postedAt,
        urgent: i % 3 === 0,
        refurbished: cat.circular ? i % 4 === 0 : false,
      });
    }
  }
  return out;
}

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
