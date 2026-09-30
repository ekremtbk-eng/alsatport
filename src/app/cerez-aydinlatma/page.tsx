import type { Metadata } from "next";
import { LegalNoticeBody } from "@/components/LegalNoticeBody";

export const metadata: Metadata = {
  title: "KVKK / Çerez Aydınlatma Metni — AlsatPort",
  description:
    "AlsatPort Bilgi Teknolojileri A.Ş. kişisel verilerin korunması ve çerez aydınlatma metni. KVKK m.10–m.11 haklarınız ve çerez tercihleriniz.",
};

export default function CookieNoticePage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-8">
      <LegalNoticeBody />
    </article>
  );
}
