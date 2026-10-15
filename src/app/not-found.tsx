import type { Metadata } from "next";
import { StatusScreen } from "@/components/StatusScreen";

export const metadata: Metadata = {
  title: "Sayfa bulunamadı · AlsatPort",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return <StatusScreen kind="notFound" />;
}
