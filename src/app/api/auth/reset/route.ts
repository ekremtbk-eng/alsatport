import { NextResponse, after } from "next/server";
import { sendSecurityNoticeEmail } from "@/lib/mail/authMail";
import { recordSecurityNotice } from "@/lib/security/alerts";
import { hashPassword } from "@/lib/security/password";
import { resetStampMatches, verifyPasswordResetToken } from "@/lib/security/passwordReset";
import { clientIp } from "@/lib/security/rateLimit";
import { requireMutatingRequest, revokeUserSessions } from "@/lib/security/session";
import { THROTTLE, throttle, tooMany } from "@/lib/security/throttle";
import { writeAudit } from "@/lib/admin/audit";
import { findUserById, saveUser } from "@/lib/security/userStore";
import { readJson } from "@/lib/security/parseBody";
import { resetBodySchema } from "@/lib/security/schemas";

export async function POST(req: Request) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const ip = clientIp(req);
  const limited = await throttle([{ key: `reset:ip:${ip}`, ...THROTTLE.reset }], req);
  if (!limited.ok) return tooMany(limited.retryAfter);
  const parsed = await readJson(req, resetBodySchema);
  if (!parsed.ok) return parsed.response;
  const claims = await verifyPasswordResetToken(parsed.data.token);
  const user = claims ? await findUserById(claims.userId) : undefined;
  if (!claims || !user || user.bannedAt || !(await resetStampMatches(claims.stamp, user.passwordHash))) {
    return NextResponse.json({ ok: false, error: "auth.reset.invalid" }, { status: 400 });
  }
  const passwordHash = await hashPassword(parsed.data.password);
  await saveUser({ ...user, passwordHash });
  const ended = await revokeUserSessions(user.id, "password-reset");
  await writeAudit({
    actorId: user.id,
    action: user.role === "admin" ? "admin.password_reset" : "auth.password_reset",
    entityType: "security",
    ip,
    userAgent: req.headers.get("user-agent"),
    payload: { sessionsEnded: ended },
  });
  after(() =>
    sendSecurityNoticeEmail(user.email, "Şifreniz sıfırlandı", "AlsatPort hesabınızın şifresi sıfırlama bağlantısıyla değiştirildi.").then(
      () => undefined,
      () => undefined,
    ),
  );
  after(() =>
    recordSecurityNotice(user.id, "security.password", "Şifreniz sıfırlandı", "AlsatPort hesabınızın şifresi sıfırlama bağlantısıyla değiştirildi."),
  );
  return NextResponse.json({ ok: true });
}
