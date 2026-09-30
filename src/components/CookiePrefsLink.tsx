"use client";

import { useCookies } from "@/context/CookieContext";

export function CookiePrefsLink({ button = false }: { button?: boolean }) {
  const { openPrefs } = useCookies();
  if (button) {
    return (
      <button type="button" onClick={openPrefs} className="btn-primary h-11 px-5 text-sm">
        Çerez Tercihlerini Yönet
      </button>
    );
  }
  return (
    <button type="button" onClick={openPrefs} className="chip">
      Çerez ayarları
    </button>
  );
}
