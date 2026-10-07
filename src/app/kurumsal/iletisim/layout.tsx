import { corporatePageMetadata } from "@/lib/seo";

export const metadata = corporatePageMetadata("iletisim", "İletişim", "/kurumsal/iletisim");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
