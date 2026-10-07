import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "İşletme Paneli · AlsatPort",
  robots: { index: false, follow: false },
};

export default function BusinessPanelLayout({ children }: { children: React.ReactNode }) {
  return children;
}
