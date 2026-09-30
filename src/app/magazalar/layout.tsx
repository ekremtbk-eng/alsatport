import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Mağazalar · AlsatPort",
  description: "AlsatPort satıcı mağazaları ve vitrinleri.",
  path: "/magazalar",
});

export default function StoresLayout({ children }: { children: React.ReactNode }) {
  return children;
}
