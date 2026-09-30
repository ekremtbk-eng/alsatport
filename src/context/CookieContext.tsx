"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type CookiePrefs = {
  necessary: true;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
};

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

const KEY = "alsatport-cookie-consent-v2";

export const defaultPrefs: CookiePrefs = {
  necessary: true,
  functional: false,
  analytics: false,
  marketing: false,
};

const allOn: CookiePrefs = {
  necessary: true,
  functional: true,
  analytics: true,
  marketing: true,
};

const Ctx = createContext<CookieState | null>(null);

export function CookieProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [decided, setDecided] = useState(false);
  const [prefs, setPrefs] = useState<CookiePrefs>(defaultPrefs);
  const [bannerOpen, setBannerOpen] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CookiePrefs;
        setPrefs({ ...defaultPrefs, ...parsed, necessary: true });
        setDecided(true);
        setBannerOpen(false);
      } else {
        setBannerOpen(true);
      }
    } catch {
      setBannerOpen(true);
    }
    setHydrated(true);
  }, []);

  const persist = useCallback((next: CookiePrefs) => {
    const value = { ...next, necessary: true as const };
    setPrefs(value);
    setDecided(true);
    setBannerOpen(false);
    setPrefsOpen(false);
    localStorage.setItem(KEY, JSON.stringify(value));
  }, []);

  const acceptAll = useCallback(() => persist(allOn), [persist]);
  const rejectAll = useCallback(() => persist(defaultPrefs), [persist]);
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
    [
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
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCookies() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCookies must be used within CookieProvider");
  return ctx;
}
