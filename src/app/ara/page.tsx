import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { findCategory, hrefForCategory } from "@/data/categories";
import { categoryJsonLd, categorySeoCopy, pageMetadata } from "@/lib/seo";
import { SearchPageClient } from "./SearchPageClient";

type Ctx = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const SEARCH_TITLE = "İlan ara · AlSatPort";
const SEARCH_DESCRIPTION = "AlSatPort'ta kelime, ülke (Türkiye / KKTC), il, ilçe ve kategoriye göre ilan arayın.";
const VIEW_ONLY = new Set(["gorunum"]);

function first(v: string | string[] | undefined) {
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
}

/**
 * `/ara?kategori=<slug>` is the canonical listing page of a leaf category. Keyword searches,
 * filter/sort combinations and unknown categories stay crawlable for links but out of the index.
 */
export async function generateMetadata({ searchParams }: Ctx): Promise<Metadata> {
  const sp = await searchParams;
  const keys = Object.keys(sp).filter((k) => first(sp[k]) && !VIEW_ONLY.has(k));
  if (!keys.length) {
    return pageMetadata({ title: SEARCH_TITLE, description: SEARCH_DESCRIPTION, path: "/ara" });
  }
  const slug = first(sp.kategori) || first(sp.cat);
  const cat = slug ? findCategory(slug) : undefined;
  if (!cat || cat.filter) {
    return pageMetadata({ title: SEARCH_TITLE, description: SEARCH_DESCRIPTION, path: "/ara", index: false, follow: true });
  }
  const path = hrefForCategory(cat);
  const categoryOnly = keys.length === 1 && (keys[0] === "kategori" || keys[0] === "cat");
  const copy = categorySeoCopy(cat);
  return pageMetadata({
    title: copy.title,
    description: copy.description,
    path,
    index: categoryOnly,
    follow: true,
  });
}

export default async function SearchPage({ searchParams }: Ctx) {
  const sp = await searchParams;
  const keys = Object.keys(sp).filter((k) => first(sp[k]) && !VIEW_ONLY.has(k));
  const slug = first(sp.kategori) || first(sp.cat);
  const cat = slug ? findCategory(slug) : undefined;
  const categoryOnly = Boolean(cat && !cat.filter && keys.length === 1 && (keys[0] === "kategori" || keys[0] === "cat"));
  /** Leaf (and any category-only ara URL) gets BreadcrumbList + CollectionPage aligned to canonical href. */
  const schema = categoryOnly && cat ? categoryJsonLd(cat) : null;
  return (
    <>
      {schema ? <JsonLd data={schema} /> : null}
      <SearchPageClient />
    </>
  );
}
