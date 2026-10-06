"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ALL_CONSENT,
  DEFAULT_CONSENT,
  onConsentChange,
  purgeWithoutConsent,
  readConsent,
  removeObsoleteStorage,
  writeConsent,
  type ConsentPrefs,
} from "@/lib/consent";

export type CookiePrefs = ConsentPrefs;

type CookieState = {
  hydrated: boolean;
  decided: boolean;
  prefs: CookiePrefs;
  bannerOpen: boolean;
  prefsOpen: boolean;
  acceptAll: () => void;
  rejectAll: () => void;
  savePrefs: (prefs: CookiePrefs) => void;
  openBanner: () => void;
  openPrefs: () => void;
  closePrefs: () => void;
};

export const defaultPrefs: CookiePrefs = DEFAULT_CONSENT;

const Ctx = createContext<CookieState | null>(null);

export function CookieProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [decided, setDecided] = useState(false);
  const [prefs, setPrefs] = useState<CookiePrefs>(DEFAULT_CONSENT);
  const [bannerOpen, setBannerOpen] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);

  useEffect(() => {
    removeObsoleteStorage();
    const rec = readConsent();
    if (rec) {
      setPrefs(rec.prefs);
      setDecided(true);
      purgeWithoutConsent(rec.prefs);
    } else {
      purgeWithoutConsent(DEFAULT_CONSENT);
      setBannerOpen(true);
    }
    setHydrated(true);
    return onConsentChange((next) => setPrefs(next.prefs));
  }, []);

  const persist = useCallback((next: CookiePrefs) => {
    const rec = writeConsent(next);
    setPrefs(rec.prefs);
    setDecided(true);
    setBannerOpen(false);
    setPrefsOpen(false);
  }, []);

  const acceptAll = useCallback(() => persist(ALL_CONSENT), [persist]);
  const rejectAll = useCallback(() => persist(DEFAULT_CONSENT), [persist]);
  const savePrefs = useCallback((next: CookiePrefs) => persist(next), [persist]);
  const openBanner = useCallback(() => {
    setBannerOpen(true);
    setPrefsOpen(false);
  }, []);
  const openPrefs = useCallback(() => {
    setPrefsOpen(true);
    setBannerOpen(false);
  }, []);
  const closePrefs = useCallback(() => {
    setPrefsOpen(false);
    if (!decided) setBannerOpen(true);
  }, [decided]);

  const value = useMemo(
    () => ({
      hydrated,
      decided,
      prefs,
      bannerOpen,
      prefsOpen,
      acceptAll,
      rejectAll,
      savePrefs,
      openBanner,
      openPrefs,
      closePrefs,
    }),
    [hydrated, decided, prefs, bannerOpen, prefsOpen, acceptAll, rejectAll, savePrefs, openBanner, openPrefs, closePrefs],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCookies() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCookies must be used within CookieProvider");
  return ctx;
}

/** True only after the visitor explicitly allowed this category. */
export function useConsent(category: "functional" | "analytics" | "marketing") {
  const { prefs, hydrated } = useCookies();
  return hydrated && prefs[category] === true;
}
