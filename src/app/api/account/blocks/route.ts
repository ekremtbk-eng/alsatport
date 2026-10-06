import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isUuid } from "@/lib/ids";
import { publicAccountName } from "@/lib/publicName";
import { readJson } from "@/lib/security/parseBody";
import { LIMITS, clientIp, rateLimit } from "@/lib/security/rateLimit";
import { blockBodySchema } from "@/lib/security/schemas";
import { requireMutatingRequest, requireUser } from "@/lib/security/session";

export async function GET() {
  const auth = await requireUser("member", { allowUnverified: true });
  if ("error" in auth) return auth.error;
  const rows = await prisma.userBlock.findMany({
    where: { blockerId: auth.user.id },
    include: { blocked: { select: { username: true, profile: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json({
    ok: true,
    blocks: rows.map((r) => ({
      id: r.id,
      name: publicAccountName({ ...r.blocked.profile, username: r.blocked.username }),
      avatar: r.blocked.profile?.avatarUrl || "",
      at: r.createdAt.getTime(),
    })),
  });
}

async function limit(req: Request, userId: string) {
  const limited = rateLimit(`blocks:${clientIp(req)}:${userId}`, LIMITS.apiWrite.limit, LIMITS.apiWrite.windowMs);
  if (limited.ok) return null;
  return NextResponse.json(
    { ok: false, error: "auth.err.rateLimit" },
    { status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
  );
}

/** Blocks the other participant of a conversation the caller belongs to; user ids never reach the client. */
export async function POST(req: Request) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const auth = await requireUser("member", { allowUnverified: true });
  if ("error" in auth) return auth.error;
  const limited = await limit(req, auth.user.id);
  if (limited) return limited;
  const parsed = await readJson(req, blockBodySchema);
  if (!parsed.ok) return parsed.response;
  const convo = await prisma.conversation.findFirst({
    where: { id: parsed.data.conversationId, OR: [{ buyerId: auth.user.id }, { sellerId: auth.user.id }] },
    select: { buyerId: true, sellerId: true },
  });
  if (!convo) return NextResponse.json({ ok: false, error: "auth.err.session" }, { status: 404 });
  const otherId = convo.buyerId === auth.user.id ? convo.sellerId : convo.buyerId;
  await prisma.userBlock.upsert({
    where: { blockerId_blockedId: { blockerId: auth.user.id, blockedId: otherId } },
    create: { blockerId: auth.user.id, blockedId: otherId },
    update: {},
  });
  return NextResponse.json({ ok: true });
}

/** Accepts either a block id (from the list) or a conversation id (from the chat screen). */
export async function DELETE(req: Request) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const auth = await requireUser("member", { allowUnverified: true });
  if ("error" in auth) return auth.error;
  const limited = await limit(req, auth.user.id);
  if (limited) return limited;
  const url = new URL(req.url);
  const conversationId = url.searchParams.get("conversationId") ?? "";
  const id = url.searchParams.get("id") ?? "";
  if (isUuid(conversationId)) {
    const convo = await prisma.conversation.findFirst({
      where: { id: conversationId, OR: [{ buyerId: auth.user.id }, { sellerId: auth.user.id }] },
      select: { buyerId: true, sellerId: true },
    });
    if (!convo) return NextResponse.json({ ok: false, error: "auth.err.session" }, { status: 404 });
    const otherId = convo.buyerId === auth.user.id ? convo.sellerId : convo.buyerId;
    await prisma.userBlock.deleteMany({ where: { blockerId: auth.user.id, blockedId: otherId } });
    return NextResponse.json({ ok: true });
  }
  if (!isUuid(id)) return NextResponse.json({ ok: false, error: "auth.err.required" }, { status: 400 });
  await prisma.userBlock.deleteMany({ where: { id, blockerId: auth.user.id } });
  return NextResponse.json({ ok: true });
}
