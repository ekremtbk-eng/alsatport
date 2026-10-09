import { BRAND_LOGO_DARK, BRAND_LOGO_LIGHT, BRAND_LOGO_SRC, BRAND_MARK_SRC } from "@/lib/brand";

export type BrandKitFile = { label: string; src: string; download: string; type: "PNG" | "JPG" | "ICO" };
export type BrandKitItem = {
  id: string;
  title: string;
  note: string;
  /** Surface the asset is designed for; the preview uses it. */
  surface: "light" | "dark" | "neutral";
  size: string;
  preview: string;
  files: BrandKitFile[];
};

/**
 * Only the brand files the live site already uses (header, favicon, app icon, share image).
 * Nothing here is redrawn or generated; downloads point straight at the files in /public.
 */
export const BRAND_KIT: BrandKitItem[] = [
  {
    id: "logo",
    title: "Logo — açık zemin",
    note: "Şeffaf arka planlı ana logo. Sitenin üst menüsünde kullanılır.",
    surface: "light",
    size: `${BRAND_LOGO_LIGHT.width} × ${BRAND_LOGO_LIGHT.height} px`,
    preview: BRAND_LOGO_LIGHT.src,
    files: [{ label: "PNG indir", src: BRAND_LOGO_LIGHT.src, download: "alsatport-logo.png", type: "PNG" }],
  },
  {
    id: "logo-dark",
    title: "Logo — koyu zemin",
    note: "Şeffaf arka planlı, beyaz yazılı logo. Koyu ve yeşil zeminler içindir.",
    surface: "dark",
    size: `${BRAND_LOGO_DARK.width} × ${BRAND_LOGO_DARK.height} px`,
    preview: BRAND_LOGO_DARK.src,
    files: [{ label: "PNG indir", src: BRAND_LOGO_DARK.src, download: "alsatport-logo-dark.png", type: "PNG" }],
  },
  {
    id: "icon",
    title: "Uygulama ikonu",
    note: "Yuvarlatılmış köşeli, şeffaf kenarlı uygulama ve web uygulaması ikonu.",
    surface: "neutral",
    size: "512 × 512 px",
    preview: BRAND_MARK_SRC,
    files: [{ label: "PNG indir", src: BRAND_MARK_SRC, download: "alsatport-icon.png", type: "PNG" }],
  },
  {
    id: "icon-square",
    title: "Kare ikon",
    note: "Sosyal medya profil görselleri için kare ikon.",
    surface: "neutral",
    size: "512 × 512 px",
    preview: BRAND_LOGO_SRC,
    files: [{ label: "JPG indir", src: BRAND_LOGO_SRC, download: "alsatport-icon-square.jpg", type: "JPG" }],
  },
  {
    id: "favicon",
    title: "Favicon",
    note: "Tarayıcı sekmesinde görünen site ikonu.",
    surface: "neutral",
    size: "16–48 px",
    preview: "/favicon-48x48.png",
    files: [
      { label: "ICO indir", src: "/favicon.ico", download: "alsatport-favicon.ico", type: "ICO" },
      { label: "PNG indir", src: "/favicon-48x48.png", download: "alsatport-favicon-48.png", type: "PNG" },
    ],
  },
  {
    id: "social",
    title: "Paylaşım görseli",
    note: "Bağlantı paylaşımlarında görünen kapak görseli.",
    surface: "dark",
    size: "1200 × 630 px",
    preview: "/og.png",
    files: [{ label: "PNG indir", src: "/og.png", download: "alsatport-social-cover.png", type: "PNG" }],
  },
];

export const BRAND_KIT_SLOGAN = "Al, Sat, Keşfet!";
