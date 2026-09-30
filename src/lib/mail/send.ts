import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import { LEGAL_EMAIL_DESTEK } from "@/data/legal";
import {
  mailFromAddress,
  outboundMailReady,
  resendConfigured,
  smtpConfigured,
  smtpSettings,
} from "@/lib/mail/config";

export type OutboundMail = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type SendMailResult = { ok: true; via: "resend" | "smtp" | "log" } | { ok: false; via: "none" };

type SmtpAttempt = {
  host: string;
  port: number;
  secure: boolean;
  requireTLS: boolean;
  user: string;
  pass: string;
};

async function sendWithResend(mail: OutboundMail) {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: mailFromAddress(),
      reply_to: LEGAL_EMAIL_DESTEK,
      to: [mail.to],
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend ${res.status}: ${body.slice(0, 240)}`);
  }
  return true;
}

function smtpTransportOptions(attempt: SmtpAttempt): SMTPTransport.Options {
  return {
    host: attempt.host,
    port: attempt.port,
    secure: attempt.secure,
    requireTLS: attempt.requireTLS,
    auth: {
      user: attempt.user,
      pass: attempt.pass,
    },
    authMethod: "LOGIN",
    tls: {
      minVersion: "TLSv1.2",
      servername: attempt.host,
    },
    connectionTimeout: 20_000,
    greetingTimeout: 20_000,
    socketTimeout: 25_000,
  };
}

async function trySmtpTransport(mail: OutboundMail, attempt: SmtpAttempt) {
  const transporter = nodemailer.createTransport({
    ...smtpTransportOptions(attempt),
    family: 4,
  } as SMTPTransport.Options);
  try {
    await transporter.sendMail({
      from: mailFromAddress(),
      sender: attempt.user,
      replyTo: LEGAL_EMAIL_DESTEK,
      envelope: { from: attempt.user, to: mail.to },
      to: mail.to,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });
    return true;
  } finally {
    transporter.close();
  }
}

function smtpAttempts(): SmtpAttempt[] {
  const cfg = smtpSettings();
  const hosts = [...new Set([cfg.host, ...cfg.altHosts])];
  const shapes: { port: number; secure: boolean; requireTLS: boolean }[] = [
    { port: 465, secure: true, requireTLS: false },
    { port: 587, secure: false, requireTLS: true },
  ];
  const preferred = shapes.find((s) => s.port === cfg.port && s.secure === cfg.secure);
  const ordered = preferred ? [preferred, ...shapes.filter((s) => s !== preferred)] : shapes;
  const out: SmtpAttempt[] = [];
  for (const host of hosts) {
    for (const shape of ordered) {
      out.push({
        host,
        port: shape.port,
        secure: shape.secure,
        requireTLS: shape.requireTLS,
        user: cfg.user,
        pass: cfg.pass,
      });
    }
  }
  return out;
}

async function sendWithSmtp(mail: OutboundMail) {
  if (!smtpConfigured()) {
    console.error("[mail] SMTP_PASS is empty in this process (check Vercel Production env name SMTP_PASS)");
    return false;
  }
  const seen = new Set<string>();
  for (const attempt of smtpAttempts()) {
    const key = `${attempt.host}:${attempt.port}:${attempt.secure}`;
    if (seen.has(key)) continue;
    seen.add(key);
    try {
      await trySmtpTransport(mail, attempt);
      console.info("[mail] smtp ok", { host: attempt.host, port: attempt.port, secure: attempt.secure });
      return true;
    } catch (err) {
      console.error("[mail] smtp attempt failed", {
        host: attempt.host,
        port: attempt.port,
        secure: attempt.secure,
        requireTLS: attempt.requireTLS,
        userSet: Boolean(attempt.user),
        passLen: attempt.pass.length,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return false;
}

export async function sendMail(mail: OutboundMail): Promise<SendMailResult> {
  if (resendConfigured()) {
    try {
      if (await sendWithResend(mail)) return { ok: true, via: "resend" };
    } catch (err) {
      console.error("[mail] resend failed, trying smtp", err instanceof Error ? err.message : err);
    }
  }
  try {
    if (await sendWithSmtp(mail)) return { ok: true, via: "smtp" };
  } catch (err) {
    console.error("[mail] smtp failed", err instanceof Error ? err.message : err);
  }
  if (!outboundMailReady()) {
    console.error("[mail] SMTP_PASS or RESEND_API_KEY is not available at runtime");
  }
  if (process.env.NODE_ENV === "production") {
    return { ok: false, via: "none" };
  }
  console.info("[mail] no outbound transport; preview only", { to: mail.to, subject: mail.subject });
  return { ok: true, via: "log" };
}
