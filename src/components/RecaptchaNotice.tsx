"use client";

import { useI18n } from "@/context/I18nContext";

export function RecaptchaNotice() {
  const { t } = useI18n();
  if (!process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY) return null;
  return (
    <p className="m-0 text-[11px] leading-snug text-muted">
      {t("recaptcha.notice")}{" "}
      <a
        className="underline"
        href="https://policies.google.com/privacy"
        target="_blank"
        rel="noopener noreferrer"
      >
        {t("recaptcha.privacy")}
      </a>{" "}
      {t("recaptcha.and")}{" "}
      <a
        className="underline"
        href="https://policies.google.com/terms"
        target="_blank"
        rel="noopener noreferrer"
      >
        {t("recaptcha.terms")}
      </a>
      .
    </p>
  );
}
