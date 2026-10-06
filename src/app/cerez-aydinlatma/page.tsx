import { CookiePolicyBody } from "@/components/legal/CookiePolicyBody";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Çerez Politikası · AlSatPort",
  description:
    "AlSatPort'un kullandığı tüm çerezler ve tarayıcı depolama kayıtları: ad, sağlayıcı, amaç, süre ve kategori. Analitik ve pazarlama çerezi kullanılmaz.",
  path: "/cerez-aydinlatma",
});

export default function CookiePolicyPage() {
  return (
    <article className="legal-page mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <CookiePolicyBody />
    </article>
  );
}
