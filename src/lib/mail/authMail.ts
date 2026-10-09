import { appOrigin, welcomeVerifyEmailHtml, welcomeVerifyEmailText } from "@/lib/mail/welcomeEmail";
import { escapeHtml, firstNameFrom } from "@/lib/mail/escapeHtml";
import { emailCardHeader, emailLayout, emailText } from "@/lib/mail/layout";
import { sendMail } from "@/lib/mail/send";
import { LEGAL_EMAIL_DESTEK } from "@/data/legal";
import { signEmailVerifyToken } from "@/lib/security/emailVerify";

type MailContent = { subject: string; html: string; text: string };

function wrap(title: string, body: string) {
  return emailLayout({
    title,
    card: `${emailCardHeader(title)}
<tr><td class="ap-card-pad" style="padding:12px 32px 28px;font-size:15px;line-height:1.6;color:#374151;">${body}</td></tr>`,
  });
}

const BUTTON =
  "background:#16a34a;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:12px;display:inline-block";

export const OTP_TITLES = {
  email: "E-posta doğrulama kodu",
  phone: "Telefon doğrulama kodu",
  "email-change": "E-posta değişikliği doğrulama kodu",
  "2fa-setup": "İki aşamalı doğrulama kodu",
  "login-2fa": "Giriş doğrulama kodu",
  "recovery-email": "Kurtarma e-postası doğrulama kodu",
} as const;

export function otpEmail(otp: string, kind: keyof typeof OTP_TITLES): MailContent {
  const title = OTP_TITLES[kind];
  const note = "Kod 10 dakika geçerlidir. Bu e-postayı siz istemediyseniz yok sayın.";
  return {
    subject: `AlsatPort ${title}`,
    html: wrap(
      title,
      `<p style="margin:0 0 8px">Doğrulama kodunuz:</p><p style="margin:0 0 16px;font-size:28px;letter-spacing:0.3em;font-weight:800;color:#111827">${escapeHtml(otp)}</p><p style="margin:0;color:#6b7280;font-size:13px">${note}</p>`,
    ),
    text: emailText(`${title}: ${otp}\n${note}`),
  };
}

export function passwordResetEmail(token: string, ttlMinutes: number): MailContent {
  const href = `${appOrigin()}/sifre-sifirla#token=${encodeURIComponent(token)}`;
  return {
    subject: "AlsatPort şifre sıfırlama",
    html: wrap(
      "Şifre sıfırlama",
      `<p style="margin:0">AlsatPort hesabınız için şifre sıfırlama talebi aldık.</p>
    <p style="margin:24px 0"><a href="${escapeHtml(href)}" style="${BUTTON}">Yeni şifre belirle</a></p>
    <p style="margin:0 0 12px;color:#6b7280;font-size:13px">Bağlantı ${ttlMinutes} dakika geçerlidir ve yalnızca bir kez kullanılabilir. Bu talebi siz yapmadıysanız e-postayı yok sayın; şifreniz değişmez.</p>
    <p style="margin:0;color:#6b7280;font-size:12px;word-break:break-all">${escapeHtml(href)}</p>`,
    ),
    text: emailText(`Şifre sıfırlama (${ttlMinutes} dk geçerli, tek kullanımlık): ${href}`),
  };
}

export function socialOnlyResetEmail(provider: string): MailContent {
  const via = provider === "apple" ? "Apple" : "Google";
  const href = `${appOrigin()}/giris`;
  return {
    subject: "AlsatPort şifre sıfırlama",
    html: wrap(
      "Şifre sıfırlama",
      `<p style="margin:0 0 12px">Bu e-posta için şifre sıfırlama talebi aldık. Hesabınız ${via} ile oluşturulmuş ve henüz bir AlsatPort şifresi yok.</p>
    <p style="margin:0">Giriş ekranında <strong>${via} ile giriş yap</strong> seçeneğini kullanın. Dilerseniz giriş yaptıktan sonra Profil &gt; Şifre ve güvenlik bölümünden şifre belirleyebilirsiniz.</p>
    <p style="margin:24px 0"><a href="${escapeHtml(href)}" style="${BUTTON}">Giriş ekranına git</a></p>
    <p style="margin:0;color:#6b7280;font-size:13px">Bu talebi siz yapmadıysanız e-postayı yok sayın.</p>`,
    ),
    text: emailText(
      `Hesabınız ${via} ile oluşturulmuş. ${via} ile giriş yapın; şifreyi Profil > Şifre ve güvenlik bölümünden belirleyebilirsiniz. ${href}`,
    ),
  };
}

export function securityNoticeEmail(title: string, message: string): MailContent {
  const note = `Bu işlemi siz yapmadıysanız hemen şifrenizi değiştirin ve ${LEGAL_EMAIL_DESTEK} adresine yazın.`;
  return {
    subject: `AlsatPort güvenlik bildirimi: ${title}`,
    html: wrap(
      title,
      `<p style="margin:0 0 12px">${escapeHtml(message)}</p><p style="margin:0;color:#6b7280;font-size:13px">${escapeHtml(note)}</p>`,
    ),
    text: emailText(`${title}: ${message}\n${note}`),
  };
}

/** Opt-in notice (listing/message events); recipients manage it under Profil → Bildirim ayarları. */
export function noticeEmail(title: string, message: string, path: string): MailContent {
  const href = `${appOrigin()}${path.startsWith("/") ? path : "/profil"}`;
  const settings = `${appOrigin()}/profil?p=bildirim-ayarlari`;
  return {
    subject: `AlsatPort: ${title}`,
    html: wrap(
      title,
      `<p style="margin:0">${escapeHtml(message)}</p>
    <p style="margin:24px 0"><a href="${escapeHtml(href)}" style="${BUTTON}">AlsatPort'ta görüntüle</a></p>
    <p style="margin:0;color:#6b7280;font-size:12px">Bu e-postayı bildirim tercihleriniz nedeniyle aldınız. <a href="${escapeHtml(settings)}" style="color:#6b7280">Bildirim ayarları</a></p>`,
    ),
    text: emailText(`${title}: ${message}\n${href}\n\nBu e-postayı bildirim tercihleriniz nedeniyle aldınız. Bildirim ayarları: ${settings}`),
  };
}

export async function sendOtpEmail(to: string, otp: string, kind: keyof typeof OTP_TITLES) {
  return sendMail({ to, ...otpEmail(otp, kind) });
}

export async function sendPasswordResetEmail(to: string, token: string, ttlMinutes: number) {
  return sendMail({ to, ...passwordResetEmail(token, ttlMinutes) });
}

export async function sendSocialOnlyResetEmail(to: string, provider: string) {
  return sendMail({ to, ...socialOnlyResetEmail(provider) });
}

export async function sendSecurityNoticeEmail(to: string, title: string, message: string) {
  return sendMail({ to, ...securityNoticeEmail(title, message) });
}

export async function sendNoticeEmail(to: string, title: string, message: string, path: string) {
  return sendMail({ to, ...noticeEmail(title, message, path) });
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
