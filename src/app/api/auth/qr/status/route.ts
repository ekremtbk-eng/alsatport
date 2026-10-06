import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sessionCookieOptions } from "@/lib/security/cookies";
import { completeLogin } from "@/lib/security/loginFlow";
import { COOKIE_QR_SECRET, qrHash } from "@/lib/security/qr";
import { clientIp, rateLimit } from "@/lib/security/rateLimit";
import { requireMutatingRequest } from "@/lib/security/session";
import { findUserById } from "@/lib/security/userStore";

/** Polled by the desktop that showed the QR; only the browser holding the secret cookie can redeem it. */
export async function POST(req: Request) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const limited = rateLimit(`qrpoll:${clientIp(req)}`, 150, 5 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json({ ok: false, error: "auth.err.rateLimit" }, { status: 429 });
  }
  const secret = (await cookies()).get(COOKIE_QR_SECRET)?.value;
  if (!secret) return NextResponse.json({ ok: true, status: "expired" });
  const row = await prisma.qrToken.findUnique({ where: { secretHash: await qrHash(secret) } });
  const done = (status: string) => {
    const res = NextResponse.json({ ok: true, status });
    res.cookies.set(COOKIE_QR_SECRET, "", sessionCookieOptions(0));
    return res;
  };
  if (!row || row.kind !== "login") return done("expired");
  if (row.status === "rejected") return done("rejected");
  if (row.status === "pending") {
    return row.expiresAt.getTime() < Date.now() ? done("expired") : NextResponse.json({ ok: true, status: "pending" });
  }
  if (row.status !== "approved" || !row.userId) return done("expired");

  const claimed = await prisma.qrToken.updateMany({
    where: { id: row.id, status: "approved", consumedAt: null },
    data: { status: "consumed", consumedAt: new Date() },
  });
  if (claimed.count !== 1) return done("expired");
  const user = await findUserById(row.userId);
  if (!user || user.bannedAt || user.role === "admin") return done("expired");
  const res = await completeLogin(user, req, { method: "qr" }, { status: "approved" });
  res.cookies.set(COOKIE_QR_SECRET, "", sessionCookieOptions(0));
  return res;
}
