"use client";

import { useCallback, useEffect, useState } from "react";

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
type InstallWindow = Window & { __apInstall?: PromptEvent | null; __apInstalled?: boolean };
type RelatedApp = { platform: string; url?: string; id?: string };

/** Captured by the boot script in app/layout so an early `beforeinstallprompt` is never missed. */
export const INSTALL_EVENT = "ap-installable";

/**
 * Display modes an installed AlSatPort window can run in (manifest `display` / `display_override`).
 * `fullscreen` is left out on purpose: it also matches a normal tab in F11 / video fullscreen.
 */
const APP_DISPLAY_QUERIES = [
  "(display-mode: standalone)",
  "(display-mode: minimal-ui)",
  "(display-mode: window-controls-overlay)",
];

/** True when this page is running inside the installed app (Android, iOS/iPadOS home screen, Windows, macOS). */
export function runningAsInstalledApp(): boolean {
  if (typeof window === "undefined") return false;
  return (
    APP_DISPLAY_QUERIES.some((q) => window.matchMedia(q).matches) ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** The browser fired `appinstalled` during this page load. */
function installedThisLoad(): boolean {
  return typeof window !== "undefined" && !!(window as InstallWindow).__apInstalled;
}

const RELATED_TIMEOUT_MS = 1500;
let relatedCheck: Promise<boolean> | null = null;

/**
 * Chromium can report whether this site's own web app is installed (manifest `related_applications`
 * with platform "webapp"). Other browsers have no such API, so "unknown" is treated as not installed.
 */
export function relatedAppInstalled(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (relatedCheck) return relatedCheck;
  const nav = navigator as Navigator & { getInstalledRelatedApps?: () => Promise<RelatedApp[]> };
  if (typeof nav.getInstalledRelatedApps !== "function") return (relatedCheck = Promise.resolve(false));
  const query = nav
    .getInstalledRelatedApps()
    .then((apps) => apps.some((a) => a.platform === "webapp"))
    .catch(() => false);
  const timeout = new Promise<boolean>((resolve) => window.setTimeout(() => resolve(false), RELATED_TIMEOUT_MS));
  return (relatedCheck = Promise.race([query, timeout]));
}

/** Resolves after every reliable install signal has been checked. */
export async function detectInstalled(): Promise<boolean> {
  if (installedThisLoad() || runningAsInstalledApp()) return true;
  return relatedAppInstalled();
}

export function useInstall() {
  const [canPrompt, setCanPrompt] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    let alive = true;
    const sync = () => {
      setCanPrompt(!!(window as InstallWindow).__apInstall);
      if (installedThisLoad() || runningAsInstalledApp()) setInstalled(true);
    };
    sync();
    void relatedAppInstalled().then((yes) => {
      if (alive && yes) setInstalled(true);
    });
    window.addEventListener(INSTALL_EVENT, sync);
    const media = APP_DISPLAY_QUERIES.map((q) => window.matchMedia(q));
    media.forEach((m) => m.addEventListener("change", sync));
    return () => {
      alive = false;
      window.removeEventListener(INSTALL_EVENT, sync);
      media.forEach((m) => m.removeEventListener("change", sync));
    };
  }, []);

  /** Opens the browser's own install dialog. Accepting it is not proof of installation; `appinstalled` is. */
  const prompt = useCallback(async () => {
    const w = window as InstallWindow;
    const ev = w.__apInstall;
    if (!ev) return "unavailable" as const;
    w.__apInstall = null;
    setCanPrompt(false);
    window.dispatchEvent(new Event(INSTALL_EVENT));
    await ev.prompt();
    const { outcome } = await ev.userChoice;
    return outcome;
  }, []);

  return { canPrompt, installed, prompt };
}
