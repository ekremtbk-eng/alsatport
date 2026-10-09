import { APP_TARGETS, safeAppUrl } from "@/data/appDistribution";
import { LEGAL_ADDRESS, LEGAL_BRAND, LEGAL_DOMAIN, LEGAL_EMAIL_DESTEK, SOCIAL_ACCOUNTS } from "@/data/legal";
import { brandIcon } from "@/lib/brand";
import { escapeHtml } from "@/lib/mail/escapeHtml";
import { appOrigin } from "@/lib/site";

export const EMAIL_SLOGAN = "Al, Sat, Keşfet!";
export const EMAIL_TAGLINE = "Türkiye genelinde emlak, vasıta, ikinci el ve hizmet ilanları platformu.";
export const EMAIL_REASON = "Bu e-posta AlsatPort hesabınız veya platformdaki işlemlerinizle ilgili olarak gönderilmiştir.";
export const EMAIL_NO_REPLY = `Bu e-postaya doğrudan yanıt vermeyin. Destek için ${LEGAL_EMAIL_DESTEK} adresini kullanabilirsiniz.`;
/** Marks the shared footer so tests can assert it appears exactly once. */
export const EMAIL_FOOTER_MARK = "ap-mail-footer";

export function mailUrl(path: string) {
  return `${appOrigin()}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Production app icon (same file as the site's PWA/app icon); has its own background, so it reads in dark mode. */
export function mailLogoUrl() {
  return mailUrl(brandIcon("/icon-192.png"));
}

export function footerLinks() {
  return [
    { label: "Destek", href: mailUrl("/kurumsal/iletisim") },
    { label: "Gizlilik Politikası", href: mailUrl("/gizlilik-politikasi") },
    { label: "Kullanım Koşulları", href: mailUrl("/kullanim-kosullari") },
    { label: "KVKK Aydınlatma Metni", href: mailUrl("/kvkk") },
  ];
}

/** Only accounts the project lists as official (url set); nothing is shown for the rest. */
function socialLinks() {
  return SOCIAL_ACCOUNTS.flatMap((a) => (a.url ? [{ label: a.label, href: a.url }] : []));
}

/** Store buttons appear only once a published store URL is configured in APP_TARGETS. */
function storeLinks() {
  const labels: Partial<Record<string, string>> = { play: "Google Play", appstore: "App Store" };
  return APP_TARGETS.flatMap((t) => {
    const href = labels[t.id] ? safeAppUrl(t.url) : null;
    return href ? [{ label: labels[t.id]!, href }] : [];
  });
}

const LINK = "color:#047857;text-decoration:underline;font-weight:600;white-space:nowrap;";
const MUTED = "color:#6b7280;";

function pillRow(items: { label: string; href: string }[], className: string) {
  if (!items.length) return "";
  const cells = items
    .map(
      (i) =>
        `<a href="${escapeHtml(i.href)}" class="${className}" style="display:inline-block;margin:0 4px 6px;padding:5px 12px;border:1px solid #d1d5db;border-radius:999px;color:#374151;font-size:12px;font-weight:600;text-decoration:none;">${escapeHtml(i.label)}</a>`,
    )
    .join("");
  return `<tr><td align="center" style="padding:4px 0 6px;">${cells}</td></tr>`;
}

export function emailFooterHtml() {
  const home = mailUrl("/");
  const links = footerLinks()
    .map((l) => `<a href="${escapeHtml(l.href)}" class="apf-link" style="${LINK}">${escapeHtml(l.label)}</a>`)
    .join(`<span class="apf-muted" style="${MUTED}">&nbsp;&middot;&nbsp;</span> `);
  const address = LEGAL_ADDRESS ? `<br>${escapeHtml(LEGAL_ADDRESS)}` : "";
  return `<!-- ${EMAIL_FOOTER_MARK} -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="${EMAIL_FOOTER_MARK}" style="max-width:600px;width:100%;">
  <tr>
    <td align="center" style="padding:24px 16px 8px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td valign="middle" style="padding-right:10px;">
            <a href="${escapeHtml(home)}"><img src="${escapeHtml(mailLogoUrl())}" width="40" height="40" alt="AlsatPort" style="display:block;width:40px;height:40px;border:0;border-radius:10px;"></a>
          </td>
          <td valign="middle" style="text-align:left;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
            <p class="apf-strong" style="margin:0;font-size:16px;font-weight:800;color:#111827;line-height:1.2;">AlsatPort</p>
            <p class="apf-brand" style="margin:2px 0 0;font-size:12px;font-weight:700;color:#047857;line-height:1.3;">${escapeHtml(EMAIL_SLOGAN)}</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td align="center" class="apf-text" style="padding:4px 16px 10px;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:13px;line-height:1.5;color:#4b5563;">
      ${escapeHtml(EMAIL_TAGLINE)}<br>
      <a href="${escapeHtml(home)}" class="apf-link" style="${LINK}">${escapeHtml(LEGAL_DOMAIN)}</a>
    </td>
  </tr>
  <tr>
    <td align="center" style="padding:2px 16px 12px;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:13px;line-height:1.9;">
      ${links}
    </td>
  </tr>
  ${pillRow(storeLinks(), "apf-pill")}
  ${pillRow(socialLinks(), "apf-pill")}
  <tr>
    <td align="center" class="apf-muted" style="padding:8px 20px 28px;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:11px;line-height:1.55;color:#6b7280;">
      ${escapeHtml(EMAIL_REASON)}<br>
      ${escapeHtml(EMAIL_NO_REPLY)}<br>
      &copy; ${new Date().getFullYear()} ${escapeHtml(LEGAL_BRAND)}. Tüm hakları saklıdır.${address}
    </td>
  </tr>
</table>`;
}

export function emailFooterText() {
  return [
    "—",
    `AlsatPort · ${EMAIL_SLOGAN}`,
    mailUrl("/"),
    ...footerLinks().map((l) => `${l.label}: ${l.href}`),
    ...storeLinks().map((l) => `${l.label}: ${l.href}`),
    ...socialLinks().map((l) => `${l.label}: ${l.href}`),
    "",
    EMAIL_REASON,
    EMAIL_NO_REPLY,
  ].join("\n");
}

/** Plain-text body plus the shared footer. */
export function emailText(body: string) {
  return `${body.trim()}\n\n${emailFooterText()}`;
}

/**
 * Shared document for every system e-mail: centred 600px card, then the common footer once, outside the card.
 * Table layout and inline styles for Gmail/Outlook; the <style> block only adds dark-mode and small-screen tweaks.
 */
export function emailLayout(input: { title: string; preheader?: string; card: string }) {
  const pre = input.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(input.preheader)}</div>`
    : "";
  return `<!DOCTYPE html>
<html lang="tr" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${escapeHtml(input.title)}</title>
  <style>
    @media (max-width: 480px) {
      .ap-card-pad { padding-left: 20px !important; padding-right: 20px !important; }
    }
    @media (prefers-color-scheme: dark) {
      .ap-bg { background: #0b1410 !important; }
      .apf-strong { color: #f9fafb !important; }
      .apf-text { color: #d1d5db !important; }
      .apf-muted { color: #9ca3af !important; }
      .apf-link, .apf-brand { color: #4ade80 !important; }
      .apf-pill { color: #e5e7eb !important; border-color: #4b5563 !important; }
    }
  </style>
</head>
<body class="ap-bg" style="margin:0;padding:0;background:#f3f4f6;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111827;-webkit-text-size-adjust:100%;">
  ${pre}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="ap-bg" style="background:#f3f4f6;">
    <tr>
      <td align="center" style="padding:24px 12px 0;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;border:1px solid #e5e7eb;">
          ${input.card}
        </table>
        ${emailFooterHtml()}
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Brand header used at the top of the card (same production icon as the footer). */
export function emailCardHeader(title: string) {
  return `<tr>
  <td class="ap-card-pad" style="padding:24px 32px 0;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td valign="middle" style="padding-right:8px;"><img src="${escapeHtml(mailLogoUrl())}" width="28" height="28" alt="" style="display:block;width:28px;height:28px;border:0;border-radius:7px;"></td>
        <td valign="middle" style="font-size:15px;font-weight:800;color:#047857;">AlsatPort</td>
      </tr>
    </table>
    <h1 style="margin:16px 0 0;font-size:20px;line-height:1.3;font-weight:800;color:#111827;">${escapeHtml(title)}</h1>
  </td>
</tr>`;
}
