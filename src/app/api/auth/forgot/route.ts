import { NextResponse } from "next/server";
import { isValidEmail, normalizeEmail } from "@/lib/auth";
import { sendPasswordResetEmail } from "@/lib/mail/authMail";
import { signPasswordResetToken } from "@/lib/security/passwordReset";
import { LIMITS, clientIp, rateLimit } from "@/lib/security/rateLimit";
import { sanitizeText } from "@/lib/security/sanitize";
import { requireMutatingRequest } from "@/lib/security/session";
import { findUserByIdentifier } from "@/lib/security/userStore";

export const maxDuration = 60;

export async function POST(req: Request) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const ip = clientIp(req);
  const limited = rateLimit(`forgot:${ip}`, LIMITS.forgot.limit, LIMITS.forgot.windowMs);
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: "auth.err.rateLimit" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
    );
  }
  const body = (await req.json().catch(() => null)) as { email?: string } | null;
  const email = normalizeEmail(sanitizeText(body?.email, 80));
  if (!isValidEmail(email)) {
    return NextResponse.json({ ok: false, error: "auth.err.email" }, { status: 400 });
  }
  const user = await findUserByIdentifier(email);
  if (user?.passwordHash && user.provider === "email" && !user.bannedAt) {
    const token = await signPasswordResetToken(user.id);
    await sendPasswordResetEmail(user.email, token);
  }
  return NextResponse.json({ ok: true });
}
