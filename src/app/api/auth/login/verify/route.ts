import { NextResponse } from "next/server";
import { promoteConfiguredAdmin } from "@/lib/admin/audit";
import { verifyEmailOtp } from "@/lib/security/emailOtp";
import { completeLogin } from "@/lib/security/loginFlow";
import { readJson } from "@/lib/security/parseBody";
import { LIMITS, clientIp, rateLimit } from "@/lib/security/rateLimit";
import { loginVerifySchema } from "@/lib/security/schemas";
import { requireMutatingRequest } from "@/lib/security/session";
import { clearLoginChallenge, readLoginChallenge, trustDevice } from "@/lib/security/twoFactor";
import { findUserById } from "@/lib/security/userStore";

export async function POST(req: Request) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const userId = await readLoginChallenge();
  if (!userId) return NextResponse.json({ ok: false, error: "auth.2fa.expired" }, { status: 401 });

  const limited = rateLimit(`login2fa:${clientIp(req)}:${userId}`, LIMITS.login.limit, LIMITS.login.windowMs);
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: "auth.err.rateLimit" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
    );
  }

  const parsed = await readJson(req, loginVerifySchema);
  if (!parsed.ok) return parsed.response;
  const user = await findUserById(userId);
  if (!user || user.bannedAt) return NextResponse.json({ ok: false, error: "auth.err.forbidden" }, { status: 403 });
  if (!(await verifyEmailOtp(user.id, parsed.data.otp, "login-2fa"))) {
    return NextResponse.json({ ok: false, error: "auth.2fa.wrong" }, { status: 401 });
  }
  const res = await completeLogin(await promoteConfiguredAdmin(user));
  clearLoginChallenge(res);
  if (parsed.data.trust) await trustDevice(res, user.id);
  return res;
}
