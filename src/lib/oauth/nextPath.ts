const SAME_ORIGIN_BASE = "https://same-origin.invalid";

/** Same-origin path only: browsers treat `\`, tabs and newlines as `/`, so `/\evil.com` would leave the site. */
export function safeNextPath(raw: string | null | undefined) {
  const next = (raw ?? "").trim().slice(0, 200);
   
  if (!next.startsWith("/") || /[\\\u0000-\u001f\u007f]/.test(next)) return "/profil";
  try {
    const url = new URL(next, SAME_ORIGIN_BASE);
    if (url.origin !== SAME_ORIGIN_BASE || url.pathname.startsWith("//")) return "/profil";
    return `${url.pathname}${url.search}`;
  } catch {
    return "/profil";
  }
}
