import type { Metadata } from "next";
import { CorporateShell } from "@/components/CorporateShell";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Kurumsal · AlsatPort",
  description:
    "AlSatPort kurumsal sayfaları: hakkımızda, tarihçe, sürdürülebilirlik, kariyer, haberler ve iletişim.",
  path: "/kurumsal",
});

export default function CorporateLayout({ children }: { children: React.ReactNode }) {
  return <CorporateShell>{children}</CorporateShell>;
}
