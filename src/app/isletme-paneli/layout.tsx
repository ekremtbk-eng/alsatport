import type { Metadata } from "next";
import { RequireLiveSession } from "@/components/security/RequireLiveSession";

export const metadata: Metadata = {
  title: "İşletme Paneli · AlsatPort",
  robots: { index: false, follow: false },
};

export default async function BusinessPanelLayout({ children }: { children: React.ReactNode }) {
  return <RequireLiveSession>{children}</RequireLiveSession>;
}
