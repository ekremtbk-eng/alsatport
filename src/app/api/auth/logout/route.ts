import { NextResponse } from "next/server";
import { clearSession, requireMutatingRequest } from "@/lib/security/session";

export async function POST(req: Request) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const res = NextResponse.json({ ok: true });
  return clearSession(res);
}
