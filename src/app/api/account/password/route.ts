import { NextResponse } from "next/server";
import { hashPassword, verifyPasswordHash } from "@/lib/security/password";
import { isStrongPassword } from "@/lib/security/passwordPolicy";
import { LIMITS, clientIp, rateLimit } from "@/lib/security/rateLimit";
import { saveUser } from "@/lib/security/userStore";
import { requireMutatingRequest, requireUser } from "@/lib/security/session";

export async function POST(req: Request) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const auth = await requireUser("member");
  if ("error" in auth) return auth.error;

  const ip = clientIp(req);
  const limited = rateLimit(`pw:${ip}:${auth.user.id}`, LIMITS.login.limit, LIMITS.login.windowMs);
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: "auth.err.rateLimit" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
    );
  }

  if (auth.user.provider !== "email" || !auth.user.passwordHash) {
    return NextResponse.json({ ok: false, error: "dash.pw.oauth" }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as {
    current?: string;
    next?: string;
  } | null;
  const current = typeof body?.current === "string" ? body.current : "";
  const next = typeof body?.next === "string" ? body.next : "";
  if (!current || !next) {
    return NextResponse.json({ ok: false, error: "dash.pw.missing" }, { status: 400 });
  }
  if (!isStrongPassword(next)) {
    return NextResponse.json({ ok: false, error: "auth.err.passPolicy" }, { status: 400 });
  }
  const ok = await verifyPasswordHash(current, auth.user.passwordHash);
  if (!ok) {
    return NextResponse.json({ ok: false, error: "dash.pw.current" }, { status: 400 });
  }
  const passwordHash = await hashPassword(next);
  await saveUser({ ...auth.user, passwordHash });
  return NextResponse.json({ ok: true });
}
