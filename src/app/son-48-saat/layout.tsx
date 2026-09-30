import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Son 48 saat ilanları · AlsatPort",
  description: "Son 48 saatte yayınlanan taze ilanları il, ilçe ve kelime filtreleriyle inceleyin.",
  path: "/son-48-saat",
});

export default function FreshLayout({ children }: { children: React.ReactNode }) {
  return children;
}
