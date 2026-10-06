import {
  findCategory,
  hrefForRenoCategory,
  isServiceTreeCategory,
  parentOf,
  serviceHubOf,
  visibleChildren,
  type Category,
} from "@/data/categories";
import type { SellerReview } from "@/data/reviews";
import { summarizeReviews } from "@/data/reviews";
import type { Listing } from "@/data/store";
import { districtsOf } from "@/data/turkey";
import { listingSellerLabel } from "@/lib/publicName";

export const SERVICE_FIRM_PATH = "/ustalar-hizmetler/firma";

export function serviceFirmHref(listingId: string) {
  return `${SERVICE_FIRM_PATH}/${encodeURIComponent(listingId)}`;
}

export type FirmServiceGroup = { title: string; items: { name: string; href: string }[] };
export type FirmPriceRow = { title: string; service: string; price: string };
export type FirmQa = { q: string; a: string };
export type FirmCheck = { label: string };

export type FirmProfile = {
  hours24: boolean;
  open: boolean;
  about: string;
  groups: FirmServiceGroup[];
  districts: string[];
  prices: FirmPriceRow[];
  announcements: string[];
  qa: FirmQa[];
  checks: FirmCheck[];
  crumbs: { label: string; href: string }[];
  rating: { avg: number; count: number };
  gallery: string[];
};

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function moneyRange(base: number, spread: number) {
  const a = Math.max(500, Math.round(base / 50) * 50);
  const b = Math.round((base + spread) / 50) * 50;
  const fmt = (n: number) =>
    n.toLocaleString("tr-TR", { maximumFractionDigits: n % 1 ? 2 : 0 }) + " TL";
  return `${fmt(a)} - ${fmt(b)}`;
}

function ancestors(cat: Category) {
  const chain: Category[] = [];
  let cur: Category | undefined = cat;
  while (cur && cur.id !== "services") {
    chain.unshift(cur);
    cur = parentOf(cur);
  }
  return chain;
}

function groupFrom(cat: Category): FirmServiceGroup | null {
  const kids = visibleChildren(cat);
  if (!kids.length) return null;
  return {
    title: cat.name,
    items: kids.slice(0, 8).map((c) => ({ name: c.name, href: hrefForRenoCategory(c) })),
  };
}

export function serviceRating(listing: Listing, reviews: SellerReview[]) {
  const { avg, count } = summarizeReviews(reviews);
  if (count) return { avg, count };
  let h = 2166136261;
  const key = `${listing.sellerId}:${listing.id}`;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  h >>>= 0;
  return {
    avg: Math.round((3.6 + (h % 14) / 10) * 10) / 10,
    count: 8 + (h % 2350),
  };
}

export function buildFirmProfile(listing: Listing, reviews: SellerReview[]): FirmProfile {
  const cat = findCategory(listing.categoryId);
  const hub = cat ? serviceHubOf(cat) : undefined;
  const n = hash(listing.id);
  const hours24 = (listing.features ?? []).some(
    (f) => f.includes("7/24") || f.toLocaleLowerCase("tr").includes("24/7"),
  );
  const hour = new Date().getHours();
  const open = hours24 || (hour >= 8 && hour < 19);

  const chain = cat ? ancestors(cat) : [];
  const crumbs: { label: string; href: string }[] = [
    { label: "Hizmetler", href: "/kategoriler/ustalar-hizmetler" },
  ];
  for (const node of chain) {
    crumbs.push({
      label: node.name,
      href: node.id === hub?.id ? `/kategoriler/${node.slug}` : hrefForRenoCategory(node),
    });
  }
  crumbs.push({ label: listing.title, href: serviceFirmHref(listing.id) });

  const groups: FirmServiceGroup[] = [];
  if (cat) {
    const selfKids = groupFrom(cat);
    if (selfKids) groups.push(selfKids);
    const parent = parentOf(cat);
    if (parent && parent.id !== "services" && parent.id !== hub?.id) {
      const g = groupFrom(parent);
      if (g && !groups.some((x) => x.title === g.title)) groups.push(g);
    }
    if (hub && groups.length < 2) {
      const branches = visibleChildren(hub).filter((b) => b.id !== cat.id && b.id !== parent?.id);
      const extra = branches[n % Math.max(1, branches.length)];
      if (extra) {
        const g = groupFrom(extra);
        if (g && !groups.some((x) => x.title === g.title)) groups.push(g);
      }
    }
    if (!groups.length) {
      groups.push({
        title: cat.name,
        items: [{ name: cat.name, href: hrefForRenoCategory(cat) }],
      });
    }
  }

  const allDistricts = districtsOf(listing.city);
  const take = 6 + (n % 12);
  const start = n % Math.max(1, allDistricts.length);
  const districts = Array.from({ length: Math.min(take, allDistricts.length) }, (_, i) => allDistricts[(start + i) % allDistricts.length]);

  const serviceName = cat?.name ?? "Hizmet";
  const prices: FirmPriceRow[] = Array.from({ length: 3 + (n % 6) }, (_, i) => ({
    title: `${listing.city} ${districts[i % Math.max(1, districts.length)] ?? ""} ${serviceName}`.replace(/\s+/g, " ").trim(),
    service: serviceName,
    price: moneyRange(listing.price * (0.7 + (i % 5) * 0.18), 8_000 + i * 4_500),
  }));

  const announcements =
    n % 3 === 0
      ? [
          `${listing.city} içinde aynı gün keşif ve şeffaf fiyat teklifi veriyoruz.`,
          hours24 ? "7/24 acil çağrı hattımız aktiftir." : "Hafta içi 08:00–19:00 arası hizmetinizdeyiz.",
        ]
      : [];

  const qa: FirmQa[] =
    n % 4 === 0 || listing.categoryId.startsWith("services-auto")
      ? [
          {
            q: "Keşif ve teklif ücretli mi?",
            a: "Standart keşif ücretsizdir. Yerinde ölçü veya özel ekipman gereken işlerde önceden bilgi verilir.",
          },
          {
            q: "Hangi ilçelerde çalışıyorsunuz?",
            a: `${listing.city} başta olmak üzere listelenen ilçelerde hizmet veriyoruz. Komşu ilçeler için arayınız.`,
          },
        ]
      : [];

  const allChecks: FirmCheck[] = [
    { label: "İsim, Soyisim" },
    { label: "Ticari Ünvanı" },
    { label: "Vergi Dairesi" },
    { label: "Cep Telefonu" },
    { label: "Vergi Numarası" },
    { label: "E-Posta Adresi" },
    { label: "Sabit Telefon" },
    { label: "Adres Bilgileri" },
  ];
  const checkCount = 5 + (n % 5);
  const checks = allChecks.slice(0, checkCount);

  const about = [
    listing.description.trim(),
    `${listingSellerLabel(listing)} olarak ${listing.city}${listing.district ? ` / ${listing.district}` : ""} bölgesinde ${serviceName.toLocaleLowerCase("tr")} alanında hizmet veriyoruz.`,
    "Tamamladığımız proje ve işlerden bazıları referans olarak İş Örnekleri galerisinde yer alır. Teklif Al ile işinizi anlatın; uygun gördüğünüzde telefon numarasından bize ulaşın.",
    hours24
      ? "Acil durumlarda 7/24 destek veriyoruz."
      : "Randevulu çalışma ile işinizi planlı ve temiz teslim etmeyi hedefliyoruz.",
  ].join(" ");

  const gallery = listing.images.filter(Boolean);
  const rating = serviceRating(listing, reviews);

  return {
    hours24,
    open,
    about,
    groups,
    districts,
    prices,
    announcements,
    qa,
    checks,
    crumbs,
    rating,
    gallery: gallery.length ? gallery : [listing.sellerAvatar].filter(Boolean),
  };
}

export function isServiceListing(listing: { categoryId: string } | null | undefined) {
  if (!listing) return false;
  return isServiceTreeCategory(findCategory(listing.categoryId));
}

const REVIEWERS = [
  ["Caner", "K."],
  ["Ümit", "T."],
  ["Ebru", "T."],
  ["Bora", "T."],
  ["Zeynep", "H."],
  ["Murat", "S."],
  ["Gül", "H."],
  ["Manuel", "H."],
  ["Selman", "G."],
  ["Mücahit", "A."],
  ["İlknur", "K."],
  ["Ebru", "V."],
  ["Ömer", "Ç."],
  ["Hüseyin", "D."],
  ["Muharrem Günay", "Y."],
  ["Ergun", "D."],
  ["Selcuk", "S."],
  ["Yunus", "Ö."],
  ["Gökhan", "C."],
  ["Erdal", "D."],
  ["Meral", "B."],
  ["Tuba", "D."],
  ["Mutlu", "B."],
  ["Furkan", "Y."],
];

const MONTHS = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
];

const SNIPPETS = [
  "Harika bir iş çıkardı ustamız gönül rahatlığıyla tercih edebilirsiniz",
  "Ustam eline emeğine sağlık. Kendi evini yapar gibi özenerek işini ustasından pek kalmadı günümüzde. İşçiliği, fiyatları ve güler yüzüyle gönül rahatlığıyla iletişim geçebilirsiniz.",
  "Usta eşiyle beraber 15m2 lik duvarını sistemli ve temiz bir şekilde çalışarak çok kısa sürede teslim etti. Teşekkürler",
  "Hızlı, temiz ve kusursuz işçilik. İşin büyüğü, küçüğü diye ayırt etmeden hizmet etmek odaklı çalışan bir ekip.",
  "işimde temiz titiz dakik aldığım hizmetten memnun kaldım teşekkür ediyorum",
  "İşini çok düzgün yapmasının yanında , işin yapılacağı zamanın belirlenmesinde ve yerine getirilmesinde güvenilirliği titizlik tadında değer.",
  "Çok memnun kaldım belirtği saatte geldi ve sorunsuz bir şekilde hizmet verdi teşekkür ederim",
  "Temiz ve usta işçilik güldelle tavsiye ediyorum.",
  "Ankaralı selim ustanın işinden gayet memnun kaldık verdiği taahhütleri zamanında eksiksiz ve hatasızla yaptı kendisine teşekkür eder. İyilerinden başarlar dilerim.",
  "Kaliteli malzeme ve profesyonel işçilik çalışıyor kendisine teşekkür ediyorum.",
];

export function syntheticFirmReviews(listing: Listing, avg: number, count: number): SellerReview[] {
  const n = Math.min(12, Math.max(4, Math.min(count, 12)));
  const seed = hash(listing.id);
  return Array.from({ length: n }, (_, i) => {
    const who = REVIEWERS[(seed + i * 7) % REVIEWERS.length];
    const stars = i === 1 && avg < 4.5 ? Math.max(1, Math.round(avg) - 1) : Math.min(5, Math.max(1, Math.round(avg)));
    return {
      id: `syn-${listing.id}-${i}`,
      sellerId: listing.sellerId,
      listingId: listing.id,
      authorId: `syn-${i}`,
      authorName: `${who[0]} ${who[1]}`,
      authorAvatar: "",
      rating: stars,
      text: SNIPPETS[(seed + i * 3) % SNIPPETS.length],
      createdAt: `${MONTHS[(seed + i) % 12]} ${2023 + ((seed + i) % 3)}`,
    };
  });
}
