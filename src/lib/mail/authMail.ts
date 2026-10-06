import { appOrigin, welcomeVerifyEmailHtml, welcomeVerifyEmailText } from "@/lib/mail/welcomeEmail";
import { escapeHtml, firstNameFrom } from "@/lib/mail/escapeHtml";
import { sendMail } from "@/lib/mail/send";
import { LEGAL_EMAIL_DESTEK } from "@/data/legal";
import { signEmailVerifyToken } from "@/lib/security/emailVerify";

function wrap(title: string, body: string) {
  return `<!DOCTYPE html><html lang="tr"><body style="font-family:Segoe UI,Arial,sans-serif;color:#111827;background:#f3f4f6;padding:24px">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;padding:24px">
    <p style="font-weight:800;color:#16a34a">AlsatPort</p>
    <h1 style="font-size:20px">${escapeHtml(title)}</h1>
    ${body}
    <p style="color:#6b7280;font-size:12px;margin-top:24px">AlsatPort Destek · ${escapeHtml(LEGAL_EMAIL_DESTEK)}</p>
  </div></body></html>`;
}

const OTP_TITLES = {
  email: "E-posta doğrulama kodu",
  phone: "Telefon doğrulama kodu",
  "email-change": "E-posta değişikliği doğrulama kodu",
  "2fa-setup": "İki aşamalı doğrulama kodu",
  "login-2fa": "Giriş doğrulama kodu",
  "recovery-email": "Kurtarma e-postası doğrulama kodu",
} as const;

export async function sendOtpEmail(to: string, otp: string, kind: keyof typeof OTP_TITLES) {
  const title = OTP_TITLES[kind];
  const html = wrap(
    title,
    `<p>Doğrulama kodunuz:</p><p style="font-size:28px;letter-spacing:0.3em;font-weight:800">${escapeHtml(otp)}</p><p style="color:#6b7280;font-size:13px">Kod 10 dakika geçerlidir. Bu e-postayı siz istemediyseniz yok sayın.</p>`,
  );
  return sendMail({
    to,
    subject: `AlsatPort ${title}`,
    html,
    text: `${title}: ${otp}`,
  });
}

export async function sendPasswordResetEmail(to: string, token: string, ttlMinutes: number) {
  const href = `${appOrigin()}/sifre-sifirla#token=${encodeURIComponent(token)}`;
  const html = wrap(
    "Şifre sıfırlama",
    `<p>AlsatPort hesabınız için şifre sıfırlama talebi aldık.</p>
    <p style="margin:24px 0"><a href="${escapeHtml(href)}" style="background:#16a34a;color:#fff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:12px;display:inline-block">Yeni şifre belirle</a></p>
    <p style="color:#6b7280;font-size:13px">Bağlantı ${ttlMinutes} dakika geçerlidir ve yalnızca bir kez kullanılabilir. Bu talebi siz yapmadıysanız e-postayı yok sayın; şifreniz değişmez.</p>
    <p style="color:#6b7280;font-size:12px;word-break:break-all">${escapeHtml(href)}</p>`,
  );
  return sendMail({
    to,
    subject: "AlsatPort şifre sıfırlama",
    html,
    text: `Şifre sıfırlama (${ttlMinutes} dk geçerli, tek kullanımlık): ${href}`,
  });
}

export async function sendSocialOnlyResetEmail(to: string, provider: string) {
  const via = provider === "apple" ? "Apple" : "Google";
  const href = `${appOrigin()}/giris`;
  const html = wrap(
    "Şifre sıfırlama",
    `<p>Bu e-posta için şifre sıfırlama talebi aldık. Hesabınız ${via} ile oluşturulmuş ve henüz bir AlsatPort şifresi yok.</p>
    <p>Giriş ekranında <strong>${via} ile giriş yap</strong> seçeneğini kullanın. Dilerseniz giriş yaptıktan sonra Profil &gt; Şifre ve güvenlik bölümünden şifre belirleyebilirsiniz.</p>
    <p style="margin:24px 0"><a href="${escapeHtml(href)}" style="background:#16a34a;color:#fff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:12px;display:inline-block">Giriş ekranına git</a></p>
    <p style="color:#6b7280;font-size:13px">Bu talebi siz yapmadıysanız e-postayı yok sayın.</p>`,
  );
  return sendMail({
    to,
    subject: "AlsatPort şifre sıfırlama",
    html,
    text: `Hesabınız ${via} ile oluşturulmuş. ${via} ile giriş yapın; şifreyi Profil > Şifre ve güvenlik bölümünden belirleyebilirsiniz. ${href}`,
  });
}

export async function sendSecurityNoticeEmail(to: string, title: string, message: string) {
  const html = wrap(
    title,
    `<p>${escapeHtml(message)}</p><p style="color:#6b7280;font-size:13px">Bu işlemi siz yapmadıysanız hemen şifrenizi değiştirin ve ${escapeHtml(LEGAL_EMAIL_DESTEK)} adresine yazın.</p>`,
  );
  return sendMail({ to, subject: `AlsatPort güvenlik bildirimi: ${title}`, html, text: `${title}: ${message}` });
}

/** Opt-in notice (listing/message events); recipients manage it under Profil → Bildirim ayarları. */
export async function sendNoticeEmail(to: string, title: string, message: string, path: string) {
  const href = `${appOrigin()}${path.startsWith("/") ? path : "/profil"}`;
  const settings = `${appOrigin()}/profil?p=bildirim-ayarlari`;
  const html = wrap(
    title,
    `<p>${escapeHtml(message)}</p>
    <p style="margin:24px 0"><a href="${escapeHtml(href)}" style="background:#16a34a;color:#fff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:12px;display:inline-block">AlsatPort'ta görüntüle</a></p>
    <p style="color:#6b7280;font-size:12px">Bu e-postayı bildirim tercihleriniz nedeniyle aldınız. <a href="${escapeHtml(settings)}" style="color:#6b7280">Bildirim ayarları</a></p>`,
  );
  return sendMail({ to, subject: `AlsatPort: ${title}`, html, text: `${title}: ${message} ${href}` });
}

export function mailDebugEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.MAIL_DEBUG === "1";
}

export async function sendSignupVerificationEmail(input: { userId: string; email: string; name?: string }) {
  const token = await signEmailVerifyToken(input.userId, input.email);
  const href = `${appOrigin()}/eposta-dogrula?token=${encodeURIComponent(token)}`;
  const first = firstNameFrom(input.name);
  return sendMail({
    to: input.email,
    subject: `${first}, AlsatPort'a hoş geldiniz — e-postanızı doğrulayın`,
    html: welcomeVerifyEmailHtml(input.name ?? "", href),
    text: welcomeVerifyEmailText(input.name ?? "", href),
  });
}
