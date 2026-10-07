import { corporatePageMetadata } from "@/lib/seo";

export const metadata = corporatePageMetadata("sayilarla", "Sayılarla AlsatPort", "/kurumsal/sayilarla");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
