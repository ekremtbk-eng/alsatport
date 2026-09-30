import type { Metadata } from "next";
import { PreInfoBody } from "@/components/PreInfoBody";

export const metadata: Metadata = {
  title: "Ön Bilgilendirme Koşulları — AlsatPort",
  description:
    "AlsatPort üyelik ve doping hizmetleri ön bilgilendirme metni. 6502 sayılı Kanun, anında ifa ve cayma hakkı istisnası.",
};

export default function PreInfoPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-8">
      <PreInfoBody />
    </article>
  );
}
