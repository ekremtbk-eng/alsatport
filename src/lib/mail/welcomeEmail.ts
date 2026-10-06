import { LEGAL_ADDRESS, LEGAL_BRAND, LEGAL_EMAIL_DESTEK, LEGAL_WEB } from "@/data/legal";
import { escapeHtml, firstNameFrom } from "@/lib/mail/escapeHtml";
import { sendMail } from "@/lib/mail/send";
import { appOrigin } from "@/lib/site";

export { appOrigin };

const ADDRESS_HTML = LEGAL_ADDRESS ? `<p style="margin:0 0 8px;">${escapeHtml(LEGAL_ADDRESS)}</p>` : "";

function href(path: string) {
  return `${appOrigin()}${path.startsWith("/") ? path : `/${path}`}`;
}

export function welcomeEmailHtml(name: string) {
  const safe = escapeHtml(firstNameFrom(name));
  const post = href("/ilan-ver");
  const browse = href("/kategoriler");
  const support = href("/kurumsal/iletisim");
  const home = href("/");
  const kvkk = href("/kvkk");
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>AlsatPort'a Hoş Geldiniz!</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111827;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
          <tr>
            <td style="background:#111827;padding:28px 32px;text-align:center;">
              <a href="${home}" style="text-decoration:none;color:#ffffff;">
                <span style="display:inline-block;width:40px;height:40px;line-height:40px;border-radius:12px;background:#00C853;color:#ffffff;font-weight:800;font-size:18px;">A</span>
                <span style="display:inline-block;margin-left:8px;font-size:22px;font-weight:800;letter-spacing:-0.03em;vertical-align:middle;">Al<span style="color:#00C853;">Sat</span>Port</span>
              </a>
              <p style="margin:16px 0 0;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.03em;">AlsatPort'a Hoş Geldiniz!</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 32px 8px;font-size:16px;line-height:1.6;color:#374151;">
              <p style="margin:0 0 12px;font-size:18px;font-weight:700;color:#111827;">Merhaba ${safe},</p>
              <p style="margin:0;">Sizi AlsatPort ailesinde görmekten çok mutluyuz! Araçtan gayrimenkule, otelden dijital listelemelere aradığınız her şeyi güvenle bulabilir veya hemen ilan verebilirsiniz.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:6px;">
                    <a href="${post}" style="display:inline-block;min-width:200px;padding:14px 20px;border-radius:12px;background:#00C853;color:#ffffff;font-weight:800;font-size:15px;text-decoration:none;">Hemen İlan Ver</a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:6px;">
                    <a href="${browse}" style="display:inline-block;min-width:200px;padding:14px 20px;border-radius:12px;background:#111827;color:#ffffff;font-weight:800;font-size:15px;text-decoration:none;">Alışverişe Başla / İlan Ara</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:12px;border:1px solid #eef0f3;">
                <tr>
                  <td style="padding:18px 20px;font-size:14px;line-height:1.55;color:#374151;">
                    <p style="margin:0 0 12px;font-weight:800;color:#111827;">Kullanım ipuçları</p>
                    <p style="margin:0 0 10px;">✔️ <strong>Favorilerinize kaydedin:</strong> İlgilendiğiniz ilanları takibe alın, fiyat değişikliklerinden haberdar olun.</p>
                    <p style="margin:0;">✔️ <strong>Güvenli İletişim:</strong> Diğer kullanıcılarla platform üzerinden güvenle mesajlaşın.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 8px;font-size:14px;line-height:1.6;color:#4b5563;">
              <p style="margin:0 0 8px;font-weight:700;color:#111827;">Bir sorunla mı karşılaştınız? Bize e-postayla yazın.</p>
              <p style="margin:0;">Destek merkezi: <a href="${support}" style="color:#047857;font-weight:700;text-decoration:none;">${support}</a><br>
              ${LEGAL_EMAIL_DESTEK}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px 32px;font-size:11px;line-height:1.55;color:#6b7280;border-top:1px solid #eef0f3;">
              <p style="margin:0 0 8px;">© ${year} ${LEGAL_BRAND}. Tüm hakları saklıdır.</p>
              ${ADDRESS_HTML}
              <p style="margin:0;"><a href="${home}" style="color:#6b7280;">${LEGAL_WEB}</a> · <a href="${kvkk}" style="color:#6b7280;">KVKK Aydınlatma Metni</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function welcomeVerifyEmailHtml(name: string, verifyHref: string) {
  const safe = escapeHtml(firstNameFrom(name));
  const verify = escapeHtml(verifyHref);
  const home = href("/");
  const support = href("/kurumsal/iletisim");
  const kvkk = href("/kvkk");
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>AlsatPort'a hoş geldiniz — e-postanızı doğrulayın</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111827;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
          <tr>
            <td style="background:#111827;padding:28px 32px;text-align:center;">
              <a href="${home}" style="text-decoration:none;color:#ffffff;">
                <span style="display:inline-block;width:40px;height:40px;line-height:40px;border-radius:12px;background:#00C853;color:#ffffff;font-weight:800;font-size:18px;">A</span>
                <span style="display:inline-block;margin-left:8px;font-size:22px;font-weight:800;letter-spacing:-0.03em;vertical-align:middle;">Al<span style="color:#00C853;">Sat</span>Port</span>
              </a>
              <p style="margin:16px 0 0;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.03em;">Hoş geldiniz ve e-postanızı doğrulayın</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 32px 8px;font-size:16px;line-height:1.6;color:#374151;">
              <p style="margin:0 0 12px;font-size:18px;font-weight:700;color:#111827;">Merhaba ${safe},</p>
              <p style="margin:0 0 12px;">AlsatPort ailesine katıldığınız için teşekkür ederiz. Hesabınız oluşturuldu; ilan vermek, mesajlaşmak ve alışverişe başlamak için e-posta adresinizi doğrulamanız gerekir.</p>
              <p style="margin:0;">Aşağıdaki düğmeye tıklayın. Bağlantı <strong>48 saat</strong> geçerlidir.</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:28px 32px 12px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="border-radius:12px;background:#00C853;">
                    <a href="${verify}" style="display:inline-block;padding:16px 28px;border-radius:12px;background:#00C853;color:#ffffff;font-weight:800;font-size:16px;text-decoration:none;">E-postamı doğrula</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 8px;font-size:13px;line-height:1.55;color:#6b7280;">
              <p style="margin:0 0 8px;">Düğme çalışmazsa bu bağlantıyı tarayıcınıza kopyalayın:</p>
              <p style="margin:0;word-break:break-all;"><a href="${verify}" style="color:#047857;font-weight:600;">${verify}</a></p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:12px;border:1px solid #eef0f3;">
                <tr>
                  <td style="padding:18px 20px;font-size:14px;line-height:1.55;color:#374151;">
                    <p style="margin:0 0 12px;font-weight:800;color:#111827;">Doğruladıktan sonra</p>
                    <p style="margin:0 0 10px;">✔️ İlan verebilir, favorilere ekleyebilir ve güvenle mesajlaşabilirsiniz.</p>
                    <p style="margin:0;">✔️ Sorularınız için ${escapeHtml(LEGAL_EMAIL_DESTEK)} adresine yazabilirsiniz.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 8px;font-size:14px;line-height:1.6;color:#4b5563;">
              <p style="margin:0;">Bu e-postayı siz istemediyseniz yok sayabilirsiniz. Destek: <a href="${support}" style="color:#047857;font-weight:700;text-decoration:none;">${support}</a></p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px 32px;font-size:11px;line-height:1.55;color:#6b7280;border-top:1px solid #eef0f3;">
              <p style="margin:0 0 8px;">© ${year} ${LEGAL_BRAND}. Tüm hakları saklıdır.</p>
              ${ADDRESS_HTML}
              <p style="margin:0;"><a href="${home}" style="color:#6b7280;">${LEGAL_WEB}</a> · <a href="${kvkk}" style="color:#6b7280;">KVKK Aydınlatma Metni</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function welcomeVerifyEmailText(name: string, verifyHref: string) {
  const greet = firstNameFrom(name);
  return [
    "AlsatPort'a hoş geldiniz — e-postanızı doğrulayın",
    "",
    `Merhaba ${greet},`,
    "AlsatPort ailesine katıldığınız için teşekkür ederiz. Hesabınız oluşturuldu; platformu kullanmak için e-posta adresinizi doğrulamanız gerekir.",
    "",
    `E-postamı doğrula (48 saat geçerli): ${verifyHref}`,
    "",
    `Destek: ${LEGAL_EMAIL_DESTEK}`,
    `Bu e-postayı siz istemediyseniz yok sayabilirsiniz.`,
    "",
    `© ${new Date().getFullYear()} ${LEGAL_BRAND}`,
    LEGAL_WEB,
  ].join("\n");
}

export function welcomeEmailText(name: string) {
  const greet = firstNameFrom(name);
  return [
    "AlsatPort'a Hoş Geldiniz!",
    "",
    `Merhaba ${greet},`,
    "Sizi AlsatPort ailesinde görmekten çok mutluyuz! Araçtan gayrimenkule, otelden dijital listelemelere aradığınız her şeyi güvenle bulabilir veya hemen ilan verebilirsiniz.",
    "",
    `Hemen İlan Ver: ${href("/ilan-ver")}`,
    `Alışverişe Başla / İlan Ara: ${href("/kategoriler")}`,
    "",
    "Favorilerinize kaydedin: İlgilendiğiniz ilanları takibe alın, fiyat değişikliklerinden haberdar olun.",
    "Güvenli İletişim: Diğer kullanıcılarla platform üzerinden güvenle mesajlaşın.",
    "",
    "Bir sorunla mı karşılaştınız? Bize e-postayla yazın.",
    `Destek: ${href("/kurumsal/iletisim")} · ${LEGAL_EMAIL_DESTEK}`,
    "",
    `© ${new Date().getFullYear()} ${LEGAL_BRAND}`,
    ...(LEGAL_ADDRESS ? [LEGAL_ADDRESS] : []),
    LEGAL_WEB,
  ].join("\n");
}

export async function sendWelcomeEmail(input: { to?: string; name?: string }) {
  const to = (input.to ?? "").trim();
  if (!to || !to.includes("@")) return { ok: false as const, skipped: true };
  const html = welcomeEmailHtml(input.name ?? "");
  const text = welcomeEmailText(input.name ?? "");
  try {
    const sent = await sendMail({
      to,
      subject: "AlsatPort'a Hoş Geldiniz!",
      html,
      text,
    });
    if (!sent.ok) return { ok: false as const, skipped: false };
    return { ok: true as const, via: sent.via };
  } catch (err) {
    console.error("[mail] welcome send failed", err);
    return { ok: false as const, skipped: false };
  }
}
