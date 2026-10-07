import type { MetadataRoute } from "next";
import { appOrigin } from "@/lib/site";

/**
 * One group for every crawler: a bot only obeys its most specific group, so a separate Googlebot
 * block would silently drop every rule listed here.
 */
export default function robots(): MetadataRoute.Robots {
  const origin = appOrigin();
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/api/media/"],
        disallow: [
          "/admin",
          "/api/",
          "/profil",
          "/mesajlar",
          "/ilan-ver",
          "/ilanlarim",
          "/odeme",
          "/favoriler",
          "/bildirimler",
          "/bildirim-ayarlari",
          "/hesap-tamamla",
          "/eposta-dogrula",
          "/sifre-sifirla",
          "/karsilastir",
          "/qr",
          "/*?*marka=",
          "/*?*priceMin=",
          "/*?*priceMax=",
          "/*?*kimden=",
          "/*?*sira=",
          "/*?*gorunum=",
          "/*?*next=",
        ],
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
  };
}
