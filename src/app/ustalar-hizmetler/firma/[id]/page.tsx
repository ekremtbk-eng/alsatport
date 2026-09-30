import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { ServiceFirmPageClient } from "./ServiceFirmPageClient";

type Ctx = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Ctx): Promise<Metadata> {
  const { id } = await params;
  return pageMetadata({
    title: "Hizmet veren profili · Ustalar ve Hizmetler · AlsatPort",
    description: "Onaylı hizmet veren profili, verdiği hizmetler, iş örnekleri ve değerlendirmeler.",
    path: `/ustalar-hizmetler/firma/${id}`,
    index: false,
  });
}

export default function ServiceFirmPage() {
  return <ServiceFirmPageClient />;
}
