import { corporatePageMetadata } from "@/lib/seo";

export const metadata = corporatePageMetadata("hakkimizda", "Hakkımızda", "/kurumsal/hakkimizda");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
