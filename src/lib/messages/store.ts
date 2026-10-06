import "server-only";
import type { Conversation as ClientConversation } from "@/data/store";
import { prisma } from "@/lib/db";
import { isUuid } from "@/lib/ids";
import { sanitizeText } from "@/lib/security/sanitize";
import { publicAccountName } from "@/lib/publicName";
import type { Prisma } from "@prisma/client";

const convoInclude = {
  listing: { include: { images: { orderBy: { sortOrder: "asc" as const }, take: 1 } } },
  buyer: { include: { profile: true as const } },
  seller: { include: { profile: true as const } },
  reads: true,
} satisfies Prisma.ConversationInclude;

type ConvoRow = Prisma.ConversationGetPayload<{ include: typeof convoInclude }>;

function clock(d: Date) {
  return d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

function unreadCount(row: ConvoRow, viewerId: string) {
  const read = row.reads.find((r) => r.userId === viewerId)?.lastReadAt;
  return row.lastMessageAt && (!read || row.lastMessageAt > read) ? 1 : 0;
}

export function toClientConversation(
  row: ConvoRow,
  viewerId: string,
  messages: ClientConversation["messages"] = [],
): ClientConversation {
  const other = row.buyerId === viewerId ? row.seller : row.buyer;
  const cover = row.listing?.images[0]?.url ?? "";
  return {
    id: row.id,
    listingId: row.listingId ?? "",
    listingTitle: row.listing?.title ?? "",
    listingImage: cover,
    peerName: publicAccountName({ ...other.profile, username: other.username }),
    peerAvatar: other.profile?.avatarUrl || "",
    lastMessage: row.lastMessage ?? "",
    time: row.lastMessageAt ? clock(row.lastMessageAt) : clock(row.createdAt),
    unread: unreadCount(row, viewerId),
    favorite: false,
    peerVerified: !!other.profile?.verified,
    messages,
  };
}

export async function blockState(userId: string, otherId: string) {
  const rows = await prisma.userBlock.findMany({
    where: {
      OR: [
        { blockerId: userId, blockedId: otherId },
        { blockerId: otherId, blockedId: userId },
      ],
    },
    select: { blockerId: true },
  });
  return {
    blockedByMe: rows.some((r) => r.blockerId === userId),
    blockedMe: rows.some((r) => r.blockerId === otherId),
  };
}

export async function listConversations(userId: string) {
  const rows = await prisma.conversation.findMany({
    where: {
      OR: [{ buyerId: userId }, { sellerId: userId }],
    },
    include: convoInclude,
    orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
    take: 80,
  });
  const withCounts = await Promise.all(
    rows.map(async (row) => {
      const read = row.reads.find((r) => r.userId === userId)?.lastReadAt ?? new Date(0);
      const unread = await prisma.message.count({
        where: {
          conversationId: row.id,
          deletedAt: null,
          senderId: { not: userId },
          createdAt: { gt: read },
        },
      });
      const mapped = toClientConversation(row, userId);
      mapped.unread = unread;
      return mapped;
    }),
  );
  return withCounts;
}

export async function startConversation(userId: string, listingId: string) {
  if (!isUuid(listingId)) return { error: "auth.err.required" as const, status: 400 };
  const listing = await prisma.listing.findFirst({
    where: { id: listingId, deletedAt: null },
    select: { id: true, sellerId: true },
  });
  if (!listing) return { error: "auth.err.session" as const, status: 404 };
  if (listing.sellerId === userId) return { error: "auth.err.forbidden" as const, status: 403 };
  const blocks = await blockState(userId, listing.sellerId);
  if (blocks.blockedByMe || blocks.blockedMe) return { error: "msg.blocked" as const, status: 403 };

  const existing = await prisma.conversation.findFirst({
    where: { listingId, buyerId: userId, sellerId: listing.sellerId },
    include: convoInclude,
  });
  if (existing) return { conversation: toClientConversation(existing, userId) };

  try {
    const created = await prisma.conversation.create({
      data: {
        listingId,
        buyerId: userId,
        sellerId: listing.sellerId,
      },
      include: convoInclude,
    });
    return { conversation: toClientConversation(created, userId) };
  } catch {
    const raced = await prisma.conversation.findFirst({
      where: { listingId, buyerId: userId, sellerId: listing.sellerId },
      include: convoInclude,
    });
    if (raced) return { conversation: toClientConversation(raced, userId) };
    return { error: "auth.err.server" as const, status: 500 };
  }
}

export async function getConversation(userId: string, id: string) {
  if (!isUuid(id)) return { error: "auth.err.required" as const, status: 400 };
  const row = await prisma.conversation.findFirst({
    where: { id, OR: [{ buyerId: userId }, { sellerId: userId }] },
    include: convoInclude,
  });
  if (!row) return { error: "auth.err.session" as const, status: 404 };

  const messages = await prisma.message.findMany({
    where: { conversationId: id, deletedAt: null },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  await prisma.conversationRead.upsert({
    where: { conversationId_userId: { conversationId: id, userId } },
    create: { conversationId: id, userId, lastReadAt: new Date() },
    update: { lastReadAt: new Date() },
  });

  const me = row.buyerId === userId ? row.buyer : row.seller;
  const other = row.buyerId === userId ? row.seller : row.buyer;
  const receipts = (me.profile?.readReceipts ?? true) && (other.profile?.readReceipts ?? true);
  const peerRead = receipts ? row.reads.find((r) => r.userId === other.id)?.lastReadAt : undefined;
  const blocks = await blockState(userId, other.id);

  return {
    conversation: {
      ...toClientConversation(
        row,
        userId,
        messages.map((m) => ({
          id: m.id,
          fromMe: m.senderId === userId,
          text: m.body,
          time: clock(m.createdAt),
          at: m.createdAt.getTime(),
        })),
      ),
      ...blocks,
      ...(peerRead ? { peerReadAt: peerRead.getTime() } : {}),
    },
  };
}

export async function postMessage(userId: string, conversationId: string, rawText: string) {
  const text = sanitizeText(rawText, 2000);
  if (!isUuid(conversationId) || !text) return { error: "auth.err.required" as const, status: 400 };

  const convo = await prisma.conversation.findFirst({
    where: { id: conversationId, OR: [{ buyerId: userId }, { sellerId: userId }] },
  });
  if (!convo) return { error: "auth.err.session" as const, status: 404 };
  const blocks = await blockState(userId, convo.buyerId === userId ? convo.sellerId : convo.buyerId);
  if (blocks.blockedByMe || blocks.blockedMe) return { error: "msg.blocked" as const, status: 403 };

  const now = new Date();
  const [message] = await prisma.$transaction([
    prisma.message.create({
      data: { conversationId, senderId: userId, body: text },
    }),
    prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessage: text, lastMessageAt: now },
    }),
    prisma.conversationRead.upsert({
      where: { conversationId_userId: { conversationId, userId } },
      create: { conversationId, userId, lastReadAt: now },
      update: { lastReadAt: now },
    }),
  ]);

  const detail = await getConversation(userId, conversationId);
  if ("error" in detail && detail.error) {
    return { error: detail.error, status: detail.status };
  }
  return { conversation: detail.conversation, messageId: message.id, text };
}
