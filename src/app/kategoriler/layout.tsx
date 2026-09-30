import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { jsonLdGraph, organizationJsonLd, pageMetadata, topCategoryListJsonLd, websiteJsonLd } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Tüm kategoriler · AlsatPort",
  description: "Emlak, vasıta, ikinci el, iş ve hizmet kategorileri. AlsatPort kategori rehberi.",
  path: "/kategoriler",
});

export default function CategoriesLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={jsonLdGraph([organizationJsonLd(), websiteJsonLd(), topCategoryListJsonLd()])} />
      {children}
    </>
  );
}
