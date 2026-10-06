import { TermsOfServiceBody } from "@/components/TermsOfServiceBody";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Kullanım Koşulları · AlSatPort",
  description:
    "AlSatPort kullanım koşulları: platformun yer sağlayıcı rolü, üyelik, ilanlar, kullanıcılar arası alışveriş, yasak davranışlar, şikâyet ve yaptırımlar.",
  path: "/kullanim-kosullari",
});

export default function TermsOfServicePage() {
  return (
    <article className="legal-page mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <TermsOfServiceBody />
    </article>
  );
}
