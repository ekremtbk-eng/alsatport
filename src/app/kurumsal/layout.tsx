import type { Metadata } from "next";
import { CorporateShell } from "@/components/CorporateShell";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Kurumsal · AlsatPort",
  description:
    "AlsatPort Bilgi Teknolojileri A.Ş. kurumsal sayfaları: hakkımızda, tarihçe, sürdürülebilirlik, kariyer, haberler ve iletişim.",
  path: "/kurumsal",
});

export default function CorporateLayout({ children }: { children: React.ReactNode }) {
  return <CorporateShell>{children}</CorporateShell>;
}
