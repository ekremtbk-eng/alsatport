"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Check,
  Download,
  EllipsisVertical,
  Globe,
  Megaphone,
  MonitorDown,
  MousePointerClick,
  Search,
  Share,
  SquarePlus,
  Zap,
  X,
  type LucideIcon,
} from "lucide-react";
import { useI18n } from "@/context/I18nContext";
import { nativeAppUrl } from "@/data/appDistribution";
import { BRAND_MARK_SRC, BRAND_NAME } from "@/lib/brand";
import { detectPlatform, installPath, type InstallPath, type PlatformInfo } from "@/lib/pwa/platform";
import { useInstall } from "@/lib/pwa/useInstall";
import { rememberWelcome, screenBusy, welcomeAllowedOn, welcomeDecided, type WelcomeChoice } from "@/lib/pwa/installWelcome";

const FIRST_DELAY_MS = 2500;
const RETRY_MS = 2000;

type Guide = Exclude<InstallPath, "prompt" | "unsupported">;
type View = "intro" | Guide | "unsupported";

const GUIDES: Record<Guide, { titleKey: string; leadKey: string; steps: { icon: LucideIcon; key: string }[] }> = {
  "ios-share": {
    titleKey: "iw.g.ios",
    leadKey: "iw.g.lead",
    steps: [
      { icon: Share, key: "iw.ios.1" },
      { icon: SquarePlus, key: "iw.ios.2" },
      { icon: Check, key: "iw.ios.3" },
    ],
  },
  "android-menu": {
    titleKey: "iw.g.android",
    leadKey: "iw.g.lead",
    steps: [
      { icon: EllipsisVertical, key: "iw.and.1" },
      { icon: Download, key: "iw.and.2" },
      { icon: Check, key: "iw.and.3" },
    ],
  },
  "desktop-menu": {
    titleKey: "iw.g.desktop",
    leadKey: "iw.g.leadDesk",
    steps: [
      { icon: MonitorDown, key: "iw.desk.1" },
      { icon: EllipsisVertical, key: "iw.desk.2" },
      { icon: Check, key: "iw.desk.3" },
    ],
  },
  "mac-safari": {
    titleKey: "iw.g.mac",
    leadKey: "iw.g.leadDesk",
    steps: [
      { icon: MousePointerClick, key: "iw.mac.1" },
      { icon: SquarePlus, key: "iw.mac.2" },
      { icon: Check, key: "iw.mac.3" },
    ],
  },
};

/** Stops a second opening in this tab even when localStorage is unavailable. */
let handledThisLoad = false;

export function InstallWelcome() {
  const { t } = useI18n();
  const path = usePathname();
  const { canPrompt, installed, prompt } = useInstall();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("intro");
  const [info, setInfo] = useState<PlatformInfo | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLElement | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const installedRef = useRef(installed);
  installedRef.current = installed;

  useEffect(() => {
    const uaData = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData;
    setInfo(detectPlatform(navigator.userAgent, uaData?.platform ?? "", navigator.maxTouchPoints || 0));
  }, []);

  useEffect(() => {
    if (open || handledThisLoad || !welcomeAllowedOn(path) || welcomeDecided()) return;
    let timer = 0;
    const attempt = () => {
      if (handledThisLoad || welcomeDecided() || installedRef.current) return;
      if (screenBusy()) {
        timer = window.setTimeout(attempt, RETRY_MS);
        return;
      }
      handledThisLoad = true;
      returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setView("intro");
      setOpen(true);
    };
    timer = window.setTimeout(attempt, FIRST_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [path, open]);

  const close = useCallback((choice?: WelcomeChoice) => {
    if (choice) rememberWelcome(choice);
    setOpen(false);
    const back = returnFocusRef.current;
    if (back && document.contains(back)) back.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const body = document.body;
    const y = window.scrollY;
    const prevBody = body.getAttribute("style");
    root.classList.add("iw-lock");
    // iOS Safari ignores overflow:hidden for touch scrolling; pinning the body is the reliable lock.
    Object.assign(body.style, { position: "fixed", top: `-${y}px`, left: "0", right: "0", width: "100%" });
    primaryRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close("dismissed");
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const items = [...dialogRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])")];
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      } else if (!dialogRef.current.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      root.classList.remove("iw-lock");
      if (prevBody === null) body.removeAttribute("style");
      else body.setAttribute("style", prevBody);
      window.scrollTo({ top: y, behavior: "instant" });
    };
  }, [open, close]);

  useEffect(() => {
    if (open && view !== "intro") primaryRef.current?.focus({ preventScroll: true });
  }, [open, view]);

  useEffect(() => {
    if (open && installed) close();
  }, [open, installed, close]);

  if (!open || !info) return null;

  const platform = info.platform;
  const nativeUrl = nativeAppUrl(platform);

  function onDownload() {
    rememberWelcome("install");
    if (canPrompt) {
      close();
      void prompt();
      return;
    }
    const next = installPath(info!, false);
    setView(next === "prompt" ? "unsupported" : next);
  }

  const guide = view !== "intro" && view !== "unsupported" ? GUIDES[view] : null;
  const showIosBrowserNote = view === "ios-share" && !info.isSafari;

  return (
    <div className="iw-overlay">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="iw-title"
        aria-describedby="iw-desc"
        className="iw-card"
        data-platform={platform}
      >
        <button type="button" className="iw-x" aria-label={t("common.close")} onClick={() => close("dismissed")}>
          <X aria-hidden="true" strokeWidth={2.6} />
        </button>

        <div className="iw-scroll">
          <div className="iw-hero" aria-hidden="true">
            <span className="iw-ring iw-ring-a" />
            <span className="iw-ring iw-ring-b" />
            <span className="iw-mark">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={BRAND_MARK_SRC} alt="" width={72} height={72} />
            </span>
            <span className="iw-brand">{BRAND_NAME}</span>
          </div>

          <div className="iw-body">
            {view === "intro" ? (
              <>
                <h2 id="iw-title" className="iw-title">
                  {t("iw.title")}
                </h2>
                <p id="iw-desc" className="iw-desc">
                  {t("iw.desc")}
                </p>
                <ul className="iw-perks">
                  <li>
                    <Megaphone aria-hidden="true" />
                    {t("iw.perk.post")}
                  </li>
                  <li>
                    <Search aria-hidden="true" />
                    {t("iw.perk.find")}
                  </li>
                  <li>
                    <Zap aria-hidden="true" />
                    {t("iw.perk.tap")}
                  </li>
                </ul>
                {nativeUrl ? (
                  <a
                    ref={(el) => {
                      primaryRef.current = el;
                    }}
                    href={nativeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="iw-cta"
                    onClick={() => close("install")}
                  >
                    <Download aria-hidden="true" />
                    {t("iw.download")}
                  </a>
                ) : (
                  <button
                    ref={(el) => {
                      primaryRef.current = el;
                    }}
                    type="button"
                    className="iw-cta"
                    onClick={onDownload}
                  >
                    <Download aria-hidden="true" />
                    {t("iw.download")}
                  </button>
                )}
                {nativeUrl ? null : <p className="iw-note iw-note-web">{t("iw.note.web")}</p>}
                <button type="button" className="iw-later" onClick={() => close("later")}>
                  {t("iw.later")}
                </button>
              </>
            ) : guide ? (
              <>
                <h2 id="iw-title" className="iw-title">
                  {t(guide.titleKey)}
                </h2>
                <p id="iw-desc" className="iw-desc">
                  {t(guide.leadKey)}
                </p>
                <ol className="iw-steps">
                  {guide.steps.map(({ icon: Icon, key }, i) => (
                    <li key={key}>
                      <span className="iw-step-n" aria-hidden="true">
                        {i + 1}
                      </span>
                      <span className="iw-step-ico" aria-hidden="true">
                        <Icon />
                      </span>
                      <span className="iw-step-text">{t(key)}</span>
                    </li>
                  ))}
                </ol>
                {showIosBrowserNote ? <p className="iw-note">{t("iw.ios.other")}</p> : null}
                <button
                  ref={(el) => {
                    primaryRef.current = el;
                  }}
                  type="button"
                  className="iw-cta"
                  onClick={() => close()}
                >
                  {t("iw.gotIt")}
                </button>
              </>
            ) : (
              <>
                <h2 id="iw-title" className="iw-title">
                  {t("iw.un.title")}
                </h2>
                <p id="iw-desc" className="iw-desc">
                  {t("iw.un.text")}
                </p>
                <button
                  ref={(el) => {
                    primaryRef.current = el;
                  }}
                  type="button"
                  className="iw-cta"
                  onClick={() => close()}
                >
                  <Globe aria-hidden="true" />
                  {t("iw.continue")}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
