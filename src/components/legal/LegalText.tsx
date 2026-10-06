"use client";

import { KvkkLink } from "@/components/LegalNoticeModal";
import { useI18n } from "@/context/I18nContext";

/** Renders an i18n string whose {terms}, {kvkk} and {privacy} tokens become legal links. */
export function LegalText({ text, className }: { text: string; className?: string }) {
  const { t } = useI18n();
  const parts = text.split(/(\{terms\}|\{kvkk\}|\{privacy\})/);
  return (
    <p className={className}>
      {parts.map((part, i) => {
        if (part === "{kvkk}") {
          return (
            <KvkkLink key={i} className="auth-gate-legal-link">
              {t("auth.gate.kvkk")}
            </KvkkLink>
          );
        }
        if (part === "{terms}" || part === "{privacy}") {
          return (
            <a
              key={i}
              href={part === "{terms}" ? "/kullanim-kosullari" : "/gizlilik-politikasi"}
              target="_blank"
              rel="noopener"
              className="auth-gate-legal-link"
            >
              {t(part === "{terms}" ? "footer.terms" : "footer.privacy")}
            </a>
          );
        }
        return part;
      })}
    </p>
  );
}
