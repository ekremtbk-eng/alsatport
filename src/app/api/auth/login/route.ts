import { NextResponse } from "next/server";
import { verifyPasswordHash } from "@/lib/security/password";
import { LIMITS, clientIp, rateLimit } from "@/lib/security/rateLimit";
import { sanitizeText } from "@/lib/security/sanitize";
import { findUserByIdentifier } from "@/lib/security/userStore";
import { requireMutatingRequest } from "@/lib/security/session";
import { promoteConfiguredAdmin } from "@/lib/admin/audit";
import { readJson } from "@/lib/security/parseBody";
import { loginBodySchema } from "@/lib/security/schemas";
import { isStrongPassword } from "@/lib/security/passwordPolicy";
import { completeLogin, sendLoginCode } from "@/lib/security/loginFlow";
import { isTrustedDevice, setLoginChallenge } from "@/lib/security/twoFactor";

export async function POST(req: Request) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const parsed = await readJson(req, loginBodySchema);
  if (!parsed.ok) return parsed.response;
  const ip = clientIp(req);
  const identifier = sanitizeText(parsed.data.identifier, 80);
  const password = parsed.data.password;

  const ipLimit = rateLimit(`login:${ip}`, LIMITS.login.limit, LIMITS.login.windowMs);
  const idLimit = rateLimit(`login-id:${identifier.toLowerCase()}`, LIMITS.login.limit, LIMITS.login.windowMs);
  if (!ipLimit.ok || !idLimit.ok) {
    return NextResponse.json(
      { ok: false, error: "auth.err.rateLimit" },
      { status: 429, headers: { "Retry-After": String(Math.max(ipLimit.retryAfter, idLimit.retryAfter)) } },
    );
  }

  if (!identifier || !password || !isStrongPassword(password)) {
    return NextResponse.json({ ok: false, error: "auth.err.wrong" }, { status: 401 });
  }

  let user = await findUserByIdentifier(identifier);
  if (!user?.passwordHash) {
    return NextResponse.json({ ok: false, error: "auth.err.wrong" }, { status: 401 });
  }
  if (user.bannedAt) {
    return NextResponse.json({ ok: false, error: "auth.err.forbidden" }, { status: 403 });
  }
  const passwordHash = user.passwordHash;
  user = await promoteConfiguredAdmin(user);
  const ok = await verifyPasswordHash(password, passwordHash);
  if (!ok) {
    return NextResponse.json({ ok: false, error: "auth.err.wrong" }, { status: 401 });
  }

  if (user.profile.twoFactorEnabled && !(await isTrustedDevice(user.id))) {
    const sent = await sendLoginCode(user);
    if (!sent.ok) return NextResponse.json({ ok: false, error: "auth.err.mail" }, { status: 503 });
    const res = NextResponse.json({ ...sent, twoFactor: true });
    await setLoginChallenge(res, user.id);
    return res;
  }

  return completeLogin(user);
}
