import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { upsertVerifiedOAuthUser, safeNextPath } from "@/lib/oauth/complete";
import { COMPLETE_PATH, allowlistedReturn } from "@/lib/profile";
import {
  exchangeOAuthCode,
  parseOAuthProvider,
  verifyOAuthState,
  type OAuthProvider,
} from "@/lib/oauth/providers";
import { startSession } from "@/lib/security/session";
import { needsSecondFactor, sendLoginCode } from "@/lib/security/loginFlow";
import { setLoginChallenge } from "@/lib/security/twoFactor";
import { promoteConfiguredAdmin } from "@/lib/admin/audit";
import { CANONICAL_ORIGIN } from "@/lib/site";

export const maxDuration = 60;

type Ctx = { params: Promise<{ provider: string }> };

function oauthFail(q: string) {
  return NextResponse.redirect(new URL(`/giris?oauth=${q}`, CANONICAL_ORIGIN));
}

async function finish(req: Request, provider: OAuthProvider, code: string, state: string) {
  if (!code || !state) return oauthFail("bad");
  let parsed: { next: string; nonce: string } | null = null;
  try {
    parsed = await verifyOAuthState(state, provider);
  } catch {
    parsed = null;
  }
  const jar = await cookies();
  const nonce = jar.get("ap_oauth_nonce")?.value;
  if (!parsed || !nonce || parsed.nonce !== nonce) return oauthFail("state");

  const identity = await exchangeOAuthCode(provider, code);
  if ("error" in identity) return oauthFail("token");

  const upserted = await upsertVerifiedOAuthUser(identity, req);
  if ("error" in upserted) return oauthFail("email");
  if (upserted.user.bannedAt) return oauthFail("denied");
  const user = await promoteConfiguredAdmin(upserted.user);

  const target = safeNextPath(parsed.next);
  const carry = allowlistedReturn(target);

  if (await needsSecondFactor(user)) {
    const sent = await sendLoginCode(user);
    if (!sent.ok) return oauthFail("mail");
    const challengeUrl = new URL("/giris?tfa=1", CANONICAL_ORIGIN);
    if (carry) challengeUrl.searchParams.set("next", carry);
    const res = NextResponse.redirect(challengeUrl);
    res.cookies.set("ap_oauth_nonce", "", { path: "/", maxAge: 0 });
    await setLoginChallenge(res, user.id);
    return res;
  }

  const next = upserted.needsEmailVerify
    ? "/eposta-dogrula"
    : carry
      ? carry
      : upserted.needsProfile
        ? COMPLETE_PATH
        : target;
  const dest = new URL(next, CANONICAL_ORIGIN);
  if (dest.origin !== new URL(CANONICAL_ORIGIN).origin) return oauthFail("bad");
  if (upserted.needsEmailVerify) {
    dest.searchParams.set(upserted.mailSent ? "sent" : "mail", upserted.mailSent ? "1" : "0");
    if (carry) dest.searchParams.set("next", carry);
  } else {
    dest.searchParams.set("social", "1");
  }
  const res = NextResponse.redirect(dest);
  res.cookies.set("ap_oauth_nonce", "", { path: "/", maxAge: 0 });
  await startSession(res, user, req, { method: "oauth" });
  return res;
}

export async function GET(req: Request, ctx: Ctx) {
  const { provider: raw } = await ctx.params;
  const provider = parseOAuthProvider(raw);
  if (!provider) return oauthFail("bad");
  const url = new URL(req.url);
  if (url.searchParams.get("error")) return oauthFail("denied");
  return finish(req, provider, url.searchParams.get("code") ?? "", url.searchParams.get("state") ?? "");
}

export async function POST(req: Request, ctx: Ctx) {
  const { provider: raw } = await ctx.params;
  const provider = parseOAuthProvider(raw);
  if (!provider) return oauthFail("bad");
  const form = await req.formData().catch(() => null);
  if (String(form?.get("error") ?? "")) return oauthFail("denied");
  return finish(req, provider, String(form?.get("code") ?? ""), String(form?.get("state") ?? ""));
}
