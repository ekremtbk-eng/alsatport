"use client";

import { RECAPTCHA_TOKEN_MAX, type RecaptchaAction } from "@/lib/security/recaptcha";

type GrecaptchaApi = {
  ready: (cb: () => void) => void;
  execute: (siteKey: string, options: { action: string }) => Promise<string>;
};

type GrecaptchaCfg = {
  clients?: Record<string, unknown>;
};

declare global {
  interface Window {
    grecaptcha?: GrecaptchaApi;
    ___grecaptcha_cfg?: GrecaptchaCfg;
  }
}

function siteKey() {
  return (process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? "").trim();
}

function api(): GrecaptchaApi | undefined {
  const g = window.grecaptcha;
  if (g?.execute) return g;
  return undefined;
}

/** Google keys clients by numeric widget id (e.g. "100000"), not by the site key string. */
function clientCount() {
  const clients = window.___grecaptcha_cfg?.clients;
  if (!clients) return 0;
  return Object.keys(clients).length;
}

function ensureScript(key: string) {
  const wanted = `render=${encodeURIComponent(key)}`;
  const found = document.querySelectorAll("script[src]");
  for (const node of found) {
    const el = node as HTMLScriptElement;
    const href = el.src;
    if (!href.includes("recaptcha/api.js")) continue;
    if (href.includes(wanted) || href.includes(`render=${key}`)) return;
    // Stale loader without this site key — remove so Google can register the current key.
    el.remove();
    break;
  }
  const script = document.createElement("script");
  script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(key)}`;
  script.async = true;
  script.defer = true;
  const nonce = document.querySelector("script[nonce]")?.getAttribute("nonce");
  if (nonce) script.setAttribute("nonce", nonce);
  document.head.appendChild(script);
}

/** Loads reCAPTCHA only where it is needed (the sign-up form), never site-wide. */
export function preloadRecaptcha() {
  const key = siteKey();
  if (key && typeof window !== "undefined") ensureScript(key);
}

function waitForGrecaptcha(ms: number) {
  return new Promise<GrecaptchaApi | null>((resolve) => {
    const started = Date.now();
    const tick = () => {
      const g = api();
      if (g) {
        if (typeof g.ready === "function") {
          g.ready(() => resolve(g));
          return;
        }
        resolve(g);
        return;
      }
      if (Date.now() - started >= ms) {
        resolve(null);
        return;
      }
      window.setTimeout(tick, 50);
    };
    tick();
  });
}

function diag(payload: Record<string, unknown>) {
  console.info("[recaptcha]", payload);
}

function classifyExecuteError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/invalid site key/i.test(msg)) return "invalid-site-key";
  if (/not loaded in api\.js/i.test(msg)) return "site-key-not-registered";
  return "execute-failed";
}

/**
 * Produces a fresh v3 token on every call. Callers must not cache or reuse the result
 * across registration attempts (Google rejects expired / already-used tokens).
 */
export async function executeRecaptcha(action: RecaptchaAction): Promise<string | null> {
  const key = siteKey();
  if (!key || typeof window === "undefined") {
    diag({
      stage: "client",
      scriptLoaded: false,
      grecaptchaReady: false,
      tokenGenerated: false,
      reason: "missing-site-key",
    });
    return null;
  }
  ensureScript(key);
  const g = await waitForGrecaptcha(12_000);
  if (!g) {
    diag({
      stage: "client",
      scriptLoaded: !!document.querySelector('script[src*="recaptcha/api.js"]'),
      grecaptchaReady: false,
      tokenGenerated: false,
      clientCount: clientCount(),
      reason: "grecaptcha-not-ready",
    });
    return null;
  }
  // Do NOT require clients[siteKey]: Google registers under numeric ids. Always execute()
  // for a fresh token; invalid/deleted keys throw and are classified below.
  try {
    const token = await g.execute(key, { action });
    const value = typeof token === "string" ? token.trim() : "";
    const ok = value.length >= 20 && value.length <= RECAPTCHA_TOKEN_MAX;
    diag({
      stage: "client",
      scriptLoaded: true,
      grecaptchaReady: true,
      tokenGenerated: ok,
      tokenLength: value.length,
      clientCount: clientCount(),
      action,
      reason: ok ? "ok" : "empty-or-short-token",
    });
    return ok ? value : null;
  } catch (err) {
    diag({
      stage: "client",
      scriptLoaded: true,
      grecaptchaReady: true,
      tokenGenerated: false,
      clientCount: clientCount(),
      action,
      reason: classifyExecuteError(err),
      errorName: err instanceof Error ? err.name : "unknown",
    });
    return null;
  }
}
