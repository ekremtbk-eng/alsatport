"use client";

import { useI18n } from "@/context/I18nContext";
import { sanitizeMultiline } from "@/lib/security/sanitize";

const PLACEHOLDER_DESC = new Set([
  "Açıklama eklenmedi.",
  "No description added.",
  "Keine Beschreibung.",
  "لا يوجد وصف.",
  "Нет описания.",
]);

export function listingDescriptionText(raw: string | undefined) {
  return sanitizeMultiline(raw ?? "", 8000);
}

export function ListingDescriptionPanel({
  description,
  className,
}: {
  description?: string;
  className?: string;
}) {
  const { t } = useI18n();
  const text = listingDescriptionText(description);
  const empty = !text || PLACEHOLDER_DESC.has(text);

  return (
    <section className={className}>
      {empty ? (
        <p className="break-words text-sm leading-relaxed text-muted">{t("loc.desc.empty")}</p>
      ) : (
        <p className="whitespace-pre-line break-words text-sm leading-relaxed text-ink">{text}</p>
      )}
    </section>
  );
}
