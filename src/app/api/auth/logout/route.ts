import { NextResponse } from "next/server";
import { clearSession, currentSession, requireMutatingRequest, revokeSession } from "@/lib/security/session";

export async function POST(req: Request) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const current = await currentSession();
  if (current) await revokeSession(current.session.id, "logout");
  return clearSession(NextResponse.json({ ok: true }));
}
