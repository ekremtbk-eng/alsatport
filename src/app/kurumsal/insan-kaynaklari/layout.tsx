import { corporatePageMetadata } from "@/lib/seo";

export const metadata = corporatePageMetadata("insan-kaynaklari", "İnsan Kaynakları", "/kurumsal/insan-kaynaklari");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
