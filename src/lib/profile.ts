import { isValidEmail } from "@/lib/auth";
import type { UserProfile } from "@/data/store";

export function isAdult(isoDate: string) {
  const born = new Date(isoDate);
  if (Number.isNaN(born.getTime())) return false;
  const now = new Date();
  let age = now.getFullYear() - born.getFullYear();
  const m = now.getMonth() - born.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < born.getDate())) age -= 1;
  return age >= 18;
}

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

export function isValidTckn(value: string) {
  const n = value.replace(/\D/g, "");
  if (!/^[1-9]\d{10}$/.test(n)) return false;
  const d = n.split("").map(Number);
  const odd = d[0] + d[2] + d[4] + d[6] + d[8];
  const even = d[1] + d[3] + d[5] + d[7];
  const d10 = ((odd * 7 - even) % 10 + 10) % 10;
  const d11 = d.slice(0, 10).reduce((a, b) => a + b, 0) % 10;
  return d[9] === d10 && d[10] === d11;
}

export function isValidVkn(value: string) {
  const n = value.replace(/\D/g, "");
  if (!/^\d{10}$/.test(n)) return false;
  const d = n.split("").map(Number);
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    const tmp = (d[i] + 10 - (i + 1)) % 10;
    let result = (tmp * 2 ** (9 - i)) % 9;
    if (tmp !== 0 && result === 0) result = 9;
    sum += result;
  }
  return d[9] === (10 - (sum % 10)) % 10;
}

export function isValidIdentityNo(value: string) {
  const n = value.replace(/\D/g, "");
  if (n.length === 11) return isValidTckn(n);
  if (n.length === 10) return isValidVkn(n);
  return false;
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

export type ProfileGap = "name" | "identity" | "phone" | "email" | "address";

export function profileGaps(user: UserProfile | null | undefined): ProfileGap[] {
  if (!user) return ["name", "identity", "phone", "email", "address"];
  const gaps: ProfileGap[] = [];
  if (!isValidFullName(user.fullName ?? "")) gaps.push("name");
  if (!isValidIdentityNo(user.nationalId ?? "")) gaps.push("identity");
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
  "/kurumsal",
  "/sifre-unuttum",
  "/sifre-sifirla",
  "/eposta-dogrula",
];
