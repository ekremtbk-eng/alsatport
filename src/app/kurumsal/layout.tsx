import type { Metadata } from "next";
import { CorporateShell } from "@/components/CorporateShell";

export const metadata: Metadata = {
  title: "Kurumsal · AlsatPort",
  description:
    "AlSatPort kurumsal sayfaları: hakkımızda, tarihçe, sürdürülebilirlik, kariyer, haberler ve iletişim.",
};

export default function CorporateLayout({ children }: { children: React.ReactNode }) {
  return <CorporateShell>{children}</CorporateShell>;
}
