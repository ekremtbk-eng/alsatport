import { NextResponse, after } from "next/server";
import { notifyNewMessage, postMessage } from "@/lib/messages/store";
import { LIMITS } from "@/lib/security/rateLimit";
import { throttle } from "@/lib/security/throttle";
import { requireMutatingRequest, requireUser } from "@/lib/security/session";
import { readJson } from "@/lib/security/parseBody";
import { messageBodySchema } from "@/lib/security/schemas";

export async function POST(req: Request) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const auth = await requireUser("member");
  if ("error" in auth) return auth.error;
  const limited = await throttle([{ key: `message:${auth.user.id}`, limit: LIMITS.message.limit, windowMs: LIMITS.message.windowMs }], req);
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: "auth.err.rateLimit" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
    );
  }

  const parsed = await readJson(req, messageBodySchema);
  if (!parsed.ok) return parsed.response;
  const result = await postMessage(auth.user.id, parsed.data.conversationId, parsed.data.text);
  if ("error" in result) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  }
  const senderId = auth.user.id;
  const conversationId = result.conversation.id;
  after(() => notifyNewMessage(senderId, conversationId).catch(() => undefined));
  return NextResponse.json({
    ok: true,
    conversationId: result.conversation.id,
    text: result.text,
    conversation: result.conversation,
  });
}
