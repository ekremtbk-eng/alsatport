import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/JsonLd";
import { findPublicStore } from "@/lib/business/store";
import { businessCategoryName } from "@/lib/business/shared";
import { absUrl, absoluteAssetUrl, jsonLdGraph, pageMetadata } from "@/lib/seo";
import { CANONICAL_ORIGIN } from "@/lib/site";
import { StorePageClient } from "./StorePageClient";

type Ctx = { params: Promise<{ slug: string }> };

const loadStore = cache(findPublicStore);

function place(city: string, district: string) {
  return [district, city].filter(Boolean).join(", ");
}

export async function generateMetadata({ params }: Ctx): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadStore(slug);
  if (!data) return { title: "Mağaza · AlsatPort", robots: { index: false, follow: false } };
  const { store } = data;
  const category = businessCategoryName(store.categoryId);
  const where = place(store.city, store.district);
  const summary = store.description.replace(/\s+/g, " ").trim();
  const description = [`${store.name}${where ? ` · ${where}` : ""}`, category, summary]
    .filter(Boolean)
    .join(" · ")
    .slice(0, 170);
  const image = store.coverUrl || store.logoUrl;
  return pageMetadata({
    title: `${store.name}${category ? ` · ${category}` : ""} Mağazası · AlsatPort`,
    description,
    path: `/magaza/${store.slug}`,
    index: true,
    images: image ? [{ url: image, alt: store.name }] : undefined,
  });
}

export default async function StorePage({ params }: Ctx) {
  const { slug } = await params;
  const data = await loadStore(slug);
  if (!data) notFound();
  const { store } = data;
  const url = absUrl(`/magaza/${store.slug}`);
  const schema = jsonLdGraph([
    {
      "@type": "Store",
      "@id": `${url}#store`,
      name: store.name,
      url,
      description: store.description.slice(0, 500),
      ...(store.logoUrl ? { logo: absoluteAssetUrl(store.logoUrl) } : {}),
      ...(store.coverUrl ? { image: absoluteAssetUrl(store.coverUrl) } : {}),
      ...(store.website ? { sameAs: [store.website] } : {}),
      address: {
        "@type": "PostalAddress",
        addressLocality: store.district || store.city,
        addressRegion: store.city,
        addressCountry: "TR",
      },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Ana sayfa", item: CANONICAL_ORIGIN },
        { "@type": "ListItem", position: 2, name: "Mağazalar", item: absUrl("/magazalar") },
        { "@type": "ListItem", position: 3, name: store.name, item: url },
      ],
    },
  ]);
  return (
    <>
      <JsonLd data={schema} />
      <StorePageClient store={store} active={data.active} sold={data.sold} />
    </>
  );
}
