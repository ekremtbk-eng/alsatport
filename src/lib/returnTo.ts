import { allowlistedReturn } from "@/lib/profile";

export { allowlistedReturn, BUSINESS_RETURN } from "@/lib/profile";

const STORE_KEY = "alsatport-return-to";
const STORE_TTL_MS = 24 * 60 * 60 * 1000;

export function rememberReturn(raw: string | null | undefined) {
  const path = allowlistedReturn(raw);
  if (!path) return;
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify({ path, exp: Date.now() + STORE_TTL_MS }));
  } catch {
    /* storage unavailable */
  }
}

export function takeReturn(): string | null {
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    window.localStorage.removeItem(STORE_KEY);
    const parsed = JSON.parse(raw) as { path?: unknown; exp?: unknown };
    if (typeof parsed.exp !== "number" || parsed.exp < Date.now()) return null;
    return allowlistedReturn(typeof parsed.path === "string" ? parsed.path : null);
  } catch {
    return null;
  }
}
