import { NextResponse } from "next/server";
import { sessionCookieOptions } from "@/lib/security/cookies";
import { COOKIE_QR_SECRET, QR_LOGIN_TTL_MS, createLoginToken } from "@/lib/security/qr";
import { clientIp, rateLimit } from "@/lib/security/rateLimit";
import { requireMutatingRequest } from "@/lib/security/session";

export async function POST(req: Request) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const limited = rateLimit(`qrlogin:${clientIp(req)}`, 20, 15 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: "auth.err.rateLimit" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
    );
  }
  const { token, secret } = await createLoginToken(req.headers.get("user-agent") ?? "");
  const res = NextResponse.json({ ok: true, token, ttl: QR_LOGIN_TTL_MS });
  res.cookies.set(COOKIE_QR_SECRET, secret, sessionCookieOptions(QR_LOGIN_TTL_MS / 1000));
  return res;
}
