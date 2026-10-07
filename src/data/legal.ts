/**
 * Central legal identity. Real data-controller details come only from env
 * (LEGAL_DATA_CONTROLLER_NAME, LEGAL_CONTACT_EMAIL, LEGAL_ADDRESS, LEGAL_LAST_UPDATED),
 * inlined at build time via next.config.ts. Never put placeholder company data here.
 */
function env(value: string | undefined) {
  return (value ?? "").trim();
}

export const LEGAL_BRAND = "AlSatPort";
export const LEGAL_DOMAIN = "alsatport.com";
export const LEGAL_WEB = "https://alsatport.com";

export const LEGAL_DATA_CONTROLLER_NAME = env(process.env.LEGAL_DATA_CONTROLLER_NAME);
export const LEGAL_CONTACT_EMAIL = env(process.env.LEGAL_CONTACT_EMAIL);
export const LEGAL_ADDRESS = env(process.env.LEGAL_ADDRESS);

/** Support mailbox the site already sends from and links to. */
export const LEGAL_EMAIL_DESTEK = "destek@alsatport.com";

/** Address for KVKK applications and privacy questions. */
export const LEGAL_PRIVACY_EMAIL = LEGAL_CONTACT_EMAIL || LEGAL_EMAIL_DESTEK;

export const LEGAL_CONTROLLER_MISSING: string[] = [
  !LEGAL_DATA_CONTROLLER_NAME ? "LEGAL_DATA_CONTROLLER_NAME" : "",
  !LEGAL_CONTACT_EMAIL ? "LEGAL_CONTACT_EMAIL" : "",
  !LEGAL_ADDRESS ? "LEGAL_ADDRESS" : "",
].filter(Boolean);

export const LEGAL_CONTROLLER_READY = LEGAL_CONTROLLER_MISSING.length === 0;
export const LEGAL_CONTROLLER_WARNING = "Yayına alınmadan önce gerçek veri sorumlusu bilgileri girilmelidir.";

/** Approved legal wording: shown verbatim in every locale. */
export const LEGAL_UGC_NOTICE =
  "AlsatPort üzerinde yayımlanan ilanlar, açıklamalar, görseller ve diğer tüm içerikler kullanıcılar tarafından oluşturulmaktadır. Bu içeriklerin doğruluğu, güncelliği, güvenilirliği ve yürürlükteki mevzuata uygunluğu, ilgili ilan sahibi veya kullanıcıların sorumluluğundadır. AlsatPort, aracılık hizmeti sunan bir platform olup, kullanıcı kaynaklı içeriklerden doğabilecek hata, eksiklik veya aykırılıklardan, yasal zorunluluklar saklı kalmak kaydıyla sorumlu tutulamaz.";

/** ISO date (YYYY-MM-DD) of the last legal-text revision. */
export const LEGAL_LAST_UPDATED = env(process.env.LEGAL_LAST_UPDATED) || "2026-10-06";

const TR_MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

export function legalUpdatedLabel() {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(LEGAL_LAST_UPDATED);
  if (!m) return LEGAL_LAST_UPDATED;
  return `${Number(m[3])} ${TR_MONTHS[Number(m[2]) - 1] ?? ""} ${m[1]}`;
}

export const LEGAL_INSTAGRAM = "https://www.instagram.com/alsatport";

/** Kurumsal sameAs profilleri (JSON-LD Organization) — yalnızca doğrulanmış resmi hesap. */
export const LEGAL_SOCIAL = [LEGAL_INSTAGRAM] as const;
