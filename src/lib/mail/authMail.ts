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

export async function sendOtpEmail(to: string, otp: string, kind: "email" | "phone") {
  const title = kind === "phone" ? "Telefon doğrulama kodu" : "E-posta doğrulama kodu";
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

export async function sendPasswordResetEmail(to: string, token: string) {
  const href = `${appOrigin()}/sifre-sifirla?token=${encodeURIComponent(token)}`;
  const html = wrap(
    "Şifre sıfırlama",
    `<p>Şifrenizi sıfırlamak için bağlantıya tıklayın (1 saat geçerli):</p><p><a href="${escapeHtml(href)}">${escapeHtml(href)}</a></p>`,
  );
  return sendMail({
    to,
    subject: "AlsatPort şifre sıfırlama",
    html,
    text: `Şifre sıfırlama: ${href}`,
  });
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
