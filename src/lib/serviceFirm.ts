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

/** Fields of the business application an admin reviews before approval (tax number is checksum-validated). */
const BUSINESS_REVIEWED_FIELDS: FirmCheck[] = [
  { label: "Ticari Ünvanı" },
  { label: "Yetkili Adı Soyadı" },
  { label: "Vergi Dairesi" },
  { label: "Vergi Numarası" },
];

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

/** Only real reviews count; a firm without reviews has { avg: 0, count: 0 }. */
export function serviceRating(_listing: Listing, reviews: SellerReview[]) {
  const { avg, count } = summarizeReviews(reviews);
  return { avg, count };
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

  const checks: FirmCheck[] = listing.sellerBusiness ? BUSINESS_REVIEWED_FIELDS : [];

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
