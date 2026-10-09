/**
 * Shared e-mail footer checks: every system template renders the common footer exactly once (HTML + text),
 * with production URLs and the real app icon. Nothing is sent.
 *
 *   npx tsx --conditions=react-server scripts/test-email-footer.ts
 *   EMAIL_PREVIEW_DIR=... writes each HTML template there for visual checks.
 *   EMAIL_LOGO_CHECK=1 also fetches the logo and footer link URLs (expects HTTP 200).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { APP_TARGETS } from "@/data/appDistribution";
import { SOCIAL_ACCOUNTS } from "@/data/legal";
import {
  OTP_TITLES,
  noticeEmail,
  otpEmail,
  passwordResetEmail,
  securityNoticeEmail,
  socialOnlyResetEmail,
} from "@/lib/mail/authMail";
import { EMAIL_FOOTER_MARK, EMAIL_NO_REPLY, EMAIL_REASON, EMAIL_SLOGAN, footerLinks, mailLogoUrl } from "@/lib/mail/layout";
import { welcomeEmailHtml, welcomeEmailText, welcomeVerifyEmailHtml, welcomeVerifyEmailText } from "@/lib/mail/welcomeEmail";

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) pass++;
  else fail++;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${!ok && detail ? ` — ${detail}` : ""}`);
}
const count = (s: string, sub: string) => s.split(sub).length - 1;

const ORIGIN = "https://alsatport.com";
const EXPECTED_LINKS = [
  ["Destek", `${ORIGIN}/kurumsal/iletisim`],
  ["Gizlilik Politikası", `${ORIGIN}/gizlilik-politikasi`],
  ["Kullanım Koşulları", `${ORIGIN}/kullanim-kosullari`],
  ["KVKK Aydınlatma Metni", `${ORIGIN}/kvkk`],
] as const;

const templates: { id: string; html: string; text: string }[] = [
  ...(Object.keys(OTP_TITLES) as (keyof typeof OTP_TITLES)[]).map((k) => ({ id: `otp-${k}`, ...otpEmail("123456", k) })),
  { id: "password-reset", ...passwordResetEmail("preview-token", 30) },
  { id: "social-reset", ...socialOnlyResetEmail("google") },
  { id: "security-notice", ...securityNoticeEmail("Şifreniz değiştirildi", "Hesabınızın şifresi az önce değiştirildi.") },
  { id: "notice", ...noticeEmail("İlanınız yayında", "“Örnek ilan” başlıklı ilanınız yayına alındı.", "/profil?p=ilanlarim") },
  { id: "welcome", html: welcomeEmailHtml("Ayşe Yılmaz"), text: welcomeEmailText("Ayşe Yılmaz") },
  {
    id: "welcome-verify",
    html: welcomeVerifyEmailHtml("Ayşe Yılmaz", `${ORIGIN}/eposta-dogrula?token=preview`),
    text: welcomeVerifyEmailText("Ayşe Yılmaz", `${ORIGIN}/eposta-dogrula?token=preview`),
  },
];

check("L1 footer links point at production pages", JSON.stringify(footerLinks().map((l) => [l.label, l.href])) === JSON.stringify(EXPECTED_LINKS));
check("L2 logo is the production app icon (absolute https)", /^https:\/\/alsatport\.com\/icon-192\.png\?v=\w+$/.test(mailLogoUrl()), mailLogoUrl());

const storeConfigured = APP_TARGETS.some((t) => (t.id === "play" || t.id === "appstore") && t.url);
const socials = SOCIAL_ACCOUNTS.filter((a) => a.url);

for (const t of templates) {
  const { html, text, id } = t;
  check(`${id} H1 footer once`, count(html, `<!-- ${EMAIL_FOOTER_MARK} -->`) === 1);
  check(`${id} H2 one document`, count(html, "<!DOCTYPE html>") === 1 && count(html, "</html>") === 1);
  check(`${id} H3 logo img`, html.includes(`src="${mailLogoUrl()}"`));
  check(
    `${id} H4 footer links`,
    EXPECTED_LINKS.every(([label, href]) => count(html, `href="${href}"`) >= 1 && html.includes(`>${label}</a>`)),
  );
  check(`${id} H5 brand + slogan + domain`, html.includes(">AlsatPort</p>") && html.includes(EMAIL_SLOGAN) && html.includes(">alsatport.com</a>"));
  check(`${id} H6 small print`, html.includes(EMAIL_REASON) && html.includes(EMAIL_NO_REPLY), "exact sentences");
  check(`${id} H7 no old footer / fake logo`, !html.includes("AlsatPort Destek ·") && !html.includes(">A</span>") && !html.includes("Al<span"));
  check(`${id} H8 no store buttons until published`, storeConfigured || (!/Google Play|App Store/.test(html) && !/Google Play|App Store/.test(text)));
  check(
    `${id} H9 social only verified`,
    SOCIAL_ACCOUNTS.every((a) => (a.url ? html.includes(`href="${a.url}"`) : !html.includes(`>${a.label}</a>`))),
  );
  check(`${id} H10 dark/mobile hints`, html.includes('name="color-scheme" content="light dark"') && html.includes("prefers-color-scheme: dark") && html.includes("max-width: 480px"));
  check(`${id} H11 no http:// or localhost links`, !/href="http:\/\//.test(html) && !html.includes("localhost"));

  check(`${id} T1 text footer once`, count(text, EMAIL_REASON) === 1 && count(text, EMAIL_NO_REPLY) === 1);
  check(`${id} T2 text links`, EXPECTED_LINKS.every(([label, href]) => text.includes(`${label}: ${href}`)) && text.includes(`AlsatPort · ${EMAIL_SLOGAN}`));
  check(`${id} T3 text social verified only`, socials.every((a) => text.includes(a.url!)));
  check(`${id} T4 no old © footer in text`, !/©/.test(text));
}

const dir = process.env.EMAIL_PREVIEW_DIR;
if (dir) {
  mkdirSync(dir, { recursive: true });
  for (const t of templates) {
    // Previews load the icon from the local server when given, so they work before deploy.
    const local = process.env.EMAIL_PREVIEW_ORIGIN;
    const html = local ? t.html.replaceAll(mailLogoUrl(), mailLogoUrl().replace(ORIGIN, local)) : t.html;
    writeFileSync(join(dir, `${t.id}.html`), html, "utf8");
    writeFileSync(join(dir, `${t.id}.txt`), t.text, "utf8");
  }
  console.log(`previews: ${templates.length} → ${dir}`);
}

async function urlChecks() {
  if (process.env.EMAIL_LOGO_CHECK !== "1") return;
  const base = process.env.EMAIL_CHECK_ORIGIN ?? ORIGIN;
  const urls = [mailLogoUrl(), ...EXPECTED_LINKS.map(([, h]) => h), `${ORIGIN}/`].map((u) => u.replace(ORIGIN, base));
  for (const u of urls) {
    const res = await fetch(u, { redirect: "manual" });
    const type = res.headers.get("content-type") ?? "";
    const ok = res.status === 200 && (!u.includes("icon-192") || type.startsWith("image/png"));
    check(`U ${u.replace(base, "")} 200`, ok, `${res.status} ${type}`);
  }
}

urlChecks().then(() => {
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
});
