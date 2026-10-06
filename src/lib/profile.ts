import { isValidEmail } from "@/lib/auth";
import type { UserProfile } from "@/data/store";

/** TR cep (10 hane, isteğe bağlı baştaki 0). 50/51/53–56 operatör aralığı; TCKN ve vergi no ile karışmaz. */
export function nationalPhoneDigits(value: string) {
  const d = value.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("0")) return d.slice(1);
  return d;
}

export function isValidPhone(value: string) {
  const n = nationalPhoneDigits(value);
  return /^5(0[1-9]|[13-6]\d)\d{7}$/.test(n);
}

export function isValidFullName(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length >= 2;
}

export function isValidOpenAddress(value: string) {
  const s = value.trim().replace(/\s+/g, " ");
  if (s.length < 20) return false;
  if (!/\d/.test(s)) return false;
  return true;
}

export function isEmailVerified(user: UserProfile | null | undefined) {
  if (!user?.email || !isValidEmail(user.email)) return false;
  return user.emailVerified === true;
}

export type ProfileGap = "name" | "phone" | "email" | "address";

/** National ID is intentionally not part of the profile: it is never collected, stored or shown. */
export function profileGaps(user: UserProfile | null | undefined): ProfileGap[] {
  if (!user) return ["name", "phone", "email", "address"];
  const gaps: ProfileGap[] = [];
  if (!isValidFullName(user.fullName ?? "")) gaps.push("name");
  if (!isValidPhone(user.phone ?? "")) gaps.push("phone");
  if (!isEmailVerified(user)) gaps.push("email");
  if (!isValidOpenAddress(user.address ?? "")) gaps.push("address");
  return gaps;
}

/** Mavi tik yalnızca tüm zorunlu alanlar tam ve geçerliyken. */
export function isVerifiedEligible(user: UserProfile | null | undefined) {
  return profileGaps(user).length === 0;
}

export function stampVerification(profile: UserProfile): UserProfile {
  const ok = isVerifiedEligible(profile);
  return { ...profile, verified: ok, profileComplete: ok };
}

export function isProfileComplete(user: UserProfile | null | undefined): boolean {
  return isVerifiedEligible(user);
}

export const COMPLETE_PATH = "/profil/bilgilerim";
export const PROFILE_NUDGE_TEXT =
  "Lütfen hesap güvenliğiniz ve ilan verebilmeniz için eksik bilgilerinizi güncelleyiniz";

const AUTH_LOOP_PATHS = new Set(["/giris", "/kayit", "/welcome", "/hesap-tamamla", "/eposta-dogrula"]);

export function safeNextPath(value: string | null | undefined, fallback = "/ilan-ver") {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  const path = value.split("?")[0] ?? value;
  if (AUTH_LOOP_PATHS.has(path)) return fallback;
  return value;
}

/** Giriş / kayıt sonrası hedef. Overlay’de profil tamamsa null = sayfada kal. */
export function afterAuthHref(needsProfile: boolean, stayIfComplete = false, needsEmailVerify = false): string | null {
  if (needsEmailVerify) return "/eposta-dogrula?sent=1";
  const search = typeof window !== "undefined" ? window.location.search : "";
  const path = typeof window !== "undefined" ? window.location.pathname : "/";
  const q = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search).get("next");
  const blocked = AUTH_LOOP_PATHS.has(path);
  const dest = q ? safeNextPath(q, "/") : blocked ? "/" : path;
  if (needsProfile) {
    if (!dest || dest === "/" || dest === COMPLETE_PATH || dest.startsWith(`${COMPLETE_PATH}?`)) {
      return COMPLETE_PATH;
    }
    return `${COMPLETE_PATH}?next=${encodeURIComponent(dest)}`;
  }
  if (stayIfComplete) return null;
  return dest;
}

export function postListingHref(user: UserProfile | null | undefined, listingPath = "/ilan-ver") {
  if (!user) return `/giris?next=${encodeURIComponent(listingPath)}`;
  if (!isEmailVerified(user)) return "/eposta-dogrula";
  if (!isProfileComplete(user)) {
    return `${COMPLETE_PATH}?next=${encodeURIComponent(listingPath)}`;
  }
  return listingPath;
}

export function gatePath(user: UserProfile | null | undefined): string | null {
  if (!user) return "/giris";
  if (!isEmailVerified(user)) return "/eposta-dogrula";
  if (!isProfileComplete(user)) return COMPLETE_PATH;
  return null;
}

export const OPEN_PATHS = [
  "/welcome",
  "/giris",
  "/kayit",
  "/hizmet-vermek-istiyorum",
  "/hesap-tamamla",
  "/profil",
  "/profil/bilgilerim",
  "/cerez-aydinlatma",
  "/kvkk",
  "/gizlilik-politikasi",
  "/kullanim-kosullari",
  "/ilan-kurallari",
  "/kurumsal",
  "/sifre-unuttum",
  "/sifre-sifirla",
  "/eposta-dogrula",
];
