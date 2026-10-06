/**
 * Cookie / browser-storage consent. Nothing in the optional categories may run,
 * be injected or persist before the matching consent is recorded here.
 */
export type ConsentCategory = "functional" | "analytics" | "marketing";

export type ConsentPrefs = {
  necessary: true;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
};

export type ConsentRecord = { v: number; at: string; prefs: ConsentPrefs };

export const CONSENT_KEY = "alsatport-consent-v3";
export const CONSENT_VERSION = 3;
export const CONSENT_EVENT = "alsatport:consent";

export const DEFAULT_CONSENT: ConsentPrefs = { necessary: true, functional: false, analytics: false, marketing: false };
export const ALL_CONSENT: ConsentPrefs = { necessary: true, functional: true, analytics: true, marketing: true };

/** Superseded keys that are no longer used by the app. */
const OBSOLETE_KEYS = [
  "alsatport-cookie-consent-v2",
  "alsatport-remember",
  "alsatport-state-v1",
  "alsatport-state-v2",
  "alsatport-state-v3",
  "alsatport-state-v4",
  "alsatport-state-v5",
  "alsatport-state-v6",
  "alsatport-state-v7",
  "alsatport-state-v8",
];

/** Preference keys stored persistently only with functional consent (otherwise per-tab sessionStorage). */
export const FUNCTIONAL_KEYS = ["alsatport-compare-v1", "alsatport-loyalty-seen-v1", "alsatport-special-day-seen-v1"];

export const APP_STATE_KEY = "alsatport-state-v9";

/** Typical first-party cookie prefixes set by analytics / ad tags. */
const ANALYTICS_COOKIE = /^(_ga|_gid|_gat|_hj|_clck|_clsk|_pk_|_vwo|ajs_)/;
const MARKETING_COOKIE = /^(_fbp|_fbc|_gcl|_ttp|_uet|_scid|IDE|test_cookie)/;

function safeLocal(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function safeSession(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export function readConsent(): ConsentRecord | null {
  const ls = safeLocal();
  if (!ls) return null;
  try {
    const raw = ls.getItem(CONSENT_KEY);
    if (!raw) return null;
    const rec = JSON.parse(raw) as ConsentRecord;
    if (!rec || rec.v !== CONSENT_VERSION || !rec.prefs) return null;
    return {
      v: rec.v,
      at: String(rec.at ?? ""),
      prefs: {
        necessary: true,
        functional: rec.prefs.functional === true,
        analytics: rec.prefs.analytics === true,
        marketing: rec.prefs.marketing === true,
      },
    };
  } catch {
    return null;
  }
}

export function hasConsent(category: ConsentCategory): boolean {
  return readConsent()?.prefs[category] === true;
}

function expireCookie(name: string) {
  const host = window.location.hostname;
  const domains = ["", host, `.${host}`, `.${host.split(".").slice(-2).join(".")}`];
  for (const d of domains) {
    document.cookie = `${name}=; Max-Age=0; path=/${d ? `; domain=${d}` : ""}`;
  }
}

/** Removes data belonging to categories that are not (or no longer) consented. */
export function purgeWithoutConsent(prefs: ConsentPrefs) {
  const ls = safeLocal();
  const ss = safeSession();
  if (!prefs.functional && ls) {
    for (const key of FUNCTIONAL_KEYS) {
      const value = ls.getItem(key);
      if (value != null) {
        ss?.setItem(key, value);
        ls.removeItem(key);
      }
    }
    try {
      const raw = ls.getItem(APP_STATE_KEY);
      if (raw) {
        const state = JSON.parse(raw) as Record<string, unknown>;
        if (state.geo) {
          delete state.geo;
          ls.setItem(APP_STATE_KEY, JSON.stringify(state));
        }
      }
    } catch {
      /* ignore corrupt state */
    }
  }
  if (typeof document !== "undefined") {
    for (const part of document.cookie.split(";")) {
      const name = part.split("=")[0]?.trim();
      if (!name) continue;
      if ((!prefs.analytics && ANALYTICS_COOKIE.test(name)) || (!prefs.marketing && MARKETING_COOKIE.test(name))) {
        expireCookie(name);
      }
    }
  }
}

export function removeObsoleteStorage() {
  const ls = safeLocal();
  if (!ls) return;
  for (const key of OBSOLETE_KEYS) ls.removeItem(key);
}

export function writeConsent(prefs: ConsentPrefs): ConsentRecord {
  const rec: ConsentRecord = {
    v: CONSENT_VERSION,
    at: new Date().toISOString(),
    prefs: { ...prefs, necessary: true },
  };
  try {
    safeLocal()?.setItem(CONSENT_KEY, JSON.stringify(rec));
  } catch {
    /* private mode: consent applies to this page view only */
  }
  purgeWithoutConsent(rec.prefs);
  if (rec.prefs.functional) {
    const ls = safeLocal();
    const ss = safeSession();
    for (const key of FUNCTIONAL_KEYS) {
      const value = ss?.getItem(key);
      if (value != null && ls) {
        ls.setItem(key, value);
        ss?.removeItem(key);
      }
    }
  }
  window.dispatchEvent(new CustomEvent<ConsentRecord>(CONSENT_EVENT, { detail: rec }));
  return rec;
}

export function onConsentChange(cb: (rec: ConsentRecord) => void) {
  const handler = (e: Event) => cb((e as CustomEvent<ConsentRecord>).detail);
  window.addEventListener(CONSENT_EVENT, handler);
  return () => window.removeEventListener(CONSENT_EVENT, handler);
}

/** Preference storage: persistent with functional consent, otherwise only for this browser session. */
export const prefStorage = {
  get(key: string): string | null {
    const store = hasConsent("functional") ? safeLocal() : safeSession();
    try {
      return store?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },
  set(key: string, value: string) {
    const store = hasConsent("functional") ? safeLocal() : safeSession();
    try {
      store?.setItem(key, value);
    } catch {
      /* quota / private mode */
    }
  },
};
