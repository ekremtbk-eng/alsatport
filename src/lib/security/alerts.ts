import "server-only";
import { adminEmail } from "@/lib/admin/audit";
import { sendSecurityNoticeEmail } from "@/lib/mail/authMail";
import { throttle } from "@/lib/security/throttle";
import type { StoredUser } from "@/lib/security/userStore";

function describeAgent(ua: string | null) {
  if (!ua) return "bilinmeyen tarayıcı";
  const os = /Windows/i.test(ua)
    ? "Windows"
    : /iPhone|iPad|iOS/i.test(ua)
      ? "iOS"
      : /Android/i.test(ua)
        ? "Android"
        : /Mac OS X|Macintosh/i.test(ua)
          ? "macOS"
          : /Linux/i.test(ua)
            ? "Linux"
            : "bilinmeyen sistem";
  const browser = /Edg\//i.test(ua)
    ? "Edge"
    : /OPR\/|Opera/i.test(ua)
      ? "Opera"
      : /Chrome\//i.test(ua)
        ? "Chrome"
        : /Firefox\//i.test(ua)
          ? "Firefox"
          : /Safari\//i.test(ua)
            ? "Safari"
            : "tarayıcı";
  return `${browser} · ${os}`;
}

export function deviceLabel(ua: string | null) {
  return describeAgent(ua);
}

/** The e-mail only states what happened; it never carries a link with a token. */
export async function notifyNewDevice(user: StoredUser, info: { userAgent: string | null; ipMasked: string | null; at: Date }) {
  const when = info.at.toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" });
  const where = info.ipMasked ? ` (IP: ${info.ipMasked})` : "";
  const message = `Hesabınıza ${when} tarihinde yeni bir cihazdan giriş yapıldı: ${describeAgent(info.userAgent)}${where}. Siz değilseniz Profil → Hesap Güvenliği bölümünden tüm diğer cihazlardan çıkış yapın ve şifrenizi değiştirin.`;
  await sendSecurityNoticeEmail(user.email, "Yeni cihazdan giriş", message).catch(() => undefined);
  if (user.role === "admin") await notifyOwner("Yönetici hesabına yeni cihazdan giriş", message, `newdev:${user.id}`, user.email);
}

/**
 * Owner alert for admin-level security events, rate-limited per topic so an attack
 * cannot turn it into a mail flood.
 */
export async function notifyOwner(title: string, message: string, topic: string, skipIfSameAs?: string) {
  const to = adminEmail();
  if (!to || (skipIfSameAs && skipIfSameAs.toLowerCase() === to)) return;
  const ok = await throttle([{ key: `owner-alert:${topic}`, limit: 3, windowMs: 60 * 60 * 1000 }]);
  if (!ok.ok) return;
  await sendSecurityNoticeEmail(to, title, message).catch(() => undefined);
}
