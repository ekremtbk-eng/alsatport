import type { MetadataRoute } from "next";
import { brandIcon } from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AlSatPort",
    short_name: "AlsatPort",
    description: "AlsatPort ilan ve alışveriş platformu",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f7f8",
    theme_color: "#00c853",
    lang: "tr",
    icons: [
      { src: brandIcon("/favicon-16x16.png"), sizes: "16x16", type: "image/png" },
      { src: brandIcon("/favicon-32x32.png"), sizes: "32x32", type: "image/png" },
      { src: brandIcon("/favicon-48x48.png"), sizes: "48x48", type: "image/png" },
      { src: brandIcon("/icon-192.png"), sizes: "192x192", type: "image/png", purpose: "any" },
      { src: brandIcon("/icon-512.png"), sizes: "512x512", type: "image/png", purpose: "any" },
      { src: brandIcon("/icon-maskable-512.png"), sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: brandIcon("/apple-touch-icon.png"), sizes: "180x180", type: "image/png" },
    ],
  };
}
