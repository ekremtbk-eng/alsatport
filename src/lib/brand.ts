/** Full-resolution mark (brand kit / PWA downloads). */
export const BRAND_MARK_FULL_SRC = "/assets/alsatport-mark.png";
/**
 * Display mark for UI (256² WebP ≈ 2× the largest on-page render).
 * Prefer this over the 512 PNG so LCP is not blocked on a 290KB asset.
 */
export const BRAND_MARK_SRC = "/assets/alsatport-mark-ui.webp";
export const BRAND_MARK = { src: BRAND_MARK_SRC, width: 256, height: 256 } as const;

export const BRAND_LOGO_SRC = "/assets/alsatport-logo.jpg";
/** Intrinsic pixel size of the WebP display asset (matches original light PNG). */
export const BRAND_LOGO_LIGHT = {
  src: "/assets/alsatport-logo-light.webp",
  width: 377,
  height: 111,
} as const;
/** Intrinsic pixel size of the WebP display asset (matches original dark PNG). */
export const BRAND_LOGO_DARK = {
  src: "/assets/alsatport-logo-dark.webp",
  width: 720,
  height: 220,
} as const;
export const BRAND_NAME = "AlSatPort";

/** Bump when icon files change so browsers and crawlers refetch instead of reusing cached favicons. */
export const BRAND_ICON_VERSION = "20261004";

export function brandIcon(path: string) {
  return `${path}?v=${BRAND_ICON_VERSION}`;
}
