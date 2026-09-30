import { NextResponse } from "next/server";
import { paymentPublicStatus } from "@/lib/payments/store";
import { requireUser } from "@/lib/security/session";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const auth = await requireUser("member");
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  const row = await paymentPublicStatus(auth.user.id, id);
  if (!row) return NextResponse.json({ ok: false, error: "auth.err.forbidden" }, { status: 404 });
  return NextResponse.json({ ok: true, ...row });
}
