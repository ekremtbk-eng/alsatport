/** Third-party processors actually configured for this build (see next.config.ts legalEnv). */
const on = (v: string | undefined) => v === "1";

export const LEGAL_SERVICES = {
  google: on(process.env.LEGAL_SVC_GOOGLE),
  apple: on(process.env.LEGAL_SVC_APPLE),
  recaptcha: on(process.env.LEGAL_SVC_RECAPTCHA),
  resend: on(process.env.LEGAL_SVC_RESEND),
  smtp: on(process.env.LEGAL_SVC_SMTP),
  smtpHost: process.env.LEGAL_SVC_SMTP_HOST ?? "",
  blob: on(process.env.LEGAL_SVC_BLOB),
  sightengine: on(process.env.LEGAL_SVC_SIGHTENGINE),
  neon: on(process.env.LEGAL_SVC_NEON),
  vercel: on(process.env.LEGAL_SVC_VERCEL),
};

export function smtpProviderName(host: string) {
  if (/titan/i.test(host)) return "Titan (Titan Email)";
  if (/hostinger/i.test(host)) return "Hostinger";
  return host;
}

export type LegalProcessor = {
  name: string;
  purpose: string;
  data: string;
  location: string;
};

/** Processors that receive personal data; only those configured in this build. */
export function legalProcessors(): LegalProcessor[] {
  const s = LEGAL_SERVICES;
  const out: LegalProcessor[] = [];
  if (s.vercel) {
    out.push({
      name: "Vercel Inc.",
      purpose: "Web sitesinin ve sunucu uygulamasının barındırılması, içerik dağıtımı",
      data: "Site trafiğine ait teknik veriler (IP adresi, istek bilgileri) ve uygulamanın işlediği tüm veriler",
      location: "Sunucu bölgesi Frankfurt (AB); şirket ABD merkezli",
    });
  }
  if (s.neon) {
    out.push({
      name: "Neon",
      purpose: "Veritabanı barındırma",
      data: "Hesap, profil, ilan, mesaj, favori ve güvenlik kayıtları",
      location: "Bulut veritabanı; şirket ABD merkezli",
    });
  }
  if (s.blob) {
    out.push({
      name: "Vercel Blob (Vercel Inc.)",
      purpose: "İlan görselleri ve profil fotoğraflarının saklanması",
      data: "Yüklediğiniz görseller",
      location: "Bulut depolama; şirket ABD merkezli",
    });
  }
  if (s.google) {
    out.push({
      name: "Google LLC — Google ile giriş",
      purpose: "Google hesabınızla giriş yapmanız",
      data: "Giriş sırasında Google'ın ilettiği Google hesap kimliği, ad-soyad, e-posta adresi ve profil fotoğrafı bağlantısı",
      location: "ABD merkezli",
    });
  }
  if (s.recaptcha) {
    out.push({
      name: "Google LLC — reCAPTCHA",
      purpose: "Üye olma formunda otomatik (bot) kayıtların engellenmesi",
      data: "IP adresi, tarayıcı ve etkileşim bilgileri (Google tarafından toplanır)",
      location: "ABD merkezli",
    });
  }
  if (s.resend) {
    out.push({
      name: "Resend",
      purpose: "Doğrulama kodu, şifre sıfırlama ve bilgilendirme e-postalarının gönderilmesi",
      data: "E-posta adresi ve e-postanın içeriği",
      location: "ABD merkezli",
    });
  }
  if (s.smtp) {
    out.push({
      name: smtpProviderName(s.smtpHost),
      purpose: "Doğrulama kodu, şifre sıfırlama ve bilgilendirme e-postalarının gönderilmesi (e-posta sunucusu)",
      data: "E-posta adresi ve e-postanın içeriği",
      location: "E-posta barındırma hizmeti",
    });
  }
  if (s.sightengine) {
    out.push({
      name: "Sightengine",
      purpose: "Yüklenen profil fotoğraflarında uygunsuz içerik denetimi",
      data: "Profil fotoğrafı görseli",
      location: "AB merkezli (Fransa)",
    });
  }
  return out;
}
