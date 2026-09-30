import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { LIMITS, clientIp, rateLimit } from "@/lib/security/rateLimit";
import { sanitizeText } from "@/lib/security/sanitize";
import { requireMutatingRequest, requireUser } from "@/lib/security/session";
import { readJson } from "@/lib/security/parseBody";
import { reportBodySchema } from "@/lib/security/schemas";

export async function POST(req: Request) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const auth = await requireUser("member");
  if ("error" in auth) return auth.error;
  const ip = clientIp(req);
  const limited = rateLimit(`report:${ip}:${auth.user.id}`, LIMITS.report.limit, LIMITS.report.windowMs);
  if (!limited.ok) {
    return NextResponse.json({ ok: false, error: "auth.err.rateLimit" }, { status: 429 });
  }
  const parsed = await readJson(req, reportBodySchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  await prisma.report.create({
    data: {
      reporterId: auth.user.id,
      targetType: body.targetType,
      listingId: body.listingId,
      reportedUserId: body.reportedUserId,
      messageId: body.messageId,
      reason: body.reason,
      details: sanitizeText(body.details, 500) || null,
    },
  });
  return NextResponse.json({ ok: true });
}
