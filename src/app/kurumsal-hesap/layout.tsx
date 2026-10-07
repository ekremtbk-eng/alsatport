import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kurumsal Hesap · AlsatPort",
  robots: { index: false, follow: false },
};

export default function BusinessApplyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
