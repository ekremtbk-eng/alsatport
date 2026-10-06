"use client";

import { RECAPTCHA_TOKEN_MAX, type RecaptchaAction } from "@/lib/security/recaptcha";

type GrecaptchaApi = {
  ready: (cb: () => void) => void;
  execute: (siteKey: string, options: { action: string }) => Promise<string>;
  enterprise?: {
    ready?: (cb: () => void) => void;
    execute: (siteKey: string, options: { action: string }) => Promise<string>;
  };
};

declare global {
  interface Window {
    grecaptcha?: GrecaptchaApi;
  }
}

function siteKey() {
  return (process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? "").trim();
}

function api(): GrecaptchaApi | undefined {
  const g = window.grecaptcha;
  if (g?.enterprise?.execute) return g;
  if (g?.execute) return g;
  return undefined;
}

function ensureScript(key: string) {
  if (api()) return;
  const src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(key)}`;
  const found = document.querySelectorAll("script[src]");
  for (const node of found) {
    const href = (node as HTMLScriptElement).src;
    if (href.includes("recaptcha/api.js")) return;
  }
  const script = document.createElement("script");
  script.src = src;
  script.async = true;
  script.defer = true;
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
        const ready = g.enterprise?.ready ?? g.ready;
        if (typeof ready === "function") {
          ready.call(g.enterprise ?? g, () => resolve(g));
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

export async function executeRecaptcha(action: RecaptchaAction): Promise<string | null> {
  const key = siteKey();
  if (!key || typeof window === "undefined") {
    diag({ scriptLoaded: false, grecaptchaReady: false, tokenGenerated: false, reason: "missing-site-key" });
    return null;
  }
  ensureScript(key);
  const g = await waitForGrecaptcha(12_000);
  if (!g) {
    diag({
      scriptLoaded: !!document.querySelector('script[src*="recaptcha/api.js"]'),
      grecaptchaReady: false,
      tokenGenerated: false,
      reason: "grecaptcha-not-ready",
    });
    return null;
  }
  const run = g.enterprise?.execute ?? g.execute;
  try {
    const token = await run.call(g.enterprise ?? g, key, { action });
    const value = typeof token === "string" ? token.trim() : "";
    const ok = value.length >= 20 && value.length <= RECAPTCHA_TOKEN_MAX;
    diag({
      scriptLoaded: true,
      grecaptchaReady: true,
      tokenGenerated: ok,
      tokenLength: value.length,
      action,
    });
    return ok ? value : null;
  } catch (err) {
    diag({
      scriptLoaded: true,
      grecaptchaReady: true,
      tokenGenerated: false,
      action,
      reason: "execute-failed",
      errorName: err instanceof Error ? err.name : "unknown",
    });
    return null;
  }
}
