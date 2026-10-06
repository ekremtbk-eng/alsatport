import { NextResponse, after } from "next/server";
import { writeAudit } from "@/lib/admin/audit";
import { notifyOwner } from "@/lib/security/alerts";
import { verifyPasswordOrDummy } from "@/lib/security/password";
import { clientIp } from "@/lib/security/rateLimit";
import { sanitizeText } from "@/lib/security/sanitize";
import { findUserByIdentifier } from "@/lib/security/userStore";
import { requireMutatingRequest } from "@/lib/security/session";
import { readJson } from "@/lib/security/parseBody";
import { loginBodySchema } from "@/lib/security/schemas";
import { isStrongPassword } from "@/lib/security/passwordPolicy";
import { completeLogin, needsSecondFactor, sendLoginCode } from "@/lib/security/loginFlow";
import { setLoginChallenge } from "@/lib/security/twoFactor";
import { THROTTLE, throttle, tooMany } from "@/lib/security/throttle";

function wrong() {
  return NextResponse.json({ ok: false, error: "auth.err.wrong" }, { status: 401 });
}

export async function POST(req: Request) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const parsed = await readJson(req, loginBodySchema);
  if (!parsed.ok) return parsed.response;
  const ip = clientIp(req);
  const identifier = sanitizeText(parsed.data.identifier, 80);
  const password = parsed.data.password;
  const id = identifier.toLowerCase();

  const limited = await throttle(
    [
      { key: `login:ip-id:${ip}:${id}`, ...THROTTLE.loginIpId },
      { key: `login:id:${id}`, ...THROTTLE.loginId },
      { key: `login:ip:${ip}`, ...THROTTLE.loginIp },
    ],
    req,
  );
  if (!limited.ok) return tooMany(limited.retryAfter);

  if (!identifier || !password || !isStrongPassword(password)) return wrong();

  const user = await findUserByIdentifier(identifier);
  const ok = await verifyPasswordOrDummy(password, user?.passwordHash);
  if (!user?.passwordHash || !ok) {
    if (user?.role === "admin") {
      after(async () => {
        await writeAudit({
          actorId: user.id,
          action: "admin.login_failed",
          entityType: "security",
          ip,
          userAgent: req.headers.get("user-agent"),
        });
        await notifyOwner(
          "Yönetici hesabında başarısız giriş",
          "Yönetici hesabınız için hatalı şifreyle giriş denemesi yapıldı. Siz değilseniz şifrenizi değiştirin.",
          `admin-fail:${user.id}`,
        );
      });
    }
    return wrong();
  }
  if (user.bannedAt) {
    return NextResponse.json({ ok: false, error: "auth.err.forbidden" }, { status: 403 });
  }

  if (await needsSecondFactor(user)) {
    const sent = await sendLoginCode(user);
    if (!sent.ok) return NextResponse.json({ ok: false, error: "auth.err.mail" }, { status: 503 });
    const res = NextResponse.json({ ...sent, twoFactor: true });
    await setLoginChallenge(res, user.id);
    return res;
  }

  return completeLogin(user, req, { method: "password" });
}
