"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { brandIcon } from "@/lib/brand";
import { Check, Download, Info } from "lucide-react";
import { useI18n } from "@/context/I18nContext";
import { SOCIAL_ACCOUNTS } from "@/data/legal";
import { APP_GROUPS, APP_TARGETS, safeAppUrl, type AppGroupId } from "@/data/appDistribution";
import { detectPlatform, installPath, type DevicePlatform, type PlatformInfo } from "@/lib/pwa/platform";
import { useInstall } from "@/lib/pwa/useInstall";
import { AppTargetIcon, SocialIcon } from "@/components/BrandIcons";

const PLATFORM_NAME: Record<DevicePlatform, string> = {
  android: "Android",
  ios: "iPhone / iPad",
  windows: "Windows",
  mac: "Mac",
  linux: "Linux",
  other: "",
};

const PLATFORM_GROUP: Record<DevicePlatform, AppGroupId | null> = {
  android: "android",
  ios: "apple",
  mac: "apple",
  windows: "desktop",
  linux: "desktop",
  other: null,
};

const HELP_KEY = {
  "ios-share": "apps.help.ios",
  "mac-safari": "apps.help.mac",
  "android-menu": "apps.help.android",
  "desktop-menu": "apps.help.desktop",
  unsupported: "apps.help.unsupported",
} as const;

export function FooterApps() {
  const { t } = useI18n();
  const { canPrompt, installed, prompt } = useInstall();
  const [info, setInfo] = useState<PlatformInfo | null>(null);
  const [help, setHelp] = useState<string | null>(null);

  useEffect(() => {
    const uaData = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData;
    setInfo(detectPlatform(navigator.userAgent, uaData?.platform ?? "", navigator.maxTouchPoints || 0));
  }, []);

  const platform = info?.platform ?? "other";
  const current = PLATFORM_GROUP[platform];
  const groups = useMemo(
    () => (current ? [...APP_GROUPS].sort((a, b) => Number(b.id === current) - Number(a.id === current)) : APP_GROUPS),
    [current],
  );

  async function onInstall() {
    if (installed) {
      setHelp(t("apps.help.installed"));
      return;
    }
    if (canPrompt) {
      setHelp(null);
      await prompt();
      return;
    }
    const path = info ? installPath(info, false) : "unsupported";
    setHelp(t(HELP_KEY[path as keyof typeof HELP_KEY] ?? "apps.help.unsupported"));
  }

  return (
    <section className="ft-apps" aria-labelledby="ft-apps-title" data-platform={platform}>
      <div className="ft-follow">
        <h2 className="ft-h">{t("apps.follow")}</h2>
        <ul className="ft-soc-list">
          {SOCIAL_ACCOUNTS.map((a) => (
            <li key={a.id}>
              {a.url ? (
                <a className="ft-soc" href={a.url} target="_blank" rel="noopener noreferrer" aria-label={a.label} title={a.label}>
                  <SocialIcon id={a.id} />
                </a>
              ) : (
                <span className="ft-soc is-soon" role="img" aria-label={`${a.label} · ${t("apps.soon")}`} title={`${a.label} · ${t("apps.soon")}`}>
                  <SocialIcon id={a.id} />
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="ft-get">
        <div className="ft-get-head">
          <h2 id="ft-apps-title" className="ft-h ft-h-lg">
            {t("apps.title")}
          </h2>
          <p>{t("apps.sub")}</p>
        </div>

        <div className="ft-web">
          <Image src={brandIcon("/icon-192.png")} alt="" width={44} height={44} className="ft-web-ico" unoptimized />
          <div className="ft-web-text">
            <strong>{t("apps.web.title")}</strong>
            <span>
              {PLATFORM_NAME[platform] ? t("apps.web.for", { p: PLATFORM_NAME[platform] }) : t("apps.web.any")}
              {" · "}
              {t("apps.web.note")}
            </span>
          </div>
          <button type="button" className={`ft-web-btn ${installed ? "is-done" : ""}`} onClick={onInstall}>
            {installed ? <Check aria-hidden="true" /> : canPrompt ? <Download aria-hidden="true" /> : <Info aria-hidden="true" />}
            {installed ? t("apps.installed") : canPrompt ? t("apps.install") : t("apps.how")}
          </button>
        </div>
        {help ? (
          <p className="ft-help" role="status">
            {help}
          </p>
        ) : null}

        <h3 className="ft-all-h">{t("apps.all")}</h3>
        <div className="ft-groups">
          {groups.map((g) => (
            <div key={g.id} className={`ft-group ${g.id === current ? "is-current" : ""}`}>
              <h4>
                {t(g.titleKey)}
                {g.id === current ? <span className="ft-you">{t("apps.yours")}</span> : null}
              </h4>
              <ul>
                {g.targets.map((id) => {
                  const target = APP_TARGETS.find((x) => x.id === id)!;
                  const url = safeAppUrl(target.url);
                  return (
                    <li key={id} className="ft-target">
                      <span className="ft-target-ico">
                        <AppTargetIcon id={id} />
                      </span>
                      <span className="ft-target-text">
                        <strong>{t(target.nameKey)}</strong>
                        <small>{t(target.subKey)}</small>
                      </span>
                      {url ? (
                        <a className="ft-target-btn" href={url} target="_blank" rel="noopener noreferrer">
                          {t("apps.get")}
                        </a>
                      ) : (
                        <span className="ft-soon">{t("apps.soon")}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
