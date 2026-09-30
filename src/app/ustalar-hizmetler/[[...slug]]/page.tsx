import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { findCategoryFromRenoPath, hrefForRenoCategory, visibleChildren } from "@/data/categories";
import { categoryJsonLd, pageMetadata } from "@/lib/seo";
import { ServicesBrowseClient } from "./ServicesBrowseClient";

type Ctx = { params: Promise<{ slug?: string[] }> };

export async function generateMetadata({ params }: Ctx): Promise<Metadata> {
  const { slug } = await params;
  const segments = (slug ?? []).map((s) => decodeURIComponent(s));
  const cat = findCategoryFromRenoPath(segments);
  const kids = cat ? visibleChildren(cat) : [];
  const title = cat ? `${cat.name} hizmetleri · AlsatPort` : "Ustalar ve Hizmetler · AlsatPort";
  const description = cat
    ? kids.length
      ? `${cat.name}: ${kids.map((c) => c.name).slice(0, 10).join(", ")}.`
      : `${cat.name} hizmet ilanları AlsatPort'ta.`
    : "AlsatPort ustalar ve hizmetler.";
  return pageMetadata({
    title,
    description,
    path: cat ? (cat.id === "services" ? "/kategoriler/ustalar-hizmetler" : hrefForRenoCategory(cat)) : "/ustalar-hizmetler",
    index: Boolean(cat),
  });
}

export default async function ServicesPathPage({ params }: Ctx) {
  const { slug } = await params;
  const segments = (slug ?? []).map((s) => decodeURIComponent(s));
  const cat = findCategoryFromRenoPath(segments);
  return (
    <>
      {cat ? <JsonLd data={categoryJsonLd(cat)} /> : null}
      <ServicesBrowseClient />
    </>
  );
}
