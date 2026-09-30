import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { findCategoryFromJobPath, hrefForJobCategory, visibleChildren } from "@/data/categories";
import { categoryJsonLd, pageMetadata } from "@/lib/seo";
import { JobsBrowseClient } from "./JobsBrowseClient";

type Ctx = { params: Promise<{ slug?: string[] }> };

export async function generateMetadata({ params }: Ctx): Promise<Metadata> {
  const { slug } = await params;
  const segments = (slug ?? []).map((s) => decodeURIComponent(s));
  const cat = findCategoryFromJobPath(segments);
  const kids = cat ? visibleChildren(cat) : [];
  const title = cat ? `${cat.name} iş ilanları · AlsatPort` : "İş ilanları · AlsatPort";
  const description = cat
    ? kids.length
      ? `${cat.name}: ${kids.map((c) => c.name).join(", ")}. AlsatPort iş ilanları.`
      : `${cat.name} iş ilanları AlsatPort'ta.`
    : "AlsatPort iş ilanları.";
  return pageMetadata({
    title,
    description,
    path: cat ? hrefForJobCategory(cat) : "/is-ilanlari",
    index: Boolean(cat),
  });
}

export default async function JobsPathPage({ params }: Ctx) {
  const { slug } = await params;
  const segments = (slug ?? []).map((s) => decodeURIComponent(s));
  const cat = findCategoryFromJobPath(segments);
  return (
    <>
      {cat ? <JsonLd data={categoryJsonLd(cat)} /> : null}
      <JobsBrowseClient />
    </>
  );
}
