import { corporatePageMetadata } from "@/lib/seo";

export const metadata = corporatePageMetadata("haberler", "Haberler", "/kurumsal/haberler");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
