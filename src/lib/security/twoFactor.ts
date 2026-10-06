import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { COOKIE_DEVICE, sessionCookieOptions } from "@/lib/security/cookies";
import { authSecretBytes } from "@/lib/security/secret";

export const COOKIE_2FA = "ap_2fa";
export const COOKIE_TRUSTED = "ap_tdev";
const CHALLENGE_MAX_AGE = 60 * 10;
const TRUSTED_MAX_AGE = 60 * 60 * 24 * 60;

async function sign(claims: Record<string, unknown>, sub: string, maxAge: number) {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${maxAge}s`)
    .setSubject(sub)
    .sign(authSecretBytes());
}

async function verify(token: string | undefined, typ: string) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, authSecretBytes(), { algorithms: ["HS256"] });
    if (payload.typ !== typ || !payload.sub) return null;
    return payload;
  } catch {
    return null;
  }
}

async function deviceId() {
  return (await cookies()).get(COOKIE_DEVICE)?.value ?? "";
}

/** Pending second step after a correct password; carries no session rights by itself. */
export async function setLoginChallenge(res: NextResponse, userId: string) {
  res.cookies.set(COOKIE_2FA, await sign({ typ: "2fa" }, userId, CHALLENGE_MAX_AGE), sessionCookieOptions(CHALLENGE_MAX_AGE));
}

export async function readLoginChallenge() {
  const payload = await verify((await cookies()).get(COOKIE_2FA)?.value, "2fa");
  return payload?.sub ?? null;
}

export function clearLoginChallenge(res: NextResponse) {
  res.cookies.set(COOKIE_2FA, "", sessionCookieOptions(0));
}

/** Trust is bound to both the user and the browser's device cookie. */
export async function isTrustedDevice(userId: string) {
  const did = await deviceId();
  if (!did) return false;
  const payload = await verify((await cookies()).get(COOKIE_TRUSTED)?.value, "tdev");
  return payload?.sub === userId && payload.did === did;
}

export async function trustDevice(res: NextResponse, userId: string) {
  const did = await deviceId();
  if (!did) return;
  res.cookies.set(COOKIE_TRUSTED, await sign({ typ: "tdev", did }, userId, TRUSTED_MAX_AGE), sessionCookieOptions(TRUSTED_MAX_AGE));
}

export function forgetTrustedDevice(res: NextResponse) {
  res.cookies.set(COOKIE_TRUSTED, "", sessionCookieOptions(0));
}
