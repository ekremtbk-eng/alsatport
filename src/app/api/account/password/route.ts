import { NextResponse } from "next/server";
import { hashPassword, verifyPasswordHash } from "@/lib/security/password";
import { LIMITS, clientIp, rateLimit } from "@/lib/security/rateLimit";
import { saveUser } from "@/lib/security/userStore";
import { requireMutatingRequest, requireUser } from "@/lib/security/session";
import { readJson } from "@/lib/security/parseBody";
import { passwordChangeSchema } from "@/lib/security/schemas";
import { sendSecurityNoticeEmail } from "@/lib/mail/authMail";

export async function POST(req: Request) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const auth = await requireUser("member");
  if ("error" in auth) return auth.error;

  const ip = clientIp(req);
  const limited = rateLimit(`pw:${ip}:${auth.user.id}`, LIMITS.login.limit, LIMITS.login.windowMs);
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
  const passwordHash = await hashPassword(next);
  const user = await saveUser({ ...auth.user, passwordHash });
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
