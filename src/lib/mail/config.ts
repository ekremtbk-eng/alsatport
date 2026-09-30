import { LEGAL_EMAIL_DESTEK } from "@/data/legal";

const HOSTINGER_SMTP = "smtp.hostinger.com";
const TITAN_SMTP = "smtp.titan.email";

function envStr(name: string) {
  const raw = process.env[name];
  if (typeof raw !== "string") return "";
  return raw
    .replace(/^\uFEFF/, "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\r/g, "")
    .replace(/\\n/g, "")
    .trim();
}

export function mailFromAddress() {
  const from = envStr("MAIL_FROM");
  if (from) return from;
  return `AlsatPort Destek <${LEGAL_EMAIL_DESTEK}>`;
}

export function smtpUser() {
  return envStr("SMTP_USER") || LEGAL_EMAIL_DESTEK;
}

export function smtpPass() {
  return envStr("SMTP_PASS") || envStr("SMTP_PASSWORD") || envStr("MAIL_PASS");
}

export function smtpSettings() {
  const host = envStr("SMTP_HOST") || HOSTINGER_SMTP;
  const portRaw = envStr("SMTP_PORT");
  const port = Number(portRaw || "465");
  const secureFlag = envStr("SMTP_SECURE").toLowerCase();
  const secure = secureFlag === "false" ? false : secureFlag === "true" || port === 465;
  return {
    host,
    port: Number.isFinite(port) && port > 0 ? port : 465,
    secure,
    user: smtpUser(),
    pass: smtpPass(),
    altHosts: [HOSTINGER_SMTP, TITAN_SMTP] as const,
  };
}

export function resendConfigured() {
  return Boolean(envStr("RESEND_API_KEY"));
}

export function smtpConfigured() {
  return Boolean(smtpPass());
}

export function outboundMailReady() {
  return resendConfigured() || smtpConfigured();
}
