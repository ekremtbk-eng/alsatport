"use client";

import { Cookie, Lock, Settings2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useCookies, type CookiePrefs } from "@/context/CookieContext";
import Link from "next/link";
import { useI18n } from "@/context/I18nContext";

const CATEGORIES: {
  key: keyof CookiePrefs;
  titleKey: string;
  textKey: string;
  locked?: boolean;
}[] = [
  { key: "necessary", titleKey: "cookie.nec", textKey: "cookie.nec.t", locked: true },
  { key: "functional", titleKey: "cookie.fun", textKey: "cookie.fun.t" },
  { key: "analytics", titleKey: "cookie.an", textKey: "cookie.an.t" },
  { key: "marketing", titleKey: "cookie.mk", textKey: "cookie.mk.t" },
];

export function CookieConsent() {
  const {
    hydrated,
    bannerOpen,
    prefsOpen,
    prefs,
    acceptAll,
    rejectAll,
    savePrefs,
    openPrefs,
    closePrefs,
  } = useCookies();
  const [draft, setDraft] = useState<CookiePrefs>(prefs);
  const { t } = useI18n();

  useEffect(() => {
    if (prefsOpen) setDraft(prefs);
  }, [prefsOpen, prefs]);

  if (!hydrated) return null;

  return (
    <>
      {bannerOpen && !prefsOpen && (
        <div className="cookie-banner p-3 lg:p-5">
          <div className="mx-auto flex max-w-5xl flex-col gap-4 rounded-3xl border border-lime/20 bg-panel/95 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl md:p-5">
            <div className="flex items-start gap-3">
              <span className="btn-primary mt-0.5 grid h-10 w-10 shrink-0 !rounded-2xl">
                <Cookie className="relative z-10 h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-extrabold md:text-base">{t("cookie.h")}</p>
                <p className="mt-1 text-xs leading-relaxed text-soft md:text-sm">
                  {t("cookie.p")}{" "}
                  <Link href="/cerez-aydinlatma" className="font-semibold text-lime underline-offset-2 hover:underline">
                    {t("footer.cookiePolicy")}
                  </Link>
                </p>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <button type="button" onClick={rejectAll} className="btn-primary h-11 text-sm">
                {t("cookie.reject")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraft(prefs);
                  openPrefs();
                }}
                className="btn-ghost h-11 text-sm"
              >
                <Settings2 className="h-4 w-4" />
                <span>{t("cookie.manage")}</span>
              </button>
              <button type="button" onClick={acceptAll} className="btn-primary h-11 text-sm">
                {t("cookie.accept")}
              </button>
            </div>
          </div>
        </div>
      )}

      {prefsOpen && (
        <div className="fixed inset-0 z-[110] grid place-items-end bg-black/40 p-3 backdrop-blur-sm sm:place-items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cookie-prefs-title"
            className="chat-dock w-full max-w-lg overflow-hidden rounded-3xl bg-panel"
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h2 id="cookie-prefs-title" className="text-base font-extrabold">
                {t("cookie.h")}
              </h2>
              <button
                type="button"
                onClick={closePrefs}
                className="grid h-8 w-8 place-items-center rounded-lg hover:bg-elev"
                aria-label={t("common.close")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[70vh] space-y-3 overflow-auto p-4">
              <p className="text-xs leading-relaxed text-muted">
                {t("cookie.always")}
              </p>
              {CATEGORIES.map((c) => {
                const on = draft[c.key];
                return (
                  <div key={c.key} className="rounded-2xl border border-line bg-card p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="flex items-center gap-1.5 text-sm font-bold">
                          {t(c.titleKey)}
                          {c.locked && <Lock className="h-3.5 w-3.5 text-muted" />}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-muted">{t(c.textKey)}</p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={!!on}
                        disabled={c.locked}
                        onClick={() =>
                          setDraft((p) => ({
                            ...p,
                            necessary: true,
                            [c.key]: !p[c.key],
                          }))
                        }
                        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                          on ? "bg-lime" : "bg-elev ring-1 ring-line"
                        } ${c.locked ? "cursor-not-allowed opacity-70" : ""}`}
                      >
                        <span
                          className={`absolute top-0.5 h-5 w-5 rounded-full bg-bg shadow transition ${
                            on ? "start-5" : "start-0.5"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                );
              })}
              <Link href="/cerez-aydinlatma" onClick={closePrefs} className="block text-center text-xs font-semibold text-lime">
                {t("cookie.read")}
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-2 border-t border-line p-3 sm:grid-cols-3">
              <button type="button" onClick={rejectAll} className="btn-primary h-11 text-sm">
                {t("cookie.reject")}
              </button>
              <button type="button" onClick={() => savePrefs(draft)} className="btn-ghost h-11 text-sm">
                {t("cookie.save")}
              </button>
              <button type="button" onClick={acceptAll} className="btn-primary h-11 text-sm">
                {t("cookie.accept")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
