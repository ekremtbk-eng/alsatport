import { NextResponse, after } from "next/server";
import { writeAudit } from "@/lib/admin/audit";
import { sendSecurityNoticeEmail } from "@/lib/mail/authMail";
import { clientIp } from "@/lib/security/rateLimit";
import { requireAdmin, requireMutatingRequest } from "@/lib/security/session";
import { throttle, tooMany } from "@/lib/security/throttle";
import { maskEmail } from "@/lib/security/userStore";

/**
 * Sends the security-notice template to the signed-in admin's own verified address (never to a supplied one),
 * so the live mail transport can be checked without touching any user data.
 */
export async function POST(req: Request) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const auth = await requireAdmin({ stepUp: true });
  if ("error" in auth) return auth.error;
  const limited = await throttle([{ key: `admin-test-mail:${auth.user.id}`, limit: 3, windowMs: 60 * 60 * 1000 }], req);
  if (!limited.ok) return tooMany(limited.retryAfter);

  const sent = await sendSecurityNoticeEmail(
    auth.user.email,
    "Test e-postası",
    "Bu, AlsatPort mail sisteminin canlı gönderimini doğrulamak için yönetici panelinden istenen bir test e-postasıdır. Hesabınızda herhangi bir değişiklik yapılmadı.",
  );
  after(() =>
    writeAudit({
      actorId: auth.user.id,
      action: sent.ok ? "admin.test_mail" : "admin.test_mail_failed",
      entityType: "security",
      entityId: auth.session.id,
      ip: clientIp(req),
      userAgent: req.headers.get("user-agent"),
      payload: { template: "security-notice", via: sent.via },
    }),
  );
  if (!sent.ok) return NextResponse.json({ ok: false, error: "auth.err.mail" }, { status: 503 });
  return NextResponse.json({ ok: true, template: "security-notice", via: sent.via, maskedEmail: maskEmail(auth.user.email) });
}
