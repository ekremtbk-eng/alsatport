"use client";

import type { RecaptchaAction } from "@/lib/security/recaptcha";

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

function siteKey() {
  return (process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? "").trim();
}

function waitForGrecaptcha(ms: number) {
  return new Promise<boolean>((resolve) => {
    const started = Date.now();
    const tick = () => {
      if (window.grecaptcha?.execute) {
        window.grecaptcha.ready(() => resolve(true));
        return;
      }
      if (Date.now() - started >= ms) {
        resolve(false);
        return;
      }
      window.setTimeout(tick, 50);
    };
    tick();
  });
}

export async function executeRecaptcha(action: RecaptchaAction): Promise<string | null> {
  const key = siteKey();
  if (!key || typeof window === "undefined") return null;
  const ready = await waitForGrecaptcha(10_000);
  if (!ready || !window.grecaptcha) return null;
  try {
    return await window.grecaptcha.execute(key, { action });
  } catch {
    return null;
  }
}
