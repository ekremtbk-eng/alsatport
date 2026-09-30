const FORBIDDEN = "alsatport-dev-auth-secret-change-me-32";

export function getAuthSecret(): string {
  const raw = process.env.AUTH_SECRET?.trim() ?? "";
  if (raw.length < 32 || raw === FORBIDDEN) {
    throw new Error("AUTH_SECRET must be set to a unique value of at least 32 characters.");
  }
  return raw;
}

export function authSecretBytes() {
  return new TextEncoder().encode(getAuthSecret());
}
