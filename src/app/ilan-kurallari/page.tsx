import { ListingRulesBody } from "@/components/legal/ListingRulesBody";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "İlan Kuralları · AlSatPort",
  description:
    "AlSatPort ilan kuralları: yanıltıcı ilan, başkasına ait görseller, kişisel veriler, yasaklı ürünler, dolandırıcılık, spam, telif ve marka hakları, şikâyet ve yaptırımlar.",
  path: "/ilan-kurallari",
});

export default function ListingRulesPage() {
  return (
    <article className="legal-page mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <ListingRulesBody />
    </article>
  );
}
