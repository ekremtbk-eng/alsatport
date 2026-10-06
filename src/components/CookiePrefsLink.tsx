"use client";

import { useCookies } from "@/context/CookieContext";
import { useI18n } from "@/context/I18nContext";

export function CookiePrefsLink({ button = false }: { button?: boolean }) {
  const { openPrefs } = useCookies();
  const { t } = useI18n();
  return (
    <button type="button" onClick={openPrefs} className={button ? "btn-primary h-11 px-5 text-sm" : "chip"}>
      {t("footer.cookies")}
    </button>
  );
}
