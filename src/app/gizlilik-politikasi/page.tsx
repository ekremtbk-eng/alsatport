import { PrivacyPolicyBody } from "@/components/PrivacyPolicyBody";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Gizlilik Politikası · AlsatPort",
  description:
    "AlsatPort gizlilik politikası. Veri sorumlusu AlSatPort Bilgi Teknolojileri A.Ş. Google ile girişte yalnızca ad, e-posta ve profil resmi alınır; üçüncü taraflara satılmaz. İletişim: destek@alsatport.com",
  path: "/gizlilik-politikasi",
});

export default function PrivacyPolicyPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-8">
      <PrivacyPolicyBody />
    </article>
  );
}
