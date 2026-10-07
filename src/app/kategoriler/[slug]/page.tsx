import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { findCategory, hrefForCategory, visibleChildren } from "@/data/categories";
import { categoryJsonLd, categoryPath, pageMetadata } from "@/lib/seo";
import { CategoryDetailClient } from "./CategoryDetailClient";

type Ctx = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Ctx): Promise<Metadata> {
  const { slug } = await params;
  const decoded = decodeURIComponent(slug ?? "");
  const cat = findCategory(decoded);
  const title = cat ? `${cat.name} ilanları · AlsatPort` : "Kategoriler · AlsatPort";
  const kids = cat ? visibleChildren(cat) : [];
  const description = cat
    ? kids.length
      ? `${cat.name} ve alt kategorileri: ${kids
          .slice(0, 8)
          .map((c) => c.name)
          .join(", ")}. AlsatPort'ta ilanlara göz atın.`
      : `${cat.name} ilanları AlsatPort'ta. Al, sat, keşfet.`
    : "AlsatPort kategori rehberi.";
  return pageMetadata({
    title,
    description,
    path: cat ? hrefForCategory(cat) : categoryPath(decoded),
    index: Boolean(cat),
  });
}

export default async function CategoryDetailPage({ params }: Ctx) {
  const { slug } = await params;
  const cat = findCategory(decodeURIComponent(slug ?? ""));
  return (
    <>
      {cat ? <JsonLd data={categoryJsonLd(cat)} /> : null}
      <CategoryDetailClient />
    </>
  );
}
