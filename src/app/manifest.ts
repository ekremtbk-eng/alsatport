import type { MetadataRoute } from "next";
import { CANONICAL_ORIGIN } from "@/lib/site";

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
      { src: "/favicon.ico", sizes: "48x48", type: "image/x-icon" },
      { src: "/favicon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { src: "/favicon-48x48.png", sizes: "48x48", type: "image/png" },
      { src: "/icon.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
