import { NextResponse } from "next/server";
import { listConversations, startConversation } from "@/lib/messages/store";
import { requireMutatingRequest, requireUser } from "@/lib/security/session";
import { readJson } from "@/lib/security/parseBody";
import { listingIdBodySchema } from "@/lib/security/schemas";

export async function GET() {
  const auth = await requireUser("member");
  if ("error" in auth) return auth.error;
  const conversations = await listConversations(auth.user.id);
  return NextResponse.json({ ok: true, conversations });
}

export async function POST(req: Request) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const auth = await requireUser("member");
  if ("error" in auth) return auth.error;
  const parsed = await readJson(req, listingIdBodySchema);
  if (!parsed.ok) return parsed.response;
  const result = await startConversation(auth.user.id, parsed.data.listingId);
  if ("error" in result) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true, conversation: result.conversation, id: result.conversation.id });
}
