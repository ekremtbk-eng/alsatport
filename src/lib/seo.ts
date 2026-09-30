import type { Metadata } from "next";
import {
  LEGAL_ADDRESS,
  LEGAL_BRAND,
  LEGAL_COMPANY,
  LEGAL_EMAIL_DESTEK,
  LEGAL_PHONE_E164,
  LEGAL_SOCIAL,
  LEGAL_WEB,
} from "@/data/legal";
import { categories, findCategory, hrefForCategory, parentOf, visibleChildren, type Category } from "@/data/categories";
import { SITE_SITELINKS } from "@/data/sitelinks";
import { CANONICAL_ORIGIN } from "@/lib/site";

export const SEO_TITLE = "AlSatPort — Al, Sat, Keşfet!";
export const SEO_DESCRIPTION =
  "AlsatPort: emlak, vasıta, ikinci el ve hizmet ilanları. Türkiye genelinde al, sat, keşfet.";
export const SEO_KEYWORDS = [
  "alsatport",
  "ilan",
  "ikinci el",
  "emlak",
  "vasıta",
  "sahibinden",
  "alışveriş",
  "kategori",
];

export function absUrl(path = "/") {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${CANONICAL_ORIGIN}${p === "/" ? "/" : p}`;
}

export const OG_IMAGE_PATH = "/og.png";
export const LOGO_IMAGE_PATH = "/icon-512.png";

export function defaultOgImage() {
  return {
    url: absUrl(OG_IMAGE_PATH),
    width: 1200,
    height: 630,
    alt: `${LEGAL_BRAND} — Al, Sat, Keşfet!`,
    type: "image/png",
  };
}

export function pageMetadata(input: {
  title: string;
  description: string;
  path: string;
  index?: boolean;
  images?: { url: string; alt?: string }[];
  type?: "website" | "article";
}): Metadata {
  const url = absUrl(input.path);
  const images = input.images?.length
    ? input.images.map((img) => ({ url: img.url, alt: img.alt ?? input.title }))
    : [defaultOgImage()];
  const index = input.index !== false;
  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: url },
    robots: index ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: {
      title: input.title,
      description: input.description,
      url,
      siteName: LEGAL_BRAND,
      locale: "tr_TR",
      type: input.type ?? "website",
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      images: images.map((i) => i.url),
    },
    other: {
      "og:image:alt": images[0]?.alt ?? input.title,
    },
  };
}

export function categoryPath(slug: string) {
  return `/kategoriler/${encodeURIComponent(slug)}`;
}

export function categoryCrumbs(cat: Category) {
  const crumbs: Category[] = [cat];
  let walk: Category | undefined = cat;
  for (let i = 0; i < 8; i++) {
    walk = parentOf(walk);
    if (!walk) break;
    crumbs.unshift(walk);
  }
  return crumbs;
}

export function jsonLdGraph(nodes: Record<string, unknown>[]) {
  return {
    "@context": "https://schema.org",
    "@graph": nodes,
  };
}

export function organizationJsonLd() {
  const logoUrl = absUrl(LOGO_IMAGE_PATH);
  return {
    "@type": "Organization",
    "@id": `${CANONICAL_ORIGIN}/#organization`,
    name: LEGAL_COMPANY,
    legalName: LEGAL_COMPANY,
    alternateName: [LEGAL_BRAND, "AlsatPort"],
    url: CANONICAL_ORIGIN,
    logo: {
      "@type": "ImageObject",
      "@id": `${CANONICAL_ORIGIN}/#logo`,
      url: logoUrl,
      contentUrl: logoUrl,
      width: 512,
      height: 512,
      caption: LEGAL_BRAND,
    },
    image: absUrl(OG_IMAGE_PATH),
    email: LEGAL_EMAIL_DESTEK,
    telephone: LEGAL_PHONE_E164,
    address: {
      "@type": "PostalAddress",
      streetAddress: LEGAL_ADDRESS,
      addressLocality: "İstanbul",
      addressCountry: "TR",
    },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: LEGAL_EMAIL_DESTEK,
      telephone: LEGAL_PHONE_E164,
      areaServed: "TR",
      availableLanguage: ["Turkish", "English"],
    },
    sameAs: [LEGAL_WEB, ...LEGAL_SOCIAL],
    description: SEO_DESCRIPTION,
  };
}

export function websiteJsonLd() {
  return {
    "@type": "WebSite",
    "@id": `${CANONICAL_ORIGIN}/#website`,
    url: CANONICAL_ORIGIN,
    name: LEGAL_BRAND,
    alternateName: "AlsatPort",
    description: SEO_DESCRIPTION,
    inLanguage: "tr-TR",
    publisher: { "@id": `${CANONICAL_ORIGIN}/#organization` },
    copyrightHolder: { "@id": `${CANONICAL_ORIGIN}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: `${CANONICAL_ORIGIN}/ara?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

/** Helps Google sitelinks: named shortcuts under the main result. */
export function siteNavigationJsonLd() {
  const links = [
    ...SITE_SITELINKS.map((l) => ({ name: l.name, url: absUrl(l.href) })),
    { name: "Tüm Kategoriler", url: absUrl("/kategoriler") },
    { name: "Mağazalar", url: absUrl("/magazalar") },
    { name: "Kurumsal", url: absUrl("/kurumsal") },
    { name: "İletişim", url: absUrl("/kurumsal/iletisim") },
  ];
  return {
    "@type": "ItemList",
    "@id": `${CANONICAL_ORIGIN}/#sitenav`,
    name: "AlSatPort ana kategoriler",
    numberOfItems: links.length,
    itemListElement: links.map((l, i) => ({
      "@type": "SiteNavigationElement",
      position: i + 1,
      name: l.name,
      url: l.url,
    })),
  };
}

export function homeWebPageJsonLd() {
  return {
    "@type": "WebPage",
    "@id": `${CANONICAL_ORIGIN}/#webpage`,
    url: CANONICAL_ORIGIN,
    name: SEO_TITLE,
    description: SEO_DESCRIPTION,
    inLanguage: "tr-TR",
    isPartOf: { "@id": `${CANONICAL_ORIGIN}/#website` },
    about: { "@id": `${CANONICAL_ORIGIN}/#organization` },
    primaryImageOfPage: absUrl(OG_IMAGE_PATH),
    breadcrumb: { "@id": `${CANONICAL_ORIGIN}/#breadcrumb` },
  };
}

export function homeBreadcrumbJsonLd() {
  return {
    "@type": "BreadcrumbList",
    "@id": `${CANONICAL_ORIGIN}/#breadcrumb`,
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Ana Sayfa",
        item: CANONICAL_ORIGIN,
      },
    ],
  };
}

export function topCategoryListJsonLd() {
  const roots = categories.filter((c) => !c.navHidden && !c.filter);
  return {
    "@type": "ItemList",
    "@id": `${CANONICAL_ORIGIN}/kategoriler#list`,
    name: "AlsatPort kategorileri",
    numberOfItems: roots.length,
    itemListElement: roots.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      url: absUrl(hrefForCategory(c)),
    })),
  };
}

export function categoryJsonLd(cat: Category) {
  const crumbs = categoryCrumbs(cat);
  const children = visibleChildren(cat);
  const url = absUrl(categoryPath(cat.slug));
  const breadcrumb = {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Ana sayfa", item: CANONICAL_ORIGIN },
      { "@type": "ListItem", position: 2, name: "Kategoriler", item: absUrl("/kategoriler") },
      ...crumbs.map((c, i) => ({
        "@type": "ListItem",
        position: i + 3,
        name: c.name,
        item: absUrl(categoryPath(c.slug)),
      })),
    ],
  };
  const collection = {
    "@type": "CollectionPage",
    "@id": `${url}#page`,
    url,
    name: `${cat.name} ilanları`,
    description: `${cat.name} kategorisindeki ilanlar AlsatPort'ta.`,
    isPartOf: { "@id": `${CANONICAL_ORIGIN}/#website` },
    about: {
      "@type": "Thing",
      name: cat.name,
    },
  };
  const childList =
    children.length > 0
      ? {
          "@type": "ItemList",
          name: `${cat.name} alt kategorileri`,
          itemListElement: children.map((ch, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: ch.name,
            url: absUrl(categoryPath(ch.slug)),
          })),
        }
      : null;
  return jsonLdGraph([organizationJsonLd(), websiteJsonLd(), breadcrumb, collection, ...(childList ? [childList] : [])]);
}

export function listingJsonLd(input: {
  id: string;
  title: string;
  description: string;
  price: number;
  images: string[];
  city?: string;
  categoryName?: string;
  categorySlug?: string;
}) {
  const url = absUrl(`/ilan/${input.id}`);
  const crumbs = [
    { "@type": "ListItem", position: 1, name: "Ana sayfa", item: CANONICAL_ORIGIN },
    { "@type": "ListItem", position: 2, name: "Kategoriler", item: absUrl("/kategoriler") },
  ];
  if (input.categorySlug && input.categoryName) {
    crumbs.push({
      "@type": "ListItem",
      position: 3,
      name: input.categoryName,
      item: absUrl(categoryPath(input.categorySlug)),
    });
    crumbs.push({ "@type": "ListItem", position: 4, name: input.title, item: url });
  } else {
    crumbs.push({ "@type": "ListItem", position: 3, name: input.title, item: url });
  }
  const offer = {
    "@type": "Offer",
    url,
    priceCurrency: "TRY",
    price: String(input.price),
    availability: "https://schema.org/InStock",
    itemOffered: {
      "@type": "Product",
      name: input.title,
      description: input.description.slice(0, 5000),
      image: input.images.slice(0, 8),
      category: input.categoryName,
    },
  };
  if (input.city) {
    (offer.itemOffered as { areaServed?: unknown }).areaServed = {
      "@type": "City",
      name: input.city,
    };
  }
  return jsonLdGraph([
    organizationJsonLd(),
    websiteJsonLd(),
    { "@type": "BreadcrumbList", itemListElement: crumbs },
    offer,
  ]);
}

export function findCategorySafe(slug: string) {
  return findCategory(decodeURIComponent(slug));
}
