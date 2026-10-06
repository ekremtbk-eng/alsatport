import { NextResponse, after } from "next/server";
import { sendSecurityNoticeEmail } from "@/lib/mail/authMail";
import { hashPassword } from "@/lib/security/password";
import { resetStampMatches, verifyPasswordResetToken } from "@/lib/security/passwordReset";
import { LIMITS, clientIp, rateLimit } from "@/lib/security/rateLimit";
import { requireMutatingRequest } from "@/lib/security/session";
import { findUserById, saveUser } from "@/lib/security/userStore";
import { readJson } from "@/lib/security/parseBody";
import { resetBodySchema } from "@/lib/security/schemas";

export async function POST(req: Request) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const ip = clientIp(req);
  const limited = rateLimit(`reset:${ip}`, LIMITS.forgot.limit, LIMITS.forgot.windowMs);
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: "auth.err.rateLimit" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
    );
  }
  const parsed = await readJson(req, resetBodySchema);
  if (!parsed.ok) return parsed.response;
  const claims = await verifyPasswordResetToken(parsed.data.token);
  const user = claims ? await findUserById(claims.userId) : undefined;
  if (!claims || !user || user.bannedAt || !(await resetStampMatches(claims.stamp, user.passwordHash))) {
    return NextResponse.json({ ok: false, error: "auth.reset.invalid" }, { status: 400 });
  }
  const passwordHash = await hashPassword(parsed.data.password);
  await saveUser({ ...user, passwordHash });
  after(() =>
    sendSecurityNoticeEmail(user.email, "Şifreniz sıfırlandı", "AlsatPort hesabınızın şifresi sıfırlama bağlantısıyla değiştirildi.").then(
      () => undefined,
      () => undefined,
    ),
  );
  return NextResponse.json({ ok: true });
}
