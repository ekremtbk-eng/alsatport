import type { Metadata } from "next";
import { RequireLiveSession } from "@/components/security/RequireLiveSession";

export const metadata: Metadata = {
  title: "Kurumsal Hesap · AlsatPort",
  robots: { index: false, follow: false },
};

export default async function BusinessApplyLayout({ children }: { children: React.ReactNode }) {
  return <RequireLiveSession>{children}</RequireLiveSession>;
}
