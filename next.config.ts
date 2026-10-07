import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD, PHASE_PRODUCTION_SERVER } from "next/constants";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self), payment=()" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  { key: "X-XSS-Protection", value: "0" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

/** Auth, account and utility screens: never indexed even if a URL leaks into a crawl. */
const NOINDEX_PATHS = [
  "/giris",
  "/kayit",
  "/welcome",
  "/sifre-unuttum",
  "/sifre-sifirla",
  "/eposta-dogrula",
  "/hesap-tamamla",
  "/profil",
  "/profil/:path*",
  "/mesajlar",
  "/mesajlar/:path*",
  "/favoriler",
  "/bildirimler",
  "/bildirim-ayarlari",
  "/ilanlarim",
  "/ilanlarim/:path*",
  "/ilan-ver",
  "/ilan-ver/:path*",
  "/odeme",
  "/odeme/:path*",
  "/karsilastir",
  "/qr",
  "/qr/:path*",
  "/admin",
  "/admin/:path*",
  "/paketler",
];
/** Public but thin/duplicate pages: links are followed, the page itself stays out of the index. */
const NOINDEX_FOLLOW_PATHS = ["/satici/:path*", "/ustalar-hizmetler/firma/:path*"];

const flag = (on: unknown) => (on ? "1" : "");
const has = (...names: string[]) => names.every((n) => (process.env[n] ?? "").trim() !== "");
const smtpPass = has("SMTP_PASS") || has("SMTP_PASSWORD") || has("MAIL_PASS");

/** Public legal identity + which processors are configured (booleans only, never secrets). */
const legalEnv: Record<string, string> = {
  LEGAL_DATA_CONTROLLER_NAME: process.env.LEGAL_DATA_CONTROLLER_NAME ?? "",
  LEGAL_CONTACT_EMAIL: process.env.LEGAL_CONTACT_EMAIL ?? "",
  LEGAL_ADDRESS: process.env.LEGAL_ADDRESS ?? "",
  LEGAL_LAST_UPDATED: process.env.LEGAL_LAST_UPDATED ?? "",
  LEGAL_SVC_GOOGLE: flag(
    has("GOOGLE_CLIENT_SECRET") &&
      /^\d+-[a-z0-9]+\.apps\.googleusercontent\.com$/i.test((process.env.GOOGLE_CLIENT_ID ?? "").trim().replace(/^["']|["']$/g, "")),
  ),
  LEGAL_SVC_APPLE: flag(has("APPLE_CLIENT_ID", "APPLE_TEAM_ID", "APPLE_KEY_ID", "APPLE_PRIVATE_KEY")),
  LEGAL_SVC_RECAPTCHA: flag(has("NEXT_PUBLIC_RECAPTCHA_SITE_KEY", "RECAPTCHA_SECRET_KEY")),
  LEGAL_SVC_RESEND: flag(has("RESEND_API_KEY")),
  LEGAL_SVC_SMTP: flag(smtpPass),
  LEGAL_SVC_SMTP_HOST: smtpPass ? (process.env.SMTP_HOST ?? "").trim() || "smtp.hostinger.com" : "",
  LEGAL_SVC_BLOB: flag(has("BLOB_READ_WRITE_TOKEN")),
  LEGAL_SVC_SIGHTENGINE: flag(has("SIGHTENGINE_API_USER", "SIGHTENGINE_API_SECRET")),
  LEGAL_SVC_NEON: flag(/neon\.tech/i.test(process.env.DATABASE_URL ?? "")),
  LEGAL_SVC_VERCEL: flag(process.env.VERCEL === "1"),
};

const REQUIRED_LEGAL = ["LEGAL_DATA_CONTROLLER_NAME", "LEGAL_ADDRESS", "LEGAL_CONTACT_EMAIL"] as const;
function warnMissingLegal() {
  const missingLegal = REQUIRED_LEGAL.filter((n) => !has(n));
  if (!missingLegal.length) return;
  const bar = "!".repeat(78);
  console.warn(
    [
      "",
      bar,
      "!! UYARI / WARNING: Yasal kimlik bilgileri eksik (KVKK aydınlatma metni için zorunlu).",
      `!! Eksik env: ${missingLegal.join(", ")}`,
      "!! KVKK, Gizlilik ve Çerez sayfaları veri sorumlusu kimliği olmadan yayınlanacak.",
      "!! Production'a çıkmadan önce bu değişkenleri gerçek bilgilerle doldurun.",
      bar,
      "",
    ].join("\n"),
  );
}

const nextConfig: NextConfig = {
  env: legalEnv,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "plus.unsplash.com" },
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
      { protocol: "https", hostname: "*.blob.vercel-storage.com" },
    ],
  },
  poweredByHeader: false,
  serverExternalPackages: ["@prisma/client", "prisma", "@vercel/blob"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      ...NOINDEX_PATHS.map((source) => ({
        source,
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      })),
      ...NOINDEX_FOLLOW_PATHS.map((source) => ({
        source,
        headers: [{ key: "X-Robots-Tag", value: "noindex, follow" }],
      })),
    ];
  },
  async redirects() {
    return [
      { source: "/magazalar", destination: "/", permanent: true },
      { source: "/magazalar/:path*", destination: "/", permanent: true },
    ];
  },
};

export default function config(phase: string): NextConfig {
  if (phase === PHASE_PRODUCTION_BUILD || phase === PHASE_PRODUCTION_SERVER) warnMissingLegal();
  return nextConfig;
}
