import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/security/password";
import { verifyPasswordResetToken } from "@/lib/security/passwordReset";
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
  const token = parsed.data.token;
  const password = parsed.data.password;
  const userId = await verifyPasswordResetToken(token);
  if (!userId) {
    return NextResponse.json({ ok: false, error: "auth.err.session" }, { status: 400 });
  }
  const user = await findUserById(userId);
  if (!user || user.bannedAt || user.provider !== "email") {
    return NextResponse.json({ ok: false, error: "auth.err.session" }, { status: 400 });
  }
  const passwordHash = await hashPassword(password);
  await saveUser({ ...user, passwordHash });
  return NextResponse.json({ ok: true });
}
