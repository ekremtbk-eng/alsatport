import "server-only";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { SignJWT } from "jose";
import { importPKCS8 } from "jose";
import { oauthCallbackUrl, type VerifiedOAuthIdentity } from "@/lib/oauth/complete";
import {
  appleClientId,
  appleKeyId,
  applePrivateKey,
  appleTeamId,
  facebookAppId,
  facebookAppSecret,
  googleClientId,
  googleClientSecret,
  isGoogleClientIdShape,
} from "@/lib/oauth/env";
import { getAuthSecret } from "@/lib/security/secret";

export type OAuthProvider = "google" | "apple" | "facebook";

export function parseOAuthProvider(value: string): OAuthProvider | null {
  if (value === "google" || value === "apple" || value === "facebook") return value;
  return null;
}

export function oauthConfigured(provider: OAuthProvider) {
  if (provider === "google") {
    const id = googleClientId();
    const secret = googleClientSecret();
    if (!id || !secret) return false;
    if (!isGoogleClientIdShape(id)) {
      console.error("[oauth] GOOGLE_CLIENT_ID must look like {numbers}-{id}.apps.googleusercontent.com, not a project number");
      return false;
    }
    return true;
  }
  if (provider === "facebook") {
    return Boolean(facebookAppId() && facebookAppSecret());
  }
  return Boolean(appleClientId() && appleTeamId() && appleKeyId() && applePrivateKey());
}

export async function signOAuthState(input: { provider: OAuthProvider; next: string; nonce: string }) {
  return new SignJWT(input)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(new TextEncoder().encode(getAuthSecret()));
}

export async function verifyOAuthState(token: string, provider: OAuthProvider) {
  const { payload } = await jwtVerify(token, new TextEncoder().encode(getAuthSecret()), {
    algorithms: ["HS256"],
  });
  if (payload.provider !== provider || typeof payload.nonce !== "string") return null;
  return {
    next: typeof payload.next === "string" ? payload.next : "/profil",
    nonce: payload.nonce,
  };
}

export function authorizationUrl(provider: OAuthProvider, state: string) {
  const redirect = oauthCallbackUrl(provider);
  if (provider === "google") {
    const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    u.searchParams.set("client_id", googleClientId());
    u.searchParams.set("redirect_uri", redirect);
    u.searchParams.set("response_type", "code");
    u.searchParams.set("scope", "openid email profile");
    u.searchParams.set("state", state);
    u.searchParams.set("prompt", "select_account");
    return u.toString();
  }
  if (provider === "facebook") {
    const u = new URL("https://www.facebook.com/v21.0/dialog/oauth");
    u.searchParams.set("client_id", facebookAppId());
    u.searchParams.set("redirect_uri", redirect);
    u.searchParams.set("state", state);
    u.searchParams.set("scope", "email,public_profile");
    return u.toString();
  }
  const u = new URL("https://appleid.apple.com/auth/authorize");
  u.searchParams.set("client_id", appleClientId());
  u.searchParams.set("redirect_uri", redirect);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("response_mode", "form_post");
  u.searchParams.set("scope", "name email");
  u.searchParams.set("state", state);
  return u.toString();
}

const googleJwks = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

async function appleClientSecret() {
  const pem = applePrivateKey();
  const key = await importPKCS8(pem, "ES256");
  return new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: appleKeyId() })
    .setIssuer(appleTeamId())
    .setAudience("https://appleid.apple.com")
    .setSubject(appleClientId())
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(key);
}

export async function exchangeOAuthCode(
  provider: OAuthProvider,
  code: string,
): Promise<VerifiedOAuthIdentity | { error: string }> {
  if (provider === "google") {
    const body = new URLSearchParams({
      code,
      client_id: googleClientId(),
      client_secret: googleClientSecret(),
      redirect_uri: oauthCallbackUrl("google"),
      grant_type: "authorization_code",
    });
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const tokenJson = (await tokenRes.json().catch(() => null)) as {
      id_token?: string;
      error?: string;
      error_description?: string;
    } | null;
    if (!tokenJson?.id_token) {
      console.error("[oauth:google] token exchange failed", {
        status: tokenRes.status,
        error: tokenJson?.error ?? null,
        description: tokenJson?.error_description ?? null,
        redirect: oauthCallbackUrl("google"),
        clientIdLen: googleClientId().length,
        clientIdShape: isGoogleClientIdShape(googleClientId()),
      });
      return { error: "auth.err.google" };
    }
    let payload: Record<string, unknown>;
    try {
      const verified = await jwtVerify(tokenJson.id_token, googleJwks, {
        issuer: ["https://accounts.google.com", "accounts.google.com"],
        audience: googleClientId(),
      });
      payload = verified.payload as Record<string, unknown>;
    } catch (err) {
      console.error("[oauth:google] id_token verify failed", err instanceof Error ? err.message : String(err));
      return { error: "auth.err.google" };
    }
    const email = String(payload.email ?? "");
    if (payload.email_verified !== true) return { error: "auth.err.email" };
    return {
      provider: "google",
      sub: String(payload.sub ?? ""),
      email,
      emailVerified: true,
      name: String(payload.name ?? ""),
      picture: typeof payload.picture === "string" ? payload.picture : undefined,
    };
  }

  if (provider === "facebook") {
    const redirect = oauthCallbackUrl("facebook");
    const tokenUrl = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
    tokenUrl.searchParams.set("client_id", facebookAppId());
    tokenUrl.searchParams.set("client_secret", facebookAppSecret());
    tokenUrl.searchParams.set("redirect_uri", redirect);
    tokenUrl.searchParams.set("code", code);
    const tokenRes = await fetch(tokenUrl);
    const tokenJson = (await tokenRes.json().catch(() => null)) as { access_token?: string } | null;
    if (!tokenJson?.access_token) return { error: "auth.err.facebook" };
    const meUrl = new URL("https://graph.facebook.com/v21.0/me");
    meUrl.searchParams.set("fields", "id,name,email,picture.type(large)");
    meUrl.searchParams.set("access_token", tokenJson.access_token);
    const meRes = await fetch(meUrl);
    const me = (await meRes.json().catch(() => null)) as {
      id?: string;
      name?: string;
      email?: string;
      picture?: { data?: { url?: string } };
    } | null;
    if (!me?.id || !me.email) return { error: "auth.err.email" };
    return {
      provider: "facebook",
      sub: me.id,
      email: me.email,
      emailVerified: true,
      name: me.name ?? "",
      picture: me.picture?.data?.url,
    };
  }

  const secret = await appleClientSecret();
  const body = new URLSearchParams({
    client_id: appleClientId(),
    client_secret: secret,
    code,
    grant_type: "authorization_code",
    redirect_uri: oauthCallbackUrl("apple"),
  });
  const tokenRes = await fetch("https://appleid.apple.com/auth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const tokenJson = (await tokenRes.json().catch(() => null)) as { id_token?: string } | null;
  if (!tokenJson?.id_token) return { error: "auth.err.apple" };
  const appleJwks = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));
  const { payload } = await jwtVerify(tokenJson.id_token, appleJwks, {
    issuer: "https://appleid.apple.com",
    audience: appleClientId(),
  });
  const email = String(payload.email ?? "");
  if (!email) return { error: "auth.err.email" };
  return {
    provider: "apple",
    sub: String(payload.sub ?? ""),
    email,
    emailVerified: payload.email_verified === true || payload.email_verified === "true",
    name: "",
  };
}
