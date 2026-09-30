import { ServiceOfferLanding } from "@/components/ServiceOfferLanding";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Hizmet Vermek İstiyorum · Ustalar ve Hizmetler · AlsatPort",
  description:
    "Tüm Türkiye'de hizmet verenler burada. Ev tadilat, nakliyat, araç servis, tamirat ve düğün kategorilerinde hizmet verene katıl, yeni müşterilere ulaş.",
  path: "/hizmet-vermek-istiyorum",
});

export default function HizmetVermekIstiyorumPage() {
  return <ServiceOfferLanding />;
}
