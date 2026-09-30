import { NextResponse } from "next/server";
import { sendPasswordResetEmail } from "@/lib/mail/authMail";
import { signPasswordResetToken } from "@/lib/security/passwordReset";
import { LIMITS, clientIp, rateLimit } from "@/lib/security/rateLimit";
import { requireMutatingRequest } from "@/lib/security/session";
import { findUserByIdentifier } from "@/lib/security/userStore";
import { readJson } from "@/lib/security/parseBody";
import { forgotBodySchema } from "@/lib/security/schemas";

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
  const parsed = await readJson(req, forgotBodySchema);
  if (!parsed.ok) return parsed.response;
  const email = parsed.data.email;
  const user = await findUserByIdentifier(email);
  if (user?.passwordHash && user.provider === "email" && !user.bannedAt) {
    const token = await signPasswordResetToken(user.id);
    await sendPasswordResetEmail(user.email, token);
  }
  return NextResponse.json({ ok: true });
}
