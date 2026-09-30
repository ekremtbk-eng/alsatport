import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isUuid } from "@/lib/ids";
import { LIMITS, clientIp, rateLimit } from "@/lib/security/rateLimit";
import { sanitizeText } from "@/lib/security/sanitize";
import { requireMutatingRequest, requireUser } from "@/lib/security/session";
import type { ReportReason, ReportTarget } from "@prisma/client";

const REASONS: ReportReason[] = ["spam", "fraud", "inappropriate", "counterfeit", "wrong_category", "other"];
const TARGETS: ReportTarget[] = ["listing", "user", "message"];

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
  const body = (await req.json().catch(() => null)) as {
    targetType?: string;
    listingId?: string;
    reportedUserId?: string;
    messageId?: string;
    reason?: string;
    details?: string;
  } | null;
  const targetType = TARGETS.includes(body?.targetType as ReportTarget) ? (body!.targetType as ReportTarget) : null;
  const reason = REASONS.includes(body?.reason as ReportReason) ? (body!.reason as ReportReason) : "other";
  if (!targetType) return NextResponse.json({ ok: false, error: "auth.err.required" }, { status: 400 });
  const listingId = body?.listingId && isUuid(body.listingId) ? body.listingId : undefined;
  const reportedUserId = body?.reportedUserId && isUuid(body.reportedUserId) ? body.reportedUserId : undefined;
  const messageId = body?.messageId && isUuid(body.messageId) ? body.messageId : undefined;
  await prisma.report.create({
    data: {
      reporterId: auth.user.id,
      targetType,
      listingId,
      reportedUserId,
      messageId,
      reason,
      details: sanitizeText(body?.details, 500) || null,
    },
  });
  return NextResponse.json({ ok: true });
}
