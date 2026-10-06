import { NextResponse } from "next/server";
import { hashPassword, verifyPasswordHash } from "@/lib/security/password";
import { LIMITS, clientIp } from "@/lib/security/rateLimit";
import { throttle } from "@/lib/security/throttle";
import { saveUser } from "@/lib/security/userStore";
import { requireMutatingRequest, requireUser, revokeUserSessions, sessionIsFresh } from "@/lib/security/session";
import { writeAudit } from "@/lib/admin/audit";
import { readJson } from "@/lib/security/parseBody";
import { passwordChangeSchema } from "@/lib/security/schemas";
import { sendSecurityNoticeEmail } from "@/lib/mail/authMail";

export async function POST(req: Request) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const auth = await requireUser("member");
  if ("error" in auth) return auth.error;

  const ip = clientIp(req);
  const limited = await throttle([{ key: `pw:${auth.user.id}`, limit: LIMITS.login.limit, windowMs: LIMITS.login.windowMs }], req);
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: "auth.err.rateLimit" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
    );
  }

  const parsed = await readJson(req, passwordChangeSchema);
  if (!parsed.ok) return parsed.response;
  const current = parsed.data.current;
  const next = parsed.data.next;
  const hadPassword = !!auth.user.passwordHash;
  if (hadPassword && !(await verifyPasswordHash(current, auth.user.passwordHash!))) {
    return NextResponse.json({ ok: false, error: "dash.pw.current" }, { status: 400 });
  }
  // Without a current password, only a freshly signed-in session may add one (stolen-cookie persistence).
  if (!hadPassword && !sessionIsFresh(auth.session)) {
    return NextResponse.json({ ok: false, error: "auth.err.reauth" }, { status: 403 });
  }
  const passwordHash = await hashPassword(next);
  const user = await saveUser({ ...auth.user, passwordHash });
  const ended = await revokeUserSessions(user.id, "password-change", auth.session.id);
  await writeAudit({
    actorId: user.id,
    action: hadPassword ? "auth.password_change" : "auth.password_add",
    entityType: "security",
    ip,
    userAgent: req.headers.get("user-agent"),
    payload: { otherSessionsEnded: ended },
  });
  if (auth.user.email) {
    await sendSecurityNoticeEmail(
      auth.user.email,
      hadPassword ? "Şifreniz değiştirildi" : "Hesabınıza şifre eklendi",
      hadPassword
        ? "AlsatPort hesabınızın şifresi değiştirildi."
        : "Artık e-posta adresiniz ve belirlediğiniz şifreyle de giriş yapabilirsiniz.",
    ).catch(() => undefined);
  }
  return NextResponse.json({ ok: true, user: user.profile });
}
