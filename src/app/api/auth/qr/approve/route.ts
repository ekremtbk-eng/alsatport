import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseSearch, readJson } from "@/lib/security/parseBody";
import { findLiveToken, qrHash } from "@/lib/security/qr";
import { clientIp } from "@/lib/security/rateLimit";
import { THROTTLE, throttle, tooMany } from "@/lib/security/throttle";
import { qrApproveSchema, qrTokenSchema } from "@/lib/security/schemas";
import { requireMutatingRequest, requireUser } from "@/lib/security/session";

/** Phone side: shows which browser asked to sign in before the user approves. */
export async function GET(req: Request) {
  const auth = await requireUser("member");
  if ("error" in auth) return auth.error;
  const q = parseSearch(new URL(req.url), qrTokenSchema);
  if (!q) return NextResponse.json({ ok: false, error: "qr.err.invalid" }, { status: 400 });
  const row = await findLiveToken(q.t, "login");
  if (!row || row.status !== "pending") return NextResponse.json({ ok: false, error: "qr.err.expired" }, { status: 410 });
  return NextResponse.json({
    ok: true,
    agent: row.requesterAgent ?? "",
    expiresIn: Math.max(0, row.expiresAt.getTime() - Date.now()),
  });
}

export async function POST(req: Request) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const auth = await requireUser("member");
  if ("error" in auth) return auth.error;
  const limited = await throttle([{ key: `qr-approve:${auth.user.id}:${clientIp(req)}`, ...THROTTLE.qr }], req);
  if (!limited.ok) return tooMany(limited.retryAfter);
  const parsed = await readJson(req, qrApproveSchema);
  if (!parsed.ok) return parsed.response;
  if (parsed.data.approve && auth.user.role === "admin") {
    return NextResponse.json({ ok: false, error: "qr.err.admin" }, { status: 403 });
  }
  const updated = await prisma.qrToken.updateMany({
    where: {
      tokenHash: await qrHash(parsed.data.t),
      kind: "login",
      status: "pending",
      expiresAt: { gt: new Date() },
    },
    data: parsed.data.approve
      ? { status: "approved", userId: auth.user.id, approvedAt: new Date() }
      : { status: "rejected" },
  });
  if (updated.count !== 1) return NextResponse.json({ ok: false, error: "qr.err.expired" }, { status: 410 });
  return NextResponse.json({ ok: true });
}
