import { NextResponse } from "next/server";
import { safeNextPath } from "@/lib/profile";
import { clearSession } from "@/lib/security/session";

/**
 * Clears stale auth cookies after a revoked/expired page-session check, then sends the user to login.
 * GET-only: no DB writes — only cookie expiry + redirect.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  let next = safeNextPath(url.searchParams.get("next"), "/");
  // Never resume into APIs or auth endpoints (avoids odd loops after login).
  if (!next || next.startsWith("/api") || next === "/giris" || next === "/kayit" || next.startsWith("/giris?") || next.startsWith("/kayit?")) {
    next = "/";
  }
  const dest = new URL("/giris", url.origin);
  if (next && next !== "/") {
    dest.searchParams.set("next", next);
  }
  const res = clearSession(NextResponse.redirect(dest));
  res.headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
  return res;
}
