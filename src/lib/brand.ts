export const BRAND_MARK_SRC = "/assets/alsatport-mark.png";
export const BRAND_LOGO_SRC = "/assets/alsatport-logo.jpg";
export const BRAND_LOGO_LIGHT = { src: "/assets/alsatport-logo-light.png", width: 377, height: 111 };
export const BRAND_LOGO_DARK = { src: "/assets/alsatport-logo-dark.png", width: 720, height: 220 };
export const BRAND_NAME = "AlSatPort";

/** Bump when icon files change so browsers and crawlers refetch instead of reusing cached favicons. */
export const BRAND_ICON_VERSION = "20261004";

export function brandIcon(path: string) {
  return `${path}?v=${BRAND_ICON_VERSION}`;
}
