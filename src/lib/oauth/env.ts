function stripEnv(name: string) {
  const raw = process.env[name];
  if (typeof raw !== "string") return "";
  return raw
    .replace(/^\uFEFF/, "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\r/g, "")
    .trim();
}

export function oauthEnv(name: string) {
  return stripEnv(name);
}

export function googleClientId() {
  return oauthEnv("GOOGLE_CLIENT_ID");
}

export function googleClientSecret() {
  return oauthEnv("GOOGLE_CLIENT_SECRET");
}

export function facebookAppId() {
  return oauthEnv("FACEBOOK_APP_ID");
}

export function facebookAppSecret() {
  return oauthEnv("FACEBOOK_APP_SECRET");
}

export function appleClientId() {
  return oauthEnv("APPLE_CLIENT_ID");
}

export function appleTeamId() {
  return oauthEnv("APPLE_TEAM_ID");
}

export function appleKeyId() {
  return oauthEnv("APPLE_KEY_ID");
}

export function applePrivateKey() {
  return oauthEnv("APPLE_PRIVATE_KEY").replace(/\\n/g, "\n");
}

export function isGoogleClientIdShape(id: string) {
  return /^\d+-[a-z0-9]+\.apps\.googleusercontent\.com$/i.test(id);
}
