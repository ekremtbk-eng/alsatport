import { PrivacyPolicyBody } from "@/components/PrivacyPolicyBody";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Gizlilik Politikası · AlSatPort",
  description:
    "AlSatPort gizlilik politikası: Google ile giriş, hesap, ilan ve mesaj verileri, güvenlik kayıtları, çerezler, hizmet sağlayıcılar ve hesap silme. Verileriniz satılmaz.",
  path: "/gizlilik-politikasi",
});

export default function PrivacyPolicyPage() {
  return (
    <article className="legal-page mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <PrivacyPolicyBody />
    </article>
  );
}
