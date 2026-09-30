import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Acil Acil ilanlar · AlsatPort",
  description: "Acil olarak işaretlenen ilanları il, ilçe, tarih ve kelime filtreleriyle inceleyin.",
  path: "/acil",
});

export default function AcilLayout({ children }: { children: React.ReactNode }) {
  return children;
}
