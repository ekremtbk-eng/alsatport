/**
 * Native app distribution. Every `url` stays null until a real, published build exists:
 * the footer shows "Yakında" for null entries and never links to a placeholder store page or file.
 * Only official store listings or files served from alsatport.com belong here.
 */
export type AppTargetId = "play" | "apk" | "appstore" | "mac" | "windows" | "linux";
export type AppGroupId = "android" | "apple" | "desktop";

export type AppTarget = {
  id: AppTargetId;
  group: AppGroupId;
  /** i18n key of the platform name. */
  nameKey: string;
  /** i18n key of the store / package line under the name. */
  subKey: string;
  url: string | null;
};

export const APP_TARGETS: readonly AppTarget[] = [
  { id: "play", group: "android", nameKey: "apps.t.play", subKey: "apps.s.play", url: null },
  { id: "apk", group: "android", nameKey: "apps.t.apk", subKey: "apps.s.apk", url: null },
  { id: "appstore", group: "apple", nameKey: "apps.t.ios", subKey: "apps.s.appstore", url: null },
  { id: "mac", group: "apple", nameKey: "apps.t.mac", subKey: "apps.s.mac", url: null },
  { id: "windows", group: "desktop", nameKey: "apps.t.windows", subKey: "apps.s.desktop", url: null },
  { id: "linux", group: "desktop", nameKey: "apps.t.linux", subKey: "apps.s.desktop", url: null },
];

export const APP_GROUPS: readonly { id: AppGroupId; titleKey: string; targets: AppTargetId[] }[] = [
  { id: "android", titleKey: "apps.g.android", targets: ["play", "apk"] },
  { id: "apple", titleKey: "apps.g.apple", targets: ["appstore", "mac"] },
  { id: "desktop", titleKey: "apps.g.desktop", targets: ["windows", "mac", "linux"] },
];

const ALLOWED_HOSTS = new Set(["play.google.com", "apps.apple.com", "alsatport.com", "www.microsoft.com", "apps.microsoft.com", "flathub.org", "snapcraft.io"]);

/** Defense in depth: a configured URL is used only if it is https on an official store or our own domain. */
export function safeAppUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === "https:" && ALLOWED_HOSTS.has(u.hostname) ? u.toString() : null;
  } catch {
    return null;
  }
}
