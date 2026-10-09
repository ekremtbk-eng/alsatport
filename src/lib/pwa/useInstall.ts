"use client";

import { useCallback, useEffect, useState } from "react";

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
type InstallWindow = Window & { __apInstall?: PromptEvent | null; __apInstalled?: boolean };

/** Captured by the boot script in app/layout so an early `beforeinstallprompt` is never missed. */
export const INSTALL_EVENT = "ap-installable";

function standalone() {
  if (typeof window === "undefined") return false;
  const w = window as InstallWindow;
  return (
    !!w.__apInstalled ||
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: window-controls-overlay)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function useInstall() {
  const [canPrompt, setCanPrompt] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const sync = () => {
      setCanPrompt(!!(window as InstallWindow).__apInstall);
      setInstalled(standalone());
    };
    sync();
    window.addEventListener(INSTALL_EVENT, sync);
    return () => window.removeEventListener(INSTALL_EVENT, sync);
  }, []);

  const prompt = useCallback(async () => {
    const w = window as InstallWindow;
    const ev = w.__apInstall;
    if (!ev) return "unavailable" as const;
    w.__apInstall = null;
    setCanPrompt(false);
    await ev.prompt();
    const { outcome } = await ev.userChoice;
    if (outcome === "accepted") setInstalled(true);
    return outcome;
  }, []);

  return { canPrompt, installed, prompt };
}
