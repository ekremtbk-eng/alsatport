import type { MetadataRoute } from "next";
import { brandIcon } from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "AlSatPort",
    short_name: "AlsatPort",
    description: "İlanlara her yerden ulaşın, ücretsiz ilan verin ve fırsatları keşfedin.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "any",
    background_color: "#f5f7f8",
    theme_color: "#00c853",
    lang: "tr",
    dir: "ltr",
    categories: ["shopping", "business", "lifestyle"],
    icons: [
      { src: brandIcon("/favicon-16x16.png"), sizes: "16x16", type: "image/png" },
      { src: brandIcon("/favicon-32x32.png"), sizes: "32x32", type: "image/png" },
      { src: brandIcon("/favicon-48x48.png"), sizes: "48x48", type: "image/png" },
      { src: brandIcon("/icon-192.png"), sizes: "192x192", type: "image/png", purpose: "any" },
      { src: brandIcon("/icon-512.png"), sizes: "512x512", type: "image/png", purpose: "any" },
      { src: brandIcon("/icon-maskable-512.png"), sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: brandIcon("/apple-touch-icon.png"), sizes: "180x180", type: "image/png" },
    ],
    shortcuts: [
      { name: "İlan Ver", url: "/ilan-ver", icons: [{ src: brandIcon("/icon-192.png"), sizes: "192x192" }] },
      { name: "İlan Ara", url: "/ara", icons: [{ src: brandIcon("/icon-192.png"), sizes: "192x192" }] },
    ],
  };
}
