import "server-only";
import { unstable_noStore as noStore } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { safeNextPath } from "@/lib/profile";
import { currentSession } from "@/lib/security/session";

/**
 * Server-side gate for protected App Router pages (Node runtime).
 * Uses the same revoke/expiry checks as API `currentSession()` — not JWT-only.
 * On failure, redirects through `/api/auth/expired-session` so stale cookies are cleared.
 *
 * `noStore()` + `cookies()` (via currentSession) keep this out of the Full Route Cache /
 * static generation so a revoked session cannot be served from a cached RSC payload.
 */
export async function requirePageSession() {
  noStore();
  const live = await currentSession();
  if (live) return live;

  const h = await headers();
  const raw = h.get("x-alsatport-path") || "/";
  const next = safeNextPath(raw, "/");
  const q = next && next !== "/giris" && next !== "/kayit" ? `?next=${encodeURIComponent(next)}` : "";
  redirect(`/api/auth/expired-session${q}`);
}
