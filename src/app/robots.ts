import type { MetadataRoute } from "next";
import { appOrigin } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const origin = appOrigin();
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/kategoriler",
          "/kategoriler/",
          "/ilan/",
          "/ara",
          "/acil",
          "/son-48-saat",
          "/ustalar-hizmetler",
          "/is-ilanlari",
          "/hizmet-vermek-istiyorum",
          "/kurumsal",
          "/gizlilik-politikasi",
          "/kullanim-kosullari",
          "/og.png",
          "/icon-512.png",
          "/favicon.ico",
        ],
        disallow: [
          "/admin",
          "/api/",
          "/profil",
          "/mesajlar",
          "/ilan-ver",
          "/hesap-tamamla",
          "/ilanlarim",
          "/odeme",
          "/favoriler",
          "/bildirimler",
          "/ara?*marka=",
          "/ara?*priceMin=",
          "/ara?*kimden=",
        ],
      },
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: ["/admin", "/api/", "/profil", "/mesajlar", "/ilan-ver", "/odeme"],
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
    host: origin.replace(/^https?:\/\//, ""),
  };
}
