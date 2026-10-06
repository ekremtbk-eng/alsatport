import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/admin/audit";
import { deviceLabel } from "@/lib/security/alerts";
import { readJson } from "@/lib/security/parseBody";
import { clientIp } from "@/lib/security/rateLimit";
import { requireMutatingRequest, requireUser, revokeSession, revokeUserSessions } from "@/lib/security/session";

const revokeSchema = z.union([
  z.object({ scope: z.literal("others") }),
  z.object({ scope: z.literal("one"), id: z.string().uuid() }),
]);

/** Lists only the caller's own live sessions; device hashes and raw IPs are never returned. */
export async function GET() {
  const auth = await requireUser("member", { allowUnverified: true });
  if ("error" in auth) return auth.error;
  const rows = await prisma.userSession.findMany({
    where: { userId: auth.user.id, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { lastSeenAt: "desc" },
    take: 30,
    select: { id: true, method: true, userAgent: true, ipMasked: true, createdAt: true, lastSeenAt: true },
  });
  return NextResponse.json({
    ok: true,
    sessions: rows.map((r) => ({
      id: r.id,
      device: deviceLabel(r.userAgent),
      method: r.method,
      ip: r.ipMasked,
      createdAt: r.createdAt.toISOString(),
      lastSeenAt: r.lastSeenAt.toISOString(),
      current: r.id === auth.session.id,
    })),
  });
}

export async function DELETE(req: Request) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const auth = await requireUser("member", { allowUnverified: true });
  if ("error" in auth) return auth.error;
  const parsed = await readJson(req, revokeSchema);
  if (!parsed.ok) return parsed.response;

  let ended = 0;
  if (parsed.data.scope === "others") {
    ended = await revokeUserSessions(auth.user.id, "user-signed-out-others", auth.session.id);
  } else {
    if (parsed.data.id === auth.session.id) {
      return NextResponse.json({ ok: false, error: "auth.err.required" }, { status: 400 });
    }
    // Ownership: the session must belong to the caller, otherwise nothing is touched.
    const own = await prisma.userSession.findFirst({ where: { id: parsed.data.id, userId: auth.user.id }, select: { id: true } });
    if (!own) return NextResponse.json({ ok: false, error: "auth.err.forbidden" }, { status: 404 });
    await revokeSession(own.id, "user-revoked");
    ended = 1;
  }
  await writeAudit({
    actorId: auth.user.id,
    action: "auth.sessions_revoked",
    entityType: "security",
    ip: clientIp(req),
    userAgent: req.headers.get("user-agent"),
    payload: { scope: parsed.data.scope, ended },
  });
  return NextResponse.json({ ok: true, ended });
}
