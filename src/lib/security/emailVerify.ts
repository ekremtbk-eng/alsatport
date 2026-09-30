import { SignJWT, jwtVerify } from "jose";
import { authSecretBytes } from "@/lib/security/secret";
import { normalizeEmail } from "@/lib/auth";

const TYP = "email-verify";

export async function signEmailVerifyToken(userId: string, email: string) {
  return new SignJWT({ typ: TYP, email: normalizeEmail(email) })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("48h")
    .sign(authSecretBytes());
}

export async function verifyEmailVerifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, authSecretBytes(), { algorithms: ["HS256"] });
    if (payload.typ !== TYP || typeof payload.sub !== "string" || typeof payload.email !== "string") {
      return null;
    }
    return { userId: payload.sub, email: normalizeEmail(payload.email) };
  } catch {
    return null;
  }
}
