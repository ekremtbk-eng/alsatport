import { NextResponse } from "next/server";
import { newCsrfToken } from "@/lib/security/csrf";
import { attachCsrf } from "@/lib/security/session";

export async function GET() {
  const token = newCsrfToken();
  const res = NextResponse.json({ ok: true, token });
  attachCsrf(res, token);
  return res;
}
