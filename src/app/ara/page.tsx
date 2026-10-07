import type { Metadata } from "next";
import { findCategory, hrefForCategory } from "@/data/categories";
import { pageMetadata } from "@/lib/seo";
import { SearchPageClient } from "./SearchPageClient";

type Ctx = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const SEARCH_TITLE = "İlan ara · AlsatPort";
const SEARCH_DESCRIPTION = "AlsatPort'ta kelime, il, ilçe ve kategoriye göre ilan arayın.";
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
  return pageMetadata({
    title: `${cat.name} ilanları · AlsatPort`,
    description: `${cat.name} ilanları AlsatPort'ta. Türkiye genelinde güncel ilanlara göz atın.`,
    path,
    index: categoryOnly,
    follow: true,
  });
}

export default function SearchPage() {
  return <SearchPageClient />;
}
