import { NextResponse } from "next/server";
import { resetStampMatches, verifyPasswordResetToken } from "@/lib/security/passwordReset";
import { LIMITS, clientIp, rateLimit } from "@/lib/security/rateLimit";
import { requireMutatingRequest } from "@/lib/security/session";
import { findUserById } from "@/lib/security/userStore";
import { readJson } from "@/lib/security/parseBody";
import { resetTokenSchema } from "@/lib/security/schemas";

export async function POST(req: Request) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const limited = rateLimit(`reset-check:${clientIp(req)}`, LIMITS.forgot.limit * 4, LIMITS.forgot.windowMs);
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: "auth.err.rateLimit" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
    );
  }
  const parsed = await readJson(req, resetTokenSchema);
  if (!parsed.ok) return parsed.response;
  const claims = await verifyPasswordResetToken(parsed.data.token);
  const user = claims ? await findUserById(claims.userId) : undefined;
  const valid = !!claims && !!user && !user.bannedAt && (await resetStampMatches(claims.stamp, user.passwordHash));
  if (!valid) return NextResponse.json({ ok: false, error: "auth.reset.invalid" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
