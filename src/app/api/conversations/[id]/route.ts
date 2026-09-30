import { NextResponse } from "next/server";
import { getConversation } from "@/lib/messages/store";
import { requireUser } from "@/lib/security/session";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const auth = await requireUser("member");
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  const result = await getConversation(auth.user.id, id);
  if ("error" in result) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true, conversation: result.conversation });
}
