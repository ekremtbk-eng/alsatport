import type { Metadata } from "next";
import { MobileServicesHub } from "@/components/home/MobileServicesHub";
import { ServicesHome } from "@/components/ServicesHome";

export const metadata: Metadata = {
  title: "Servisler | AlSatPort",
  robots: { index: true, follow: true },
};

/** Phone: AlSatPort services hub. Desktop: existing Ustalar portal home. */
export default function ServislerPage() {
  return (
    <>
      <div className="home-phone-only">
        <MobileServicesHub />
      </div>
      <div className="home-desk-only">
        <ServicesHome />
      </div>
    </>
  );
}
