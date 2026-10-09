import { escapeHtml, firstNameFrom } from "@/lib/mail/escapeHtml";
import { emailLayout, emailText, mailLogoUrl, mailUrl as href } from "@/lib/mail/layout";
import { sendMail } from "@/lib/mail/send";
import { appOrigin } from "@/lib/site";

export { appOrigin };

function heroHeader(title: string) {
  return `<tr>
  <td style="background:#111827;padding:28px 32px;text-align:center;border-radius:16px 16px 0 0;">
    <a href="${escapeHtml(href("/"))}" style="text-decoration:none;color:#ffffff;">
      <img src="${escapeHtml(mailLogoUrl())}" width="44" height="44" alt="AlsatPort" style="display:inline-block;width:44px;height:44px;border:0;border-radius:12px;vertical-align:middle;">
      <span style="display:inline-block;margin-left:8px;font-size:22px;font-weight:800;letter-spacing:-0.03em;vertical-align:middle;color:#ffffff;">AlsatPort</span>
    </a>
    <p style="margin:16px 0 0;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.03em;">${escapeHtml(title)}</p>
  </td>
</tr>`;
}

function tipsBox(heading: string, lines: string[]) {
  return `<tr>
  <td class="ap-card-pad" style="padding:16px 32px 28px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:12px;border:1px solid #eef0f3;">
      <tr>
        <td style="padding:18px 20px;font-size:14px;line-height:1.55;color:#374151;">
          <p style="margin:0 0 12px;font-weight:800;color:#111827;">${heading}</p>
          ${lines.map((l, i) => `<p style="margin:0${i < lines.length - 1 ? " 0 10px" : ""};">✔️ ${l}</p>`).join("\n          ")}
        </td>
      </tr>
    </table>
  </td>
</tr>`;
}

export function welcomeEmailHtml(name: string) {
  const safe = escapeHtml(firstNameFrom(name));
  const post = escapeHtml(href("/ilan-ver"));
  const browse = escapeHtml(href("/kategoriler"));
  const title = "AlsatPort'a Hoş Geldiniz!";

  return emailLayout({
    title,
    card: `${heroHeader(title)}
<tr>
  <td class="ap-card-pad" style="padding:32px 32px 8px;font-size:16px;line-height:1.6;color:#374151;">
    <p style="margin:0 0 12px;font-size:18px;font-weight:700;color:#111827;">Merhaba ${safe},</p>
    <p style="margin:0;">Sizi AlsatPort ailesinde görmekten çok mutluyuz! Araçtan gayrimenkule, otelden dijital listelemelere aradığınız her şeyi güvenle bulabilir veya hemen ilan verebilirsiniz.</p>
  </td>
</tr>
<tr>
  <td class="ap-card-pad" style="padding:20px 32px 8px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:6px;">
          <a href="${post}" style="display:inline-block;min-width:180px;padding:14px 20px;border-radius:12px;background:#00C853;color:#ffffff;font-weight:800;font-size:15px;text-decoration:none;">Hemen İlan Ver</a>
        </td>
      </tr>
      <tr>
        <td align="center" style="padding:6px;">
          <a href="${browse}" style="display:inline-block;min-width:180px;padding:14px 20px;border-radius:12px;background:#111827;color:#ffffff;font-weight:800;font-size:15px;text-decoration:none;">Alışverişe Başla / İlan Ara</a>
        </td>
      </tr>
    </table>
  </td>
</tr>
${tipsBox("Kullanım ipuçları", [
  "<strong>Favorilerinize kaydedin:</strong> İlgilendiğiniz ilanları takibe alın, fiyat değişikliklerinden haberdar olun.",
  "<strong>Güvenli İletişim:</strong> Diğer kullanıcılarla platform üzerinden güvenle mesajlaşın.",
])}`,
  });
}

export function welcomeVerifyEmailHtml(name: string, verifyHref: string) {
  const safe = escapeHtml(firstNameFrom(name));
  const verify = escapeHtml(verifyHref);

  return emailLayout({
    title: "AlsatPort'a hoş geldiniz — e-postanızı doğrulayın",
    card: `${heroHeader("Hoş geldiniz ve e-postanızı doğrulayın")}
<tr>
  <td class="ap-card-pad" style="padding:32px 32px 8px;font-size:16px;line-height:1.6;color:#374151;">
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
  <td class="ap-card-pad" style="padding:8px 32px 8px;font-size:13px;line-height:1.55;color:#6b7280;">
    <p style="margin:0 0 8px;">Düğme çalışmazsa bu bağlantıyı tarayıcınıza kopyalayın:</p>
    <p style="margin:0 0 12px;word-break:break-all;"><a href="${verify}" style="color:#047857;font-weight:600;">${verify}</a></p>
    <p style="margin:0;">Bu e-postayı siz istemediyseniz yok sayabilirsiniz.</p>
  </td>
</tr>
${tipsBox("Doğruladıktan sonra", ["İlan verebilir, favorilere ekleyebilir ve güvenle mesajlaşabilirsiniz."])}`,
  });
}

export function welcomeVerifyEmailText(name: string, verifyHref: string) {
  const greet = firstNameFrom(name);
  return emailText(
    [
      "AlsatPort'a hoş geldiniz — e-postanızı doğrulayın",
      "",
      `Merhaba ${greet},`,
      "AlsatPort ailesine katıldığınız için teşekkür ederiz. Hesabınız oluşturuldu; platformu kullanmak için e-posta adresinizi doğrulamanız gerekir.",
      "",
      `E-postamı doğrula (48 saat geçerli): ${verifyHref}`,
      "",
      "Bu e-postayı siz istemediyseniz yok sayabilirsiniz.",
    ].join("\n"),
  );
}

export function welcomeEmailText(name: string) {
  const greet = firstNameFrom(name);
  return emailText(
    [
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
    ].join("\n"),
  );
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
