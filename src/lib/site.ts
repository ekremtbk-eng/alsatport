/** Public origin for every auth callback, mail link, and metadata URL. */
export const CANONICAL_ORIGIN = "https://alsatport.com";
export const GOOGLE_OAUTH_CALLBACK = `${CANONICAL_ORIGIN}/api/auth/oauth/google/callback`;

function originFromValue(raw: string | undefined) {
  if (!raw) return "";
  try {
    return new URL(raw.trim()).origin.replace(/\/$/, "");
  } catch {
    return "";
  }
}

export function appOrigin() {
  if (process.env.NODE_ENV === "production") return CANONICAL_ORIGIN;
  const fromEnv = [process.env.APP_URL, process.env.NEXT_PUBLIC_APP_URL, process.env.NEXTAUTH_URL]
    .map(originFromValue)
    .find(Boolean);
  return fromEnv || CANONICAL_ORIGIN;
}

export function oauthCallbackPath(provider: string) {
  return `${CANONICAL_ORIGIN}/api/auth/oauth/${provider}/callback`;
}

export function demoCatalogEnabled() {
  return process.env.NODE_ENV !== "production";
}
