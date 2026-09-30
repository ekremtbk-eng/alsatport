import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/security/password";
import { isStrongPassword } from "@/lib/security/passwordPolicy";
import { verifyPasswordResetToken } from "@/lib/security/passwordReset";
import { LIMITS, clientIp, rateLimit } from "@/lib/security/rateLimit";
import { requireMutatingRequest } from "@/lib/security/session";
import { findUserById, saveUser } from "@/lib/security/userStore";

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
  const body = (await req.json().catch(() => null)) as { token?: string; password?: string } | null;
  const token = typeof body?.token === "string" ? body.token : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!token || !password) {
    return NextResponse.json({ ok: false, error: "auth.err.required" }, { status: 400 });
  }
  if (!isStrongPassword(password)) {
    return NextResponse.json({ ok: false, error: "auth.err.passPolicy" }, { status: 400 });
  }
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
