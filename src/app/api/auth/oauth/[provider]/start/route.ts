import { NextResponse } from "next/server";
import {
  authorizationUrl,
  oauthConfigured,
  parseOAuthProvider,
  signOAuthState,
  type OAuthProvider,
} from "@/lib/oauth/providers";
import { oauthCallbackUrl, safeNextPath } from "@/lib/oauth/complete";
import { appOrigin } from "@/lib/site";
import { LIMITS, clientRateKey, rateLimit } from "@/lib/security/rateLimit";

type Ctx = { params: Promise<{ provider: string }> };

function envMeta(name: string) {
  const v = process.env[name]?.trim() ?? "";
  return { name, set: v.length > 0, length: v.length };
}

function oauthStartDebug(provider: OAuthProvider) {
  const keys =
    provider === "google"
      ? ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"]
      : provider === "facebook"
        ? ["FACEBOOK_APP_ID", "FACEBOOK_APP_SECRET"]
        : ["APPLE_CLIENT_ID", "APPLE_TEAM_ID", "APPLE_KEY_ID", "APPLE_PRIVATE_KEY"];
  return {
    provider,
    nodeEnv: process.env.NODE_ENV,
    appUrl: appOrigin(),
    callback: oauthCallbackUrl(provider),
    authSecret: envMeta("AUTH_SECRET"),
    vars: keys.map(envMeta),
  };
}

export async function GET(req: Request, ctx: Ctx) {
  try {
    const { provider: raw } = await ctx.params;
    const provider = parseOAuthProvider(raw);
    if (!provider) {
      return NextResponse.redirect(new URL("/giris?oauth=bad", req.url));
    }
    if (!oauthConfigured(provider)) {
      console.error("[oauth:start] not configured", oauthStartDebug(provider));
      return NextResponse.redirect(new URL("/giris?oauth=off", req.url));
    }
    if (process.env.NODE_ENV === "production") {
      const limited = rateLimit(clientRateKey(req, "oauth"), LIMITS.oauth.limit, LIMITS.oauth.windowMs, req);
      if (!limited.ok) {
        return NextResponse.redirect(new URL("/giris?oauth=rate", req.url));
      }
    }
    const next = safeNextPath(new URL(req.url).searchParams.get("next"));
    const nonce = crypto.randomUUID();
    const state = await signOAuthState({ provider, next, nonce });
    const res = NextResponse.redirect(authorizationUrl(provider, state));
    res.cookies.set("ap_oauth_nonce", nonce, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 600,
    });
    return res;
  } catch (err) {
    const raw = (await ctx.params).provider;
    const provider = parseOAuthProvider(raw);
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("[oauth:start] failed", {
      url: req.url,
      ...(provider ? oauthStartDebug(provider) : { provider: raw }),
      message,
      stack,
    });
    return NextResponse.json(
      { ok: false, error: "oauth.start", message, hint: "Check the terminal for [oauth:start] failed" },
      { status: 500 },
    );
  }
}
