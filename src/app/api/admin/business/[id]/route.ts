import { NextResponse } from "next/server";
import { adminBusinessAction } from "@/lib/business/store";
import { writeAudit } from "@/lib/admin/audit";
import { isUuid } from "@/lib/ids";
import { readJson } from "@/lib/security/parseBody";
import { clientIp } from "@/lib/security/rateLimit";
import { adminBusinessActionSchema } from "@/lib/security/schemas";
import { requireAdmin, requireMutatingRequest } from "@/lib/security/session";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const auth = await requireAdmin({ stepUp: true });
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  if (!isUuid(id)) return NextResponse.json({ ok: false, error: "auth.err.required" }, { status: 400 });
  const parsed = await readJson(req, adminBusinessActionSchema);
  if (!parsed.ok) return parsed.response;
  const { action, reason } = parsed.data;
  const result = await adminBusinessAction(auth.user.id, id, action, reason);
  if ("error" in result) return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  await writeAudit({
    actorId: auth.user.id,
    action: `business.${action}`,
    entityType: "business",
    entityId: id,
    ip: clientIp(req),
    userAgent: req.headers.get("user-agent"),
    payload: { previous: result.previous, next: result.row.status, owner: result.row.userId, reason: reason || undefined },
  });
  return NextResponse.json({ ok: true, state: result.row.status });
}
