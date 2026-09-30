"use client";

import { ArrowUpRight, Mail } from "lucide-react";
import { LEGAL_EMAIL_DESTEK } from "@/data/legal";
import { useI18n } from "@/context/I18nContext";

export function SupportMailLink({
  variant = "footer",
}: {
  variant?: "footer" | "card";
}) {
  const { t } = useI18n();
  return (
    <a
      className={`support-mail support-mail--${variant}`}
      href={`mailto:${LEGAL_EMAIL_DESTEK}?subject=${encodeURIComponent("AlsatPort destek")}`}
    >
      <span className="support-mail-icon" aria-hidden>
        <Mail strokeWidth={2.2} />
      </span>
      <span className="support-mail-copy">
        <span className="support-mail-kicker">{t("footer.support")}</span>
        <span className="support-mail-addr">{LEGAL_EMAIL_DESTEK}</span>
      </span>
      <ArrowUpRight className="support-mail-arrow" strokeWidth={2.4} aria-hidden />
    </a>
  );
}
