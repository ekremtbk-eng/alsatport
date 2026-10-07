import type { Metadata } from "next";
import { findNews } from "@/data/corporate";
import { pageMetadata } from "@/lib/seo";

type Ctx = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Ctx): Promise<Metadata> {
  const { slug } = await params;
  const item = findNews(decodeURIComponent(slug));
  return pageMetadata({
    title: item ? `${item.title} · Haberler · AlsatPort` : "Haberler · AlsatPort",
    description: item?.summary ?? "AlSatPort haberleri.",
    path: `/kurumsal/haberler/${slug}`,
    index: Boolean(item),
    type: "article",
  });
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
