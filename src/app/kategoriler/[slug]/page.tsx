import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { JsonLd } from "@/components/JsonLd";
import { findCategory, hrefForCategory } from "@/data/categories";
import {
  categoryHubNeedsCanonicalRedirect,
  categoryJsonLd,
  categoryPath,
  categorySeoCopy,
  pageMetadata,
  withPreservedSearchParams,
} from "@/lib/seo";
import { CategoryDetailClient } from "./CategoryDetailClient";

type Ctx = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Ctx): Promise<Metadata> {
  const { slug } = await params;
  const decoded = decodeURIComponent(slug ?? "");
  const cat = findCategory(decoded);
  if (!cat) {
    return pageMetadata({
      title: "Kategoriler · AlSatPort",
      description: "AlSatPort kategori rehberi.",
      path: categoryPath(decoded),
      index: false,
    });
  }
  const copy = categorySeoCopy(cat);
  return pageMetadata({
    title: copy.title,
    description: copy.description,
    path: hrefForCategory(cat),
    index: true,
  });
}

export default async function CategoryDetailPage({ params, searchParams }: Ctx) {
  const { slug } = await params;
  const cat = findCategory(decodeURIComponent(slug ?? ""));
  if (cat && categoryHubNeedsCanonicalRedirect(cat)) {
    const sp = await searchParams;
    permanentRedirect(withPreservedSearchParams(hrefForCategory(cat), sp));
  }
  return (
    <>
      {cat ? <JsonLd data={categoryJsonLd(cat)} /> : null}
      <CategoryDetailClient />
    </>
  );
}
