import { NextResponse } from "next/server";
import { sendLoginCode } from "@/lib/security/loginFlow";
import { readJson } from "@/lib/security/parseBody";
import { LIMITS, clientIp, rateLimit } from "@/lib/security/rateLimit";
import { loginResendSchema } from "@/lib/security/schemas";
import { requireMutatingRequest } from "@/lib/security/session";
import { readLoginChallenge } from "@/lib/security/twoFactor";
import { findUserById } from "@/lib/security/userStore";

export async function POST(req: Request) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const userId = await readLoginChallenge();
  if (!userId) return NextResponse.json({ ok: false, error: "auth.2fa.expired" }, { status: 401 });

  const limited = rateLimit(`login2fa-send:${clientIp(req)}:${userId}`, LIMITS.emailOtp.limit, LIMITS.emailOtp.windowMs);
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: "auth.err.rateLimit" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
    );
  }

  const parsed = await readJson(req, loginResendSchema);
  if (!parsed.ok) return parsed.response;
  const user = await findUserById(userId);
  if (!user || user.bannedAt) return NextResponse.json({ ok: false, error: "auth.err.forbidden" }, { status: 403 });
  const sent = await sendLoginCode(user, parsed.data.to);
  if (sent.cooling) {
    return NextResponse.json(
      { ok: false, error: "auth.2fa.wait", resendIn: sent.resendIn, expiresIn: sent.expiresIn },
      { status: 429, headers: { "Retry-After": String(sent.resendIn) } },
    );
  }
  if (!sent.ok) return NextResponse.json({ ok: false, error: "auth.err.mail" }, { status: 503 });
  return NextResponse.json(sent);
}
