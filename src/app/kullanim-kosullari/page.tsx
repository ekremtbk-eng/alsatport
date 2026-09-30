import { TermsOfServiceBody } from "@/components/TermsOfServiceBody";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Kullanım Koşulları · AlsatPort",
  description:
    "AlsatPort kullanım koşulları: üyelik, Google ile giriş, ilan kuralları, yasak içerik, ücretler ve uygulanacak hukuk.",
  path: "/kullanim-kosullari",
});

export default function TermsOfServicePage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-8">
      <TermsOfServiceBody />
    </article>
  );
}
