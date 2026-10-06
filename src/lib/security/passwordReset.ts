import { SignJWT, jwtVerify } from "jose";
import { sha256Secret } from "@/lib/security/hash";
import { authSecretBytes } from "@/lib/security/secret";

export const RESET_TTL_MINUTES = 30;

/** Bound to the current password hash: any password change (incl. this reset) voids every issued link. */
async function passwordStamp(passwordHash: string) {
  return (await sha256Secret("reset", passwordHash)).slice(0, 32);
}

export async function signPasswordResetToken(userId: string, passwordHash: string) {
  return new SignJWT({ typ: "reset", ps: await passwordStamp(passwordHash) })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${RESET_TTL_MINUTES}m`)
    .sign(authSecretBytes());
}

export async function verifyPasswordResetToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, authSecretBytes(), { algorithms: ["HS256"] });
    if (payload.typ !== "reset" || !payload.sub || typeof payload.ps !== "string") return null;
    return { userId: payload.sub, stamp: payload.ps };
  } catch {
    return null;
  }
}

export async function resetStampMatches(stamp: string, passwordHash: string | undefined) {
  return !!passwordHash && stamp === (await passwordStamp(passwordHash));
}
