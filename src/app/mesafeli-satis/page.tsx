import type { Metadata } from "next";
import { DistanceSalesBody } from "@/components/DistanceSalesBody";

export const metadata: Metadata = {
  title: "Mesafeli Satış Sözleşmesi — AlsatPort",
  description:
    "AlsatPort Bilgi Teknolojileri A.Ş. mesafeli satış sözleşmesi. Dijital üyelik hizmetlerinde 6502 sayılı Kanun uyarınca cayma hakkı bulunmaz.",
};

export default function DistanceSalesPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-8">
      <DistanceSalesBody />
    </article>
  );
}
