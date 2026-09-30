import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "İlan ara · AlsatPort",
  description: "AlsatPort'ta kelime, il, ilçe ve kategoriye göre ilan arayın.",
  path: "/ara",
});

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
