import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  LINK_RETURN,
  linkOAuthIdentity,
  upsertVerifiedOAuthUser,
  safeNextPath,
  type VerifiedOAuthIdentity,
} from "@/lib/oauth/complete";
import { COMPLETE_PATH, allowlistedReturn } from "@/lib/profile";
import {
  exchangeOAuthCode,
  parseOAuthProvider,
  verifyOAuthState,
  type OAuthLinkIntent,
  type OAuthProvider,
} from "@/lib/oauth/providers";
import { STEP_UP_WINDOW_MS, canLinkProvider, currentSession, startSession } from "@/lib/security/session";
import { findUserById } from "@/lib/security/userStore";
import { needsSecondFactor, sendLoginCode } from "@/lib/security/loginFlow";
import { setLoginChallenge } from "@/lib/security/twoFactor";
import { promoteConfiguredAdmin } from "@/lib/admin/audit";
import { CANONICAL_ORIGIN } from "@/lib/site";

export const maxDuration = 60;

type Ctx = { params: Promise<{ provider: string }> };

function oauthFail(q: string) {
  return NextResponse.redirect(new URL(`/giris?oauth=${q}`, CANONICAL_ORIGIN));
}

function linkDone(code: string) {
  const res = NextResponse.redirect(new URL(`${LINK_RETURN}&oauth=${code}`, CANONICAL_ORIGIN));
  res.cookies.set("ap_oauth_nonce", "", { path: "/", maxAge: 0 });
  return res;
}

/** Same user, same session that started the link, still freshly re-authenticated (state lives up to 10 min). */
async function finishLink(link: OAuthLinkIntent, identity: VerifiedOAuthIdentity) {
  const current = await currentSession();
  if (!current || current.session.id !== link.sid || current.claims.sub !== link.uid) return linkDone("session");
  const user = await findUserById(link.uid);
  if (!user || user.bannedAt) return linkDone("session");
  if (!canLinkProvider(current.session, user.role, STEP_UP_WINDOW_MS + 10 * 60 * 1000)) return linkDone("reauth");
  const linked = await linkOAuthIdentity(user.id, identity);
  if ("error" in linked) return linkDone(linked.error === "auth.err.oauthLinked" ? "linked" : "email");
  return linkDone("linkok");
}

async function finish(req: Request, provider: OAuthProvider, code: string, state: string) {
  if (!code || !state) return oauthFail("bad");
  let parsed: Awaited<ReturnType<typeof verifyOAuthState>> = null;
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

  if (parsed.link) return finishLink(parsed.link, identity);

  const upserted = await upsertVerifiedOAuthUser(identity, req);
  if ("linkRequired" in upserted) return oauthFail("link");
  if ("error" in upserted) return oauthFail(upserted.error === "auth.err.oauthLinked" ? "linked" : "email");
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
