import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { LIMITS } from "@/lib/security/rateLimit";
import { throttle } from "@/lib/security/throttle";
import { sanitizeText } from "@/lib/security/sanitize";
import { requireMutatingRequest, requireUser } from "@/lib/security/session";
import { readJson } from "@/lib/security/parseBody";
import { reportBodySchema } from "@/lib/security/schemas";

export async function POST(req: Request) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const auth = await requireUser("member");
  if ("error" in auth) return auth.error;
  const limited = await throttle([{ key: `report:${auth.user.id}`, limit: LIMITS.report.limit, windowMs: LIMITS.report.windowMs }], req);
  if (!limited.ok) {
    return NextResponse.json({ ok: false, error: "auth.err.rateLimit" }, { status: 429 });
  }
  const parsed = await readJson(req, reportBodySchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  if (body.targetType === "listing") {
    if (!body.listingId) return NextResponse.json({ ok: false, error: "auth.err.required" }, { status: 400 });
    const listing = await prisma.listing.findUnique({ where: { id: body.listingId }, select: { sellerId: true } });
    if (!listing) return NextResponse.json({ ok: false, error: "list.notfound" }, { status: 404 });
    if (listing.sellerId === auth.user.id) {
      return NextResponse.json({ ok: false, error: "report.err.own" }, { status: 400 });
    }
    const open = await prisma.report.findFirst({
      where: { reporterId: auth.user.id, listingId: body.listingId, status: { in: ["open", "reviewing"] } },
      select: { id: true },
    });
    if (open) return NextResponse.json({ ok: true, duplicate: true });
  }
  let reportedUserId = body.reportedUserId;
  if (body.targetType === "message") {
    if (!body.messageId) return NextResponse.json({ ok: false, error: "auth.err.required" }, { status: 400 });
    const message = await prisma.message.findFirst({
      where: {
        id: body.messageId,
        conversation: { OR: [{ buyerId: auth.user.id }, { sellerId: auth.user.id }] },
      },
      select: { senderId: true },
    });
    if (!message) return NextResponse.json({ ok: false, error: "auth.err.forbidden" }, { status: 404 });
    if (message.senderId === auth.user.id) {
      return NextResponse.json({ ok: false, error: "report.err.own" }, { status: 400 });
    }
    reportedUserId = message.senderId;
  }
  if (body.targetType === "user") {
    if (!reportedUserId) return NextResponse.json({ ok: false, error: "auth.err.required" }, { status: 400 });
    if (reportedUserId === auth.user.id) return NextResponse.json({ ok: false, error: "report.err.own" }, { status: 400 });
    const exists = await prisma.user.findUnique({ where: { id: reportedUserId }, select: { id: true } });
    if (!exists) return NextResponse.json({ ok: false, error: "auth.err.forbidden" }, { status: 404 });
  }
  await prisma.report.create({
    data: {
      reporterId: auth.user.id,
      targetType: body.targetType,
      listingId: body.targetType === "listing" ? body.listingId : undefined,
      reportedUserId: body.targetType === "listing" ? undefined : reportedUserId,
      messageId: body.targetType === "message" ? body.messageId : undefined,
      reason: body.reason,
      details: sanitizeText(body.details, 500) || null,
    },
  });
  return NextResponse.json({ ok: true });
}
