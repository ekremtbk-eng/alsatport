import { LegalNoticeBody } from "@/components/LegalNoticeBody";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "KVKK Aydınlatma Metni · AlSatPort",
  description:
    "AlSatPort KVKK aydınlatma metni: işlenen kişisel veriler, amaçlar, hukuki sebepler, aktarılan hizmet sağlayıcılar, saklama süreleri ve KVKK m.11 haklarınız.",
  path: "/kvkk",
});

export default function KvkkPage() {
  return (
    <article className="legal-page mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <LegalNoticeBody />
    </article>
  );
}
